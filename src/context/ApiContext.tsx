import React, { createContext, useContext, useState, ReactNode } from 'react';
import { sendMessageToAI } from '../services/aiService';

// Define context types
interface ApiContextType {
  sendQuery: (query: string) => Promise<{
    response: string;
    userEmotions: string[];
    responseEmotions: string[];
    emotion: string;
  }>;
  isLoading: boolean;
  error: string | null;
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
});

// Provider component
interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to send a query to the AI
  const sendQuery = async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the AI service
      const response = await sendMessageToAI(query);
      
      // For now, generate dummy emotions
      // In the real application, these would come from the backend
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
    <ApiContext.Provider value={{ sendQuery, isLoading, error }}>
      {children}
    </ApiContext.Provider>
  );
};

// Hook to use the API context
export const useApi = () => useContext(ApiContext);