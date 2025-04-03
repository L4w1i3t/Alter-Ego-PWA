import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { sendMessageToAI, AIConfig } from '../services/aiService';
import { loadChatHistory, saveChatHistory, ChatHistoryEntry, loadSettings } from '../utils/storageUtils';
import { v4 as uuidv4 } from 'uuid';

// Define message type
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Define context types
interface ApiContextType {
  sendQuery: (query: string, systemPrompt?: string, config?: Partial<AIConfig>, personaName?: string) => Promise<{
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
}

// Create context with default values
const ApiContext = createContext<ApiContextType>({
  sendQuery: async () => ({ 
    response: '', 
    userEmotions: [], 
    responseEmotions: [],
    emotion: 'neutral'
  }),
  isLoading: false,
  error: null,
  conversationHistory: [],
  clearConversation: () => {},
  currentPersona: "ALTER EGO",
  setCurrentPersona: () => {}
});

// Provider component
interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentPersona, setCurrentPersona] = useState<string>("ALTER EGO");
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  
  // Load the conversation history for the current persona
  useEffect(() => {
    loadPersonaHistory(currentPersona);
  }, [currentPersona]);
  
  // Function to load conversation history for a specific persona
  const loadPersonaHistory = (personaName: string) => {
    const allHistory = loadChatHistory();
    
    // Find an existing session for this persona or create a new one
    let personaSession = allHistory.find(entry => entry.persona === personaName);
    
    if (personaSession) {
      // Use existing session
      setActiveSessionId(personaSession.id);
      
      // Convert stored format to the format used in the component
      const messages: Message[] = personaSession.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Apply memory buffer limit to loaded conversations
      setConversationHistory(limitConversationHistory(messages));
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
        messages: []
      };
      
      saveChatHistory([...allHistory, newSession]);
    }
  };

  const limitConversationHistory = (messages: Message[], forAiContext: boolean = false) => {
    // Only apply memory buffer limit when preparing context for AI requests
    if (forAiContext) {
      const { memoryBuffer } = loadSettings();
      return messages.slice(-memoryBuffer * 2); // Keep only the last N exchanges for AI context
    }
    
    // For display purposes, return all messages
    return messages;
  };
  
  // Function to save the current conversation state
  const saveCurrentConversation = (messages: Message[]) => {
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
            timestamp: new Date().toISOString()
          })),
          timestamp: new Date().toISOString() // Update the timestamp
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
          timestamp: new Date().toISOString()
        }))
      });
    }
    
    saveChatHistory(updatedHistory);
  };

  // Function to clear conversation history for a specific persona or the current one
  const clearConversation = (personaName?: string) => {
    const targetPersona = personaName || currentPersona;
    
    // Clear in-memory conversation
    if (targetPersona === currentPersona) {
      setConversationHistory([]);
    }
    
    // Clear stored conversation
    const allHistory = loadChatHistory();
    const updatedHistory = allHistory.map(entry => {
      if (entry.persona === targetPersona) {
        return {
          ...entry,
          messages: [],
          timestamp: new Date().toISOString()
        };
      }
      return entry;
    });
    
    saveChatHistory(updatedHistory);
  };
  
  // Function to change the current persona
  const handleSetCurrentPersona = (personaName: string) => {
    if (personaName !== currentPersona) {
      setCurrentPersona(personaName);
      // History will be loaded by the useEffect hook
    }
  };

  // Function to send a query to the AI
  // Function to send a query to the AI
const sendQuery = async (
  query: string, 
  systemPrompt: string = "You are ALTER EGO, an intelligent and helpful AI assistant. This is dummy text to fall back on.",
  config?: Partial<AIConfig>,
  personaName?: string
) => {
  // If a specific persona is provided and it's different from current,
  // switch to that persona first (useful for direct API calls)
  if (personaName && personaName !== currentPersona) {
    handleSetCurrentPersona(personaName);
  }
  
  setIsLoading(true);
  setError(null);
  
  try {
    // Add the new user message to history
    const updatedFullHistory: Message[] = [
      ...conversationHistory, 
      { role: 'user' as const, content: query }
    ];
    
    // Apply memory buffer limitation ONLY for the AI context
    const { memoryBuffer } = loadSettings();
    // Take only the last N exchanges based on memory buffer setting
    const limitedContextForAI = updatedFullHistory.slice(-memoryBuffer * 2);
    
    console.log(`Memory buffer set to ${memoryBuffer}, using ${limitedContextForAI.length} messages for context`);
    
    // Convert Message[] to MessageHistory[] expected by sendMessageToAI
    const messagesForAI = limitedContextForAI.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Call the AI service with limited history for context
    const response = await sendMessageToAI(query, systemPrompt, messagesForAI, config);
    
    // Update conversation history with the AI's response
    const finalHistory: Message[] = [
      ...updatedFullHistory,
      { role: 'assistant' as const, content: response }
    ];
    
    // Save the complete conversation history
    setConversationHistory(finalHistory);
    saveCurrentConversation(finalHistory);
    
    // For now, generate dummy emotions - this can be enhanced later
    const userEmotions = ['CURRENTLY UNAVAILABLE'];
    const responseEmotions = ['CURRENTLY UNAVAILABLE'];
    const emotion = 'neutral';
    
    setIsLoading(false);
    return { response, userEmotions, responseEmotions, emotion };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    setError(errorMessage);
    setIsLoading(false);
    return { 
      response: `Error: ${errorMessage}`, 
      userEmotions: [], 
      responseEmotions: [],
      emotion: 'neutral'
    };
  }
};

  return (
    <ApiContext.Provider value={{ 
      sendQuery, 
      isLoading, 
      error, 
      conversationHistory, 
      clearConversation,
      currentPersona,
      setCurrentPersona: handleSetCurrentPersona
    }}>
      {children}
    </ApiContext.Provider>
  );
};

// Hook to use the API context
export const useApi = () => useContext(ApiContext);