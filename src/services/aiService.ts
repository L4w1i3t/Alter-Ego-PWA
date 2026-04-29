import {
  generateChatCompletion,
  generateVisionChatCompletion,
  generateOpenRouterChatCompletion,
  getAvailableModels,
  getTokenUsageStats,
  modelSupportsVision,
} from '../utils/openaiApi';
import { generateOllamaChatCompletion } from '../utils/ollamaApi';
import { loadApiKeys, loadSettings, getAIConfigFromStorage, saveAIConfigToStorage } from '../utils/storageUtils';
import { detectAIProvider, getModelForProvider } from '../utils/aiProviders';
import type { AIConfig, MessageHistory } from '../types';
import { AI, STORAGE_KEYS } from '../config/constants';
import { logger } from '../utils/logger';

// Re-export types for backward compatibility
export type { AIConfig, MessageHistory };

// Types are now imported from centralized location

// Default configuration
const defaultConfig: AIConfig = {
  model: AI.DEFAULT_MODEL,
  temperature: AI.DEFAULT_TEMPERATURE,
  maxTokens: AI.DEFAULT_MAX_TOKENS,
};

// Get current configuration
export const getAIConfig = (): AIConfig => {
  try {
    const configStr = getAIConfigFromStorage();
    const settings = loadSettings();
    
    // If no saved config, return default with preferred model from settings
    if (!configStr) {
      return {
        ...defaultConfig,
        model: settings.preferredLanguageModel || defaultConfig.model,
      };
    }
    
    const config = JSON.parse(configStr);
    
    // Always use preferred language model from settings if available
    if (settings.preferredLanguageModel) {
      config.model = settings.preferredLanguageModel;
    }
    
    return config;
  } catch (error) {
    logger.error('Error loading AI config:', error);
    const settings = loadSettings();
    return {
      ...defaultConfig,
      model: settings.preferredLanguageModel || defaultConfig.model,
    };
  }
};

// Save configuration
export const saveAIConfig = (config: AIConfig): void => {
  saveAIConfigToStorage(JSON.stringify(config));
};

// Get available models
export const getModels = (): string[] => {
  return getAvailableModels();
};

// Get token usage statistics
export const getUsageStats = (): {
  total: number;
  byModel: Record<string, number>;
} => {
  return getTokenUsageStats();
};

// Updated AI service to use OpenAI with configurations and persona
export const sendMessageToAI = async (
  message: string,
  systemPrompt: string = 'You are ALTER EGO, an intelligent AI personality.',
  history: MessageHistory[] = [],
  config?: Partial<AIConfig>,
  images?: string[],
  sessionId?: string,
  options?: { autonomous?: boolean }
): Promise<string> => {
  try {
    const settings = loadSettings();
    const apiKeys = loadApiKeys();
    const provider = detectAIProvider(settings, apiKeys);

    // Get current configuration and apply any overrides
    const currentConfig = getAIConfig();
    const finalConfig = {
      ...currentConfig,
      ...config,
    };

    if (!config?.model) {
      finalConfig.model = getModelForProvider(provider, settings);
    }

    const systemMemoryBlock = history
      .filter(msg => msg.role === 'system' && msg.content)
      .map(msg => msg.content)
      .join('\n\n');
    const mergedSystemPrompt = systemMemoryBlock
      ? `${systemPrompt}\n\n${systemMemoryBlock}`
      : systemPrompt;
    const conversationHistory = history.filter(
      msg => msg.role === 'user' || msg.role === 'assistant'
    ) as { role: 'user' | 'assistant'; content: string; images?: string[] }[];

    if (provider === 'ollama') {
      logger.info(`Using Ollama model: ${finalConfig.model}`);
      return generateOllamaChatCompletion(
        mergedSystemPrompt,
        message,
        conversationHistory,
        images || [],
        finalConfig.model,
        finalConfig.temperature,
        finalConfig.maxTokens,
        sessionId,
        { autonomous: options?.autonomous }
      );
    }

    if (provider === 'openrouter') {
      logger.info(`Using OpenRouter model: ${finalConfig.model}`);
      return generateOpenRouterChatCompletion(
        mergedSystemPrompt,
        message,
        conversationHistory,
        images || [],
        finalConfig.model,
        finalConfig.temperature,
        finalConfig.maxTokens,
        sessionId,
        { autonomous: options?.autonomous }
      );
    }

    // OpenAI logic (original code + vision support)
    const { OPENAI_API_KEY } = apiKeys;

    if (!OPENAI_API_KEY) {
      return 'OpenAI API key is not set. Please add your API key in the Settings panel.';
    }
    
    // IMPORTANT: Use preferred language model from settings unless explicitly overridden in config
    // This ensures the user's model selection from API Keys settings is respected
    if (!config?.model && settings.preferredLanguageModel) {
      finalConfig.model = settings.preferredLanguageModel;
      logger.debug(`Using preferred language model from settings: ${finalConfig.model}`);
    }

    // Check if we have images and need to use vision
    const hasImages = images && images.length > 0;

    if (hasImages) {
      // Ensure we're using a vision-capable model
      if (!modelSupportsVision(finalConfig.model)) {
        logger.debug(
          `Model ${finalConfig.model} doesn't support vision, switching to gpt-4o-mini`
        );
        finalConfig.model = 'gpt-4o-mini';
      }

      logger.debug(
        `Using vision model: ${finalConfig.model} with ${images.length} images`
      );

      // Use vision-capable chat completion
      const response = await generateVisionChatCompletion(
        mergedSystemPrompt,
        message,
        images,
        conversationHistory,
        finalConfig.model,
        finalConfig.temperature,
        finalConfig.maxTokens,
        sessionId
      );

      return response;
    } else {
      // Regular text-only completion
      // Log a concise prompt summary for debugging
      logger.debug(
        `System prompt ready -> model: ${finalConfig.model}, length: ${mergedSystemPrompt.length} chars`
      );

      // Log the number of messages in history for debugging
      logger.debug(
        `Using ${conversationHistory.length} conversation messages and ${systemMemoryBlock ? 'merged' : 'no'} system memory context for AI context`
      );

      // Call the OpenAI API with configuration and persona
      // The history is already limited by the caller
      const response = await generateChatCompletion(
        mergedSystemPrompt,
        message,
        conversationHistory,
        finalConfig.model,
        finalConfig.temperature,
        finalConfig.maxTokens,
        sessionId,
        { autonomous: options?.autonomous }
      );

      return response;
    }
  } catch (error) {
    logger.error('Error in AI service:', error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return 'Failed to get response from AI service. Please check your API key and try again.';
  }
};
