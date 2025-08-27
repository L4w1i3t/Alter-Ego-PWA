import { loadSettings } from './storageUtils';

// Backend configuration
const BACKEND_CONFIG = {
  baseUrl: 'http://127.0.0.1:8000', // Default local backend URL
  timeout: 30000, // 30 second timeout
};

// Interface for backend chat request
interface BackendChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// Interface for backend chat response
interface BackendChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Interface for available models
interface BackendModel {
  id: string;
  name: string;
  description: string;
  parameters?: string;
  context_length?: number;
  loaded: boolean;
}

/**
 * Get the backend URL from settings or use default
 */
export const getBackendUrl = (): string => {
  try {
    const settings = loadSettings();
    return settings.backendUrl || BACKEND_CONFIG.baseUrl;
  } catch (error) {
    console.error('Error loading backend URL from settings:', error);
    return BACKEND_CONFIG.baseUrl;
  }
};

/**
 * Test if the backend server is available
 */
export const testBackendConnection = async (): Promise<boolean> => {
  try {
    const baseUrl = getBackendUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
};

/**
 * Get available models from the backend
 */
export const getOpenSourceModels = async (): Promise<BackendModel[]> => {
  try {
    const baseUrl = getBackendUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const models: BackendModel[] = await response.json();
    return models;
  } catch (error) {
    console.error('Error fetching open-source models:', error);
    throw new Error('Failed to fetch available models from backend');
  }
};

/**
 * Load a specific model on the backend
 */
export const loadBackendModel = async (modelId: string): Promise<void> => {
  try {
    const baseUrl = getBackendUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout for model loading

    const response = await fetch(
      `${baseUrl}/models/${encodeURIComponent(modelId)}/load`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.status}`);
    }

    console.log(`Model ${modelId} loading initiated`);
  } catch (error) {
    console.error('Error loading backend model:', error);
    throw new Error(`Failed to load model ${modelId}`);
  }
};

/**
 * Generate chat completion using the open-source backend
 */
export const generateOpenSourceCompletion = async (
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  model: string = 'Orenguteng/Llama-3-8B-Lexi-Uncensored',
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<string> => {
  try {
    const baseUrl = getBackendUrl();

    // Prepare the request payload
    const requestPayload: BackendChatRequest = {
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    console.log(`Sending request to open-source backend: ${model}`);
    console.log(
      `Messages: ${messages.length}, Temperature: ${temperature}, Max tokens: ${maxTokens}`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      BACKEND_CONFIG.timeout
    );

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error ${response.status}: ${errorText}`);
    }

    const data: BackendChatResponse = await response.json();

    // Extract the response content
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const responseContent = data.choices[0].message.content;

      // Log token usage for debugging
      if (data.usage) {
        console.log(
          `Token usage - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`
        );
      }

      return responseContent;
    } else {
      throw new Error('Invalid response format from backend');
    }
  } catch (error) {
    console.error('Error generating open-source completion:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(
          'Request timeout - the backend may be overloaded or the model is still loading'
        );
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error(
          'Cannot connect to the backend server. Please ensure it is running at ' +
            getBackendUrl()
        );
      } else {
        throw error;
      }
    } else {
      throw new Error('Unknown error occurred while generating response');
    }
  }
};

/**
 * Get backend server status and information
 */
export const getBackendStatus = async (): Promise<{
  status: string;
  device: string;
  loadedModels: string[];
  version?: string;
}> => {
  try {
    const baseUrl = getBackendUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const status = await response.json();
    return {
      status: status.status || 'unknown',
      device: status.device || 'unknown',
      loadedModels: status.loaded_models || [],
      version: status.version,
    };
  } catch (error) {
    console.error('Error getting backend status:', error);
    throw new Error('Failed to get backend status');
  }
};

/**
 * Validate that the backend is ready for use
 */
export const validateBackendReady = async (): Promise<{
  ready: boolean;
  error?: string;
  status?: any;
}> => {
  try {
    // Test connection
    const isConnected = await testBackendConnection();
    if (!isConnected) {
      return {
        ready: false,
        error: 'Cannot connect to backend server. Please ensure it is running.',
      };
    }

    // Get status
    const status = await getBackendStatus();

    return {
      ready: true,
      status,
    };
  } catch (error) {
    return {
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Export configuration for use in settings
export const OPEN_SOURCE_CONFIG = {
  defaultModel: 'Orenguteng/Llama-3-8B-Lexi-Uncensored', // Default model to use
  models: {
    'Orenguteng/Llama-3-8B-Lexi-Uncensored':
      'Llama 3 8B Lexi Uncensored (Uncensored, creative responses, used for testing)',
  },
};
