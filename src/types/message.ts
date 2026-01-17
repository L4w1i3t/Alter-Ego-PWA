/**
 * Message-related type definitions
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  id?: number;
  images?: string[]; // Array of image URLs/data URLs
  imageIds?: string[]; // Array of cached image IDs for reference
}

export interface MessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // Array of image URLs/data URLs for vision
}

export interface ChatHistoryEntry {
  id: string;
  persona: string;
  timestamp: string;
  messages: Message[];
}
