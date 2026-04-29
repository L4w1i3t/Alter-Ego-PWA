import { AI } from '../config/constants';
import { trackAiResponseTime } from './performanceMetrics';
import { tokenTracker } from './tokenTracker';
import { loadSettings } from './storageUtils';
import { buildSystemPrompt, verifySystemPrompt } from './systemPrompt';
import type { ModelOption } from './aiProviders';

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaChatResponse {
  model: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaModelTag {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  details?: {
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export const getOllamaBaseUrl = (): string => {
  const settings = loadSettings();
  return (settings.ollamaBaseUrl || AI.DEFAULT_OLLAMA_BASE_URL).replace(
    /\/+$/,
    ''
  );
};

export const stripDataUrlPrefix = (imageUrl: string): string => {
  const commaIndex = imageUrl.indexOf(',');
  if (imageUrl.startsWith('data:') && commaIndex >= 0) {
    return imageUrl.slice(commaIndex + 1);
  }
  return imageUrl;
};

export const testOllamaConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${getOllamaBaseUrl()}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
};

const fetchOllamaTags = async (): Promise<OllamaModelTag[]> => {
  const response = await fetch(`${getOllamaBaseUrl()}/api/tags`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Ollama model list failed: ${response.status}`);
  }

  const data = (await response.json()) as { models?: OllamaModelTag[] };
  return data.models || [];
};

export const getOllamaModels = async (): Promise<string[]> => {
  return (await fetchOllamaTags())
    .map(model => model.model || model.name)
    .filter((name): name is string => !!name);
};

export const getOllamaModelOptions = async (): Promise<ModelOption[]> => {
  return (await fetchOllamaTags())
    .map(model => {
      const id = model.model || model.name;
      if (!id) return null;

      const details = [
        model.details?.parameter_size,
        model.details?.quantization_level,
        model.details?.family,
      ].filter(Boolean);

      const option: ModelOption = {
        id,
        name: model.name || id,
        description: details.length
          ? `Installed local model (${details.join(', ')})`
          : 'Installed local Ollama model',
        source: 'local',
      };
      return option;
    })
    .filter((model): model is ModelOption => !!model);
};

export const generateOllamaChatCompletion = async (
  systemPrompt: string,
  userMessage: string,
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    images?: string[];
  }>,
  images: string[],
  model: string,
  temperature: number,
  maxTokens: number,
  sessionId?: string,
  options?: { autonomous?: boolean }
): Promise<string> => {
  const startTime = performance.now();
  const fullSystemPrompt = buildSystemPrompt(systemPrompt);

  if (!verifySystemPrompt(fullSystemPrompt)) {
    throw new Error(
      'The system prompt does not include the required universal rules.'
    );
  }

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.role === 'user' && msg.images?.length
        ? { images: msg.images.map(stripDataUrlPrefix) }
        : {}),
    })),
    {
      role: options?.autonomous ? 'system' : 'user',
      content: userMessage,
      ...(images.length ? { images: images.map(stripDataUrlPrefix) } : {}),
    },
  ];

  const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Ollama API error (${response.status}): ${body || response.statusText}`
    );
  }

  const data = (await response.json()) as OllamaChatResponse;
  const content = data.message?.content?.trim();
  if (!content) {
    throw new Error('Ollama returned an empty response.');
  }

  trackAiResponseTime(performance.now() - startTime);

  if (sessionId) {
    tokenTracker.addTokens(
      sessionId,
      images.length ? 'conversation' : 'textGeneration',
      data.prompt_eval_count || 0,
      data.eval_count || 0
    );
  }

  return content;
};
