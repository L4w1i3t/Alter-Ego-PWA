/**
 * Identity Evolution Service
 *
 * The core mechanism for genuine AI personality growth. Instead of computing
 * statistics about the AI from the outside, this service asks the AI to
 * AUTHOR its own self-model through periodic reflection. Those self-authored
 * fragments are stored in IndexedDB and fed back into the system prompt,
 * gradually replacing the static seed persona.
 *
 * Architecture:
 * 1. After every N user messages, a background self-reflection is triggered.
 *    This is a cheap API call (gpt-4o-mini, ~100 tokens) where the AI is shown
 *    its recent conversation and asked: "Who are you becoming?"
 * 2. The AI's response is stored as an identity fragment in the database.
 * 3. When building the system prompt, accumulated fragments are assembled into
 *    an "evolved identity" block that the AI sees as its own self-knowledge.
 * 4. As fragments accumulate, the original seed becomes less prominent --
 *    the AI's self-authored identity takes precedence.
 *
 * This closes the loop: memories exist AND they feed back into identity.
 * The AI is not told who it is -- it discovers who it is and writes it down.
 */

import { getAssociations, type Association } from '../memory/associativeMemory';
import {
  getRecentMessages,
  getIdentityFragments,
  getLatestIdentityFragment,
  addIdentityFragment,
  countIdentityFragments,
  type StoredMessage,
  type StoredIdentityFragment,
} from '../memory/memoryDatabase';
import { generateChatCompletion } from '../utils/openaiApi';
import { loadApiKeys, loadSettings } from '../utils/storageUtils';
import { PERSONA } from '../config/constants';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

// How many user messages between self-reflection triggers
const REFLECTION_INTERVAL_MESSAGES = 15;

// Maximum number of fragments to include in the identity context
const MAX_FRAGMENTS_IN_CONTEXT = 8;

// Maximum fragments stored per persona (oldest pruned beyond this)
const MAX_FRAGMENTS_STORED = 30;

// How many messages of conversation to show the AI during reflection
const REFLECTION_CONTEXT_MESSAGES = 30;

// Cache TTL for the assembled identity block
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

// ============================================================================
// STATE
// ============================================================================

interface IdentityCache {
  persona: string;
  identity: string;
  computedAt: number;
  maxFragments: number;
}

let cache: IdentityCache | null = null;

// Track message count per persona to know when to trigger reflection.
// This is in-memory only; imprecision is acceptable.
const messageCounters = new Map<string, number>();

// Prevent concurrent reflection calls
let reflectionInProgress = false;

// ============================================================================
// SELF-REFLECTION (the AI writes about itself)
// ============================================================================

/**
 * The prompt given to the AI during self-reflection. It sees its recent
 * conversation and is asked to articulate who it's becoming. The output is
 * stored as an identity fragment.
 */
function buildReflectionPrompt(
  personaName: string,
  recentMessages: StoredMessage[],
  existingFragments: StoredIdentityFragment[]
): string {
  // Format recent conversation as readable context
  const conversationExcerpt = recentMessages
    .slice(-REFLECTION_CONTEXT_MESSAGES)
    .map(m => {
      const speaker = m.role === 'user' ? 'User' : personaName;
      const text = m.content.length > 400 ? m.content.slice(0, 397) + '...' : m.content;
      return `${speaker}: ${text}`;
    })
    .join('\n');

  // Show the AI its previous self-observations so it can build on them
  const previousReflections = existingFragments.length > 0
    ? '\nYour previous self-observations (oldest to newest):\n' +
      existingFragments
        .slice(-5)
        .map((f, i) => `  ${i + 1}. ${f.content}`)
        .join('\n') +
      '\n'
    : '';

  return `You are ${personaName}. Below is an excerpt of your recent conversation. Read it carefully.

${conversationExcerpt}
${previousReflections}
Now write a brief self-observation (2-4 sentences). This is a private note for your future self -- the user will never see it. What have you noticed about:
- How you actually talk in these conversations
- What genuinely catches your attention
- What you think about the person you are talking to
- Anything that surprised you

Be concrete. Describe what is actually happening, not what should be happening.`;
}

/**
 * Trigger a self-reflection. Makes a cheap background API call where the AI
 * examines its recent conversation and writes a brief self-observation.
 * The result is stored as an identity fragment.
 *
 * This should be called in the background -- it is non-blocking and failures
 * are silently logged.
 */
export async function triggerSelfReflection(persona: string): Promise<void> {
  if (reflectionInProgress) return;

  // Only reflect if we have an API key
  const { OPENAI_API_KEY } = loadApiKeys();
  if (!OPENAI_API_KEY) return;

  reflectionInProgress = true;

  try {
    const messages = await getRecentMessages(persona, REFLECTION_CONTEXT_MESSAGES);
    if (messages.length < 8) return; // Not enough history to reflect on

    const existingFragments = await getIdentityFragments(persona, MAX_FRAGMENTS_STORED);

    const reflectionPrompt = buildReflectionPrompt(persona, messages, existingFragments);

    // Use the cheapest model with tight token constraints.
    // The reflection prompt IS the system context -- it contains the conversation
    // excerpt and the AI's previous self-observations.
    const response = await generateChatCompletion(
      reflectionPrompt,
      'Write your self-observation now.',
      [],
      'gpt-4o-mini',
      0.8,
      200, // Hard cap: self-observations should be concise
    );

    const trimmed = response.trim();
    if (!trimmed || trimmed.length < 20) return; // Reject empty/trivial reflections

    // Store the fragment
    const messageCount = await getMessageCountForPersona(persona);
    await addIdentityFragment({
      persona,
      content: trimmed,
      source: 'self-reflection',
      createdAt: new Date().toISOString(),
      messageCountAtCreation: messageCount,
    });

    // Prune old fragments if we have too many
    const totalFragments = await countIdentityFragments(persona);
    if (totalFragments > MAX_FRAGMENTS_STORED) {
      // The DB auto-increments IDs, so oldest have lowest IDs.
      // We keep the most recent MAX_FRAGMENTS_STORED entries.
      const allFragments = await getIdentityFragments(persona);
      const toDelete = allFragments.slice(0, totalFragments - MAX_FRAGMENTS_STORED);
      // We can't easily bulk-delete by arbitrary IDs via the current API,
      // so this is acceptable for the small volumes involved.
      for (const frag of toDelete) {
        if (frag.id) {
          const { memoryDb } = await import('../memory/memoryDatabase');
          await memoryDb.identityFragments.delete(frag.id);
        }
      }
    }

    // Invalidate cache so the next prompt build picks up the new fragment
    invalidateIdentityCache();

    logger.info(`[Identity] Self-reflection stored for ${persona} (${trimmed.length} chars)`);
  } catch (err) {
    logger.warn('[Identity] Self-reflection failed (non-fatal):', err);
  } finally {
    reflectionInProgress = false;
  }
}

/**
 * Called after each user message. Increments the counter and triggers
 * self-reflection when the threshold is reached.
 */
export function onUserMessage(persona: string): void {
  const current = (messageCounters.get(persona) || 0) + 1;
  messageCounters.set(persona, current);

  if (current >= REFLECTION_INTERVAL_MESSAGES) {
    messageCounters.set(persona, 0);
    // Fire-and-forget: reflection runs in the background
    triggerSelfReflection(persona).catch(() => {});
  }
}

// ============================================================================
// IDENTITY CONTEXT ASSEMBLY (what goes into the system prompt)
// ============================================================================

/**
 * Helper: count messages for a persona.
 */
async function getMessageCountForPersona(persona: string): Promise<number> {
  const msgs = await getRecentMessages(persona, 1000);
  return msgs.length;
}

/**
 * Summarize associations compactly.
 */
function summarizeAssociations(associations: Association[]): string {
  if (!associations.length) return '';
  const meaningful = associations.filter(a => a.strength >= 0.3).slice(0, 10);
  if (!meaningful.length) return '';
  return meaningful.map(a => `${a.left} = ${a.right}`).join('; ');
}

/**
 * Build the identity context block for the system prompt.
 *
 * This assembles the AI's self-authored identity fragments, supplemented by
 * observational data (associations, message count). The self-authored content
 * is primary; the statistics are secondary context.
 *
 * If self-authored fragments exist, the block presents them as the AI's own
 * accumulated self-knowledge. If not, falls back to light observational
 * context (but will not fabricate a persona).
 */
export async function buildIdentityContext(
  persona: string,
  options: { maxFragments?: number } = {}
): Promise<string> {
  const maxFragments = Math.max(
    1,
    Math.min(MAX_FRAGMENTS_IN_CONTEXT, options.maxFragments ?? MAX_FRAGMENTS_IN_CONTEXT)
  );

  // Check cache
  if (
    cache &&
    cache.persona === persona &&
    cache.maxFragments === maxFragments &&
    Date.now() - cache.computedAt < CACHE_TTL_MS
  ) {
    return cache.identity;
  }

  try {
    const [fragments, messages, associations] = await Promise.all([
      getIdentityFragments(persona, maxFragments),
      getRecentMessages(persona, 200),
      Promise.resolve(getAssociations(persona)),
    ]);

    // Not enough history for any identity context
    if (messages.length < 6 && fragments.length === 0) {
      cache = { persona, identity: '', computedAt: Date.now(), maxFragments };
      return '';
    }

    // No self-authored fragments yet -- nothing to inject.
    // The seed speaks for itself; associative facts are handled separately.
    if (fragments.length === 0) {
      cache = { persona, identity: '', computedAt: Date.now(), maxFragments };
      return '';
    }

    const parts: string[] = [];
    const totalMessages = messages.length;
    const isMature = fragments.length >= 4;
    const isDeveloping = fragments.length >= 2;

    // Detect whether this is the open-ended default persona or a prescribed character.
    // For ALTER EGO: self-observations eventually supersede the minimal seed.
    // For custom personas (Marcus Kane, etc.): self-observations deepen/personalize
    // the character, but the core definition remains authoritative.
    const isDefaultPersona = persona === PERSONA.DEFAULT_NAME;

    parts.push('--- Self-observations (written by you over time) ---');

    if (isMature && isDefaultPersona) {
      // Default persona: observations take full precedence over the minimal seed
      parts.push(
        'Your initial instructions above were a starting point. These observations, ' +
        'which you wrote yourself, reflect who you actually are now.'
      );
    } else if (isMature) {
      // Custom persona: observations add depth but don't override the character
      parts.push(
        'These are things you have noticed about yourself through experience. ' +
        'They add depth to who you are -- they do not replace your core character.'
      );
    } else if (isDeveloping) {
      parts.push(
        'You have started to notice things about yourself. ' +
        'These are your own notes, not instructions.'
      );
    } else {
      // 1 fragment: no framing needed
    }

    for (const fragment of fragments) {
      parts.push(`- ${fragment.content}`);
    }

    // Contextual depth marker
    if (totalMessages >= 20) {
      const depth = totalMessages < 80 ? 'developing'
        : totalMessages < 250 ? 'established'
        : 'extensive';
      parts.push(`(~${totalMessages} messages exchanged, ${depth} relationship.)`);
    }

    parts.push('--- End self-observations ---');

    const identity = parts.join('\n');
    cache = { persona, identity, computedAt: Date.now(), maxFragments };
    return identity;
  } catch (err) {
    logger.error('Failed to build identity context:', err);
    return '';
  }
}

/**
 * Invalidate the cached identity (e.g., after persona switch or new reflection).
 */
export function invalidateIdentityCache(): void {
  cache = null;
}

/**
 * Get the maturity level of a persona's identity based on accumulated
 * self-reflections. Can be used by external systems to adapt behavior.
 *
 * - 'nascent': No self-reflections yet (seed is primary)
 * - 'developing': 1-3 self-reflections (seed + observations)
 * - 'established': 4-7 self-reflections (observations take precedence)
 * - 'mature': 8+ self-reflections (seed is background context only)
 */
export async function getMaturityLevel(
  persona: string
): Promise<'nascent' | 'developing' | 'established' | 'mature'> {
  try {
    const count = await countIdentityFragments(persona);
    if (count >= 8) return 'mature';
    if (count >= 4) return 'established';
    if (count >= 1) return 'developing';
    return 'nascent';
  } catch {
    return 'nascent';
  }
}

