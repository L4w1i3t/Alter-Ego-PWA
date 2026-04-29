/**
 * Configuration-related type definitions
 */

import { ElevenlabsVoiceSettings } from '../utils/elevenlabsApi';

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export type AIProvider = 'openai' | 'openrouter' | 'ollama';
export type OpenRouterDataCollection = 'allow' | 'deny';

export interface VoiceConfig {
  enabled: boolean;
  language: string;
}

export interface VoiceModel {
  id: string;
  name: string;
  description: string;
  provider: string; // 'elevenlabs' or 'browser'
  voiceId?: string; // For ElevenLabs voices
  modelId?: string; // For ElevenLabs model selection
  settings?: Partial<ElevenlabsVoiceSettings>;
}

export interface Settings {
  selectedModel: string | null;
  aiProvider?: AIProvider; // Active chat provider; selectedModel is legacy.
  activeCharacter: string;
  voiceModel: string | null;
  memoryBuffer: number;
  textSpeed?: number; // Characters per second for typing animation
  // UI/UX toggles and presentation
  notificationDuration?: number; // Duration for notifications in milliseconds
  soundNotifications?: boolean; // Enable/disable notification sounds
  showTimestamps?: boolean; // Show/hide message timestamps
  compactMode?: boolean; // Dense UI layout
  animationsEnabled?: boolean; // Enable/disable UI animations
  immersiveMode?: boolean; // Enable immersive mode devtools warnings
  autoBackup?: boolean; // Auto-backup conversations
  developerMode?: boolean; // Show debug information
  showEmotionDetection?: boolean; // Show/hide emotion detection boxes
  openSourceModel?: string; // Selected open-source model
  backendUrl?: string; // Custom backend URL for open-source models
  personaVersion?: string; // Track persona definition version for migrations
  preferredLanguageModel?: string; // User's preferred OpenAI language model
  openRouterModel?: string; // User's preferred OpenRouter OpenAI model id
  openRouterFallbackModels?: string; // Comma-separated OpenRouter OpenAI fallback model ids
  openRouterByokOptimized?: boolean; // Prefer BYOK-aware OpenRouter routing
  openRouterProviderOrder?: string; // Comma-separated OpenRouter provider slugs
  openRouterOnlyProviders?: string; // Comma-separated provider allow-list
  openRouterAllowFallbacks?: boolean; // Allow OpenRouter shared-capacity fallbacks
  openRouterRequireParameters?: boolean; // Require provider support for all request params
  openRouterDataCollection?: OpenRouterDataCollection; // OpenRouter provider data policy
  openRouterZdr?: boolean; // Require zero-data-retention endpoints
  ollamaModel?: string; // User's preferred local Ollama model id
  ollamaBaseUrl?: string; // Ollama server URL
  hasCompletedFirstStartup?: boolean; // Controls the one-time splash screen
  // Presentation controls
  overallTextScale?: number; // Global font scale (1 = 100%)
  responseTextScale?: number; // Chat message font scale (used only if overallTextScale === 1)
  bubbleMaxWidthPercent?: number; // Max width of chat bubbles (percentage 50-90)
  // Autonomy (Electron-only: AI-initiated messages)
  autonomyEnabled?: boolean; // Allow the AI to send messages proactively
  autonomyIntervalMinutes?: number; // Base interval between autonomous messages (minutes)
  autonomyNotifications?: boolean; // Show OS push notifications for autonomous messages
  // LAN Peer-to-Peer (Electron-only: two ALTER EGO instances chat over the local network)
  lanEnabled?: boolean; // Enable LAN discovery and peer connections
  lanAutoConnect?: boolean; // Automatically connect to the first discovered peer
  lanUnlimitedTurns?: boolean; // If true, ignore turn limit (chat until disconnect)
}
