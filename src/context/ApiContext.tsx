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
  id?: number;
  images?: string[]; // Array of image URLs/data URLs
  imageIds?: string[]; // Array of cached image IDs for reference
}

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

    // Find an existing session for this persona or create a new one
    let personaSession = allHistory.find(
      entry => entry.persona === personaName
    );

    if (personaSession) {
      // Use existing session
      setActiveSessionId(personaSession.id);

      // Convert stored format to the format used in the component
      const messages: Message[] = personaSession.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Apply memory buffer limit to loaded conversations
      setConversationHistory(limitConversationHistory(messages));

      // Also store in long term memory if not already there
      try {
        const existingLTM = await getPersonaMemory(personaName);
        if (!existingLTM) {
          // Convert messages to the format expected by LTMDatabase
          const ltmMessages = messages.map(msg => ({
            text: toLtmText(msg),
            isUser: msg.role === 'user',
            timestamp: new Date(),
          }));

          // Store in long-term memory
          await savePersonaMemory(personaName, {
            messages: ltmMessages,
            users: [],
            aiConfig: {},
            voiceConfig: { enabled: false, language: 'en-US' },
          });
        }
      } catch (err) {
        console.error('Error storing in long-term memory:', err);
      }
    } else {
      // Create a new session for this persona
      const newSessionId = uuidv4();
      setActiveSessionId(newSessionId);
      setConversationHistory([]);

      // Save the new session
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
      return searchResults.map(msg => ({
        role: msg.isUser ? ('user' as const) : ('assistant' as const),
        content: msg.text,
        id: msg.id,
      }));
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
      return messages.map(msg => ({
        role: msg.isUser ? ('user' as const) : ('assistant' as const),
        content: msg.text,
        id: msg.id,
      }));
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
      return messages.map(msg => ({
        role: msg.isUser ? ('user' as const) : ('assistant' as const),
        content: msg.text,
        id: msg.id,
      }));
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
      return searchResults.map(msg => ({
        role: msg.isUser ? ('user' as const) : ('assistant' as const),
        content: msg.text,
        id: msg.id,
      }));
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
      return messages.slice(-memoryBuffer * 2); // Keep only the last N exchanges for AI context
    }

    // For display purposes, return all messages
    return messages;
  };

  // Function to save the current conversation state
  const saveCurrentConversation = async (messages: Message[]) => {
    if (!activeSessionId) return;

    const allHistory = loadChatHistory();

    // Save all messages, not just the limited ones
    const updatedHistory = allHistory.map(entry => {
      if (entry.id === activeSessionId) {
        return {
          ...entry,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString(),
          })),
          timestamp: new Date().toISOString(), // Update the timestamp
        };
      }
      return entry;
    });

    // If the session wasn't found, add it
    if (!updatedHistory.find(entry => entry.id === activeSessionId)) {
      updatedHistory.push({
        id: activeSessionId,
        persona: currentPersona,
        timestamp: new Date().toISOString(),
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString(),
        })),
      });
    }

    saveChatHistory(updatedHistory);

    // Also save to long-term memory
    try {
      // Convert messages to the format expected by LTMDatabase
      const ltmMessages = messages.map(msg => ({
        text: toLtmText(msg),
        isUser: msg.role === 'user',
        timestamp: new Date(),
        id: msg.id,
      }));

      // Get existing LTM for this persona or create new
      const existingLTM = await getPersonaMemory(currentPersona);
      if (existingLTM) {
        // Update existing memory
        existingLTM.messages = ltmMessages;
        await savePersonaMemory(currentPersona, existingLTM);
      } else {
        // Create new memory
        await savePersonaMemory(currentPersona, {
          messages: ltmMessages,
          users: [],
          aiConfig: {},
          voiceConfig: { enabled: false, language: 'en-US' },
        });
      }
    } catch (err) {
      console.error('Error saving to long-term memory:', err);
    }
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
    };

    // Format each memory as a clear exchange
    const formattedMemories: Message[] = memories.map((msg, index) => {
      // For better clarity, add context about who said what
      const prefix =
        msg.role === 'user'
          ? '(From past conversation) User asked: '
          : '(From past conversation) ALTER EGO replied: ';

      return {
        role: 'system' as const,
        content: `${prefix}${msg.content}`,
      };
    });

    // Add a footer to separate memories from current conversation
    const footer: Message = {
      role: 'system',
      content: 'End of past memories. Return to current conversation:',
    };

    return [header, ...formattedMemories, footer];
  };

  // Function to get IDs of messages in short-term memory buffer
  const getShortTermMemoryIds = (): number[] => {
    return conversationHistory
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
      const userMessage: Message = {
        role: 'user' as const,
        content: query,
        ...(imageUrls.length > 0 && { images: imageUrls }),
        ...(imageIds.length > 0 && { imageIds: imageIds }),
      };

      const updatedFullHistory: Message[] = [
        ...conversationHistory,
        userMessage,
      ]; // Apply memory buffer limitation ONLY for the AI context
      const { memoryBuffer } = loadSettings();
      // Build a smart short‑term context (balanced, truncated, budget‑aware)
      const { pruned: limitedContextForAI, summary: shortSummary } =
        buildShortTermContext(conversationHistory, {
          memoryPairs: memoryBuffer,
          charBudget: 2000,
        });

      console.log(
        `Memory buffer set to ${memoryBuffer}, using ${limitedContextForAI.length} messages for context`
      );

      // Extract and store simple associations (semantic facts) from current user query
      try {
        const pairs = parseAssociationsFromText(query);
        if (pairs.length) {
          addAssociations(currentPersona, pairs);
        }
      } catch (e) {
        console.warn('Association parse failed:', e);
      }

      // Get IDs of messages already in short-term memory to avoid duplicates
      const shortTermMemoryIds = getShortTermMemoryIds();

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
      const response = await sendMessageToAI(
        query,
        effectiveSystemPrompt,
        messagesForAI,
        config,
        imageUrls, // Pass images to AI service
        sessionId // Pass session ID for token tracking
      );

      // Update conversation history with the AI's response
      const finalHistory: Message[] = [
        ...updatedFullHistory,
        { role: 'assistant' as const, content: response },
      ]; // Save the complete conversation history
      setConversationHistory(finalHistory);
      await saveCurrentConversation(finalHistory); // Classify emotions using the new emotion service
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
