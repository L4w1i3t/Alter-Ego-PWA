/**
 * Associative Memory - Consolidated Dexie-backed Implementation
 * 
 * This module provides semantic memory for per-persona facts like "box = red".
 * Data is now stored in IndexedDB via the consolidated memoryDatabase for
 * improved reliability, indexing, and capacity.
 * 
 * Architecture:
 * - In-memory cache provides fast synchronous reads
 * - Background sync ensures durability in IndexedDB
 * - Automatic migration from legacy localStorage data
 * - Ebbinghaus-inspired decay for cognitive realism
 * 
 * @module associativeMemory
 */

import {
  addAssociations as dbAddAssociations,
  getAssociations as dbGetAssociations,
  touchAssociations as dbTouchAssociations,
  buildFactsLine as dbBuildFactsLine,
  parseAssociationsFromText as dbParseAssociationsFromText,
  clearPersonaAssociations as dbClearPersonaAssociations,
  migrateFromLocalStorage,
  clearAllAssociationsData as dbClearAllAssociations,
  type StoredAssociation,
} from './memoryDatabase';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES (Preserved for backward compatibility)
// ============================================================================

export interface Association {
  left: string;
  right: string;
  strength: number;
  exposures?: number;
  createdAt: string;
  lastUsed?: string;
  lastReinforcedAt?: string;
}

// ============================================================================
// IN-MEMORY CACHE FOR SYNCHRONOUS ACCESS
// ============================================================================

interface CacheEntry {
  associations: Association[];
  lastSync: number;
  dirty: boolean;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5000; // 5 seconds
const pendingSyncs = new Map<string, NodeJS.Timeout>();

let migrationComplete = false;
let migrationPromise: Promise<void> | null = null;

/**
 * Ensure migration from localStorage has been attempted.
 */
async function ensureMigration(): Promise<void> {
  if (migrationComplete) return;
  
  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        const result = await migrateFromLocalStorage();
        if (result.migrated) {
          logger.info('Associative memory migration:', result.details);
        }
      } catch (error) {
        logger.error('Failed to migrate associative memory:', error);
      } finally {
        migrationComplete = true;
      }
    })();
  }
  
  await migrationPromise;
}

// Trigger migration on module load
ensureMigration().catch(() => {});

/**
 * Convert StoredAssociation to legacy Association format.
 */
function toAssociation(stored: StoredAssociation): Association {
  return {
    left: stored.left,
    right: stored.right,
    strength: stored.strength,
    exposures: stored.exposures,
    createdAt: stored.createdAt,
    lastUsed: stored.lastUsed,
    lastReinforcedAt: stored.lastReinforcedAt,
  };
}

/**
 * Get cached associations or fetch from database.
 */
async function refreshCache(persona: string): Promise<Association[]> {
  await ensureMigration();
  
  try {
    const stored = await dbGetAssociations(persona);
    const associations = stored.map(toAssociation);
    
    cache.set(persona, {
      associations,
      lastSync: Date.now(),
      dirty: false,
    });
    
    return associations;
  } catch (error) {
    logger.error('Failed to fetch associations from database:', error);
    const cached = cache.get(persona);
    return cached?.associations || [];
  }
}

/**
 * Schedule a cache refresh for a persona.
 */
function scheduleRefresh(persona: string): void {
  // Clear any pending sync
  const existing = pendingSyncs.get(persona);
  if (existing) {
    clearTimeout(existing);
  }
  
  // Schedule new sync
  const timeout = setTimeout(() => {
    refreshCache(persona).catch(error => {
      logger.error('Scheduled cache refresh failed:', error);
    });
    pendingSyncs.delete(persona);
  }, 100); // Short delay to batch rapid operations
  
  pendingSyncs.set(persona, timeout);
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

const STOP_WORDS = new Set([
  'the', 'this', 'that', 'there', 'here', 'and', 'but', 'with', 'then',
  'when', 'what', 'why', 'are', 'you', 'your', 'have', 'has', 'was',
  'all', 'any', 'each', 'every',
]);

function isAssociationToken(tok: string): boolean {
  if (!tok) return false;
  if (tok.length < 3) return false;
  if (STOP_WORDS.has(tok)) return false;
  if (!/[a-z]/.test(tok)) return false;
  return true;
}

function daysSince(iso?: string): number {
  if (!iso) return 1e6;
  const dt = Date.now() - new Date(iso).getTime();
  return Math.max(0, dt / (1000 * 60 * 60 * 24));
}

function decayedStrength(a: Association, halfLifeDays = 14): number {
  const base = a.strength || 0;
  const days = daysSince(a.lastReinforcedAt || a.lastUsed || a.createdAt);
  const k = Math.log(2) / halfLifeDays;
  return base * Math.exp(-k * days);
}

function recencyBoost(a: Association): number {
  const d = daysSince(a.lastUsed || a.createdAt);
  return 1 + Math.exp(-d / 3) * 0.5;
}

function salience(a: Association): number {
  const ds = decayedStrength(a);
  const rb = recencyBoost(a);
  const exp = (a.exposures || 1) ** 0.25;
  return ds * rb * exp;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Add associations for a persona.
 * Synchronous with background persistence.
 */
export function addAssociations(
  persona: string,
  pairs: Array<{ left: string; right: string }>
): void {
  if (!pairs.length) return;
  
  // Optimistically update cache
  const cached = cache.get(persona);
  const now = new Date().toISOString();
  
  if (cached) {
    for (const { left, right } of pairs) {
      const l = left.trim().toLowerCase();
      const r = right.trim().toLowerCase();
      if (!isAssociationToken(l) || !isAssociationToken(r)) continue;
      
      const idx = cached.associations.findIndex(a => a.left === l && a.right === r);
      if (idx >= 0) {
        cached.associations[idx].strength = Math.min(1e6, (cached.associations[idx].strength || 1) + 1);
        cached.associations[idx].exposures = (cached.associations[idx].exposures || 0) + 1;
        cached.associations[idx].lastUsed = now;
        cached.associations[idx].lastReinforcedAt = now;
      } else {
        cached.associations.push({
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
    cached.dirty = true;
  }
  
  // Persist to database
  dbAddAssociations(persona, pairs).catch(error => {
    logger.error('Failed to persist associations:', error);
  });
  
  scheduleRefresh(persona);
}

/**
 * Get associations for a persona, sorted by salience.
 * Returns cached data synchronously.
 */
export function getAssociations(persona: string): Association[] {
  const cached = cache.get(persona);
  const now = Date.now();
  
  // If cache is stale or missing, trigger refresh
  if (!cached || (now - cached.lastSync) > CACHE_TTL_MS || cached.dirty) {
    scheduleRefresh(persona);
  }
  
  // Sort by salience
  const associations = cached?.associations || [];
  return associations.slice().sort((a, b) => salience(b) - salience(a));
}

/**
 * Async version for contexts where async is acceptable.
 */
export async function getAssociationsAsync(persona: string): Promise<Association[]> {
  const associations = await refreshCache(persona);
  return associations.slice().sort((a, b) => salience(b) - salience(a));
}

/**
 * Touch associations that appear in text (mark as used).
 */
export function touchAssociations(
  persona: string,
  used: Array<{ left: string; right: string }>
): void {
  if (!used.length) return;
  
  // Optimistically update cache
  const cached = cache.get(persona);
  const now = new Date().toISOString();
  
  if (cached) {
    for (const { left, right } of used) {
      const l = left.trim().toLowerCase();
      const r = right.trim().toLowerCase();
      const idx = cached.associations.findIndex(a => a.left === l && a.right === r);
      if (idx >= 0) {
        cached.associations[idx].lastUsed = now;
        cached.associations[idx].strength = Math.min(1e6, (cached.associations[idx].strength || 1) + 0.5);
        cached.associations[idx].exposures = (cached.associations[idx].exposures || 0) + 1;
        cached.associations[idx].lastReinforcedAt = now;
      }
    }
    cached.dirty = true;
  }
  
  // Persist to database
  dbTouchAssociations(persona, used).catch(error => {
    logger.error('Failed to touch associations:', error);
  });
  
  scheduleRefresh(persona);
}

/**
 * Parse association statements from text.
 */
export function parseAssociationsFromText(
  text: string
): Array<{ left: string; right: string }> {
  return dbParseAssociationsFromText(text);
}

/**
 * Translate right-side tokens using known associations.
 */
export function translateRightSequence(
  persona: string,
  rights: string[]
): string[] {
  const associations = getAssociations(persona);
  const map = new Map<string, string>();
  
  for (const a of associations) {
    if (!map.has(a.right)) {
      map.set(a.right, a.left);
    }
  }
  
  return rights.map(r => map.get(r.toLowerCase()) || r);
}

/**
 * Build a compact facts line for system prompt injection.
 */
export function buildFactsLine(
  persona: string,
  charBudget: number = 160
): string | null {
  const associations = getAssociations(persona);
  if (!associations.length) return null;
  
  const parts: string[] = [];
  let total = 'Facts: '.length;
  const seen = new Set<string>();
  
  for (const a of associations) {
    if (!isAssociationToken(a.left) || !isAssociationToken(a.right)) continue;
    if (seen.has(a.right)) continue;
    
    const frag = `${a.left}=${a.right}`;
    const addLen = (parts.length ? 2 : 0) + frag.length;
    if (total + addLen > charBudget) break;
    
    parts.push(frag);
    total += addLen;
    seen.add(a.right);
  }
  
  return parts.length ? `Facts: ${parts.join('; ')}` : null;
}

/**
 * Async version of buildFactsLine.
 */
export async function buildFactsLineAsync(
  persona: string,
  charBudget: number = 160
): Promise<string | null> {
  return await dbBuildFactsLine(persona, charBudget);
}

/**
 * Find associations where right-side tokens appear in text.
 */
export function getRightsUsedInText(
  persona: string,
  text: string
): Array<{ left: string; right: string }> {
  const associations = getAssociations(persona);
  if (!associations.length || !text) return [];
  
  const rightsSet = new Set(associations.map(a => a.right.toLowerCase()));
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_,\s-]/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  
  const used: Array<{ left: string; right: string }> = [];
  const seen = new Set<string>();
  
  for (const t of tokens) {
    if (rightsSet.has(t)) {
      const best = associations.find(a => a.right === t);
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
 * Clear all associations for a persona.
 */
export function clearPersonaAssociations(persona: string): void {
  cache.delete(persona);
  
  dbClearPersonaAssociations(persona).catch(error => {
    logger.error('Failed to clear persona associations:', error);
  });
}

/**
 * Clear all associations (entire memory store).
 */
export function clearAllAssociations(): void {
  cache.clear();
  
  dbClearAllAssociations().catch(error => {
    logger.error('Failed to clear all associations:', error);
  });
}

/**
 * Initialize associative memory system.
 * Call on app startup for migration and cache warming.
 */
export async function initializeAssociativeMemory(personas: string[]): Promise<void> {
  await ensureMigration();
  
  // Warm cache for active personas
  for (const persona of personas) {
    await refreshCache(persona);
  }
}
