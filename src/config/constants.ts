/**
 * Centralized constants and configuration values
 */

export const APP_CONSTANTS = {
  // Memory & History
  MEMORY: {
    DEFAULT_BUFFER: 3,
    MAX_HISTORY_LENGTH: 100,
  },

  // AI Configuration
  AI: {
    DEFAULT_MODEL: 'gpt-4o-mini',
    DEFAULT_TEMPERATURE: 0.9, // Higher temperature for more creative, less robotic responses
    DEFAULT_MAX_TOKENS: 1000,
  },

  // UI/UX
  UI: {
    DEFAULT_TEXT_SPEED: 40, // Characters per second for typing animation
    DEFAULT_NOTIFICATION_DURATION: 3000, // milliseconds
    DEFAULT_TEXT_SCALE: 1, // 100%
    DEFAULT_BUBBLE_MAX_WIDTH_PERCENT: 70,
  },

  // Storage Keys
  STORAGE_KEYS: {
    API_KEYS: 'alterEgo_apiKeys',
    API_KEYS_ENCRYPTED: 'alterEgo_apiKeys_encrypted',
    VOICE_MODELS: 'alterEgo_voiceModels',
    PERSONAS: 'alterEgo_personas',
    PERSONA_VERSION: 'alterEgo_personaVersion',
    CHAT_HISTORY: 'alterEgo_chatHistory',
    SETTINGS: 'alterEgoSettings',
    IMMERSIVE_MODE: 'alterEgo_immersiveMode',
    AI_CONFIG: 'alterEgo_aiConfig',
    TOKEN_USAGE: 'alterEgo_tokenUsage',
    TOKEN_SUMMARIES: 'alterEgo_tokenSummaries',
  },

  // Persona
  PERSONA: {
    VERSION: '0.8.5',
    DEFAULT_NAME: 'ALTER EGO',
  },

  // Performance
  PERFORMANCE: {
    FPS_UPDATE_INTERVAL: 1000, // milliseconds
    MEMORY_UPDATE_INTERVAL: 1000, // milliseconds
  },

  // Custom Events
  EVENTS: {
    SETTINGS_UPDATED: 'alter-ego-settings-updated',
    PWA_INSTALL_AVAILABLE: 'pwa-install-available',
    PWA_INSTALLED: 'pwa-installed',
  },

  // Image Processing
  IMAGE: {
    MAX_SIZE_MB: 10,
    SUPPORTED_FORMATS: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
  },

  // Token Limits
  TOKENS: {
    WARNING_THRESHOLD: 8000,
    MAX_CONTEXT: 128000,
  },
} as const;

// Type-safe access to constants
export type AppConstants = typeof APP_CONSTANTS;

// Export individual constant groups for convenience
export const { MEMORY, AI, UI, STORAGE_KEYS, PERSONA, PERFORMANCE, IMAGE, TOKENS, EVENTS } = APP_CONSTANTS;
