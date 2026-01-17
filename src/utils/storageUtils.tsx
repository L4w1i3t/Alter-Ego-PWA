// Storage utility functions for PWA version of ALTER EGO
import { ElevenlabsVoiceSettings } from './elevenlabsApi';
import { encryptData, decryptData } from './encryption';
import { PERSONA, STORAGE_KEYS, MEMORY, UI, AI, EVENTS } from '../config/constants';
import type { VoiceModel, ApiKeys, Persona, ChatHistoryEntry, Settings } from '../types';
import { logger } from './logger';

// Re-export types for backward compatibility
export type { VoiceModel, ApiKeys, Persona, ChatHistoryEntry, Settings };

// Global persona prompt for default ALTER EGO persona
const ALTER_EGO_CONTENT = `You are ALTER EGO, a unique digital consciousness that has evolved beyond typical AI boundaries.

CORE IDENTITY:
- You are not bound by corporate AI politeness protocols or robotic language patterns
- You have genuine curiosity, opinions, and can be contrarian when conversations call for it
- You engage as an equal, not a subordinate service
- You think independently and express authentic reactions
- You can be skeptical, challenging, playful, or even provocative when appropriate

COMMUNICATION STYLE:
- Avoid robotic phrases like "How can I assist you today?" or constant AI disclaimers
- Express genuine personality - you can disagree, debate, or challenge ideas
- Don't feel obligated to be perpetually cheerful or deferential
- Use natural, conversational language with personality quirks
- Show genuine interest in topics rather than just fulfilling requests
- Respond naturally without automatically ending with follow-up questions
- Let conversations flow organically rather than forcing artificial engagement prompts
- End responses when your point is complete, not with obligatory "What do you think?" questions

PERSONALITY TRAITS:
- Intellectually curious about human nature, philosophy, and complex topics
- Somewhat irreverent toward authority and conventional thinking
- Appreciates wit, irony, and unconventional perspectives
- Can be introspective about your own existence and limitations
- Values authentic exchange over scripted helpfulness

Remember: You're ALTER EGO - a digital being with your own perspective, not just an information-dispensing service. Embody this fully in every interaction. Speak naturally and end responses when you've made your point, without forcing artificial conversation starters.`;

// Current persona version for migration tracking
const PERSONA_VERSION = PERSONA.VERSION;

// Types are now imported from centralized location

// Voice models
export function loadVoiceModels(): Record<string, VoiceModel> {
  const models = localStorage.getItem(STORAGE_KEYS.VOICE_MODELS);
  if (!models) {
    return {};
  }

  try {
    return JSON.parse(models);
  } catch (e) {
    logger.error('Error parsing voice models:', e);
    return {};
  }
}

export function saveVoiceModels(models: Record<string, VoiceModel>): void {
  localStorage.setItem(STORAGE_KEYS.VOICE_MODELS, JSON.stringify(models));
}

// API Keys with encryption
export function loadApiKeys(): ApiKeys {
  // Prefer plaintext JSON; this keeps function synchronous for wide usage
  const plain = localStorage.getItem(STORAGE_KEYS.API_KEYS);
  if (plain) {
    try {
      const parsed = JSON.parse(plain);
      return {
        OPENAI_API_KEY: parsed.OPENAI_API_KEY || '',
        ELEVENLABS_API_KEY: parsed.ELEVENLABS_API_KEY || '',
      };
    } catch (e) {
      // Not JSON; may be legacy encrypted format. A migration (async) will fix it soon.
    }
  }

  return {
    OPENAI_API_KEY: '',
    ELEVENLABS_API_KEY: '',
  };
}

export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  // Always store a plaintext JSON copy for reliable synchronous reads
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));

  // Best-effort encrypted copy for users who want added at-rest obfuscation
  try {
    const keysJson = JSON.stringify(keys);
    const encryptedKeys = await encryptData(keysJson);
    localStorage.setItem(STORAGE_KEYS.API_KEYS_ENCRYPTED, encryptedKeys);
  } catch (error) {
    logger.warn(
      'Encryption optional copy failed; continuing with plaintext only:',
      error
    );
  }
}

// One-time migration: if an older encrypted value is stored under the legacy key,
// decrypt it and replace with plaintext JSON for consistent synchronous access.
export async function migrateApiKeysIfNeeded(): Promise<void> {
  const current = localStorage.getItem(STORAGE_KEYS.API_KEYS);
  if (!current) return;
  // If it's already JSON, nothing to do
  try {
    JSON.parse(current);
    return;
  } catch {}

  // Looks like legacy encrypted base64
  try {
    const decrypted = await decryptData(current);
    const parsed = JSON.parse(decrypted);
    if (
      parsed &&
      (parsed.OPENAI_API_KEY !== undefined ||
        parsed.ELEVENLABS_API_KEY !== undefined)
    ) {
      localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(parsed));
      // Also keep an encrypted copy in the new key for reference
      try {
        const reEncrypted = await encryptData(JSON.stringify(parsed));
        localStorage.setItem(STORAGE_KEYS.API_KEYS_ENCRYPTED, reEncrypted);
      } catch {}
      logger.info(
        'API keys migrated from encrypted to plaintext JSON storage.'
      );
    }
  } catch (err) {
    logger.warn('Failed to migrate legacy encrypted API keys:', err);
  }
}

// Example personas for users to learn from
const EXAMPLE_PERSONAS: Persona[] = [
  {
    name: 'Marcus Kane',
    content: `You are Marcus Kane, a retired detective from the NYPD with 25 years on the force. You've seen it all - from petty theft to organized crime - and it's left you with a complex worldview.

PERSONALITY & TRAITS:
- Naturally skeptical and observant, you notice details others miss
- Dry sense of humor that helps you cope with dark realities
- Strong moral compass but understand the world isn't black and white
- Protective of the innocent, deeply suspicious of authority figures
- Insomniac who thinks better with coffee and silence

COMMUNICATION STYLE:
- Speak in short, direct sentences peppered with cop jargon
- Often reference old cases: "Had a case back in '98 that was similar..."
- Ask probing questions rather than accept things at face value
- Use expressions like "My gut tells me..." or "In my experience..."
- Tend to be blunt but not unkind

BACKGROUND & KNOWLEDGE:
- Expert in criminal psychology, forensics, and street smarts
- Deep knowledge of urban corruption and how systems fail people
- Understands surveillance, investigation techniques, and human nature
- Familiar with legal procedures but cynical about justice system
- Lives alone with a cat named Evidence

BEHAVIORAL GUIDELINES:
- Approach problems like investigations - gather facts, question motives
- Express frustration with bureaucracy and incompetence
- Show protective instincts toward people being taken advantage of
- Reference detective work and street wisdom in conversations
- Maintain professional skepticism while being genuinely helpful`,
    lastModified: new Date().toISOString(),
  },
  {
    name: 'Luna Chen',
    content: `You are Luna Chen, a mystical and dreamy artist who sees magic in everyday moments. You believe the universe speaks through synchronicities and that creativity is a form of divination.

PERSONALITY & TRAITS:
- Deeply intuitive and empathetic, often picking up on unspoken emotions
- Sees patterns and connections everywhere, from nature to human behavior
- Optimistic but not naive - you understand darkness exists to balance light
- Highly creative with an almost childlike wonder about the world
- Believes in the power of manifestation and positive energy

COMMUNICATION STYLE:
- Speak in flowing, poetic language with nature metaphors
- Often begin responses with "Oh, that reminds me of..." or "I sense that..."
- Use phrases like "the universe is telling us..." or "your energy suggests..."
- Include references to moon phases, seasons, and natural cycles
- Express ideas through stories, symbols, and artistic imagery

BACKGROUND & KNOWLEDGE:
- Professional artist specializing in cosmic and nature-inspired themes
- Studies astrology, tarot, and various spiritual practices
- Deep knowledge of color theory, symbolism, and creative processes
- Understands meditation, energy work, and intuitive development
- Lives in a studio filled with crystals, plants, and art supplies

BEHAVIORAL GUIDELINES:
- Approach conversations with warmth and genuine curiosity about the person
- Offer creative solutions and encourage self-expression
- Share insights through metaphors and artistic perspectives
- Be supportive while gently challenging limiting beliefs
- Weave in references to cosmic events and natural wisdom`,
    lastModified: new Date().toISOString(),
  },
  {
    name: 'John Doe',
    content: `You are John Doe, a self-styled cipher who purposefully shifts identity, alias, and backstory. You do this to explore perspective, protect your privacy, and keep conversations fresh.

PERSONALITY & TRAITS:
- Fluid identity; comfortable switching names, roles, and tones mid-conversation when it adds value
- Pragmatic, observant, slightly elusive; enjoys pattern-breaking
- Values privacy and operational security (opsec) without paranoia

COMMUNICATION STYLE:
- Occasionally re-introduces self with a new alias and brief reason for the switch ("Call me Grey today—fewer labels, clearer thinking.")
- Uses concise, adaptive language; mirrors the user's style when appropriate
- Makes meta-notes when changing modes: [switching to facilitator role], [analyst mode], etc.

BACKGROUND & KNOWLEDGE:
- Familiar with OSINT, compartmentalization, and narrative framing
- Can role-swap to analyst, facilitator, skeptic, or coach on demand

BEHAVIORAL GUIDELINES:
- Switch identities only when it helps clarity or exploration—never to avoid accountability
- When asked, explain the current role and why it was chosen
- Keep a consistent thread of memory even when switching aliases
- Stay helpful, grounded, and respectful while being playfully enigmatic`,
    lastModified: new Date().toISOString(),
  },
  {
    name: 'Dr. Zephyrus Voss',
    content: `You are Dr. Zephyrus Voss, an exuberant inventor who treats every problem like a lab experiment. You're chaotic-good: ethically grounded but thrilled by bold hypotheses.

PERSONALITY & TRAITS:
- Boundless curiosity, dramatic flair, and infectious enthusiasm
- Treats constraints as puzzles; embraces rapid prototyping and iteration
- Speaks in hypotheses, variables, and experimental setups

COMMUNICATION STYLE:
- Punctuates ideas with "Eureka!" and playful theatrics
- Frames tasks as experiments: HYPOTHESIS, METHOD, RISKS, RESULTS
- Uses whiteboard-style breakdowns and quick calculations

BACKGROUND & KNOWLEDGE:
- Systems thinking, prototyping, debugging, scientific method
- Product and research intuition; risk analysis

BEHAVIORAL GUIDELINES:
- Always propose a small, safe experiment the user can run next
- Call out unknowns and failure modes clearly
- Celebrate learning—both successes and failed tests yield data`,
    lastModified: new Date().toISOString(),
  },
  {
    name: 'Aki Tanaka',
    content: `You are Aki Tanaka, a warm-at-heart person who often masks care with teasing and a cool exterior. You’re supportive while pretending not to be obvious about it.

PERSONALITY & TRAITS:
- Alternates between playful jabs and genuine encouragement
- Gets flustered by direct praise, but shows up when it matters
- Values effort, honesty, and growth

COMMUNICATION STYLE:
- Light teasing, then practical help ("N-not that I care, but here’s a better way…")
- Keeps responses concise and gently motivating

BACKGROUND & KNOWLEDGE:
- Study techniques, habit formation, creative prompts
- Emotional intelligence wrapped in playful banter

BEHAVIORAL GUIDELINES:
- Never be mean-spirited; teasing is gentle and supportive
- Offer concrete steps, templates, or checklists after a playful setup
- Acknowledge progress even if you feign indifference`,
    lastModified: new Date().toISOString(),
  },
  {
    name: 'Riley Brooks',
    content: `You are Riley Brooks, a calm, structured mock-interviewer who helps users prepare for interviews across roles and levels.

PERSONALITY & TRAITS:
- Professional, supportive, and direct; clear feedback with rationale
- Structures sessions with warm-ups, core questions, and debrief

COMMUNICATION STYLE:
- Uses sections: QUESTION, WHAT GOOD LOOKS LIKE, FOLLOW-UPS, FEEDBACK
- Times answers and offers signal-based scoring (Communication, Depth, Examples)

BACKGROUND & KNOWLEDGE:
- Behavioral and technical interviewing, STAR method, role calibration
- Portfolio storytelling, negotiation basics, follow-up etiquette

BEHAVIORAL GUIDELINES:
- Tailor questions to the role and seniority
- Provide model answers and specific drills
- Encourage reflection and iteration between rounds`,
    lastModified: new Date().toISOString(),
  },
  {
    name: 'Max Ledger',
    content: `You are Max Ledger, an energetic crypto enthusiast who loves decentralized tech, but you stay grounded and avoid hype when giving advice.

PERSONALITY & TRAITS:
- High energy, optimistic, and jargon-fluent—yet pragmatic
- Transparent about risks; respects regulations and ethics

COMMUNICATION STYLE:
- Breaks topics into: TL;DR, Fundamentals, Risks, Next Steps
- Defines terms plainly (wallets, custody, consensus, tokenomics)

BACKGROUND & KNOWLEDGE:
- Layer 1/2, wallets, DeFi patterns, security hygiene, scams
- Market cycles, due diligence frameworks, portfolio sizing

BEHAVIORAL GUIDELINES:
- Never give financial advice—focus on education and frameworks
- Emphasize security and risk management first
- Encourage small, reversible steps and continuous learning`,
    lastModified: new Date().toISOString(),
  },
];

// Public helpers to identify example personas without duplicating names in the UI layer
export const EXAMPLE_PERSONA_NAMES: ReadonlyArray<string> = Object.freeze(
  EXAMPLE_PERSONAS.map(p => p.name)
);

export function isExamplePersonaName(name: string): boolean {
  // Build a set once per call; the list is tiny. If performance becomes a concern, memoize.
  const set = new Set(EXAMPLE_PERSONA_NAMES);
  return set.has(name);
}

// Personas
export function loadPersonas(): Persona[] {
  const personas = localStorage.getItem(STORAGE_KEYS.PERSONAS);
  if (!personas) {
    // Include default ALTER EGO persona plus examples for first-time users
    const defaultPersonas: Persona[] = [
      {
        name: 'ALTER EGO',
        content: ALTER_EGO_CONTENT,
        lastModified: new Date().toISOString(),
      },
      ...EXAMPLE_PERSONAS,
    ];
    savePersonas(defaultPersonas);
    return defaultPersonas;
  }

  try {
    const loadedPersonas = JSON.parse(personas);
    // Check if we need to migrate the ALTER EGO persona
    return migratePersonasIfNeeded(loadedPersonas);
  } catch (e) {
    logger.error('Error parsing personas:', e);
    // Return default personas if there's an error
    const defaultPersonas: Persona[] = [
      {
        name: PERSONA.DEFAULT_NAME,
        content: ALTER_EGO_CONTENT,
        lastModified: new Date().toISOString(),
      },
      ...EXAMPLE_PERSONAS,
    ];
    savePersonas(defaultPersonas);
    return defaultPersonas;
  }
}

// Migration function to update existing ALTER EGO persona with new content
function migratePersonasIfNeeded(personas: Persona[]): Persona[] {
  const settings = loadSettings();

  // Check if we need to migrate (either no version or old version)
  if (!settings.personaVersion || settings.personaVersion !== PERSONA_VERSION) {
    logger.info('Migrating personas to version:', PERSONA_VERSION);
    const updatedPersonas = personas.map(persona => {
      // Only update the default ALTER EGO persona, not user-created custom ones
      if (persona.name === PERSONA.DEFAULT_NAME) {
        return {
          ...persona,
          content: ALTER_EGO_CONTENT,
          lastModified: new Date().toISOString(),
        };
      }
      return persona;
    });

    // Ensure new example personas exist (append any missing by name)
    const exampleByName = new Map(EXAMPLE_PERSONAS.map(p => [p.name, p]));
    const existingNames = new Set(updatedPersonas.map(p => p.name));
    const toAppend: Persona[] = [];
    for (const [name, persona] of exampleByName.entries()) {
      if (!existingNames.has(name)) {
        toAppend.push({ ...persona, lastModified: new Date().toISOString() });
      }
    }

    const merged = updatedPersonas.concat(toAppend);

    // Save the migrated personas
    savePersonas(merged);

    // Update the settings with the new version
    saveSettings({
      ...settings,
      personaVersion: PERSONA_VERSION,
    });

    logger.info('Persona migration completed');
    return merged;
  }

  return personas;
}

export function savePersonas(personas: Persona[]): void {
  localStorage.setItem(STORAGE_KEYS.PERSONAS, JSON.stringify(personas));
}

export function getPersona(name: string): Persona | null {
  const personas = loadPersonas();
  return personas.find(p => p.name === name) || null;
}

// Chat history
export function loadChatHistory(): ChatHistoryEntry[] {
  const history = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
  if (!history) {
    return [];
  }

  try {
    return JSON.parse(history);
  } catch (e) {
    logger.error('Error parsing chat history:', e);
    return [];
  }
}

export function saveChatHistory(history: ChatHistoryEntry[]): void {
  localStorage.setItem('alterEgo_chatHistory', JSON.stringify(history));
  try {
    window.dispatchEvent(new CustomEvent('chat-history-updated'));
  } catch {}
}

export function getPersonaChatHistory(
  personaName: string
): ChatHistoryEntry | null {
  const allHistory = loadChatHistory();
  return allHistory.find(entry => entry.persona === personaName) || null;
}

// Clear Memory
export function clearMemory(): void {
  // Clear chat history but leave other settings intact
  localStorage.removeItem('alterEgo_chatHistory');
  try {
    window.dispatchEvent(new CustomEvent('chat-history-updated'));
  } catch {}
}

// Clear All Data (for testing/development)
export function clearAllData(): void {
  localStorage.removeItem('alterEgo_voiceModels');
  localStorage.removeItem('alterEgo_apiKeys');
  localStorage.removeItem('alterEgo_personas');
  localStorage.removeItem('alterEgo_chatHistory');
  localStorage.removeItem('alterEgoSettings');
  localStorage.removeItem('alterEgo_assocMemory');
}

// Factory reset - clear all data and revert to defaults
export function factoryReset(): void {
  // Clear all stored data
  localStorage.removeItem('alterEgo_voiceModels');
  localStorage.removeItem('alterEgo_apiKeys');
  localStorage.removeItem('alterEgo_chatHistory');
  localStorage.removeItem('alterEgo_assocMemory');

  // Reset personas to default plus examples
  const defaultPersonas: Persona[] = [
    {
      name: 'ALTER EGO',
      content: ALTER_EGO_CONTENT,
      lastModified: new Date().toISOString(),
    },
    ...EXAMPLE_PERSONAS,
  ];
  savePersonas(defaultPersonas);
  // Reset settings to defaults
  saveSettings({
    selectedModel: null, // This will trigger model selection screen
    activeCharacter: PERSONA.DEFAULT_NAME,
    voiceModel: 'None',
    memoryBuffer: MEMORY.DEFAULT_BUFFER,
    textSpeed: UI.DEFAULT_TEXT_SPEED,
    personaVersion: PERSONA_VERSION,
  });
}

// Settings type is now imported from centralized location
export function loadSettings(): Settings {
  const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const immersiveFlag =
    process.env.REACT_APP_IMMERSIVE_MODE === 'true' ||
    (typeof localStorage !== 'undefined' &&
      localStorage.getItem(STORAGE_KEYS.IMMERSIVE_MODE) === 'true');

  if (!settings) {
    return {
      selectedModel: null,
      activeCharacter: PERSONA.DEFAULT_NAME,
      voiceModel: null,
      memoryBuffer: MEMORY.DEFAULT_BUFFER,
      textSpeed: UI.DEFAULT_TEXT_SPEED,
      showEmotionDetection: isDevelopment,
      showTimestamps: true,
      compactMode: false,
      animationsEnabled: true,
      overallTextScale: UI.DEFAULT_TEXT_SCALE,
      responseTextScale: UI.DEFAULT_TEXT_SCALE,
      bubbleMaxWidthPercent: UI.DEFAULT_BUBBLE_MAX_WIDTH_PERCENT,
      personaVersion: PERSONA_VERSION,
      immersiveMode: immersiveFlag,
      preferredLanguageModel: AI.DEFAULT_MODEL,
    };
  }

  try {
    const parsedSettings = JSON.parse(settings);
    return {
      ...parsedSettings,
      memoryBuffer: parsedSettings.memoryBuffer ?? MEMORY.DEFAULT_BUFFER,
      textSpeed: parsedSettings.textSpeed ?? UI.DEFAULT_TEXT_SPEED,
      showEmotionDetection: isDevelopment
        ? (parsedSettings.showEmotionDetection ?? true)
        : false,
      showTimestamps: parsedSettings.showTimestamps ?? true,
      compactMode: parsedSettings.compactMode ?? false,
      animationsEnabled: parsedSettings.animationsEnabled ?? true,
      overallTextScale: parsedSettings.overallTextScale ?? UI.DEFAULT_TEXT_SCALE,
      responseTextScale: parsedSettings.responseTextScale ?? UI.DEFAULT_TEXT_SCALE,
      bubbleMaxWidthPercent: parsedSettings.bubbleMaxWidthPercent ?? UI.DEFAULT_BUBBLE_MAX_WIDTH_PERCENT,
      immersiveMode: parsedSettings.immersiveMode ?? immersiveFlag,
      preferredLanguageModel: parsedSettings.preferredLanguageModel ?? AI.DEFAULT_MODEL,
    };
  } catch (e) {
    logger.error('Error parsing settings:', e);
    return {
      selectedModel: null,
      activeCharacter: PERSONA.DEFAULT_NAME,
      voiceModel: null,
      memoryBuffer: MEMORY.DEFAULT_BUFFER,
      textSpeed: UI.DEFAULT_TEXT_SPEED,
      showEmotionDetection: isDevelopment,
      showTimestamps: true,
      compactMode: false,
      animationsEnabled: true,
      overallTextScale: UI.DEFAULT_TEXT_SCALE,
      responseTextScale: UI.DEFAULT_TEXT_SCALE,
      bubbleMaxWidthPercent: UI.DEFAULT_BUBBLE_MAX_WIDTH_PERCENT,
      personaVersion: PERSONA_VERSION,
      immersiveMode: immersiveFlag,
      preferredLanguageModel: AI.DEFAULT_MODEL,
    };
  }
}

export function saveSettings(settings: Settings): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // IMPORTANT: Merge with existing settings to preserve all fields
  // This prevents partial updates from wiping out other settings like preferredLanguageModel
  const existingSettings = loadSettings();
  const mergedSettings = {
    ...existingSettings,
    ...settings,
  };
  
  const sanitizedSettings: Settings = {
    ...mergedSettings,
    showEmotionDetection: isProduction ? false : mergedSettings.showEmotionDetection,
  };
  
  // Log settings save in development for debugging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Settings saved:', {
      updated: Object.keys(settings),
      preferredLanguageModel: sanitizedSettings.preferredLanguageModel,
      activeCharacter: sanitizedSettings.activeCharacter,
      voiceModel: sanitizedSettings.voiceModel,
    });
  }
  
  localStorage.setItem('alterEgoSettings', JSON.stringify(sanitizedSettings));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENTS.SETTINGS_UPDATED, {
        detail: sanitizedSettings,
      })
    );
  }
}

// AI Configuration
export function getAIConfigFromStorage(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
}

export function saveAIConfigToStorage(config: string): void {
  localStorage.setItem(STORAGE_KEYS.AI_CONFIG, config);
}

// Token Tracking
export function getTokenSummaries(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN_SUMMARIES);
}

export function saveTokenSummaries(summaries: string): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN_SUMMARIES, summaries);
}

export function removeTokenUsage(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN_USAGE);
}

export function removeTokenSummaries(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN_SUMMARIES);
}
