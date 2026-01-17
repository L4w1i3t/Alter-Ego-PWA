/**
 * Configuration-related type definitions
 */

import { ElevenlabsVoiceSettings } from '../utils/elevenlabsApi';

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

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
  // Presentation controls
  overallTextScale?: number; // Global font scale (1 = 100%)
  responseTextScale?: number; // Chat message font scale (used only if overallTextScale === 1)
  bubbleMaxWidthPercent?: number; // Max width of chat bubbles (percentage 50-90)
}
