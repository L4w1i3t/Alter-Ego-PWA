import { loadApiKeys, loadSettings } from './storageUtils';
import { trackAiResponseTime } from './performanceMetrics';
import { tokenTracker } from './tokenTracker';
import {
  buildSystemPrompt,
  SECURITY_RULES,
  verifySystemPrompt,
} from './systemPrompt';
import {
  OPENAI_MODEL_OPTIONS,
  filterOpenRouterOpenAIModels,
  getDefaultOpenRouterFallbackModels,
  getSafeOpenRouterModel,
  isGPT5FamilyModel,
  sanitizeOpenRouterModelCsv,
  usesDefaultSamplingOnly,
  usesMaxCompletionTokens,
  type ModelOption,
} from './aiProviders';

export {
  buildSystemPrompt,
  CHARACTER_INSTRUCTIONS,
  SECURITY_RULES,
  verifySystemPrompt,
} from './systemPrompt';

// OpenAI API utilities for ALTER EGO PWA
// Refactored to eliminate repetitive system prompt construction and improve maintainability
// All prompt building is now centralized through helper functions

// OpenAI API request interface
interface OpenAIRequest {
  model?: string;
  models?: string[];
  route?: 'fallback';
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content:
      | string
      | Array<{
          type: 'text' | 'image_url';
          text?: string;
          image_url?: {
            url: string;
            detail?: 'low' | 'high' | 'auto';
          };
        }>;
  }>;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  provider?: OpenRouterProviderPreferences;
}

interface OpenRouterProviderPreferences {
  order?: string[];
  only?: string[];
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  data_collection?: 'allow' | 'deny';
  zdr?: boolean;
  sort?: 'price' | 'throughput' | 'latency';
}

interface OpenRouterModelResponse {
  data?: Array<{
    id: string;
    name?: string;
    description?: string;
    context_length?: number;
    architecture?: {
      input_modalities?: string[];
      output_modalities?: string[];
    };
  }>;
}

interface OpenAIResponse {
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

// Token usage tracking interface
interface TokenUsage {
  timestamp: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  query_type: string;
}

const DEFAULT_OPENAI_MAX_RETRIES = 2;
const DEFAULT_OPENAI_RETRY_DELAY_MS = 500;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const shouldRetryStatus = (status: number): boolean => {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    (status >= 500 && status < 600)
  );
};

const logStringInChunks = (
  label: string,
  value: string,
  chunkSize = 1000
): void => {
  if (!value) {
    console.log(`${label}: (empty)`);
    return;
  }

  const totalChunks = Math.ceil(value.length / chunkSize);
  const header =
    totalChunks > 1
      ? `${label} (${value.length} chars across ${totalChunks} chunks)`
      : `${label} (${value.length} chars)`;
  console.log(header);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = value.slice(i * chunkSize, (i + 1) * chunkSize);
    if (totalChunks > 1) {
      console.log(`  chunk ${i + 1}/${totalChunks}:`);
    }
    console.log(chunk);
  }
};

interface OpenAIRequestConfig {
  endpoint: string;
  headers: Record<string, string>;
  payload: OpenAIRequest;
  requestLabel: string;
  maxRetries?: number;
}

async function postOpenAIRequest(
  config: OpenAIRequestConfig
): Promise<OpenAIResponse> {
  const {
    endpoint,
    headers,
    payload,
    requestLabel,
    maxRetries = DEFAULT_OPENAI_MAX_RETRIES,
  } = config;

  const requestBody = JSON.stringify(payload);
  let attempt = 0;

  while (true) {
    let response: Response;
    let rawBody = '';

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: requestBody,
      });
      rawBody = await response.text();
    } catch (networkError) {
      if (attempt < maxRetries) {
        const delay = DEFAULT_OPENAI_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `${requestLabel} network error, retrying in ${delay}ms...`,
          networkError
        );
        await sleep(delay);
        attempt += 1;
        continue;
      }

      const message =
        networkError instanceof Error
          ? networkError.message
          : 'Unknown network error';
      throw new Error(`${requestLabel} request failed: ${message}`);
    }

    const truncatedBody = rawBody.slice(0, 1000).trim();
    let parsedBody: any = null;

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = null;
      }
    }

    if (!response.ok) {
      const errorMessage =
        parsedBody?.error?.message ||
        parsedBody?.error ||
        truncatedBody ||
        response.statusText;

      if (shouldRetryStatus(response.status) && attempt < maxRetries) {
        const retryHeader = response.headers.get('retry-after');
        const retryAfterSeconds = retryHeader ? Number(retryHeader) : NaN;
        const delay =
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : DEFAULT_OPENAI_RETRY_DELAY_MS * Math.pow(2, attempt);

        console.warn(
          `${requestLabel} failed with ${response.status}. Retrying in ${delay}ms...`,
          errorMessage
        );
        await sleep(delay);
        attempt += 1;
        continue;
      }

      const suffix =
        response.status >= 500
          ? ` This usually means the ${requestLabel} service is temporarily unavailable. Please try again shortly.`
          : '';
      throw new Error(
        `${requestLabel} API error (${response.status}): ${errorMessage}${suffix}`
      );
    }

    if (!parsedBody) {
      const detail = truncatedBody || 'empty response';
      throw new Error(
        `Unexpected response format from ${requestLabel} (${response.status}): ${detail}`
      );
    }

    return parsedBody as OpenAIResponse;
  }
}
/**
 * Log token usage to local storage
 */
export const logTokenUsage = (
  model: string,
  usage: OpenAIResponse['usage'],
  queryType: string = 'standard'
): void => {
  try {
    // Get existing log or create new one
    const tokenLogKey = 'alterEgo_tokenUsage';
    const existingLogJson = localStorage.getItem(tokenLogKey);
    const existingLog: TokenUsage[] = existingLogJson
      ? JSON.parse(existingLogJson)
      : [];

    // Create new entry
    const entry: TokenUsage = {
      timestamp: new Date().toISOString(),
      model,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      query_type: queryType,
    };

    // Add new entry and save
    existingLog.push(entry);
    localStorage.setItem(tokenLogKey, JSON.stringify(existingLog));

    // Simple logging (detailed summary handled by tokenTracker)
    const queryLabel =
      queryType === 'vision' ? '' : queryType === 'image-analysis' ? '' : '';

    console.log(`${queryLabel} ${usage.total_tokens} tokens`);
  } catch (error) {
    console.error('Error logging token usage:', error);
  }
};

/**
 * Get available OpenAI models with metadata
 */
export const getAvailableModelsWithInfo = (): Array<{
  id: string;
  name: string;
  description: string;
}> => {
  return OPENAI_MODEL_OPTIONS;
};

/**
 * Get available OpenAI models
 */
export const getAvailableModels = (): string[] => {
  return getAvailableModelsWithInfo().map(m => m.id);
};

export const getOpenRouterModels = async (): Promise<ModelOption[]> => {
  const { OPENROUTER_API_KEY } = loadApiKeys();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (OPENROUTER_API_KEY) {
    headers.Authorization = `Bearer ${OPENROUTER_API_KEY}`;
  }

  const response = await fetch(
    'https://openrouter.ai/api/v1/models?output_modalities=text',
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenRouter model list failed (${response.status}): ${body || response.statusText}`
    );
  }

  const data = (await response.json()) as OpenRouterModelResponse;
  return filterOpenRouterOpenAIModels(
    (data.data || [])
    .filter(model => !!model.id)
    .map(model => ({
      id: model.id,
      name: model.name || model.id,
      description:
        model.description ||
        `${model.context_length ? `${model.context_length.toLocaleString()} token context` : 'OpenRouter model'}`,
      contextLength: model.context_length,
      inputModalities: model.architecture?.input_modalities,
      outputModalities: model.architecture?.output_modalities,
      source: 'remote' as const,
    }))
  );
};

/**
 * Get available vision-capable OpenAI models
 */
export const getAvailableVisionModels = (): string[] => {
  return [
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
    'gpt-5.3-chat-latest',
    'gpt-5-chat-latest',
    'gpt-5-mini',
    'gpt-4.1',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1-mini',
  ];
};

/**
 * Check if a model supports vision
 */
export const modelSupportsVision = (model: string): boolean => {
  return isGPT5FamilyModel(model) || getAvailableVisionModels().includes(model);
};

/**
 * Check if a model is GPT-5 or any of its variants
 */
export const isGPT5Model = (model: string): boolean => {
  return isGPT5FamilyModel(model);
};

const getOpenAIOutputTokenParam = (
  model: string
): 'max_completion_tokens' | 'max_tokens' => {
  return usesMaxCompletionTokens(model)
    ? 'max_completion_tokens'
    : 'max_tokens';
};

const withOpenAIModelParameters = (
  payload: OpenAIRequest,
  model: string,
  temperature: number,
  maxTokens: number
): OpenAIRequest => {
  const tokenParam = getOpenAIOutputTokenParam(model);
  const nextPayload: OpenAIRequest = {
    ...payload,
    [tokenParam]: maxTokens,
  };

  if (!usesDefaultSamplingOnly(model) && Number.isFinite(temperature)) {
    nextPayload.temperature = temperature;
  }

  return nextPayload;
};

export const generateChatCompletion = async (
  systemPrompt: string = '',
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7,
  maxTokens: number = 1000,
  sessionId?: string,
  options?: { autonomous?: boolean }
): Promise<string> => {
  const { OPENAI_API_KEY } = loadApiKeys();

  if (!OPENAI_API_KEY) {
    throw new Error(
      'OpenAI API key is not set. Please add your API key in the Settings.'
    );
  }

  // Start measuring response time
  const startTime = performance.now();

  // Build the complete system prompt with security and character definition
  const fullSystemPrompt = buildSystemPrompt(systemPrompt);

  // Log the complete system prompt for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('=== SYSTEM PROMPT SUMMARY ===');
    console.log(
      `Total length: ${fullSystemPrompt.length} chars | Security rules: ${SECURITY_RULES.length} chars | Persona context: ${systemPrompt.length} chars`
    );
    logStringInChunks('System Prompt (final order)', fullSystemPrompt);
    logStringInChunks('Persona Context (raw)', systemPrompt);
    console.log('=== END SYSTEM PROMPT SUMMARY ===');
  }

  // Verify if the default system prompt is included
  if (!verifySystemPrompt(fullSystemPrompt)) {
    throw new Error(
      'The system prompt does not include the required security rules.'
    );
  }

  // Construct conversation history with system prompt.
  // For autonomous messages the nudge is injected as a trailing system
  // instruction so the model sees no phantom user turn and continues
  // the conversation organically.
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    { role: 'system' as const, content: fullSystemPrompt },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    ...(options?.autonomous
      ? [{ role: 'system' as const, content: userMessage }]
      : [{ role: 'user' as const, content: userMessage }]),
  ];

  const outputTokenParam = getOpenAIOutputTokenParam(model);
  const sendsTemperature = !usesDefaultSamplingOnly(model);
  const payload = withOpenAIModelParameters(
    {
      model,
      messages,
    },
    model,
    temperature,
    maxTokens
  );

  // Log the complete payload being sent to OpenAI (sanitized)
  if (process.env.NODE_ENV === 'development') {
    console.log('=== OPENAI API REQUEST ===');
    console.log('Model:', model);
    console.log('Temperature:', sendsTemperature ? temperature : 'default');
    console.log(`Max Tokens (${outputTokenParam}):`, maxTokens);
    console.log('Total Messages:', messages.length);
    console.log(
      'API Key:',
      OPENAI_API_KEY
        ? `${OPENAI_API_KEY.substring(0, 8)}...${OPENAI_API_KEY.slice(-4)}`
        : 'Not set'
    );
    console.log('Messages Structure:');
    messages.forEach((msg, index) => {
      const content = typeof msg.content === 'string' ? msg.content : '';
      console.log(`Message ${index} (${msg.role}):`, {
        role: msg.role,
        contentLength: content.length,
        contentPreview:
          content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      });
    });
    console.log('=== END OPENAI PAYLOAD ===');
  }

  try {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    };
    if (OPENAI_API_KEY.startsWith('sk-proj-')) {
      headers['OpenAI-Beta'] = 'allow-project-key';
    }
    const data = await postOpenAIRequest({
      endpoint,
      headers,
      payload,
      requestLabel: 'OpenAI chat completion',
    });

    // Calculate response time
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // Track the response time in performance metrics
    trackAiResponseTime(responseTime);

    // Track token usage in centralized tracker
    if (data.usage && sessionId) {
      tokenTracker.addTokens(
        sessionId,
        'textGeneration',
        data.usage.prompt_tokens,
        data.usage.completion_tokens
      );
    }

    // Legacy logging (keep existing logTokenUsage for compatibility)
    if (data.usage) {
      logTokenUsage(model, data.usage);
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

/**
 * Generate chat completion with vision support for images
 */
export const generateVisionChatCompletion = async (
  systemPrompt: string = '',
  userMessage: string,
  images: string[] = [], // Array of base64 encoded images or URLs
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    images?: string[];
  }> = [],
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7,
  maxTokens: number = 1000,
  sessionId?: string
): Promise<string> => {
  const { OPENAI_API_KEY } = loadApiKeys();

  if (!OPENAI_API_KEY) {
    throw new Error(
      'OpenAI API key is not set. Please add your API key in the Settings.'
    );
  }

  // Ensure we're using a vision-capable model
  if (!modelSupportsVision(model)) {
    throw new Error(
      `Model ${model} does not support vision. Use a vision-capable model like gpt-4o-mini or gpt-4-turbo.`
    );
  }

  // Start measuring response time
  const startTime = performance.now();

  // Use the same system prompt building as text conversations
  const effectiveSystemPrompt = buildSystemPrompt(systemPrompt);

  if (process.env.NODE_ENV === 'development') {
    console.log('=== VISION CHAT COMPLETION ===');
    console.log(
      `System prompt length: ${effectiveSystemPrompt.length} characters`
    );
    console.log(`History length: ${history.length}`);
    console.log(`Images: ${images.length}`);
  }

  // Verify system prompt includes security rules
  if (!verifySystemPrompt(effectiveSystemPrompt)) {
    throw new Error(
      'The system prompt does not include the required security rules.'
    );
  }

  // Construct conversation history with system prompt (same as text pipeline)
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content:
      | string
      | Array<{
          type: 'text' | 'image_url';
          text?: string;
          image_url?: {
            url: string;
            detail?: 'low' | 'high' | 'auto';
          };
        }>;
  }> = [{ role: 'system' as const, content: effectiveSystemPrompt }];

  // Add history messages (same as text pipeline)
  history.forEach(msg => {
    if (msg.role === 'user' && msg.images && msg.images.length > 0) {
      // User message with images
      const content: Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: {
          url: string;
          detail?: 'low' | 'high' | 'auto';
        };
      }> = [{ type: 'text', text: msg.content }];

      // Add images with optimized detail level
      msg.images.forEach(imageUrl => {
        content.push({
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'low', // Always use low detail for optimal token efficiency
          },
        });
      });

      messages.push({
        role: 'user',
        content,
      });
    } else {
      // Regular text message
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  });

  // Add current user message with images
  if (images.length > 0) {
    const userContent: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    }> = [{ type: 'text', text: userMessage }];

    // Add images with optimized detail level (always use low for efficiency)
    images.forEach(imageUrl => {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'low', // Always use low detail for optimal token efficiency
        },
      });
    });

    messages.push({
      role: 'user' as const,
      content: userContent,
    });
  } else {
    // Text-only message
    messages.push({
      role: 'user' as const,
      content: userMessage,
    });
  }

  const outputTokenParam = getOpenAIOutputTokenParam(model);
  const sendsTemperature = !usesDefaultSamplingOnly(model);
  const payload = withOpenAIModelParameters(
    {
      model,
      messages,
    },
    model,
    temperature,
    maxTokens
  );

  // Log the complete payload being sent to OpenAI (without full image data)
  if (process.env.NODE_ENV === 'development') {
    console.log('=== VISION OPENAI API PAYLOAD ===');
    console.log('Model:', model);
    console.log('Temperature:', sendsTemperature ? temperature : 'default');
    console.log(`Max Tokens (${outputTokenParam}):`, maxTokens);
    console.log('Total Messages:', messages.length);
    console.log('Images in current message:', images.length);
    console.log('=== END VISION PAYLOAD ===');
  }

  try {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    };
    if (OPENAI_API_KEY.startsWith('sk-proj-')) {
      headers['OpenAI-Beta'] = 'allow-project-key';
    }
    const data = await postOpenAIRequest({
      endpoint,
      headers,
      payload,
      requestLabel: 'OpenAI vision chat completion',
    });

    // Calculate response time
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // Track the response time in performance metrics
    trackAiResponseTime(responseTime);

    // Track token usage in centralized tracker
    if (data.usage && sessionId) {
      tokenTracker.addTokens(
        sessionId,
        'conversation',
        data.usage.prompt_tokens,
        data.usage.completion_tokens
      );
    }

    // Legacy logging (keep existing logTokenUsage for compatibility)
    if (data.usage) {
      logTokenUsage(model, data.usage, 'vision');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling OpenAI Vision API:', error);
    throw error;
  }
};

const parseCsvList = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const uniqueModels = (models: string[]): string[] => {
  const seen = new Set<string>();
  return models.filter(model => {
    const key = model.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getOpenRouterProviderPreferences = ():
  | OpenRouterProviderPreferences
  | undefined => {
  const settings = loadSettings();
  const preferences: OpenRouterProviderPreferences = {};

  const providerOrder = parseCsvList(settings.openRouterProviderOrder);
  if (providerOrder.length) {
    preferences.order = providerOrder;
  }

  const onlyProviders = parseCsvList(settings.openRouterOnlyProviders);
  if (onlyProviders.length) {
    preferences.only = onlyProviders;
  }

  if (settings.openRouterAllowFallbacks === false) {
    preferences.allow_fallbacks = false;
  }

  if (settings.openRouterRequireParameters) {
    preferences.require_parameters = true;
  }

  if (settings.openRouterDataCollection === 'deny') {
    preferences.data_collection = 'deny';
  }

  if (settings.openRouterZdr) {
    preferences.zdr = true;
  }

  if (settings.openRouterByokOptimized ?? true) {
    preferences.sort = 'price';
  }

  return Object.keys(preferences).length ? preferences : undefined;
};

export const generateOpenRouterChatCompletion = async (
  systemPrompt: string = '',
  userMessage: string,
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    images?: string[];
  }> = [],
  images: string[] = [],
  model: string,
  temperature: number = 0.7,
  maxTokens: number = 1000,
  sessionId?: string,
  options?: { autonomous?: boolean }
): Promise<string> => {
  const { OPENROUTER_API_KEY } = loadApiKeys();

  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OpenRouter API key is not set. Please add your key in Settings.'
    );
  }

  const startTime = performance.now();
  const fullSystemPrompt = buildSystemPrompt(systemPrompt);

  if (!verifySystemPrompt(fullSystemPrompt)) {
    throw new Error(
      'The system prompt does not include the required security rules.'
    );
  }

  const messages: OpenAIRequest['messages'] = [
    { role: 'system', content: fullSystemPrompt },
  ];

  history.forEach(msg => {
    if (msg.role === 'user' && msg.images?.length) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: msg.content },
          ...msg.images.map(imageUrl => ({
            type: 'image_url' as const,
            image_url: { url: imageUrl, detail: 'low' as const },
          })),
        ],
      });
      return;
    }

    messages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  if (options?.autonomous) {
    messages.push({ role: 'system', content: userMessage });
  } else if (images.length) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userMessage },
        ...images.map(imageUrl => ({
          type: 'image_url' as const,
          image_url: { url: imageUrl, detail: 'low' as const },
        })),
      ],
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  const settings = loadSettings();
  const primaryModel = getSafeOpenRouterModel(model);
  const configuredFallbackModels = parseCsvList(
    sanitizeOpenRouterModelCsv(settings.openRouterFallbackModels)
  );
  const automaticFallbackModels =
    settings.openRouterAllowFallbacks !== false && configuredFallbackModels.length === 0
      ? getDefaultOpenRouterFallbackModels(primaryModel)
      : [];
  const fallbackModels = uniqueModels([
    ...configuredFallbackModels,
    ...automaticFallbackModels,
  ]).filter(fallbackModel => fallbackModel !== primaryModel);
  const routedModels = [primaryModel, ...fallbackModels];
  const sendsTemperature = !routedModels.some(usesDefaultSamplingOnly);
  const providerPreferences = getOpenRouterProviderPreferences();

  const payload: OpenAIRequest = {
    ...(fallbackModels.length
      ? { models: [primaryModel, ...fallbackModels], route: 'fallback' as const }
      : { model: primaryModel }),
    messages,
    max_tokens: maxTokens,
    ...(sendsTemperature ? { temperature } : {}),
    ...(providerPreferences ? { provider: providerPreferences } : {}),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'X-OpenRouter-Title': 'ALTER EGO',
  };

  if (typeof window !== 'undefined' && window.location?.origin) {
    headers['HTTP-Referer'] = window.location.origin;
  }

  try {
    const data = await postOpenAIRequest({
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      headers,
      payload,
      requestLabel: 'OpenRouter chat completion',
    });

    const responseTime = performance.now() - startTime;
    trackAiResponseTime(responseTime);

    if (data.usage && sessionId) {
      tokenTracker.addTokens(
        sessionId,
        images.length ? 'conversation' : 'textGeneration',
        data.usage.prompt_tokens,
        data.usage.completion_tokens
      );
    }

    if (data.usage) {
      logTokenUsage(`openrouter:${primaryModel}`, data.usage);
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    throw error;
  }
};

/**
 * Get token usage statistics
 */
export const getTokenUsageStats = (): {
  total: number;
  byModel: Record<string, number>;
} => {
  try {
    const tokenLogKey = 'alterEgo_tokenUsage';
    const logJson = localStorage.getItem(tokenLogKey);
    if (!logJson) return { total: 0, byModel: {} };

    const logs: TokenUsage[] = JSON.parse(logJson);
    let total = 0;
    const byModel: Record<string, number> = {};

    logs.forEach(entry => {
      total += entry.total_tokens;
      byModel[entry.model] = (byModel[entry.model] || 0) + entry.total_tokens;
    });

    return { total, byModel };
  } catch (error) {
    console.error('Error getting token usage stats:', error);
    return { total: 0, byModel: {} };
  }
};

/**
 * Lightweight vision API call for image analysis only.
 * Uses the shared provider-neutral system prompt contract without persona memory.
 */
export const generateLightweightVision = async (
  userMessage: string,
  images: string[] = [],
  model: string = 'gpt-4o-mini',
  temperature: number = 0.3,
  maxTokens: number = 500,
  sessionId?: string
): Promise<string> => {
  const { OPENAI_API_KEY } = loadApiKeys();

  if (!OPENAI_API_KEY) {
    throw new Error(
      'OpenAI API key is not set. Please add your API key in the Settings.'
    );
  }

  if (!modelSupportsVision(model)) {
    throw new Error(
      `Model ${model} does not support vision. Use a vision-capable model like gpt-4o-mini or gpt-4-turbo.`
    );
  }

  const startTime = performance.now();
  const imageAnalysisSystemPrompt = buildSystemPrompt(
    'You are an image analysis assistant. Provide accurate, concise descriptions of images in the requested format.'
  );

  if (!verifySystemPrompt(imageAnalysisSystemPrompt)) {
    throw new Error(
      'The system prompt does not include the required security rules.'
    );
  }

  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content:
      | string
      | Array<{
          type: 'text' | 'image_url';
          text?: string;
          image_url?: {
            url: string;
            detail?: 'low' | 'high' | 'auto';
          };
        }>;
  }> = [
    {
      role: 'system' as const,
      content: imageAnalysisSystemPrompt,
    },
  ];

  // Add user message with images
  if (images.length > 0) {
    const userContent: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    }> = [{ type: 'text', text: userMessage }];

    images.forEach(imageUrl => {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'low', // Use low detail to reduce token usage
        },
      });
    });

    messages.push({
      role: 'user' as const,
      content: userContent,
    });
  } else {
    messages.push({
      role: 'user' as const,
      content: userMessage,
    });
  }

  const outputTokenParam = getOpenAIOutputTokenParam(model);
  const sendsTemperature = !usesDefaultSamplingOnly(model);
  const payload = withOpenAIModelParameters(
    {
      model,
      messages,
    },
    model,
    temperature,
    maxTokens
  );

  console.log('=== LIGHTWEIGHT VISION API PAYLOAD ===');
  console.log('Model:', model);
  console.log('Temperature:', sendsTemperature ? temperature : 'default');
  console.log(`Max Tokens (${outputTokenParam}):`, maxTokens);
  console.log('Total Messages:', messages.length);
  console.log('Images in current message:', images.length);
  console.log('=== END LIGHTWEIGHT VISION PAYLOAD ===');

  try {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    };
    if (OPENAI_API_KEY.startsWith('sk-proj-')) {
      headers['OpenAI-Beta'] = 'allow-project-key';
    }
    const data = await postOpenAIRequest({
      endpoint,
      headers,
      payload,
      requestLabel: 'OpenAI lightweight vision completion',
    });

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    trackAiResponseTime(responseTime);

    if (data.usage && sessionId) {
      tokenTracker.addTokens(
        sessionId,
        'imageAnalysis',
        data.usage.prompt_tokens,
        data.usage.completion_tokens
      );
    }

    if (data.usage) {
      logTokenUsage(model, data.usage, 'image-analysis');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling OpenAI Vision API:', error);
    throw error;
  }
};
