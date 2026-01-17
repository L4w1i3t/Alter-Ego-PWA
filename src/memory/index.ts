/**
 * ALTER EGO Memory System - Public API
 * 
 * This module provides a unified interface to the cognitive memory systems:
 * 
 * 1. Episodic Memory (Messages) - Conversation history with temporal context
 * 2. Semantic Memory (Associations) - Learned facts and relationships  
 * 3. Working Memory - In-memory cache for active session context
 * 
 * Architecture follows cognitive science principles:
 * - Ebbinghaus decay for realistic memory fading
 * - Salience-based retrieval prioritization
 * - Automatic consolidation from short-term to long-term storage
 * 
 * @module memory
 */

// Re-export from memoryDatabase (consolidated Dexie-backed storage)
export {
  // Types
  type StoredMessage,
  type StoredAssociation,
  type StoredPersonaState,
  type PaginationResult,
  type MessageQuery,
  
  // Message operations
  addMessage as addMessageToMemory,
  getMessages as getMessagesFromMemory,
  getAllMessagesForPersona,
  getRecentMessages,
  getMessagesByTimeRange as getMessagesByTimeRangeNew,
  searchMessages as searchMessagesInMemory,
  deleteMessage as deleteMessageFromMemory,
  clearPersonaMessages,
  
  // Association operations
  addAssociations as addAssociationsToMemory,
  getAssociations as getAssociationsFromMemory,
  touchAssociations as touchAssociationsInMemory,
  buildFactsLine as buildFactsLineFromMemory,
  findAssociationsInText,
  parseAssociationsFromText as parseAssociations,
  clearPersonaAssociations as clearAssociationsForPersona,
  
  // Persona state
  getPersonaState,
  
  // Data management
  exportAllData,
  importData,
  clearAllData,
  clearAllAssociationsData,
  clearAllMessagesData,
  getDatabaseStats,
  migrateFromLocalStorage,
  
  // Database instance (for advanced operations)
  memoryDb,
} from './memoryDatabase';

// Re-export from associativeMemory (backward-compatible synchronous API)
export {
  // Types
  type Association,
  
  // Synchronous API (uses in-memory cache)
  addAssociations,
  getAssociations,
  getAssociationsAsync,
  touchAssociations,
  parseAssociationsFromText,
  translateRightSequence,
  buildFactsLine,
  buildFactsLineAsync,
  getRightsUsedInText,
  clearPersonaAssociations,
  clearAllAssociations,
  initializeAssociativeMemory,
} from './associativeMemory';

// Re-export from longTermDB (legacy API with new pagination support)
export {
  // Types
  type PaginatedResult,
  type MessageQueryOptions,
  
  // Legacy message operations
  addMessage,
  getMessages,
  getMessagesPaginated,
  getMessageById,
  updateMessage,
  deleteMessage,
  clearMessages,
  
  // User operations
  addUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  clearUsers,
  
  // Config operations
  saveAIConfig,
  getAIConfig,
  updateAIConfig,
  clearAIConfig,
  saveVoiceConfig,
  getVoiceConfig,
  updateVoiceConfig,
  clearVoiceConfig,
  
  // Paginated persona memory
  getPersonaMessagesPaginated,
  getPersonaMessageCount,
  
  // Memory retrieval (legacy)
  getMessagesByTimeRange,
  getLastNMessages,
  searchMessages,
  semanticSearchMessages,
  
  // Persona memory management
  savePersonaMemory,
  getPersonaMemory,
  deletePersonaMemory,
  
  // Database management
  clearAllMemory,
  exportAllMemory,
  importMemory,
  exportDatabaseContent,
} from './longTermDB';

// ============================================================================
// INITIALIZATION
// ============================================================================

import { migrateFromLocalStorage } from './memoryDatabase';
import { initializeAssociativeMemory } from './associativeMemory';
import { logger } from '../utils/logger';

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the memory system.
 * Call this on app startup to ensure migrations are complete
 * and caches are warmed for active personas.
 */
export async function initializeMemorySystem(activePersonas: string[] = []): Promise<void> {
  if (initialized) return;
  
  if (!initPromise) {
    initPromise = (async () => {
      try {
        logger.info('Initializing ALTER EGO memory system...');
        
        // Migrate any legacy localStorage data
        const migrationResult = await migrateFromLocalStorage();
        if (migrationResult.migrated) {
          logger.info('Memory migration complete:', migrationResult.details);
        }
        
        // Warm caches for active personas
        if (activePersonas.length > 0) {
          await initializeAssociativeMemory(activePersonas);
          logger.info(`Warmed memory caches for ${activePersonas.length} persona(s)`);
        }
        
        initialized = true;
        logger.info('Memory system initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize memory system:', error);
        throw error;
      }
    })();
  }
  
  await initPromise;
}

/**
 * Check if the memory system has been initialized.
 */
export function isMemorySystemInitialized(): boolean {
  return initialized;
}

/**
 * Get a summary of memory system statistics.
 */
export async function getMemorySystemStats(): Promise<{
  initialized: boolean;
  databases: {
    consolidated: { messages: number; associations: number; personas: number };
    legacy: { personas: number };
  };
}> {
  const { getDatabaseStats } = await import('./memoryDatabase');
  const { exportAllMemory } = await import('./longTermDB');
  
  const consolidatedStats = await getDatabaseStats();
  const legacyMemories = await exportAllMemory();
  
  return {
    initialized,
    databases: {
      consolidated: {
        messages: consolidatedStats.messageCount,
        associations: consolidatedStats.associationCount,
        personas: consolidatedStats.personaCount,
      },
      legacy: {
        personas: legacyMemories.length,
      },
    },
  };
}
