export interface Message {
    text: string;
    isUser: boolean;
    timestamp: Date;
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