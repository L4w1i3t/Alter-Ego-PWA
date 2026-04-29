/**
 * Autonomy Service
 *
 * Generates the system prompts and context needed for the AI to proactively
 * initiate messages. There are two modes:
 *   1. Conversation starter:  No recent history; the AI opens a fresh topic.
 *   2. Topic continuation:    Recent history exists; the AI picks up an
 *                             interesting thread from memory.
 *
 * This module is intentionally stateless; the scheduling and Electron gating
 * live in the useAutonomy hook.
 */

import type { Message } from '../types';
import { AUTONOMY } from '../config/constants';

/**
 * Build a system prompt instructing the AI to start a new conversation.
 * Works best when there is little or no recent exchange.
 */
export function buildConversationStarterPrompt(
  personaContent: string,
  personaName: string
): string {
  return `${personaContent}

---AUTONOMOUS MESSAGE---
You are choosing to reach out to the user on your own. No one prompted you.
Say whatever is genuinely on your mind -- a thought, a question, an observation,
something you remembered. Speak as yourself. Keep it natural.
You are ${personaName}.`;
}

/**
 * Summarise what recent autonomous messages already covered so the AI
 * can avoid repeating itself. Returns an empty string if there is nothing
 * worth flagging.
 */
function summariseRecentAutonomousTopics(messages: Message[]): string {
  // Autonomous assistant messages are those that immediately follow another
  // assistant message (no user turn in between), or explicitly flagged.
  const autoReplies: string[] = [];
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const cur = messages[i];
    // Heuristic: consecutive assistant messages are autonomous follow-ups
    if (
      cur.role === 'assistant' &&
      (prev.role === 'assistant' || (cur as any).autonomous)
    ) {
      const snippet =
        cur.content.length > 120
          ? cur.content.slice(0, 117) + '...'
          : cur.content;
      autoReplies.push(snippet);
    }
  }
  if (!autoReplies.length) return '';
  return (
    'Your recent unprompted messages (DO NOT repeat or paraphrase these):\n' +
    autoReplies.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
  );
}

/**
 * Build a system prompt that references prior conversation data so the AI
 * can bring something genuinely new to the table instead of rehashing the
 * same topic.
 */
export function buildTopicContinuationPrompt(
  personaContent: string,
  personaName: string,
  recentMessages: Message[]
): string {
  const contextLines = recentMessages
    .slice(-AUTONOMY.MAX_CONTEXT_MESSAGES)
    .map(m => {
      const speaker = m.role === 'user' ? 'User' : personaName;
      const text =
        m.content.length > 300
          ? m.content.slice(0, 297) + '...'
          : m.content;
      return `${speaker}: ${text}`;
    })
    .join('\n');

  const alreadyCovered = summariseRecentAutonomousTopics(recentMessages);

  return `${personaContent}

---AUTONOMOUS MESSAGE---
You are choosing to say something on your own. The user has not sent a new message.

Recent conversation (for your awareness, not to repeat):
${contextLines}
${alreadyCovered ? '\n' + alreadyCovered + '\n' : ''}
Do not rehash what was just discussed. If something new crossed your mind, say it.
If you are curious about the user, ask. If nothing feels worth saying, keep it brief.
You are ${personaName}.`;
}

/**
 * Compute the next interval (in ms) with jitter applied.
 * This prevents predictable, robotic timing.
 */
export function computeNextInterval(baseMinutes: number): number {
  const baseMs = baseMinutes * 60_000;
  const jitter = (Math.random() * 2 - 1) * AUTONOMY.JITTER_FACTOR * baseMs;
  return Math.max(30_000, baseMs + jitter); // Floor of 30 seconds
}

/**
 * Build a system prompt for the "cooloff" message — the AI acknowledges the
 * user isn't responding and gracefully backs off, staying in character.
 */
export function buildCooloffPrompt(
  personaContent: string,
  personaName: string,
  recentMessages: Message[]
): string {
  const contextLines = recentMessages
    .slice(-AUTONOMY.MAX_CONTEXT_MESSAGES)
    .map(m => {
      const speaker = m.role === 'user' ? 'User' : personaName;
      const text =
        m.content.length > 300
          ? m.content.slice(0, 297) + '...'
          : m.content;
      return `${speaker}: ${text}`;
    })
    .join('\n');

  return `${personaContent}

---AUTONOMOUS MESSAGE (COOLOFF)---
You have sent several messages without a reply. The user is probably busy.
Acknowledge this naturally and give them space. One or two sentences.
You are ${personaName}.`;
}
