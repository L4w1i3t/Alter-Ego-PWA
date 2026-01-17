/**
 * Consolidated Memory Database for ALTER EGO
 * 
 * This module provides a unified, ironclad memory system using Dexie (IndexedDB).
 * All memory types are stored in a single database with proper indexing,
 * pagination, and cognitive-inspired retrieval patterns.
 * 
 * Memory Architecture:
 * - Episodic Memory: Conversation messages with temporal context
 * - Semantic Memory: Associative facts and learned relationships
 * - Working Memory: In-memory cache for active session context
 * 
 * @module memoryDatabase
 */

import Dexie, { Table } from 'dexie';
import { logger } from '../utils/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StoredMessage {
  id?: number;
  persona: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  images?: string[];
  imageIds?: string[];
  // Cognitive metadata
  emotionalValence?: number; // -1 to 1 (negative to positive)
  importance?: number; // 0 to 1 (computed from reinforcement)
  accessCount?: number; // Times this memory was retrieved
  lastAccessed?: string;
}

export interface StoredAssociation {
  id?: number;
  persona: string;
  left: string; // e.g., "box"
  right: string; // e.g., "red"
  // Cognitive properties
  strength: number; // Base reinforcement score
  exposures: number; // Number of times reinforced
  createdAt: string;
  lastUsed: string;
  lastReinforcedAt: string;
  // Computed salience (updated on access)
  cachedSalience?: number;
  salienceUpdatedAt?: string;
}

export interface StoredPersonaState {
  id?: number;
  persona: string;
  lastAccessed: string;
  messageCount: number;
  associationCount: number;
  // Session continuity
  lastSessionId?: string;
  lastMessageTimestamp?: string;
}

export interface StoredSettings {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface MessageQuery {
  persona: string;
  offset?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  role?: 'user' | 'assistant' | 'system';
  searchTerm?: string;
}

// ============================================================================
// DATABASE DEFINITION
// ============================================================================

class AlterEgoMemoryDB extends Dexie {
  messages!: Table<StoredMessage, number>;
  associations!: Table<StoredAssociation, number>;
  personaStates!: Table<StoredPersonaState, number>;
  settings!: Table<StoredSettings, string>;

  constructor() {
    super('AlterEgoMemoryDB');

    // Version 1: Initial consolidated schema with compound indexes
    this.version(1).stores({
      // Messages: indexed by persona, timestamp, and compound for range queries
      messages: '++id, persona, timestamp, role, [persona+timestamp], [persona+role]',
      // Associations: indexed by persona, left/right tokens, compound for lookups
      associations: '++id, persona, left, right, strength, [persona+left], [persona+right], [persona+left+right]',
      // Persona states: indexed by persona name (unique)
      personaStates: '++id, &persona, lastAccessed',
      // Settings: key-value store
      settings: 'key, updatedAt',
    });
  }
}

// Singleton database instance
const db = new AlterEgoMemoryDB();

// ============================================================================
// CONSTANTS
// ============================================================================

const DECAY_HALF_LIFE_DAYS = 14;
const MAX_ASSOCIATIONS_PER_PERSONA = 200;
const MAX_SALIENCE_AGE_HOURS = 1; // Recalculate salience after 1 hour
const RECENCY_BOOST_WINDOW_DAYS = 30;

const STOP_WORDS = new Set([
  'the', 'this', 'that', 'there', 'here', 'and', 'but', 'with', 'then',
  'when', 'what', 'why', 'are', 'you', 'your', 'have', 'has', 'was',
  'all', 'any', 'each', 'every', 'for', 'from', 'into', 'just', 'like',
  'more', 'most', 'not', 'now', 'only', 'other', 'out', 'own', 'same',
  'than', 'them', 'then', 'these', 'they', 'very', 'well', 'will',
]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function daysSince(isoDate?: string): number {
  if (!isoDate) return 1e6;
  const dt = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, dt / (1000 * 60 * 60 * 24));
}

function hoursSince(isoDate?: string): number {
  if (!isoDate) return 1e6;
  const dt = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, dt / (1000 * 60 * 60));
}

function isValidToken(tok: string): boolean {
  if (!tok) return false;
  if (tok.length < 3) return false;
  if (STOP_WORDS.has(tok.toLowerCase())) return false;
  if (!/[a-z]/i.test(tok)) return false;
  return true;
}

/**
 * Ebbinghaus-inspired decay function.
 * Strength decays exponentially with half-life of DECAY_HALF_LIFE_DAYS.
 */
function computeDecayedStrength(association: StoredAssociation): number {
  const base = association.strength || 0;
  const days = daysSince(association.lastReinforcedAt || association.lastUsed || association.createdAt);
  const k = Math.log(2) / DECAY_HALF_LIFE_DAYS;
  return base * Math.exp(-k * days);
}

/**
 * Recency boost: recent accesses get up to 50% boost, decaying over ~3 days.
 */
function computeRecencyBoost(association: StoredAssociation): number {
  const d = daysSince(association.lastUsed || association.createdAt);
  return 1 + Math.exp(-d / 3) * 0.5;
}

/**
 * Compute salience score for an association.
 * Salience = decayed_strength * recency_boost * exposure_factor
 */
function computeSalience(association: StoredAssociation): number {
  const ds = computeDecayedStrength(association);
  const rb = computeRecencyBoost(association);
  const exp = Math.pow(association.exposures || 1, 0.25); // Diminishing returns
  return ds * rb * exp;
}

/**
 * Compute importance score for a message based on access patterns.
 */
function computeMessageImportance(message: StoredMessage): number {
  const accessFactor = Math.min(1, (message.accessCount || 0) / 10);
  const ageDays = daysSince(message.timestamp);
  const recencyFactor = ageDays < RECENCY_BOOST_WINDOW_DAYS
    ? (RECENCY_BOOST_WINDOW_DAYS - ageDays) / RECENCY_BOOST_WINDOW_DAYS
    : 0;
  return (accessFactor * 0.6) + (recencyFactor * 0.4);
}

// ============================================================================
// MESSAGE OPERATIONS (EPISODIC MEMORY)
// ============================================================================

/**
 * Add a message to episodic memory.
 */
export async function addMessage(message: Omit<StoredMessage, 'id'>): Promise<number> {
  const now = new Date().toISOString();
  const storedMessage: StoredMessage = {
    ...message,
    accessCount: 0,
    lastAccessed: now,
    importance: 0.5, // Initial neutral importance
  };
  
  const id = await db.messages.add(storedMessage);
  
  // Update persona state
  await updatePersonaMessageCount(message.persona);
  
  return id as number;
}

/**
 * Get messages with pagination and optional filtering.
 */
export async function getMessages(query: MessageQuery): Promise<PaginationResult<StoredMessage>> {
  const { persona, offset = 0, limit = 50, startDate, endDate, role, searchTerm } = query;
  
  let collection = db.messages.where('persona').equals(persona);
  
  // Get total count first
  const total = await collection.count();
  
  // Build filtered query
  let items = await collection
    .reverse() // Most recent first
    .offset(offset)
    .limit(limit)
    .toArray();
  
  // Apply additional filters in memory (for complex queries)
  if (startDate || endDate || role || searchTerm) {
    items = items.filter(msg => {
      if (role && msg.role !== role) return false;
      if (startDate && new Date(msg.timestamp) < startDate) return false;
      if (endDate && new Date(msg.timestamp) > endDate) return false;
      if (searchTerm && !msg.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }
  
  // Update access metadata for retrieved messages
  const messageIds = items.filter(m => m.id).map(m => m.id!);
  if (messageIds.length > 0) {
    const now = new Date().toISOString();
    await db.messages.where('id').anyOf(messageIds).modify(msg => {
      msg.lastAccessed = now;
      msg.accessCount = (msg.accessCount || 0) + 1;
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

/**
 * Get all messages for a persona (use sparingly - prefer pagination).
 */
export async function getAllMessagesForPersona(persona: string): Promise<StoredMessage[]> {
  return await db.messages
    .where('persona')
    .equals(persona)
    .sortBy('timestamp');
}

/**
 * Get the last N messages for a persona (efficient for context building).
 */
export async function getRecentMessages(persona: string, count: number): Promise<StoredMessage[]> {
  const messages = await db.messages
    .where('persona')
    .equals(persona)
    .reverse()
    .limit(count)
    .toArray();
  
  // Return in chronological order
  return messages.reverse();
}

/**
 * Get messages within a time range (efficient with compound index).
 */
export async function getMessagesByTimeRange(
  persona: string,
  startDate: Date,
  endDate: Date
): Promise<StoredMessage[]> {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  // Use compound index for efficient range query
  return await db.messages
    .where('[persona+timestamp]')
    .between([persona, startIso], [persona, endIso], true, true)
    .toArray();
}

/**
 * Semantic search with keyword matching and importance scoring.
 */
export async function searchMessages(
  persona: string,
  query: string,
  excludeIds: number[] = [],
  maxResults: number = 5
): Promise<StoredMessage[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];
  
  // Get all messages for persona (we'll score and filter)
  const allMessages = await db.messages
    .where('persona')
    .equals(persona)
    .toArray();
  
  // Score each message
  const scored = allMessages
    .filter(msg => !msg.id || !excludeIds.includes(msg.id))
    .map(msg => ({
      message: msg,
      score: calculateMessageRelevance(msg, keywords, query),
    }))
    .filter(item => item.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
  
  // Update access counts for retrieved messages
  const ids = scored.map(s => s.message.id).filter(Boolean) as number[];
  if (ids.length > 0) {
    const now = new Date().toISOString();
    await db.messages.where('id').anyOf(ids).modify(msg => {
      msg.lastAccessed = now;
      msg.accessCount = (msg.accessCount || 0) + 1;
    });
  }
  
  return scored.map(s => s.message);
}

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[.,?!;:()[\]{}""'']/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  return [...new Set(words)];
}

function calculateMessageRelevance(
  message: StoredMessage,
  keywords: string[],
  originalQuery: string
): number {
  const lowerContent = message.content.toLowerCase();
  let score = 0;
  
  // Exact phrase match
  if (lowerContent.includes(originalQuery.toLowerCase())) {
    score += 0.8;
  }
  
  // Keyword matches
  const matchedKeywords = keywords.filter(kw => lowerContent.includes(kw));
  const keywordDensity = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
  score += keywordDensity * 0.3;
  
  // Importance boost (based on access patterns)
  const importance = message.importance || 0.5;
  score += importance * 0.2;
  
  // Recency boost
  const ageDays = daysSince(message.timestamp);
  if (ageDays < RECENCY_BOOST_WINDOW_DAYS) {
    const recencyRatio = (RECENCY_BOOST_WINDOW_DAYS - ageDays) / RECENCY_BOOST_WINDOW_DAYS;
    score += recencyRatio * 0.15;
  }
  
  return Math.min(1.0, score);
}

/**
 * Delete a specific message.
 */
export async function deleteMessage(id: number): Promise<void> {
  const message = await db.messages.get(id);
  if (message) {
    await db.messages.delete(id);
    await updatePersonaMessageCount(message.persona);
  }
}

/**
 * Clear all messages for a persona.
 */
export async function clearPersonaMessages(persona: string): Promise<void> {
  await db.messages.where('persona').equals(persona).delete();
  await updatePersonaMessageCount(persona);
}

// ============================================================================
// ASSOCIATION OPERATIONS (SEMANTIC MEMORY)
// ============================================================================

/**
 * Add or reinforce associations.
 */
export async function addAssociations(
  persona: string,
  pairs: Array<{ left: string; right: string }>
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.transaction('rw', db.associations, db.personaStates, async () => {
    for (const { left, right } of pairs) {
      const l = left.trim().toLowerCase();
      const r = right.trim().toLowerCase();
      
      if (!isValidToken(l) || !isValidToken(r)) continue;
      
      // Check for existing association
      const existing = await db.associations
        .where('[persona+left+right]')
        .equals([persona, l, r])
        .first();
      
      if (existing) {
        // Reinforce existing association
        await db.associations.update(existing.id!, {
          strength: Math.min(1e6, (existing.strength || 1) + 1),
          exposures: (existing.exposures || 0) + 1,
          lastUsed: now,
          lastReinforcedAt: now,
          cachedSalience: undefined, // Invalidate cache
        });
      } else {
        // Create new association
        await db.associations.add({
          persona,
          left: l,
          right: r,
          strength: 1,
          exposures: 1,
          createdAt: now,
          lastUsed: now,
          lastReinforcedAt: now,
        });
      }
    }
    
    // Prune weak associations to maintain limit
    await pruneAssociations(persona);
    await updatePersonaAssociationCount(persona);
  });
}

/**
 * Get all associations for a persona, sorted by salience.
 */
export async function getAssociations(persona: string): Promise<StoredAssociation[]> {
  const associations = await db.associations
    .where('persona')
    .equals(persona)
    .toArray();
  
  // Update salience cache if stale
  const now = new Date().toISOString();
  const needsUpdate = associations.filter(
    a => !a.cachedSalience || hoursSince(a.salienceUpdatedAt) > MAX_SALIENCE_AGE_HOURS
  );
  
  if (needsUpdate.length > 0) {
    await db.transaction('rw', db.associations, async () => {
      for (const assoc of needsUpdate) {
        const salience = computeSalience(assoc);
        await db.associations.update(assoc.id!, {
          cachedSalience: salience,
          salienceUpdatedAt: now,
        });
        assoc.cachedSalience = salience;
      }
    });
  }
  
  // Sort by salience (descending)
  return associations.sort((a, b) => (b.cachedSalience || 0) - (a.cachedSalience || 0));
}

/**
 * Touch (mark as used) associations that appear in text.
 */
export async function touchAssociations(
  persona: string,
  used: Array<{ left: string; right: string }>
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.transaction('rw', db.associations, async () => {
    for (const { left, right } of used) {
      const l = left.trim().toLowerCase();
      const r = right.trim().toLowerCase();
      
      const existing = await db.associations
        .where('[persona+left+right]')
        .equals([persona, l, r])
        .first();
      
      if (existing) {
        await db.associations.update(existing.id!, {
          lastUsed: now,
          strength: Math.min(1e6, (existing.strength || 1) + 0.5),
          exposures: (existing.exposures || 0) + 1,
          lastReinforcedAt: now,
          cachedSalience: undefined, // Invalidate cache
        });
      }
    }
  });
}

/**
 * Find associations where the right-side token appears in text.
 */
export async function findAssociationsInText(
  persona: string,
  text: string
): Promise<Array<{ left: string; right: string }>> {
  const associations = await getAssociations(persona);
  if (associations.length === 0 || !text) return [];
  
  const rightsSet = new Set(associations.map(a => a.right.toLowerCase()));
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_,\s-]/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  
  const used: Array<{ left: string; right: string }> = [];
  const seen = new Set<string>();
  
  for (const token of tokens) {
    if (rightsSet.has(token)) {
      // Find the strongest association for this right token
      const best = associations.find(a => a.right === token);
      if (best) {
        const key = `${best.left}|${best.right}`;
        if (!seen.has(key)) {
          seen.add(key);
          used.push({ left: best.left, right: best.right });
        }
      }
    }
  }
  
  return used;
}

/**
 * Build a compact facts line for system prompt injection.
 */
export async function buildFactsLine(
  persona: string,
  charBudget: number = 160
): Promise<string | null> {
  const associations = await getAssociations(persona);
  if (associations.length === 0) return null;
  
  const parts: string[] = [];
  let total = 'Facts: '.length;
  const seen = new Set<string>();
  
  for (const a of associations) {
    if (!isValidToken(a.left) || !isValidToken(a.right)) continue;
    if (seen.has(a.right)) continue;
    
    const frag = `${a.left}=${a.right}`;
    const addLen = (parts.length ? 2 : 0) + frag.length; // Account for '; '
    if (total + addLen > charBudget) break;
    
    parts.push(frag);
    total += addLen;
    seen.add(a.right);
  }
  
  return parts.length ? `Facts: ${parts.join('; ')}` : null;
}

/**
 * Parse association statements from text.
 */
export function parseAssociationsFromText(
  text: string
): Array<{ left: string; right: string }> {
  const result: Array<{ left: string; right: string }> = [];
  if (!text) return result;
  
  const lc = text.toLowerCase();
  const trainingMode = /(\bremember\b|\bassociate\b|\bmap\b|\bdefine\b|\bset\b|\bmeans\b)/.test(lc);
  const normalized = lc.replace(/\s+/g, ' ');
  
  const chunks = normalized.split(/[;,]/);
  const eqRe = trainingMode
    ? /\b([a-z0-9_-]{3,})\s*(=|is|equals)\s*([a-z0-9_-]{3,})\b/
    : /\b([a-z0-9_-]{3,})\s*(=)\s*([a-z0-9_-]{3,})\b/;
  
  for (const chunk of chunks) {
    const m = chunk.match(eqRe);
    if (m) {
      const left = m[1];
      const right = m[3];
      if (left && right && isValidToken(left) && isValidToken(right)) {
        result.push({ left, right });
      }
    }
  }
  
  return result;
}

/**
 * Clear all associations for a persona.
 */
export async function clearPersonaAssociations(persona: string): Promise<void> {
  await db.associations.where('persona').equals(persona).delete();
  await updatePersonaAssociationCount(persona);
}

/**
 * Prune weak associations to maintain limit.
 */
async function pruneAssociations(persona: string): Promise<void> {
  const associations = await db.associations
    .where('persona')
    .equals(persona)
    .toArray();
  
  if (associations.length <= MAX_ASSOCIATIONS_PER_PERSONA) return;
  
  // Calculate salience for all
  const scored = associations.map(a => ({
    id: a.id!,
    salience: computeSalience(a),
    age: daysSince(a.createdAt),
  }));
  
  // Sort by salience ascending (weakest first)
  scored.sort((a, b) => a.salience - b.salience);
  
  // Remove weakest until under limit
  const toRemove = scored.slice(0, associations.length - MAX_ASSOCIATIONS_PER_PERSONA);
  const idsToRemove = toRemove
    .filter(s => s.salience < 0.1 || s.age > 120) // Only remove truly weak/old ones
    .map(s => s.id);
  
  if (idsToRemove.length > 0) {
    await db.associations.where('id').anyOf(idsToRemove).delete();
  }
}

// ============================================================================
// PERSONA STATE OPERATIONS
// ============================================================================

async function updatePersonaMessageCount(persona: string): Promise<void> {
  const count = await db.messages.where('persona').equals(persona).count();
  await upsertPersonaState(persona, { messageCount: count });
}

async function updatePersonaAssociationCount(persona: string): Promise<void> {
  const count = await db.associations.where('persona').equals(persona).count();
  await upsertPersonaState(persona, { associationCount: count });
}

async function upsertPersonaState(
  persona: string,
  updates: Partial<StoredPersonaState>
): Promise<void> {
  const existing = await db.personaStates.where('persona').equals(persona).first();
  const now = new Date().toISOString();
  
  if (existing) {
    await db.personaStates.update(existing.id!, {
      ...updates,
      lastAccessed: now,
    });
  } else {
    await db.personaStates.add({
      persona,
      lastAccessed: now,
      messageCount: 0,
      associationCount: 0,
      ...updates,
    });
  }
}

export async function getPersonaState(persona: string): Promise<StoredPersonaState | undefined> {
  return await db.personaStates.where('persona').equals(persona).first();
}

// ============================================================================
// DATA MIGRATION
// ============================================================================

/**
 * Migrate data from localStorage associative memory to Dexie.
 */
export async function migrateFromLocalStorage(): Promise<{ migrated: boolean; details: string }> {
  const STORAGE_KEY = 'alterEgo_assocMemory';
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { migrated: false, details: 'No localStorage data to migrate' };
    }
    
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { migrated: false, details: 'Invalid localStorage data format' };
    }
    
    let totalMigrated = 0;
    
    await db.transaction('rw', db.associations, db.personaStates, async () => {
      for (const [persona, associations] of Object.entries(parsed)) {
        if (!Array.isArray(associations)) continue;
        
        for (const assoc of associations as any[]) {
          // Check if already exists
          const existing = await db.associations
            .where('[persona+left+right]')
            .equals([persona, assoc.left, assoc.right])
            .first();
          
          if (!existing) {
            await db.associations.add({
              persona,
              left: assoc.left,
              right: assoc.right,
              strength: assoc.strength || 1,
              exposures: assoc.exposures || 1,
              createdAt: assoc.createdAt || new Date().toISOString(),
              lastUsed: assoc.lastUsed || new Date().toISOString(),
              lastReinforcedAt: assoc.lastReinforcedAt || assoc.lastUsed || new Date().toISOString(),
            });
            totalMigrated++;
          }
        }
        
        await updatePersonaAssociationCount(persona);
      }
    });
    
    // Backup and remove old data
    if (totalMigrated > 0) {
      localStorage.setItem(`${STORAGE_KEY}_backup_${Date.now()}`, raw);
      localStorage.removeItem(STORAGE_KEY);
    }
    
    return {
      migrated: totalMigrated > 0,
      details: `Migrated ${totalMigrated} associations to consolidated database`,
    };
  } catch (error) {
    logger.error('Migration failed:', error);
    return { migrated: false, details: `Migration error: ${error}` };
  }
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

export async function getSetting(key: string): Promise<string | undefined> {
  const setting = await db.settings.get(key);
  return setting?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.settings.delete(key);
}

// ============================================================================
// DATABASE MANAGEMENT
// ============================================================================

/**
 * Export all data for backup.
 */
export async function exportAllData(): Promise<{
  messages: StoredMessage[];
  associations: StoredAssociation[];
  personaStates: StoredPersonaState[];
  settings: StoredSettings[];
  exportedAt: string;
}> {
  return {
    messages: await db.messages.toArray(),
    associations: await db.associations.toArray(),
    personaStates: await db.personaStates.toArray(),
    settings: await db.settings.toArray(),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Import data from backup.
 */
export async function importData(data: {
  messages?: StoredMessage[];
  associations?: StoredAssociation[];
  personaStates?: StoredPersonaState[];
  settings?: StoredSettings[];
}): Promise<void> {
  await db.transaction('rw', [db.messages, db.associations, db.personaStates, db.settings], async () => {
    if (data.messages) {
      await db.messages.bulkPut(data.messages);
    }
    if (data.associations) {
      await db.associations.bulkPut(data.associations);
    }
    if (data.personaStates) {
      await db.personaStates.bulkPut(data.personaStates);
    }
    if (data.settings) {
      await db.settings.bulkPut(data.settings);
    }
  });
}

/**
 * Clear all data (factory reset).
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.messages, db.associations, db.personaStates, db.settings], async () => {
    await db.messages.clear();
    await db.associations.clear();
    await db.personaStates.clear();
    await db.settings.clear();
  });
}

/**
 * Clear all associations only (preserves messages).
 */
export async function clearAllAssociationsData(): Promise<void> {
  await db.associations.clear();
  // Reset association counts in persona states
  await db.personaStates.toCollection().modify({ associationCount: 0 });
}

/**
 * Clear all messages only (preserves associations).
 */
export async function clearAllMessagesData(): Promise<void> {
  await db.messages.clear();
  // Reset message counts in persona states
  await db.personaStates.toCollection().modify({ messageCount: 0 });
}

/**
 * Get database statistics.
 */
export async function getDatabaseStats(): Promise<{
  messageCount: number;
  associationCount: number;
  personaCount: number;
  settingCount: number;
}> {
  return {
    messageCount: await db.messages.count(),
    associationCount: await db.associations.count(),
    personaCount: await db.personaStates.count(),
    settingCount: await db.settings.count(),
  };
}

// Export database instance for advanced operations
export { db as memoryDb };
