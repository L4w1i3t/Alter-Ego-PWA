/**
 * Database-related type definitions
 */

import { Message } from './message';
import { User } from './storage';
import { AIConfig, VoiceConfig } from './config';

export interface LTMDatabase {
  id?: number;
  persona?: string;
  lastAccessed?: Date;
  messages: Message[];
  users: User[];
  aiConfig: AIConfig;
  voiceConfig: VoiceConfig;
}
