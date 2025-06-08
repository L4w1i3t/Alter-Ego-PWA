import { generateChatCompletion, getAvailableModels, getTokenUsageStats } from '../utils/openaiApi';
import { generateOpenSourceCompletion, validateBackendReady, OPEN_SOURCE_CONFIG } from '../utils/openSourceApi';
import { loadApiKeys, loadSettings } from '../utils/storageUtils';
import { getOpenSourceStatus, checkOpenSourceFallback } from '../utils/openSourceWip';

// Interface for conversation history
export interface MessageHistory {
  role: 'user' | 'assistant' | 'system';
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
): Promise<string> => {  try {    
    // Check if Open Source model is selected
    const settings = loadSettings();
    const selectedModel = settings.selectedModel || 'Open Source';
    
    if (selectedModel === 'Open Source') {
      const wipStatus = getOpenSourceStatus();
      if (wipStatus.isWip) {
        const fallbackMessage = checkOpenSourceFallback(selectedModel);
        return fallbackMessage || "🚧 Open Source model is currently under development. Please use OpenAI for full functionality.";
      }
      
      // Try to use the open-source backend
      try {
        console.log('Using open-source backend for AI completion');
        
        // Validate backend is ready
        const backendStatus = await validateBackendReady();
        if (!backendStatus.ready) {
          throw new Error(backendStatus.error || 'Backend not ready');
        }
        
        // Get current configuration and apply any overrides
        const currentConfig = getAIConfig();
        const finalConfig = {
          ...currentConfig,
          ...config
        };
        
        // Use the configured open-source model or default
        const openSourceModel = settings.openSourceModel || OPEN_SOURCE_CONFIG.defaultModel;
        
        // Prepare messages for the backend
        const messages: MessageHistory[] = [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message }
        ];
        
        console.log(`Using open-source model: ${openSourceModel}`);
        console.log(`Using ${history.length} messages from history for AI context`);
        
        // Call the open-source backend
        const response = await generateOpenSourceCompletion(
          messages,
          openSourceModel,
          finalConfig.temperature,
          finalConfig.maxTokens
        );
        
        return response;
        
      } catch (backendError) {
        console.error('Open-source backend error:', backendError);
        
        // Fallback to OpenAI if backend fails
        console.log('Falling back to OpenAI due to backend error');
        const fallbackMessage = `⚠️ Open-source backend unavailable (${backendError instanceof Error ? backendError.message : 'Unknown error'}). Switching to OpenAI...`;
        
        // Continue to OpenAI logic below
        console.warn(fallbackMessage);
      }
    }
    
    // OpenAI logic (original code)
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
      history.filter(msg => msg.role === 'user' || msg.role === 'assistant') as { role: 'user' | 'assistant', content: string }[], // Filter to only user and assistant messages
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