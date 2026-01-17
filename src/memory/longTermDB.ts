// Uses dexie for long-term storage
// This module maintains the legacy LongTermMemoryDB for backward compatibility
// while the new consolidated AlterEgoMemoryDB handles associations.
import Dexie from 'dexie';
import type { Message, User, AIConfig, VoiceConfig, LTMDatabase } from '../types';
import type { LegacyMessage } from '../types/legacy';
import { legacyToMessage, messageToLegacy } from '../types/legacy';
import { logger } from '../utils/logger';

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface MessageQueryOptions {
  offset?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  role?: 'user' | 'assistant' | 'system';
}

// Create a new Dexie database instance
const db = new Dexie('LongTermMemoryDB');

// Version 1: Old schema with text/isUser
db.version(1).stores({
  messages: '++id, text, isUser, timestamp',
  users: '++id, name',
  aiConfig: '++id, apiKey, model',
  voiceConfig: '++id, enabled, language',
  ltmDatabase: '++id, persona, lastAccessed',
});

// Version 2: New schema with role/content
db.version(2).stores({
  messages: '++id, role, content, timestamp',
  users: '++id, name',
  aiConfig: '++id, model, temperature, maxTokens',
  voiceConfig: '++id, enabled, language',
  ltmDatabase: '++id, persona, lastAccessed',
}).upgrade(async (trans) => {
  // Migrate old messages to new format
  const oldMessages = await trans.table('messages').toArray();
  await trans.table('messages').clear();
  
  for (const oldMsg of oldMessages) {
    const legacyMsg = oldMsg as any as LegacyMessage;
    const newMsg = legacyToMessage(legacyMsg);
    await trans.table('messages').add(newMsg);
  }
});

// Define the database tables
export const messagesTable = db.table<Message>('messages');
export const usersTable = db.table<User>('users');
export const aiConfigTable = db.table<AIConfig>('aiConfig');
export const voiceConfigTable = db.table<VoiceConfig>('voiceConfig');
export const ltmDatabase = db.table<LTMDatabase>('ltmDatabase');

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
};

const normalizeMessageTimestamp = (message: Message): Date => {
  if (message.timestamp) {
    return toDate(message.timestamp) ?? new Date(0);
  }
  return new Date(0);
};

const getMessageKey = (message: Message, index: number): string => {
  if (typeof message.id === 'number' && Number.isFinite(message.id)) {
    return `id:${message.id}`;
  }
  if (message.timestamp) {
    const ts = toDate(message.timestamp);
    if (ts) {
      return `ts:${ts.getTime()}:${index}`;
    }
  }
  return `idx:${index}`;
};

const RECENCY_WINDOW_DAYS = 30;

// ============================================================================
// MESSAGE OPERATIONS WITH PAGINATION
// ============================================================================

// Function to add a message to the database
export async function addMessage(message: Message): Promise<number> {
  const id = await messagesTable.add(message);
  return id as number;
}

/**
 * Get all messages (legacy function - use getMessagesPaginated for large datasets).
 * @deprecated Prefer getMessagesPaginated for large message histories.
 */
export async function getMessages(): Promise<Message[]> {
  return (await messagesTable.toArray()) as Message[];
}

/**
 * Get messages with pagination support.
 * More efficient for large message histories.
 */
export async function getMessagesPaginated(
  options: MessageQueryOptions = {}
): Promise<PaginatedResult<Message>> {
  const { offset = 0, limit = 50, startDate, endDate, role } = options;
  
  let collection = messagesTable.orderBy('timestamp');
  
  // Get total count
  const total = await messagesTable.count();
  
  // Apply pagination
  let items = await collection
    .reverse() // Most recent first
    .offset(offset)
    .limit(limit)
    .toArray();
  
  // Apply filters in memory (Dexie limitations on compound queries)
  if (startDate || endDate || role) {
    items = items.filter(msg => {
      if (role && msg.role !== role) return false;
      const msgDate = toDate(msg.timestamp);
      if (startDate && msgDate && msgDate < startDate) return false;
      if (endDate && msgDate && msgDate > endDate) return false;
      return true;
    });
  }
  
  return {
    items,
    total,
    offset,
    limit,
    hasMore: offset + items.length < total,
  };
}

export async function getMessageById(id: number): Promise<Message | undefined> {
  return (await messagesTable.get(id)) as Message | undefined;
}

export async function updateMessage(
  id: number,
  message: Partial<Message>
): Promise<void> {
  await messagesTable.update(id, message);
}

export async function deleteMessage(id: number): Promise<void> {
  await messagesTable.delete(id);
}

export async function clearMessages(): Promise<void> {
  await messagesTable.clear();
}

// User operations
export async function addUser(user: User): Promise<number> {
  const id = await usersTable.add(user);
  return id as number;
}

export async function getUsers(): Promise<User[]> {
  return (await usersTable.toArray()) as User[];
}

export async function getUserById(id: number): Promise<User | undefined> {
  return (await usersTable.get(id)) as User | undefined;
}

export async function updateUser(
  id: number,
  user: Partial<User>
): Promise<void> {
  await usersTable.update(id, user);
}

export async function deleteUser(id: number): Promise<void> {
  await usersTable.delete(id);
}

export async function clearUsers(): Promise<void> {
  await usersTable.clear();
}

// AI Config operations
export async function saveAIConfig(config: AIConfig): Promise<number> {
  // Clear existing configs first (we typically only want one active)
  await aiConfigTable.clear();
  const id = await aiConfigTable.add(config);
  return id as number;
}

export async function getAIConfig(): Promise<AIConfig | undefined> {
  const configs = await aiConfigTable.toArray();
  return configs[0];
}

export async function updateAIConfig(
  id: number,
  config: Partial<AIConfig>
): Promise<void> {
  await aiConfigTable.update(id, config);
}

export async function clearAIConfig(): Promise<void> {
  await aiConfigTable.clear();
}

// Voice Config operations
export async function saveVoiceConfig(config: VoiceConfig): Promise<number> {
  // Clear existing configs first (we typically only want one active)
  await voiceConfigTable.clear();
  const id = await voiceConfigTable.add(config);
  return id as number;
}

export async function getVoiceConfig(): Promise<VoiceConfig | undefined> {
  const configs = await voiceConfigTable.toArray();
  return configs[0];
}

export async function updateVoiceConfig(
  id: number,
  config: Partial<VoiceConfig>
): Promise<void> {
  await voiceConfigTable.update(id, config);
}

export async function clearVoiceConfig(): Promise<void> {
  await voiceConfigTable.clear();
}

// ============================================================================
// PAGINATED PERSONA MEMORY RETRIEVAL
// ============================================================================

/**
 * Get paginated messages for a persona.
 * More memory-efficient than loading all messages at once.
 */
export async function getPersonaMessagesPaginated(
  personaName: string,
  options: MessageQueryOptions = {}
): Promise<PaginatedResult<Message>> {
  const { offset = 0, limit = 50, startDate, endDate, role } = options;
  
  try {
    const ltm = await getPersonaMemory(personaName);
    if (!ltm || !ltm.messages || ltm.messages.length === 0) {
      return { items: [], total: 0, offset, limit, hasMore: false };
    }
    
    // Sort messages by timestamp (most recent first)
    let messages = [...ltm.messages].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });
    
    // Apply filters
    if (startDate || endDate || role) {
      messages = messages.filter(msg => {
        if (role && msg.role !== role) return false;
        const msgDate = msg.timestamp ? new Date(msg.timestamp) : null;
        if (startDate && msgDate && msgDate < startDate) return false;
        if (endDate && msgDate && msgDate > endDate) return false;
        return true;
      });
    }
    
    const total = messages.length;
    const items = messages.slice(offset, offset + limit);
    
    return {
      items,
      total,
      offset,
      limit,
      hasMore: offset + items.length < total,
    };
  } catch (error) {
    logger.error('Error in paginated persona messages:', error);
    return { items: [], total: 0, offset, limit, hasMore: false };
  }
}

/**
 * Get the total message count for a persona without loading all messages.
 */
export async function getPersonaMessageCount(personaName: string): Promise<number> {
  try {
    const ltm = await getPersonaMemory(personaName);
    return ltm?.messages?.length ?? 0;
  } catch {
    return 0;
  }
}

// Memory retrieval operations
export async function getMessagesByTimeRange(
  startDate: Date,
  endDate: Date,
  personaName: string
): Promise<Message[]> {
  try {
    // Get all messages for this persona
    const ltm = await getPersonaMemory(personaName);
    if (!ltm || !ltm.messages || ltm.messages.length === 0) {
      return [];
    }

    // Filter messages by time range
    return ltm.messages.filter(message => {
      const msgDate = message.timestamp
        ? new Date(message.timestamp)
        : new Date();
      return msgDate >= startDate && msgDate <= endDate;
    });
  } catch (error) {
    logger.error('Error in time range search:', error);
    return [];
  }
}

export async function getLastNMessages(
  n: number,
  personaName: string
): Promise<Message[]> {
  try {
    // Get all messages for this persona
    const ltm = await getPersonaMemory(personaName);
    if (!ltm || !ltm.messages || ltm.messages.length === 0) {
      return [];
    }

    // Sort by timestamp (descending) and take the last N
    return [...ltm.messages]
      .sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, n);
  } catch (error) {
    logger.error('Error retrieving last N messages:', error);
    return [];
  }
}

// Simple keyword search (updated to be persona-aware)
export async function searchMessages(
  query: string,
  personaName: string
): Promise<Message[]> {
  try {
    // Get all messages for this persona
    const ltm = await getPersonaMemory(personaName);
    if (!ltm || !ltm.messages || ltm.messages.length === 0) {
      return [];
    }

    // Filter messages by keyword match
    const matchingMessages = ltm.messages.filter(message =>
      message.content.toLowerCase().includes(query.toLowerCase())
    );

    return matchingMessages;
  } catch (error) {
    logger.error('Error in keyword search:', error);
    return [];
  }
}

// Advanced semantic search implementation
export async function semanticSearchMessages(
  query: string,
  personaName: string,
  excludeIds: number[] = [],
  maxResults: number = 5
): Promise<Message[]> {
  try {
    const ltm = await getPersonaMemory(personaName);
    if (!ltm || !ltm.messages || ltm.messages.length === 0) {
      return [];
    }

    const allMessages = ltm.messages.filter(
      msg => !msg.id || !excludeIds.includes(msg.id)
    );

    if (allMessages.length === 0) return [];

    const sortedMessages = allMessages.slice().sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateA - dateB;
    });

    const keywords = extractKeywords(query);

    const scored = sortedMessages.map((message, index) => ({
      message,
      index,
      score: calculateSemanticSimilarity(
        message.content,
        keywords,
        query,
        message.timestamp
      ),
    }));

    const relevant = scored
      .filter(item => item.score > 0.2)
      .sort((a, b) => b.score - a.score);

    if (relevant.length === 0) {
      return [];
    }

    const maxPrimary = Math.max(1, maxResults);
    const selected: { message: Message; index: number }[] = [];
    const usedIndices = new Set<number>();

    const addIndex = (idx: number) => {
      if (idx < 0 || idx >= sortedMessages.length) return;
      if (usedIndices.has(idx)) return;
      usedIndices.add(idx);
      selected.push({ message: sortedMessages[idx], index: idx });
    };

    const addNeighborPair = (idx: number) => {
      const primary = sortedMessages[idx];
      const baseTime = primary.timestamp
        ? new Date(primary.timestamp).getTime()
        : 0;
      const NEIGHBOR_WINDOW_MINUTES = 10;
      const neighbors = [idx - 1, idx + 1];
      neighbors.forEach(neighborIdx => {
        if (neighborIdx < 0 || neighborIdx >= sortedMessages.length) return;
        if (usedIndices.has(neighborIdx)) return;
        const neighbor = sortedMessages[neighborIdx];
        // Skip if both have same role (both user or both assistant)
        if (neighbor.role === primary.role) return;
        const neighborTime = neighbor.timestamp
          ? new Date(neighbor.timestamp).getTime()
          : 0;
        const gapMinutes = Math.abs(baseTime - neighborTime) / (1000 * 60);
        if (gapMinutes > NEIGHBOR_WINDOW_MINUTES) return;
        addIndex(neighborIdx);
      });
    };

    for (const candidate of relevant.slice(0, maxPrimary)) {
      addIndex(candidate.index);
      addNeighborPair(candidate.index);
      if (selected.length >= maxPrimary * 2) {
        break;
      }
    }

    const ordered = selected
      .sort((a, b) => {
        const timeA = a.message.timestamp
          ? new Date(a.message.timestamp).getTime()
          : 0;
        const timeB = b.message.timestamp
          ? new Date(b.message.timestamp).getTime()
          : 0;
        return timeA - timeB;
      })
      .map(item => ({ ...item.message }));

    return ordered;
  } catch (error) {
    logger.error('Error in semantic search:', error);
    return [];
  }
}

// Helper function to extract keywords from a query
function extractKeywords(query: string): string[] {
  // Remove common stop words
  const stopWords = [
    'the',
    'is',
    'at',
    'which',
    'on',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'with',
    'to',
    'of',
    'for',
  ];

  // Tokenize and filter
  const words = query
    .toLowerCase()
    .replace(/[.,?!;:()[\]{}""'']/g, '') // Remove punctuation
    .split(/\s+/) // Split by whitespace
    .filter(
      word =>
        word.length > 2 && // Skip very short words
        !stopWords.includes(word) // Skip stop words
    );

  return Array.from(new Set(words)); // Remove duplicates - fixed for ES5 compatibility
}

// Helper function to calculate semantic similarity score
function calculateSemanticSimilarity(
  text: string,
  keywords: string[],
  originalQuery: string,
  timestamp?: Date | string
): number {
  const lowerText = text.toLowerCase();

  let score = 0;

  if (lowerText.includes(originalQuery.toLowerCase())) {
    score += 0.8;
  }

  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      score += 0.1;
      const position = lowerText.indexOf(keyword);
      if (position !== -1) {
        const positionScore = Math.max(0, 1 - position / lowerText.length);
        score += positionScore * 0.05;
      }
    }
  }

  const matchedKeywords = keywords.filter(kw => lowerText.includes(kw));
  const keywordDensity =
    keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
  score += keywordDensity * 0.2;

  const lengthFactor = Math.min(1, 100 / Math.max(text.length, 1));
  score += lengthFactor * 0.05;

  score += computeRecencyBoost(timestamp);

  return Math.min(1.0, score);
}

function computeRecencyBoost(timestamp?: Date | string): number {
  if (!timestamp) return 0;
  const time = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(time.getTime())) return 0;
  const ageMs = Date.now() - time.getTime();
  if (ageMs < 0) return 0;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays >= RECENCY_WINDOW_DAYS) return 0;
  const recencyRatio = (RECENCY_WINDOW_DAYS - ageDays) / RECENCY_WINDOW_DAYS;
  return recencyRatio * 0.15;
}

// Persona-specific memory operations
export async function savePersonaMemory(
  personaName: string,
  memory: LTMDatabase
): Promise<number> {
  memory.lastAccessed = new Date();
  const existingMemory = await ltmDatabase
    .where('persona')
    .equals(personaName)
    .first();

  if (existingMemory) {
    // Use explicit fields to update rather than the entire object
    await ltmDatabase.update(existingMemory.id as number, {
      messages: memory.messages,
      users: memory.users,
      aiConfig: memory.aiConfig,
      voiceConfig: memory.voiceConfig,
      lastAccessed: memory.lastAccessed,
    });
    return existingMemory.id as number;
  } else {
    const id = await ltmDatabase.add({
      ...memory,
      persona: personaName,
    });
    return id as number;
  }
}

export async function getPersonaMemory(
  personaName: string
): Promise<LTMDatabase | undefined> {
  const memory = await ltmDatabase.where('persona').equals(personaName).first();

  if (memory) {
    // Update last accessed timestamp
    await ltmDatabase.update(memory.id as number, { lastAccessed: new Date() });
  }

  return memory;
}

export async function deletePersonaMemory(personaName: string): Promise<void> {
  await ltmDatabase.where('persona').equals(personaName).delete();
}

// Database management
export async function clearAllMemory(): Promise<void> {
  await Promise.all([
    messagesTable.clear(),
    usersTable.clear(),
    aiConfigTable.clear(),
    voiceConfigTable.clear(),
    ltmDatabase.clear(),
  ]);
}

export async function exportAllMemory(): Promise<LTMDatabase[]> {
  return await ltmDatabase.toArray();
}

export async function importMemory(memories: LTMDatabase[]): Promise<void> {
  await db.transaction('rw', ltmDatabase, async () => {
    await ltmDatabase.clear();
    await ltmDatabase.bulkAdd(memories);
  });
}

/**
 * Export the entire database content for debugging
 * Returns a comprehensive object with all tables and their contents
 */
export const exportDatabaseContent = async (): Promise<Record<string, any>> => {
  try {
    const messages = await messagesTable.toArray();
    const users = await usersTable.toArray();
    const aiConfigs = await aiConfigTable.toArray();
    const voiceConfigs = await voiceConfigTable.toArray();
    const memories = await ltmDatabase.toArray();

    return {
      version: db.verno,
      lastUpdated: new Date().toISOString(),
      tables: {
        messages: {
          count: messages.length,
          data: messages,
        },
        users: {
          count: users.length,
          data: users,
        },
        aiConfig: {
          count: aiConfigs.length,
          data: aiConfigs,
        },
        voiceConfig: {
          count: voiceConfigs.length,
          data: voiceConfigs,
        },
        ltmDatabase: {
          count: memories.length,
          data: memories,
        },
      },
      summary: {
        totalEntities:
          messages.length +
          users.length +
          aiConfigs.length +
          voiceConfigs.length +
          memories.length,
        tableCount: 5,
      },
    };
  } catch (error) {
    logger.error('Error exporting database content:', error);
    return {};
  }
};
