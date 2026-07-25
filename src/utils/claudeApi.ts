import { loadApiKeys } from './storageUtils';
import { trackAiResponseTime } from './performanceMetrics';
import { tokenTracker } from './tokenTracker';
import { buildSystemPrompt, verifySystemPrompt } from './systemPrompt';
import { logTokenUsage } from './openaiApi';
import {
  CLAUDE_MODEL_OPTIONS,
  claudeModelRejectsSampling,
  type ModelOption,
} from './aiProviders';

// Anthropic Claude utilities for ALTER EGO PWA.
//
// Unlike the OpenAI-compatible providers, Anthropic's Messages API takes the
// system prompt as a top-level `system` field (not a message with role
// "system"), returns the answer as an array of content blocks, and reports
// usage as input_tokens/output_tokens. This module keeps the same
// provider-neutral system-prompt contract used by the other providers.
//
// The request is made directly from the app (browser / native WebView) using
// the user's own API key, mirroring how OpenAI and OpenRouter are called here.
// Anthropic requires the `anthropic-dangerous-direct-browser-access` header to
// opt into cross-origin browser requests.

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const DEFAULT_CLAUDE_MAX_RETRIES = 2;
const DEFAULT_CLAUDE_RETRY_DELAY_MS = 500;

type ClaudeRole = 'user' | 'assistant';

interface ClaudeTextBlock {
  type: 'text';
  text: string;
}

interface ClaudeImageBlock {
  type: 'image';
  source:
    | { type: 'base64'; media_type: string; data: string }
    | { type: 'url'; url: string };
}

type ClaudeContentBlock = ClaudeTextBlock | ClaudeImageBlock;

interface ClaudeMessage {
  role: ClaudeRole;
  content: string | ClaudeContentBlock[];
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string | null;
  stop_sequence?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const shouldRetryStatus = (status: number): boolean => {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status === 529 || // Anthropic overloaded
    (status >= 500 && status < 600)
  );
};

/**
 * Convert an image reference into an Anthropic image content block.
 * The app stores images as base64 data URLs (data:image/png;base64,...), which
 * Anthropic accepts via a base64 source. Plain http(s) URLs use a url source.
 */
const toClaudeImageBlock = (imageUrl: string): ClaudeImageBlock | null => {
  if (imageUrl.startsWith('data:')) {
    const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(imageUrl);
    if (!match) return null;
    const mediaType = match[1] || 'image/png';
    const isBase64 = !!match[2];
    if (!isBase64) return null; // Anthropic requires base64 for inline data
    return {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: match[3] },
    };
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return { type: 'image', source: { type: 'url', url: imageUrl } };
  }

  return null;
};

const buildUserContent = (
  text: string,
  images: string[]
): string | ClaudeContentBlock[] => {
  if (!images.length) {
    return text;
  }

  const blocks: ClaudeContentBlock[] = [];
  images.forEach(imageUrl => {
    const block = toClaudeImageBlock(imageUrl);
    if (block) blocks.push(block);
  });

  if (!blocks.length) {
    return text;
  }

  // Anthropic recommends placing the text after the images.
  blocks.push({ type: 'text', text });
  return blocks;
};

async function postClaudeRequest(
  apiKey: string,
  payload: Record<string, unknown>
): Promise<ClaudeResponse> {
  const requestBody = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    // Required to allow direct calls from a browser / WebView origin.
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  let attempt = 0;

  while (true) {
    let response: Response;
    let rawBody = '';

    try {
      response = await fetch(ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers,
        body: requestBody,
      });
      rawBody = await response.text();
    } catch (networkError) {
      if (attempt < DEFAULT_CLAUDE_MAX_RETRIES) {
        const delay = DEFAULT_CLAUDE_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `Claude chat completion network error, retrying in ${delay}ms...`,
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
      throw new Error(`Claude chat completion request failed: ${message}`);
    }

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
        parsedBody?.error?.type ||
        rawBody.slice(0, 1000).trim() ||
        response.statusText;

      if (shouldRetryStatus(response.status) && attempt < DEFAULT_CLAUDE_MAX_RETRIES) {
        const retryHeader = response.headers.get('retry-after');
        const retryAfterSeconds = retryHeader ? Number(retryHeader) : NaN;
        const delay =
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : DEFAULT_CLAUDE_RETRY_DELAY_MS * Math.pow(2, attempt);

        console.warn(
          `Claude chat completion failed with ${response.status}. Retrying in ${delay}ms...`,
          errorMessage
        );
        await sleep(delay);
        attempt += 1;
        continue;
      }

      const suffix =
        response.status >= 500
          ? ' This usually means the Claude service is temporarily unavailable. Please try again shortly.'
          : '';
      throw new Error(
        `Claude API error (${response.status}): ${errorMessage}${suffix}`
      );
    }

    if (!parsedBody) {
      const detail = rawBody.slice(0, 1000).trim() || 'empty response';
      throw new Error(
        `Unexpected response format from Claude (${response.status}): ${detail}`
      );
    }

    return parsedBody as ClaudeResponse;
  }
}

/**
 * Preset Claude models. Anthropic has no browser-safe "list models" call for
 * the direct-access flow, so the curated preset list is the source of truth.
 */
export const getClaudeModelOptions = (): ModelOption[] => CLAUDE_MODEL_OPTIONS;

export const generateClaudeChatCompletion = async (
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
  const { ANTHROPIC_API_KEY } = loadApiKeys();

  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'Claude (Anthropic) API key is not set. Please add your key in Settings.'
    );
  }

  const startTime = performance.now();
  const fullSystemPrompt = buildSystemPrompt(systemPrompt);

  if (!verifySystemPrompt(fullSystemPrompt)) {
    throw new Error(
      'The system prompt does not include the required security rules.'
    );
  }

  const messages: ClaudeMessage[] = history.map(msg => ({
    role: msg.role,
    content:
      msg.role === 'user' && msg.images?.length
        ? buildUserContent(msg.content, msg.images)
        : msg.content,
  }));

  // The system prompt is a top-level field, so the autonomous nudge is appended
  // as a trailing user turn: Anthropic requires the final turn to be a user
  // message, and a trailing assistant turn would be treated as a (disallowed)
  // prefill on current Claude models.
  messages.push({
    role: 'user',
    content: options?.autonomous
      ? userMessage
      : buildUserContent(userMessage, images),
  });

  const payload: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    system: fullSystemPrompt,
    messages,
  };

  // Only send temperature to models that still accept sampling parameters.
  if (!claudeModelRejectsSampling(model) && Number.isFinite(temperature)) {
    payload.temperature = temperature;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('=== CLAUDE API REQUEST ===');
    console.log('Model:', model);
    console.log(
      'Temperature:',
      claudeModelRejectsSampling(model) ? 'default (not sent)' : temperature
    );
    console.log('Max Tokens:', maxTokens);
    console.log('Total Messages:', messages.length);
    console.log('Images in current message:', images.length);
    console.log('=== END CLAUDE PAYLOAD ===');
  }

  try {
    const data = await postClaudeRequest(ANTHROPIC_API_KEY, payload);

    if (data.stop_reason === 'refusal') {
      throw new Error(
        'Claude declined to respond to this request for safety reasons.'
      );
    }

    const content = (data.content || [])
      .filter(block => block.type === 'text' && block.text)
      .map(block => block.text as string)
      .join('')
      .trim();

    if (!content) {
      throw new Error('Claude returned an empty response.');
    }

    trackAiResponseTime(performance.now() - startTime);

    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    if (sessionId) {
      tokenTracker.addTokens(
        sessionId,
        images.length ? 'conversation' : 'textGeneration',
        inputTokens,
        outputTokens
      );
    }

    if (data.usage) {
      logTokenUsage(`claude:${model}`, {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      });
    }

    return content;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
};
