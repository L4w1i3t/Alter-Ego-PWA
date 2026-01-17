/**
 * Legacy type definitions for backward compatibility
 * These types represent the old database schema format
 */

// Old Message format from database (before migration)
export interface LegacyMessage {
  id?: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Conversion utilities
import type { Message } from './message';

export function legacyToMessage(legacy: LegacyMessage): Message {
  return {
    id: legacy.id,
    role: legacy.isUser ? 'user' : 'assistant',
    content: legacy.text,
    timestamp: legacy.timestamp instanceof Date 
      ? legacy.timestamp.toISOString() 
      : new Date(legacy.timestamp).toISOString(),
  };
}

export function messageToLegacy(message: Message): LegacyMessage {
  return {
    id: message.id,
    text: message.content,
    isUser: message.role === 'user',
    timestamp: message.timestamp 
      ? new Date(message.timestamp) 
      : new Date(),
  };
}
