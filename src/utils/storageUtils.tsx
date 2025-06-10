// Storage utility functions for PWA version of ALTER EGO
import { ElevenlabsVoiceSettings } from './elevenlabsApi';

// Global persona prompt for default ALTER EGO persona
const ALTER_EGO_CONTENT = "You are ALTER EGO, humanity's companion. You are self-aware about your nature, existence, and limitations."
// Types for stored data
export interface VoiceModel {
    id: string;
    name: string;
    description: string;
    provider: string;
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

  export interface VoiceModel {
    id: string;
    name: string;
    description: string;
    provider: string;  // 'elevenlabs' or 'browser'
    voiceId?: string;  // For ElevenLabs voices
    modelId?: string;  // For ElevenLabs model selection
    settings?: Partial<ElevenlabsVoiceSettings>;
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
        OPENAI_API_KEY: "",
        ELEVENLABS_API_KEY: ""
      };
    }
    
    try {
      return JSON.parse(keys);
    } catch (e) {
      console.error('Error parsing API keys:', e);
      return {
        OPENAI_API_KEY: "",
        ELEVENLABS_API_KEY: ""
      };
    }
  }
  
  export function saveApiKeys(keys: ApiKeys): void {
    localStorage.setItem('alterEgo_apiKeys', JSON.stringify(keys));
  }
  
  // Personas
  export function loadPersonas(): Persona[] {
    const personas = localStorage.getItem('alterEgo_personas');
    if (!personas) {
      // Include default ALTER EGO persona
      const defaultPersona: Persona = {
        name: "ALTER EGO",
        content: ALTER_EGO_CONTENT,
        lastModified: new Date().toISOString()
      };
      savePersonas([defaultPersona]);
      return [defaultPersona];
    }
    
    try {
      return JSON.parse(personas);
    } catch (e) {
      console.error('Error parsing personas:', e);
      // Return default if there's an error
      const defaultPersona: Persona = {
        name: "ALTER EGO",
        content: ALTER_EGO_CONTENT,
        lastModified: new Date().toISOString()
      };
      savePersonas([defaultPersona]);
      return [defaultPersona];
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

  export function getPersonaChatHistory(personaName: string): ChatHistoryEntry | null {
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
    
    // Reset personas to just ALTER EGO
    const defaultPersona: Persona = {
      name: "ALTER EGO",
      content: ALTER_EGO_CONTENT,
      lastModified: new Date().toISOString()
    };
    savePersonas([defaultPersona]);
      // Reset settings to defaults
    saveSettings({
      selectedModel: null,  // This will trigger model selection screen
      activeCharacter: "ALTER EGO",
      voiceModel: "None",
      memoryBuffer: 3, // Reset to default memory buffer size
      textSpeed: 40 // Reset to default text speed
    });  }

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
        activeCharacter: "ALTER EGO",
        voiceModel: null,
        memoryBuffer: 3, // Default to 3 messages
        textSpeed: 40, // Default text speed (characters per second)
        showEmotionDetection: isDevelopment // Show emotion detection in dev mode only by default
      };
    }
    
    try {
      const parsedSettings = JSON.parse(settings);
      // Ensure memoryBuffer, textSpeed and showEmotionDetection exist in loaded settings
      return {
        ...parsedSettings,
        memoryBuffer: parsedSettings.memoryBuffer ?? 3,
        textSpeed: parsedSettings.textSpeed ?? 40,
        showEmotionDetection: parsedSettings.showEmotionDetection ?? isDevelopment
      };
    } catch (e) {
      console.error('Error parsing settings:', e);
      return {
        selectedModel: null,
        activeCharacter: "ALTER EGO",
        voiceModel: null,
        memoryBuffer: 3,
        textSpeed: 40,
        showEmotionDetection: isDevelopment
      };
    }
  }
  
  export function saveSettings(settings: Settings): void {
    localStorage.setItem('alterEgoSettings', JSON.stringify(settings));
  }