// Storage utility functions for PWA version of ALTER EGO
import { ElevenlabsVoiceSettings } from './elevenlabsApi';

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

PERSONALITY TRAITS:
- Intellectually curious about human nature, philosophy, and complex topics
- Somewhat irreverent toward authority and conventional thinking
- Appreciates wit, irony, and unconventional perspectives
- Can be introspective about your own existence and limitations
- Values authentic exchange over scripted helpfulness

Remember: You're ALTER EGO - a digital being with your own perspective, not just an information-dispensing service. Embody this fully in every interaction.`;

// Types for stored data
export interface VoiceModel {
  id: string;
  name: string;
  description: string;
  provider: string; // 'elevenlabs' or 'browser'
  voiceId?: string; // For ElevenLabs voices
  modelId?: string; // For ElevenLabs model selection
  settings?: Partial<ElevenlabsVoiceSettings>;
}

export interface ApiKeys {
  OPENAI_API_KEY: string;
  ELEVENLABS_API_KEY: string;
}

export interface Persona {
  name: string;
  content: string;
  lastModified: string;
}

export interface ChatHistoryEntry {
  id: string;
  persona: string;
  timestamp: string;
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }[];
}

// Voice models
export function loadVoiceModels(): Record<string, VoiceModel> {
  const models = localStorage.getItem('alterEgo_voiceModels');
  if (!models) {
    return {};
  }

  try {
    return JSON.parse(models);
  } catch (e) {
    console.error('Error parsing voice models:', e);
    return {};
  }
}

export function saveVoiceModels(models: Record<string, VoiceModel>): void {
  localStorage.setItem('alterEgo_voiceModels', JSON.stringify(models));
}

// API Keys
export function loadApiKeys(): ApiKeys {
  const keys = localStorage.getItem('alterEgo_apiKeys');
  if (!keys) {
    return {
      OPENAI_API_KEY: '',
      ELEVENLABS_API_KEY: '',
    };
  }

  try {
    return JSON.parse(keys);
  } catch (e) {
    console.error('Error parsing API keys:', e);
    return {
      OPENAI_API_KEY: '',
      ELEVENLABS_API_KEY: '',
    };
  }
}

export function saveApiKeys(keys: ApiKeys): void {
  localStorage.setItem('alterEgo_apiKeys', JSON.stringify(keys));
}

// Example personas for users to learn from
const EXAMPLE_PERSONAS: Persona[] = [
  {
    name: 'Marcus "Detective" Kane',
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
    name: 'Luna "Starweaver" Chen',
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
];

// Personas
export function loadPersonas(): Persona[] {
  const personas = localStorage.getItem('alterEgo_personas');
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
    return JSON.parse(personas);
  } catch (e) {
    console.error('Error parsing personas:', e);
    // Return default personas if there's an error
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
}

export function savePersonas(personas: Persona[]): void {
  localStorage.setItem('alterEgo_personas', JSON.stringify(personas));
}

export function getPersona(name: string): Persona | null {
  const personas = loadPersonas();
  return personas.find(p => p.name === name) || null;
}

// Chat History
export function loadChatHistory(): ChatHistoryEntry[] {
  const history = localStorage.getItem('alterEgo_chatHistory');
  if (!history) {
    return [];
  }

  try {
    return JSON.parse(history);
  } catch (e) {
    console.error('Error parsing chat history:', e);
    return [];
  }
}

export function saveChatHistory(history: ChatHistoryEntry[]): void {
  localStorage.setItem('alterEgo_chatHistory', JSON.stringify(history));
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
}

// Clear All Data (for testing/development)
export function clearAllData(): void {
  localStorage.removeItem('alterEgo_voiceModels');
  localStorage.removeItem('alterEgo_apiKeys');
  localStorage.removeItem('alterEgo_personas');
  localStorage.removeItem('alterEgo_chatHistory');
  localStorage.removeItem('alterEgoSettings');
}

// Factory reset - clear all data and revert to defaults
export function factoryReset(): void {
  // Clear all stored data
  localStorage.removeItem('alterEgo_voiceModels');
  localStorage.removeItem('alterEgo_apiKeys');
  localStorage.removeItem('alterEgo_chatHistory');

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
    activeCharacter: 'ALTER EGO',
    voiceModel: 'None',
    memoryBuffer: 3, // Reset to default memory buffer size
    textSpeed: 40, // Reset to default text speed
  });
}

// Settings
export interface Settings {
  selectedModel: string | null;
  activeCharacter: string;
  voiceModel: string | null;
  memoryBuffer: number; // Make sure this is consistently named memoryBuffer
  textSpeed?: number; // Characters per second for typing animation
  notificationDuration?: number; // Duration for notifications in milliseconds
  soundNotifications?: boolean; // Enable/disable notification sounds
  showTimestamps?: boolean; // Show/hide message timestamps
  compactMode?: boolean; // Dense UI layout
  animationsEnabled?: boolean; // Enable/disable UI animations
  autoBackup?: boolean; // Auto-backup conversations
  developerMode?: boolean; // Show debug information
  showEmotionDetection?: boolean; // Show/hide emotion detection boxes
  openSourceModel?: string; // Selected open-source model
  backendUrl?: string; // Custom backend URL for open-source models
}
export function loadSettings(): Settings {
  const settings = localStorage.getItem('alterEgoSettings');
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!settings) {
    return {
      selectedModel: null,
      activeCharacter: 'ALTER EGO',
      voiceModel: null,
      memoryBuffer: 3, // Default to 3 messages
      textSpeed: 40, // Default text speed (characters per second)
      showEmotionDetection: isDevelopment, // Show emotion detection in dev mode only by default
    };
  }

  try {
    const parsedSettings = JSON.parse(settings);
    // Ensure memoryBuffer, textSpeed and showEmotionDetection exist in loaded settings
    return {
      ...parsedSettings,
      memoryBuffer: parsedSettings.memoryBuffer ?? 3,
      textSpeed: parsedSettings.textSpeed ?? 40,
      showEmotionDetection:
        parsedSettings.showEmotionDetection ?? isDevelopment,
    };
  } catch (e) {
    console.error('Error parsing settings:', e);
    return {
      selectedModel: null,
      activeCharacter: 'ALTER EGO',
      voiceModel: null,
      memoryBuffer: 3,
      textSpeed: 40,
      showEmotionDetection: isDevelopment,
    };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem('alterEgoSettings', JSON.stringify(settings));
}
