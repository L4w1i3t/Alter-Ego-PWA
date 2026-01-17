import {
  generateChatCompletion,
  generateVisionChatCompletion,
  getAvailableModels,
  getTokenUsageStats,
  modelSupportsVision,
} from '../utils/openaiApi';
import {
  generateOpenSourceCompletion,
  validateBackendReady,
  OPEN_SOURCE_CONFIG,
} from '../utils/openSourceApi';
import { loadApiKeys, loadSettings, getAIConfigFromStorage, saveAIConfigToStorage } from '../utils/storageUtils';
import {
  getOpenSourceStatus,
  checkOpenSourceFallback,
} from '../utils/openSourceWip';
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
  images?: string[], // Array of image URLs for vision
  sessionId?: string // For token tracking
): Promise<string> => {
  try {
    // Check if Open Source model is selected
    const settings = loadSettings();
    const selectedModel = settings.selectedModel || 'Open Source';

    if (selectedModel === 'Open Source') {
      const wipStatus = getOpenSourceStatus();
      if (wipStatus.isWip) {
        const fallbackMessage = checkOpenSourceFallback(selectedModel);
        return (
          fallbackMessage ||
          ' Open Source model is currently under development. Please use OpenAI for full functionality.'
        );
      }

      // If images are provided, we need to use OpenAI since open-source backend doesn't support vision yet
      if (images && images.length > 0) {
        logger.info(
          'Images detected, switching to OpenAI Vision API for processing...'
        );
        // Fall through to OpenAI logic
      } else {
        // Try to use the open-source backend for text-only
        try {
          logger.info('Using open-source backend for AI completion');

          // Validate backend is ready
          const backendStatus = await validateBackendReady();
          if (!backendStatus.ready) {
            throw new Error(backendStatus.error || 'Backend not ready');
          }

          // Get current configuration and apply any overrides
          const currentConfig = getAIConfig();
          const finalConfig = {
            ...currentConfig,
            ...config,
          };

          // Use the configured open-source model or default
          const openSourceModel =
            settings.openSourceModel || OPEN_SOURCE_CONFIG.defaultModel;

          // Prepare messages for the backend
          const messages: MessageHistory[] = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message },
          ];

          logger.debug(`Using open-source model: ${openSourceModel}`);
          logger.debug(
            `Using ${history.length} messages from history for AI context`
          );

          // Call the open-source backend
          const response = await generateOpenSourceCompletion(
            messages,
            openSourceModel,
            finalConfig.temperature,
            finalConfig.maxTokens
          );

          return response;
        } catch (backendError) {
          logger.error('Open-source backend error:', backendError);

          // Fallback to OpenAI if backend fails
          logger.info('Falling back to OpenAI due to backend error');
          const fallbackMessage = ` Open-source backend unavailable (${backendError instanceof Error ? backendError.message : 'Unknown error'}). Switching to OpenAI...`;

          // Continue to OpenAI logic below
          logger.warn(fallbackMessage);
        }
      }
    }

    // OpenAI logic (original code + vision support)
    const { OPENAI_API_KEY } = loadApiKeys();

    if (!OPENAI_API_KEY) {
      return 'OpenAI API key is not set. Please add your API key in the Settings panel.';
    }

    // Get current configuration and apply any overrides
    const currentConfig = getAIConfig();
    
    const finalConfig = {
      ...currentConfig,
      ...config,
    };
    
    // IMPORTANT: Use preferred language model from settings unless explicitly overridden in config
    // This ensures the user's model selection from API Keys settings is respected
    if (!config?.model && settings.preferredLanguageModel) {
      finalConfig.model = settings.preferredLanguageModel;
      logger.debug(`Using preferred language model from settings: ${finalConfig.model}`);
    }

    // Check if we have images and need to use vision
    const hasImages = images && images.length > 0;

    // Merge any system-role context from history (e.g., retrieved memories) into the system prompt
    const systemMemoryBlock = history
      .filter(m => m.role === 'system' && m.content)
      .map(m => m.content)
      .join('\n');
    const mergedSystemPrompt = systemMemoryBlock
      ? `${systemPrompt}\n\n${systemMemoryBlock}`
      : systemPrompt;

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
        history
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            ...(msg.images && { images: msg.images }),
          })),
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
        `Using ${history.length} messages from history for AI context`
      );

      // Call the OpenAI API with configuration and persona
      // The history is already limited by the caller
      const response = await generateChatCompletion(
        mergedSystemPrompt,
        message,
        history.filter(
          msg => msg.role === 'user' || msg.role === 'assistant'
        ) as { role: 'user' | 'assistant'; content: string }[], // Filter to only user and assistant messages
        finalConfig.model,
        finalConfig.temperature,
        finalConfig.maxTokens,
        sessionId
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
