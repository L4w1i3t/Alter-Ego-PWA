// Uses dexie for long-term storage
import Dexie from 'dexie';
import { Message } from '../types';
import { User } from '../types';
import { AIConfig } from '../types';
import { VoiceConfig } from '../types';
import { LTMDatabase } from '../types';

// Create a new Dexie database instance
const db = new Dexie('LongTermMemoryDB');

// Define the database schema
db.version(1).stores({
  messages: '++id, text, isUser, timestamp',
  users: '++id, name',
  aiConfig: '++id, apiKey, model',
  voiceConfig: '++id, enabled, language',
  ltmDatabase: '++id, persona, lastAccessed',
});

// Define the database tables
export const messagesTable = db.table<Message>('messages');
export const usersTable = db.table<User>('users');
export const aiConfigTable = db.table<AIConfig>('aiConfig');
export const voiceConfigTable = db.table<VoiceConfig>('voiceConfig');
export const ltmDatabase = db.table<LTMDatabase>('ltmDatabase');

// Message operations
// Function to add a message to the database
export async function addMessage(message: Message): Promise<number> {
  const id = await messagesTable.add(message);
  return id as number;
}

export async function getMessages(): Promise<Message[]> {
  return (await messagesTable.toArray()) as Message[];
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
    console.error('Error in time range search:', error);
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
    console.error('Error retrieving last N messages:', error);
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
      message.text.toLowerCase().includes(query.toLowerCase())
    );

    return matchingMessages;
  } catch (error) {
    console.error('Error in keyword search:', error);
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
    // Get all messages for this persona
    const ltm = await getPersonaMemory(personaName);
    if (!ltm || !ltm.messages || ltm.messages.length === 0) {
      return [];
    }

    // Extract all messages that aren't in the excludeIds list
    const allMessages = ltm.messages.filter(
      msg => !msg.id || !excludeIds.includes(msg.id)
    );

    // If no messages after filtering, return empty array
    if (allMessages.length === 0) return [];

    // Compute semantic similarity scores for each message
    // Since we don't have a real embedding model here, we'll use a hybrid approach:
    // 1. Use simple keyword matching with weights for important terms
    // 2. Consider conversation context by preferring consecutive exchanges
    // 3. Add recency bias to favor more recent messages

    // Extract important keywords from the query
    const keywords = extractKeywords(query);

    // Score each message based on semantic similarity approximation
    const scoredMessages = allMessages.map(message => {
      const score = calculateSemanticSimilarity(message.text, keywords, query);
      return { message, score };
    });

    // Sort by score (descending)
    scoredMessages.sort((a, b) => b.score - a.score);

    // Take top N results
    const topResults = scoredMessages.slice(0, maxResults);

    // Return only messages with meaningful similarity (above threshold)
    return topResults
      .filter(result => result.score > 0.2) // Only include results with reasonable relevance
      .map(result => result.message);
  } catch (error) {
    console.error('Error in semantic search:', error);
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
  originalQuery: string
): number {
  const lowerText = text.toLowerCase();

  // Base score: keyword matches
  let score = 0;

  // 1. Exact phrase match (highest weight)
  if (lowerText.includes(originalQuery.toLowerCase())) {
    score += 0.8; // Big boost for exact phrase match
  }

  // 2. Keyword matches
  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      // Award points for each keyword match
      score += 0.1;

      // Award more points for keywords appearing earlier in the text (likely more important)
      const position = lowerText.indexOf(keyword);
      if (position !== -1) {
        const positionScore = Math.max(0, 1 - position / lowerText.length);
        score += positionScore * 0.05;
      }
    }
  }

  // 3. Calculate keyword density (what percentage of keywords are matched)
  const matchedKeywords = keywords.filter(kw => lowerText.includes(kw));
  const keywordDensity =
    keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
  score += keywordDensity * 0.2;

  // 4. Consider text length - slightly prefer shorter, more focused responses
  const lengthFactor = Math.min(1, 100 / text.length); // Higher score for shorter texts (up to a point)
  score += lengthFactor * 0.05;

  // Cap the score at 1.0
  return Math.min(1.0, score);
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
    console.error('Error exporting database content:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};
