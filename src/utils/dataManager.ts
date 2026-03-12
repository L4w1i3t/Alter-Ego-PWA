/**
 * Data Manager
 *
 * Provides a unified export/import system that captures ALL app state:
 *   - localStorage keys (settings, API keys, personas, chat history, etc.)
 *   - IndexedDB: AlterEgoMemoryDB (consolidated memory)
 *   - IndexedDB: LongTermMemoryDB (legacy memory)
 *
 * The resulting JSON is platform-agnostic, meaning a backup taken from the
 * web PWA can be restored into the Electron portable build and vice versa.
 */

import { STORAGE_KEYS } from '../config/constants';
import { exportAllData as exportConsolidatedDB, importData as importConsolidatedDB } from '../memory/memoryDatabase';
import { exportDatabaseContent as exportLegacyDB, importMemory as importLegacyMemories, exportAllMemory } from '../memory/longTermDB';
import { logger } from './logger';

// ── Types ──

/** Schema version for forward-compatible migration. */
const BACKUP_FORMAT_VERSION = 1;

/** All localStorage keys the app owns. */
const ALL_STORAGE_KEYS: string[] = [
  STORAGE_KEYS.API_KEYS,
  STORAGE_KEYS.API_KEYS_ENCRYPTED,
  STORAGE_KEYS.VOICE_MODELS,
  STORAGE_KEYS.PERSONAS,
  STORAGE_KEYS.PERSONA_VERSION,
  STORAGE_KEYS.CHAT_HISTORY,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.IMMERSIVE_MODE,
  STORAGE_KEYS.AI_CONFIG,
  STORAGE_KEYS.TOKEN_USAGE,
  STORAGE_KEYS.TOKEN_SUMMARIES,
  // Associative memory cached in localStorage
  'alterEgo_assocMemory',
];

export interface BackupPayload {
  formatVersion: number;
  exportedAt: string;
  source: 'web' | 'electron';
  localStorage: Record<string, string>;
  consolidatedDB: {
    messages: unknown[];
    associations: unknown[];
    personaStates: unknown[];
    settings: unknown[];
  };
  legacyDB: unknown[];
}

export interface DataStats {
  localStorageKeys: number;
  consolidatedMessages: number;
  consolidatedAssociations: number;
  consolidatedPersonas: number;
  legacyPersonas: number;
}

// ── Helpers ──

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

// ── Export ──

/**
 * Collect every piece of persisted app data into a single serializable object.
 */
export async function exportAllAppData(): Promise<BackupPayload> {
  // 1. Snapshot all owned localStorage keys
  const lsData: Record<string, string> = {};
  for (const key of ALL_STORAGE_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      lsData[key] = value;
    }
  }

  // 2. Consolidated Dexie DB (AlterEgoMemoryDB)
  let consolidatedData = { messages: [] as unknown[], associations: [] as unknown[], personaStates: [] as unknown[], settings: [] as unknown[] };
  try {
    const raw = await exportConsolidatedDB();
    consolidatedData = {
      messages: raw.messages,
      associations: raw.associations,
      personaStates: raw.personaStates,
      settings: raw.settings,
    };
  } catch (err) {
    logger.warn('Failed to export consolidated DB:', err);
  }

  // 3. Legacy Dexie DB (LongTermMemoryDB)
  let legacyData: unknown[] = [];
  try {
    legacyData = await exportAllMemory();
  } catch (err) {
    logger.warn('Failed to export legacy DB:', err);
  }

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    source: isElectron() ? 'electron' : 'web',
    localStorage: lsData,
    consolidatedDB: consolidatedData,
    legacyDB: legacyData,
  };
}

// ── Import ──

/**
 * Restore a previously exported backup.
 * This REPLACES existing data (not a merge). Factory-reset semantics.
 */
export async function importAllAppData(payload: BackupPayload): Promise<void> {
  if (!payload || typeof payload.formatVersion !== 'number') {
    throw new Error('Invalid backup file: missing format version.');
  }
  if (payload.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Backup format version ${payload.formatVersion} is newer than supported (${BACKUP_FORMAT_VERSION}). Update ALTER EGO first.`
    );
  }

  // 1. Restore localStorage
  if (payload.localStorage && typeof payload.localStorage === 'object') {
    // Clear existing keys first
    for (const key of ALL_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    for (const [key, value] of Object.entries(payload.localStorage)) {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    }
  }

  // 2. Restore consolidated DB
  if (payload.consolidatedDB) {
    try {
      await importConsolidatedDB({
        messages: payload.consolidatedDB.messages as any[],
        associations: payload.consolidatedDB.associations as any[],
        personaStates: payload.consolidatedDB.personaStates as any[],
        settings: payload.consolidatedDB.settings as any[],
      });
    } catch (err) {
      logger.error('Failed to import consolidated DB:', err);
    }
  }

  // 3. Restore legacy DB
  if (Array.isArray(payload.legacyDB) && payload.legacyDB.length > 0) {
    try {
      await importLegacyMemories(payload.legacyDB as any[]);
    } catch (err) {
      logger.error('Failed to import legacy DB:', err);
    }
  }
}

// ── Statistics ──

/**
 * Gather counts for each data category (used for the UI summary).
 */
export async function getDataStats(): Promise<DataStats> {
  let consolidatedMessages = 0;
  let consolidatedAssociations = 0;
  let consolidatedPersonas = 0;
  let legacyPersonas = 0;

  try {
    const raw = await exportConsolidatedDB();
    consolidatedMessages = raw.messages.length;
    consolidatedAssociations = raw.associations.length;
    consolidatedPersonas = raw.personaStates.length;
  } catch {}

  try {
    const legacy = await exportAllMemory();
    legacyPersonas = legacy.length;
  } catch {}

  let localStorageKeys = 0;
  for (const key of ALL_STORAGE_KEYS) {
    if (localStorage.getItem(key) !== null) localStorageKeys++;
  }

  return {
    localStorageKeys,
    consolidatedMessages,
    consolidatedAssociations,
    consolidatedPersonas,
    legacyPersonas,
  };
}

// ── File helpers (browser-side download / upload) ──

/**
 * Trigger a browser download of the backup JSON.
 */
export function downloadBackup(payload: BackupPayload, filename?: string): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `ALTER_EGO_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * Open a file picker and read the selected JSON backup.
 * Returns null if the user cancels.
 */
export function pickBackupFile(): Promise<BackupPayload | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as BackupPayload;
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });

    // User cancelled
    input.addEventListener('cancel', () => resolve(null));

    input.click();
  });
}
