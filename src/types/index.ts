/**
 * Centralized type definitions
 * All types are now organized by domain and re-exported here for convenience
 */

// Message types
export type { Message, MessageHistory, ChatHistoryEntry } from './message';

// Configuration types
export type { AIConfig, VoiceConfig, VoiceModel, Settings } from './config';

// Storage types
export type { ApiKeys, Persona, User } from './storage';

// Database types
export type { LTMDatabase } from './database';

// Legacy types for backward compatibility
export type { LegacyMessage } from './legacy';
export { legacyToMessage, messageToLegacy } from './legacy';
