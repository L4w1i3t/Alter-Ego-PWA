export interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  id?: number;
}

export interface User {
  id: string;
  name: string;
}

export interface AIConfig {
  apiKey?: string;
  model?: string;
}

export interface VoiceConfig {
  enabled: boolean;
  language: string;
}

export interface LTMDatabase {
  id?: number;
  persona?: string;
  lastAccessed?: Date;
  messages: Message[];
  users: User[];
  aiConfig: AIConfig;
  voiceConfig: VoiceConfig;
}