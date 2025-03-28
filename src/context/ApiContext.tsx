import React, { createContext, useContext, useState, ReactNode } from 'react';
import { sendMessageToAI, AIConfig } from '../services/aiService';

// Define message type
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Define context types
interface ApiContextType {
  sendQuery: (query: string, systemPrompt?: string, config?: Partial<AIConfig>) => Promise<{
    response: string;
    userEmotions: string[];
    responseEmotions: string[];
    emotion: string;
  }>;
  isLoading: boolean;
  error: string | null;
  conversationHistory: Message[];
  clearConversation: () => void;
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
  clearConversation: () => {}
});

// Provider component
interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  // Function to clear conversation history
  const clearConversation = () => {
    setConversationHistory([]);
  };

  // Function to send a query to the AI
  const sendQuery = async (
    query: string, 
    systemPrompt: string = "You are ALTER EGO, an intelligent and helpful AI assistant.",
    config?: Partial<AIConfig>
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the AI service with history and config
      const response = await sendMessageToAI(query, systemPrompt, conversationHistory, config);
      
      // Update conversation history with properly typed roles
      const updatedHistory: Message[] = [
        ...conversationHistory,
        { role: 'user', content: query },
        { role: 'assistant', content: response }
      ];
      
      // Keep only the last 20 messages to avoid token limits but provide enough context
      setConversationHistory(updatedHistory.slice(-20));
      
      // For now, generate dummy emotions - this can be enhanced later
      const userEmotions = ['curiosity'];
      const responseEmotions = ['neutral'];
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
    <ApiContext.Provider value={{ sendQuery, isLoading, error, conversationHistory, clearConversation }}>
      {children}
    </ApiContext.Provider>
  );
};

// Hook to use the API context
export const useApi = () => useContext(ApiContext);