import { generateChatCompletion, getAvailableModels, getTokenUsageStats } from '../utils/openaiApi';
import { loadApiKeys } from '../utils/storageUtils';

// Interface for conversation history
export interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
}

// Interface for configuration
export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

// Default configuration
const defaultConfig: AIConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1000
};

// Get current configuration
export const getAIConfig = (): AIConfig => {
  try {
    const configStr = localStorage.getItem('alterEgo_aiConfig');
    if (!configStr) return defaultConfig;
    return JSON.parse(configStr);
  } catch (error) {
    console.error('Error loading AI config:', error);
    return defaultConfig;
  }
};

// Save configuration
export const saveAIConfig = (config: AIConfig): void => {
  localStorage.setItem('alterEgo_aiConfig', JSON.stringify(config));
};

// Get available models
export const getModels = (): string[] => {
  return getAvailableModels();
};

// Get token usage statistics
export const getUsageStats = (): { total: number, byModel: Record<string, number> } => {
  return getTokenUsageStats();
};

// Updated AI service to use OpenAI with configurations and persona
export const sendMessageToAI = async (
  message: string,
  systemPrompt: string = "You are ALTER EGO, an intelligent AI personality.",
  history: MessageHistory[] = [],
  config?: Partial<AIConfig>
): Promise<string> => {
  try {
    const { OPENAI_API_KEY } = loadApiKeys();
    
    if (!OPENAI_API_KEY) {
      return "OpenAI API key is not set. Please add your API key in the Settings panel.";
    }
    
    // Get current configuration and apply any overrides
    const currentConfig = getAIConfig();
    const finalConfig = {
      ...currentConfig,
      ...config
    };
    
    // Log the full system prompt including persona and model
    const fullSystemPrompt = `${systemPrompt} ${finalConfig.model}`;
    console.log(`Full system prompt: ${fullSystemPrompt}`);
    // Log JUST the persona being used (for debugging)
    console.log(`Using persona: ${systemPrompt.substring(0, 50)}...`);
    
    // Log the number of messages in history for debugging
    console.log(`Using ${history.length} messages from history for AI context`);
    
    // Call the OpenAI API with configuration and persona
    // The history is already limited by the caller
    const response = await generateChatCompletion(
      systemPrompt,
      message,
      history,
      finalConfig.model,
      finalConfig.temperature,
      finalConfig.maxTokens
    );
    
    return response;
  } catch (error) {
    console.error('Error in AI service:', error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return 'Failed to get response from AI service. Please check your API key and try again.';
  }
};