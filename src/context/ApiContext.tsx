import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  sendMessageToAI,
  AIConfig,
  MessageHistory,
} from '../services/aiService';
import {
  loadChatHistory,
  saveChatHistory,
  ChatHistoryEntry,
  loadSettings,
} from '../utils/storageUtils';
import { v4 as uuidv4 } from 'uuid';
// Import functions from our long-term memory database
import {
  getPersonaMemory,
  savePersonaMemory,
  deletePersonaMemory,
  searchMessages,
  semanticSearchMessages,
  getMessagesByTimeRange,
  getLastNMessages,
} from '../memory/longTermDB';
// Import emotion classification service
import {
  classifyConversationEmotion,
  analyzeUserEmotions,
  analyzeResponseEmotions,
} from '../services/emotionService';
// Import image utilities
import {
  saveImageToCache,
  fileToDataUrl,
  validateImageFile,
  processImage,
  CachedImage,
} from '../utils/imageUtils';
// Import image analysis service
import { queueImageForAnalysis } from '../services/imageAnalysisQueue';
import { tokenTracker } from '../utils/tokenTracker';
import {
  parseAssociationsFromText,
  addAssociations,
  buildFactsLine,
} from '../memory/associativeMemory';
import { buildShortTermContext } from '../utils/contextBuilder';

// Define message type
interface Message {
  role: 'user' | 'assistant' | 'system'; // Added 'system' role for RAG context
  content: string;
  timestamp?: string;
  id?: number;
  images?: string[]; // Array of image URLs/data URLs
  imageIds?: string[]; // Array of cached image IDs for reference
}

const DEFAULT_MEMORY_BUFFER = 3;
const normalizeMemoryBuffer = (value?: number): number => {
  if (typeof value !== 'number') return DEFAULT_MEMORY_BUFFER;
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MEMORY_BUFFER;
  return Math.floor(value);
};

const usedMessageIds = new Set<number>();
let nextMessageId = 1;

const registerExistingMessageId = (id?: number): void => {
  if (typeof id !== 'number' || !Number.isFinite(id)) return;
  usedMessageIds.add(id);
  if (id >= nextMessageId) {
    nextMessageId = id + 1;
  }
};

const mintMessageId = (): number => {
  while (usedMessageIds.has(nextMessageId)) {
    nextMessageId += 1;
  }
  const id = nextMessageId;
  usedMessageIds.add(id);
  nextMessageId += 1;
  return id;
};

const normalizeTimestamp = (
  value?: string
): { iso: string; mutated: boolean } => {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const iso = parsed.toISOString();
      return { iso, mutated: iso !== value };
    }
  }
  return { iso: new Date().toISOString(), mutated: true };
};

const normalizeMessageMetadata = (
  message: Message
): { normalized: Message; mutated: boolean } => {
  const { iso, mutated: timestampMutated } = normalizeTimestamp(
    message.timestamp
  );
  let mutated = timestampMutated;
  let id = message.id;
  if (typeof id === 'number' && Number.isFinite(id)) {
    registerExistingMessageId(id);
  } else {
    id = mintMessageId();
    mutated = true;
  }
  return {
    normalized: {
      ...message,
      id,
      timestamp: iso,
    },
    mutated,
  };
};

const normalizeMessageList = (
  messages: Message[]
): { normalized: Message[]; mutated: boolean } => {
  let mutated = false;
  const normalized = messages.map(msg => {
    const { normalized: normalizedMsg, mutated: msgMutated } =
      normalizeMessageMetadata(msg);
    if (msgMutated) mutated = true;
    return normalizedMsg;
  });
  return { normalized, mutated };
};

const toLtmDate = (timestamp?: string): Date => {
  if (!timestamp) return new Date();
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const MAX_LTM_MESSAGES = 400;

const toHistoryRecord = (messages: Message[]) =>
  messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp ?? new Date().toISOString(),
    ...(typeof msg.id === 'number' && Number.isFinite(msg.id)
      ? { id: msg.id }
      : {}),
    ...(msg.images && msg.images.length ? { images: msg.images } : {}),
    ...(msg.imageIds && msg.imageIds.length ? { imageIds: msg.imageIds } : {}),
  }));

// Define context types
interface ApiContextType {
  sendQuery: (
    query: string,
    systemPrompt?: string,
    config?: Partial<AIConfig>,
    personaName?: string,
    images?: File[] // Add support for image files
  ) => Promise<{
    response: string;
    userEmotions: string[];
    responseEmotions: string[];
    emotion: string;
  }>;
  isLoading: boolean;
  error: string | null;
  conversationHistory: Message[];
  clearConversation: (personaName?: string) => void;
  currentPersona: string;
  setCurrentPersona: (personaName: string) => void;
  searchLongTermMemory: (query: string) => Promise<Message[]>;
  retrieveTimeBasedMemories: (
    startDate: Date,
    endDate: Date
  ) => Promise<Message[]>;
  retrieveLastNMemories: (count: number) => Promise<Message[]>;
}

// Create context with default values
const ApiContext = createContext<ApiContextType>({
  sendQuery: async () => ({
    response: '',
    userEmotions: [],
    responseEmotions: [],
    emotion: 'neutral',
  }),
  isLoading: false,
  error: null,
  conversationHistory: [],
  clearConversation: () => {},
  currentPersona: 'ALTER EGO',
  setCurrentPersona: () => {},
  searchLongTermMemory: async () => [],
  retrieveTimeBasedMemories: async () => [],
  retrieveLastNMemories: async () => [],
});

// Provider component
interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentPersona, setCurrentPersona] = useState<string>('ALTER EGO');
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Create an LTM-safe representation of a message, enriching with image refs (not shown in chat UI)
  const toLtmText = (msg: Message): string => {
    let base = msg.content || '';
    const ids = (msg as any).imageIds as string[] | undefined;
    const imgs = (msg as any).images as string[] | undefined;
    if ((ids && ids.length) || (imgs && imgs.length)) {
      const parts: string[] = [];
      if (ids && ids.length) parts.push(`ids=${ids.join(',')}`);
      if (imgs && imgs.length) parts.push(`count=${imgs.length}`);
      base += `\n[attached_images ${parts.join(' ')}]`;
    }
    return base.trim();
  };

  // Load the conversation history for the current persona
  useEffect(() => {
    loadPersonaHistory(currentPersona);
  }, [currentPersona]);

  // Function to load conversation history for a specific persona
  const loadPersonaHistory = async (personaName: string) => {
    const allHistory = loadChatHistory();

    const personaSession = allHistory.find(
      entry => entry.persona === personaName
    );

    if (personaSession) {
      setActiveSessionId(personaSession.id);

      const sessionMessages: Message[] = personaSession.messages.map(msg => {
        const anyMsg = msg as any;
        const base: Message = {
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          ...(typeof msg.id === 'number' && Number.isFinite(msg.id)
            ? { id: msg.id }
            : {}),
        };

        if (Array.isArray(anyMsg.images) && anyMsg.images.length) {
          base.images = anyMsg.images as string[];
        }

        if (Array.isArray(anyMsg.imageIds) && anyMsg.imageIds.length) {
          base.imageIds = anyMsg.imageIds as string[];
        }

        return base;
      });

      const { normalized: normalizedMessages, mutated } =
        normalizeMessageList(sessionMessages);

      setConversationHistory(limitConversationHistory(normalizedMessages));

      if (mutated) {
        const updatedHistory = allHistory.map(entry =>
          entry.id === personaSession.id
            ? {
                ...entry,
                messages: toHistoryRecord(normalizedMessages),
              }
            : entry
        );
        saveChatHistory(updatedHistory);
      }

      try {
        const existingLTM = await getPersonaMemory(personaName);
        if (!existingLTM) {
          const ltmMessages = normalizedMessages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map(msg => ({
              text: toLtmText(msg),
              isUser: msg.role === 'user',
              timestamp: toLtmDate(msg.timestamp),
              ...(typeof msg.id === 'number' ? { id: msg.id } : {}),
            }))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          const limitedMessages =
            ltmMessages.length > MAX_LTM_MESSAGES
              ? ltmMessages.slice(ltmMessages.length - MAX_LTM_MESSAGES)
              : ltmMessages;

          await savePersonaMemory(personaName, {
            messages: limitedMessages,
            users: [],
            aiConfig: {},
            voiceConfig: { enabled: false, language: 'en-US' },
          });
        }
      } catch (err) {
        console.error('Error storing in long-term memory:', err);
      }
    } else {
      const newSessionId = uuidv4();
      setActiveSessionId(newSessionId);
      setConversationHistory([]);

      const newSession: ChatHistoryEntry = {
        id: newSessionId,
        persona: personaName,
        timestamp: new Date().toISOString(),
        messages: [],
      };

      saveChatHistory([...allHistory, newSession]);
    }
  };

  // Function to search long-term memory (basic keyword search)
  const searchLongTermMemory = async (query: string): Promise<Message[]> => {
    try {
      const searchResults = await searchMessages(query, currentPersona);
      // Convert to the Message format
      return searchResults.map(msg => {
        const timestamp = msg.timestamp
          ? msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : new Date(msg.timestamp).toISOString()
          : new Date().toISOString();
        if (typeof msg.id === 'number') {
          registerExistingMessageId(msg.id);
        }
        return {
          role: msg.isUser ? ('user' as const) : ('assistant' as const),
          content: msg.text,
          id: msg.id,
          timestamp,
        };
      });
    } catch (err) {
      console.error('Error searching long-term memory:', err);
      return [];
    }
  };

  // Function to retrieve time-based memories
  const retrieveTimeBasedMemories = async (
    startDate: Date,
    endDate: Date
  ): Promise<Message[]> => {
    try {
      const messages = await getMessagesByTimeRange(
        startDate,
        endDate,
        currentPersona
      );
      // Convert to the Message format
      return messages.map(msg => {
        const timestamp = msg.timestamp
          ? msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : new Date(msg.timestamp).toISOString()
          : new Date().toISOString();
        if (typeof msg.id === 'number') {
          registerExistingMessageId(msg.id);
        }
        return {
          role: msg.isUser ? ('user' as const) : ('assistant' as const),
          content: msg.text,
          id: msg.id,
          timestamp,
        };
      });
    } catch (err) {
      console.error('Error retrieving time-based memories:', err);
      return [];
    }
  };

  // Function to retrieve last N memories
  const retrieveLastNMemories = async (count: number): Promise<Message[]> => {
    try {
      const messages = await getLastNMessages(count, currentPersona);
      // Convert to the Message format
      return messages.map(msg => {
        const timestamp = msg.timestamp
          ? msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : new Date(msg.timestamp).toISOString()
          : new Date().toISOString();
        if (typeof msg.id === 'number') {
          registerExistingMessageId(msg.id);
        }
        return {
          role: msg.isUser ? ('user' as const) : ('assistant' as const),
          content: msg.text,
          id: msg.id,
          timestamp,
        };
      });
    } catch (err) {
      console.error('Error retrieving last N memories:', err);
      return [];
    }
  };

  // Advanced semantic search function for long-term memory retrieval
  const semanticSearchLongTermMemory = async (
    query: string,
    excludeIds: number[] = []
  ): Promise<Message[]> => {
    try {
      // Perform semantic search in LTM for this persona
      const searchResults = await semanticSearchMessages(
        query,
        currentPersona,
        excludeIds,
        5 // Retrieve max 5 relevant messages
      );

      // Convert to Message format
      return searchResults.map(msg => {
        const timestamp = msg.timestamp
          ? msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : new Date(msg.timestamp).toISOString()
          : new Date().toISOString();
        if (typeof msg.id === 'number') {
          registerExistingMessageId(msg.id);
        }
        return {
          role: msg.isUser ? ('user' as const) : ('assistant' as const),
          content: msg.text,
          id: msg.id,
          timestamp,
        };
      });
    } catch (err) {
      console.error('Error in semantic search of long-term memory:', err);
      return [];
    }
  };

  const limitConversationHistory = (
    messages: Message[],
    forAiContext: boolean = false
  ) => {
    // Only apply memory buffer limit when preparing context for AI requests
    if (forAiContext) {
      const { memoryBuffer } = loadSettings();
      const normalizedBuffer = normalizeMemoryBuffer(memoryBuffer);
      return messages.slice(-normalizedBuffer * 2); // Keep only the last N exchanges for AI context
    }

    // For display purposes, return all messages
    return messages;
  };

  // Function to save the current conversation state
  const saveCurrentConversation = async (
    messages: Message[]
  ): Promise<Message[]> => {
    const { normalized } = normalizeMessageList(messages);

    if (!activeSessionId) {
      return normalized;
    }

    const normalizedHistory = toHistoryRecord(normalized);
    const allHistory = loadChatHistory();
    let sessionFound = false;

    const updatedHistory = allHistory.map(entry => {
      if (entry.id === activeSessionId) {
        sessionFound = true;
        return {
          ...entry,
          messages: normalizedHistory,
          timestamp: new Date().toISOString(),
        };
      }
      return entry;
    });

    if (!sessionFound) {
      updatedHistory.push({
        id: activeSessionId,
        persona: currentPersona,
        timestamp: new Date().toISOString(),
        messages: normalizedHistory,
      });
    }

    saveChatHistory(updatedHistory);
    try {
      window.dispatchEvent(new CustomEvent('chat-history-updated'));
    } catch {}

    try {
      const ltmMessages = normalized
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          text: toLtmText(msg),
          isUser: msg.role === 'user',
          timestamp: toLtmDate(msg.timestamp),
          id: msg.id,
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const limited =
        ltmMessages.length > MAX_LTM_MESSAGES
          ? ltmMessages.slice(ltmMessages.length - MAX_LTM_MESSAGES)
          : ltmMessages;

      const existingLTM = await getPersonaMemory(currentPersona);
      if (existingLTM) {
        existingLTM.messages = limited;
        await savePersonaMemory(currentPersona, existingLTM);
      } else {
        await savePersonaMemory(currentPersona, {
          messages: limited,
          users: [],
          aiConfig: {},
          voiceConfig: { enabled: false, language: 'en-US' },
        });
      }
    } catch (err) {
      console.error('Error saving to long-term memory:', err);
    }

    return normalized;
  };

  // Function to clear conversation history for a specific persona or the current one
  const clearConversation = async (personaName?: string) => {
    const targetPersona = personaName || currentPersona;

    // Clear in-memory conversation
    if (targetPersona === currentPersona) {
      setConversationHistory([]);
    }

    // Option 1: Clear stored conversation for specific persona only
    const allHistory = loadChatHistory();
    const updatedHistory = allHistory.map(entry => {
      if (entry.persona === targetPersona) {
        return {
          ...entry,
          messages: [],
          timestamp: new Date().toISOString(),
        };
      }
      return entry;
    });

    saveChatHistory(updatedHistory);

    // Generate a new session ID to ensure a completely fresh start
    if (targetPersona === currentPersona) {
      const newSessionId = uuidv4();
      setActiveSessionId(newSessionId);

      // Update the session ID in saved history
      const historyCopy = [...updatedHistory];
      const personaIndex = historyCopy.findIndex(
        entry => entry.persona === targetPersona
      );

      if (personaIndex >= 0) {
        historyCopy[personaIndex] = {
          ...historyCopy[personaIndex],
          id: newSessionId,
        };
        saveChatHistory(historyCopy);
        try {
          window.dispatchEvent(new CustomEvent('chat-history-updated'));
        } catch {}
      }
    }

    // Also clear from long-term memory database
    try {
      await deletePersonaMemory(targetPersona);
      // Clear associative facts for this persona
      try {
        const { clearPersonaAssociations } = await import(
          '../memory/associativeMemory'
        );
        clearPersonaAssociations(targetPersona);
      } catch (err) {
        console.warn('Failed to clear associative memory for persona:', err);
      }
    } catch (err) {
      console.error('Error clearing from long-term memory:', err);
    }

    // Log confirmation that memory was fully cleared
    console.log(`Memory fully cleared for persona: ${targetPersona}`);
  };

  // Function to change the current persona
  const handleSetCurrentPersona = (personaName: string) => {
    if (personaName !== currentPersona) {
      setCurrentPersona(personaName);
      // History will be loaded by the useEffect hook
    }
  };

  // Function to format memories for RAG
  const formatMemoriesForRAG = (memories: Message[]): Message[] => {
    if (memories.length === 0) return [];

    // Add a header to indicate these are from long-term memory
    const header: Message = {
      role: 'system',
      content: `The following are relevant past conversations with ${currentPersona} retrieved from long-term memory:`,
      timestamp: new Date().toISOString(),
    };

    // Format each memory as a clear exchange
    const formattedMemories: Message[] = memories.map(msg => {
      const prefix =
        msg.role === 'user'
          ? '(From past conversation) User asked: '
          : '(From past conversation) ALTER EGO replied: ';
      const { iso } = normalizeTimestamp(msg.timestamp);

      return {
        role: 'system' as const,
        content: `${prefix}${msg.content}`,
        timestamp: iso,
      };
    });

    // Add a footer to separate memories from current conversation
    const footer: Message = {
      role: 'system',
      content: 'End of past memories. Return to current conversation:',
      timestamp: new Date().toISOString(),
    };

    return [header, ...formattedMemories, footer];
  };

  // Function to get IDs of messages in short-term memory buffer
  const getShortTermMemoryIds = (recentCount: number): number[] => {
    if (!recentCount || recentCount <= 0) return [];
    return conversationHistory
      .slice(-recentCount)
      .filter(msg => msg.id !== undefined)
      .map(msg => msg.id as number);
  };

  // Function to send a query to the AI
  const sendQuery = async (
    query: string,
    systemPrompt: string = 'You are ALTER EGO, an intelligent and helpful AI assistant. This is dummy text to fall back on.',
    config?: Partial<AIConfig>,
    personaName?: string,
    images?: File[]
  ) => {
    // If a specific persona is provided and it's different from current,
    // switch to that persona first (useful for direct API calls)
    if (personaName && personaName !== currentPersona) {
      handleSetCurrentPersona(personaName);
    }

    setIsLoading(true);
    setError(null);

    // Start token tracking for this query
    const sessionId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    tokenTracker.startQuery(sessionId);

    try {
      let imageUrls: string[] = [];
      let imageIds: string[] = [];

      // Process images if provided
      if (images && images.length > 0) {
        console.log(`Processing ${images.length} images...`);

        // Validate all images first
        for (const image of images) {
          const validation = validateImageFile(image);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
        }

        // Process and cache images
        for (const image of images) {
          try {
            // Save to cache for future reference
            const cachedImage = await saveImageToCache(
              image,
              currentPersona,
              `Image uploaded by ${currentPersona}`
            );

            // Compress image for API efficiency (reduce token usage)
            const compressedDataUrl = await processImage(image, {
              maxWidth: 800, // Smaller max size for API calls
              maxHeight: 800,
              quality: 0.7, // Lower quality for API efficiency
              format: 'jpeg', // JPEG is more compressed than PNG
            });

            imageUrls.push(compressedDataUrl);
            imageIds.push(cachedImage.id);

            console.log(`Processed image: ${image.name} (${cachedImage.id})`);

            // Queue image for background AI analysis (doesn't block user response)
            queueImageForAnalysis(
              cachedImage.id,
              compressedDataUrl,
              currentPersona,
              2
            ); // Priority 2 for user uploads
          } catch (err) {
            console.error('Error processing image:', err);
            throw new Error(
              `Failed to process image ${image.name}: ${err instanceof Error ? err.message : 'Unknown error'}`
            );
          }
        }
      }

      // Add the new user message to history (with images if any)
      const userMessageBase: Message = {
        role: 'user' as const,
        content: query,
        timestamp: new Date().toISOString(),
        ...(imageUrls.length > 0 && { images: imageUrls }),
        ...(imageIds.length > 0 && { imageIds }),
      };

      const { normalized: normalizedUserMessage } =
        normalizeMessageMetadata(userMessageBase);

      const updatedFullHistory: Message[] = [
        ...conversationHistory,
        normalizedUserMessage,
      ]; // Apply memory buffer limitation ONLY for the AI context
      const memoryBuffer = normalizeMemoryBuffer(loadSettings().memoryBuffer);
      // Build a smart short‑term context (balanced, truncated, budget‑aware)
      const { pruned: limitedContextForAI, summary: shortSummary } =
        buildShortTermContext(conversationHistory, {
          memoryPairs: memoryBuffer,
          charBudget: 2000,
        });

      console.log(
        `Memory buffer set to ${memoryBuffer}, using ${limitedContextForAI.length} messages for context`
      );

      let associationContext: MessageHistory[] = [];

      // Extract and store simple associations (semantic facts) from current user query
      try {
        const pairs = parseAssociationsFromText(query);
        if (pairs.length) {
          addAssociations(currentPersona, pairs);
        }
      } catch (e) {
        console.warn('Association parse failed:', e);
      }

      try {
        const { getRightsUsedInText, touchAssociations, getAssociations } =
          await import('../memory/associativeMemory');
        const used = getRightsUsedInText(currentPersona, query);
        if (used.length) {
          touchAssociations(currentPersona, used);
        }
        const allAssociations = getAssociations(currentPersona);
        const prioritized = used.length
          ? used
          : allAssociations.slice(0, Math.min(4, allAssociations.length));
        if (prioritized.length) {
          const summary = prioritized
            .map(({ left, right }) => `${left}=${right}`)
            .join('; ');
          associationContext.push({
            role: 'system' as const,
            content: `Associative memory recall (${currentPersona}): ${summary}`,
          });
        }
      } catch (assocErr) {
        console.warn('Failed to build associative context:', assocErr);
      }

      // Get IDs of messages already in short-term memory to avoid duplicates
      const shortTermMemoryIds = getShortTermMemoryIds(memoryBuffer * 2);
      if (typeof normalizedUserMessage.id === 'number') {
        shortTermMemoryIds.push(normalizedUserMessage.id);
      }

      // Try to retrieve relevant context from long-term memory using semantic search
      let relevantMemories: Message[] = [];
      try {
        // Use semantic search to find memories related to the query
        // Pass in short-term memory IDs to exclude those messages
        const searchResults = await semanticSearchLongTermMemory(
          query,
          shortTermMemoryIds
        );

        // Only include if we found something meaningful
        if (searchResults.length > 0) {
          // Format memories properly for RAG
          relevantMemories = formatMemoriesForRAG(searchResults);

          console.log(
            `Retrieved ${searchResults.length} semantically relevant memories from long-term storage`
          );
        }
      } catch (err) {
        console.error('Error retrieving from long-term memory:', err);
      } // Construct the full message history for the AI (excluding system prompt and current user message)
      const messagesForAI: MessageHistory[] = [
        // Associative context comes first so the model sees persona-specific facts
        ...associationContext,

        // Add any relevant memories from long-term storage (already formatted for RAG)
        ...relevantMemories.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),

        // Optional short summary of recent focus (merged to system prompt downstream)
        ...(shortSummary
          ? [{ role: 'system' as const, content: shortSummary }]
          : []),

        // Then add the current conversation context (excluding current user message)
        ...limitedContextForAI.map(msg => ({
          role: msg.role,
          content: msg.content,
          ...(msg.images && { images: msg.images }),
        })),
      ];

      // Debug logging to verify no duplicate user messages    // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('=== MESSAGE CONSTRUCTION DEBUG ===');
        console.log('Current user query:', query);
        console.log('Images attached:', imageUrls.length);
        console.log('Conversation history length:', conversationHistory.length);
        console.log(
          'Limited context for AI length:',
          limitedContextForAI.length
        );
        console.log('Messages for AI length:', messagesForAI.length);
        console.log(
          'Messages for AI roles:',
          messagesForAI.map(m => m.role)
        );
        console.log('=== END MESSAGE DEBUG ===');
      }

      // Build an enhanced system prompt with associative facts (compact)
      let effectiveSystemPrompt = systemPrompt;
      try {
        const factsLine = buildFactsLine(currentPersona);
        if (factsLine) {
          effectiveSystemPrompt = `${systemPrompt}\n\n${factsLine}`;
        }
      } catch {}

      // Reinforce associations if the current query uses any right-side tokens
      try {
        const { getRightsUsedInText, touchAssociations } = await import(
          '../memory/associativeMemory'
        );
        const used = getRightsUsedInText(currentPersona, query);
        if (used.length) touchAssociations(currentPersona, used);
      } catch {}

      // Call the AI service with the combined context (including images)
      let response = await sendMessageToAI(
        query,
        effectiveSystemPrompt,
        messagesForAI,
        config,
        imageUrls, // Pass images to AI service
        sessionId // Pass session ID for token tracking
      );

      // Output sanitization: enforce no emojis and trim meaningless closers
      try {
        const stripEmojis = (s: string) =>
          s
            // Remove emoji presentation and most pictographs
            .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
            // Remove standard emoticons / kaomoji-like patterns conservatively
            .replace(/(:\)|;\)|:\(|:D|XD|xD|:\]|;\]|:\}|<3|:\/|:\\\(|\^_\^|¯\\_\(ツ\)_\/¯)/g, '');
        const stripStockClosers = (s: string) => {
          const patterns = [
            // placeholder text to keep the list valid and not have a red line
            /\b(Bingus McWingus (Surely nobody will end their sentence with this, right?)\.)/gi,
          ];
          let out = s;
          for (const p of patterns) out = out.replace(p, '');
          // Clean extra spaces/lines introduced
          return out.replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        };
        response = stripStockClosers(stripEmojis(response));
      } catch {}

      // Update conversation history with the AI's response
      const assistantMessageBase: Message = {
        role: 'assistant' as const,
        content: response,
        timestamp: new Date().toISOString(),
      };
      const { normalized: normalizedAssistantMessage } =
        normalizeMessageMetadata(assistantMessageBase);

      const finalHistory: Message[] = [
        ...updatedFullHistory,
        normalizedAssistantMessage,
      ];
      const persistedHistory = await saveCurrentConversation(finalHistory);
      setConversationHistory(persistedHistory);
      // Classify emotions using the new emotion service
      const primaryEmotion = classifyConversationEmotion(query, response);
      const userEmotions = analyzeUserEmotions(query);
      const responseEmotions = analyzeResponseEmotions(response);

      // Complete token tracking and show summary
      tokenTracker.completeQuery(sessionId);

      setIsLoading(false);
      return {
        response,
        userEmotions: userEmotions.emotions,
        responseEmotions: responseEmotions.emotions,
        emotion: primaryEmotion,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // Complete token tracking even on error
      tokenTracker.completeQuery(sessionId);

      setIsLoading(false);
      return {
        response: `Error: ${errorMessage}`,
        userEmotions: ['ERROR (100%)'],
        responseEmotions: ['ERROR (100%)'],
        emotion: 'neutral',
      };
    }
  };

  return (
    <ApiContext.Provider
      value={{
        sendQuery,
        isLoading,
        error,
        conversationHistory,
        clearConversation,
        currentPersona,
        setCurrentPersona: handleSetCurrentPersona,
        searchLongTermMemory,
        retrieveTimeBasedMemories,
        retrieveLastNMemories,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};

// Hook to use the API context
export const useApi = () => useContext(ApiContext);
