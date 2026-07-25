import { AI } from '../config/constants';
import type { AIProvider, Settings, ApiKeys } from '../types';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  contextLength?: number;
  inputModalities?: string[];
  outputModalities?: string[];
  source?: 'preset' | 'remote' | 'local';
}

export interface CognitiveContextProfile {
  name: 'default' | 'open-weight-compact';
  shortTermCharBudget: number;
  maxShortTermPairs: number;
  semanticMemoryLimit: number;
  associationLimit: number;
  factsCharBudget: number;
  identityFragmentLimit: number;
  memoryCharBudget: number;
}

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  claude: 'Claude',
};

export const OPENAI_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gpt-5.5',
    name: 'GPT-5.5',
    description: 'Latest frontier model for complex production workflows',
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    description: 'High-capability GPT-5 model for coding and professional work',
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 mini',
    description: 'Strong lower-latency GPT-5 model',
  },
  {
    id: 'gpt-5.4-nano',
    name: 'GPT-5.4 nano',
    description: 'Lowest-cost GPT-5.4-class model for simple tasks',
  },
  {
    id: 'gpt-5.3-chat-latest',
    name: 'GPT-5.3 Chat',
    description: 'Current ChatGPT-style GPT-5 chat model',
  },
  {
    id: 'gpt-5-chat-latest',
    name: 'GPT-5 Chat',
    description: 'Previous ChatGPT-style GPT-5 model for conversational use',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 mini',
    description: 'Previous cost-optimized GPT-5 family model',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Strong non-reasoning model with configurable sampling',
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 mini',
    description: 'Fast, lower-cost general model',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    description: 'Legacy low-cost default with vision support',
  },
];

const OPEN_WEIGHT_MODEL_MARKERS = [
  'gpt-oss',
  'llama',
  'mistral',
  'mixtral',
  'gemma',
  'qwen',
  'deepseek',
  'phi',
  'llava',
];

const stripProviderLabel = (model: string): string =>
  model.replace(/^(openai|openrouter|ollama|claude):/i, '').trim();

export const normalizeModelIdForCapabilities = (model?: string | null): string => {
  if (!model) return '';
  return stripProviderLabel(model).replace(/^openai\//i, '').toLowerCase();
};

export const isGPT5FamilyModel = (model: string): boolean => {
  const normalized = normalizeModelIdForCapabilities(model);
  return /^gpt-5(?:$|[-.])/.test(normalized);
};

export const isOpenAIReasoningModel = (model: string): boolean => {
  const normalized = normalizeModelIdForCapabilities(model);
  return (
    isGPT5FamilyModel(normalized) ||
    /^o\d(?:$|[-.])/.test(normalized) ||
    normalized.startsWith('gpt-oss-')
  );
};

export const usesMaxCompletionTokens = (model: string): boolean => {
  return isOpenAIReasoningModel(model);
};

export const usesDefaultSamplingOnly = (model: string): boolean => {
  const normalized = normalizeModelIdForCapabilities(model);
  return (
    isGPT5FamilyModel(normalized) ||
    /^o\d(?:$|[-.])/.test(normalized) ||
    normalized.startsWith('gpt-oss-')
  );
};

export const isOpenWeightOrLocalModel = (model: string): boolean => {
  const normalized = normalizeModelIdForCapabilities(model);
  if (model.toLowerCase().startsWith('ollama:')) {
    return true;
  }
  return OPEN_WEIGHT_MODEL_MARKERS.some(marker => normalized.includes(marker));
};

export const getCognitiveContextProfile = (
  model: string,
  requestedMemoryPairs: number
): CognitiveContextProfile => {
  if (isOpenWeightOrLocalModel(model)) {
    return {
      name: 'open-weight-compact',
      shortTermCharBudget: 1200,
      maxShortTermPairs: Math.max(1, Math.min(2, requestedMemoryPairs)),
      semanticMemoryLimit: 3,
      associationLimit: 3,
      factsCharBudget: 120,
      identityFragmentLimit: 4,
      memoryCharBudget: 360,
    };
  }

  return {
    name: 'default',
    shortTermCharBudget: 2000,
    maxShortTermPairs: Math.max(1, requestedMemoryPairs),
    semanticMemoryLimit: 5,
    associationLimit: 4,
    factsCharBudget: 160,
    identityFragmentLimit: 10,
    memoryCharBudget: 600,
  };
};

export const OPENROUTER_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'openai/gpt-5.5',
    name: 'OpenAI GPT-5.5',
    description: 'Latest OpenAI frontier model routed through OpenRouter',
    source: 'preset',
  },
  {
    id: 'openai/gpt-5.4',
    name: 'OpenAI GPT-5.4',
    description: 'High-capability OpenAI model routed through OpenRouter',
    source: 'preset',
  },
  {
    id: 'openai/gpt-5.4-mini',
    name: 'OpenAI GPT-5.4 mini',
    description: 'Lower-latency OpenAI model routed through OpenRouter',
    source: 'preset',
  },
  {
    id: AI.DEFAULT_OPENROUTER_MODEL,
    name: 'OpenAI GPT-5.2',
    description: 'General OpenAI chat model routed through OpenRouter',
    source: 'preset',
  },
  {
    id: 'openai/gpt-5.3-chat-latest',
    name: 'OpenAI GPT-5.3 Chat',
    description: 'ChatGPT-style OpenAI model routed through OpenRouter',
    source: 'preset',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'OpenAI GPT-5 mini',
    description: 'Lower-cost OpenAI model routed through OpenRouter',
    source: 'preset',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI gpt-oss 120B',
    description: 'OpenAI open-weight model routed through OpenRouter',
    source: 'preset',
  },
  {
    id: 'openai/gpt-oss-120b:nitro',
    name: 'OpenAI gpt-oss 120B Nitro',
    description: 'Throughput-oriented gpt-oss 120B route through OpenRouter',
    source: 'preset',
  },
  {
    id: 'openai/gpt-oss-120b:exacto',
    name: 'OpenAI gpt-oss 120B Exacto',
    description: 'Quality-oriented gpt-oss 120B route through OpenRouter',
    source: 'preset',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI gpt-oss 20B',
    description: 'Smaller OpenAI open-weight model routed through OpenRouter',
    source: 'preset',
  },
];

export const isOpenRouterOpenAIModel = (model?: string | null): boolean => {
  return !!model && model.trim().toLowerCase().startsWith('openai/');
};

export const getSafeOpenRouterModel = (model?: string | null): string => {
  const trimmed = model?.trim();
  return isOpenRouterOpenAIModel(trimmed)
    ? trimmed!
    : AI.DEFAULT_OPENROUTER_MODEL;
};

export const filterOpenRouterOpenAIModels = (
  models: ModelOption[]
): ModelOption[] => models.filter(model => isOpenRouterOpenAIModel(model.id));

export const sanitizeOpenRouterModelCsv = (value?: string | null): string => {
  if (!value) return '';
  return value
    .split(',')
    .map(model => model.trim())
    .filter(isOpenRouterOpenAIModel)
    .join(', ');
};

export const getDefaultOpenRouterFallbackModels = (model: string): string[] => {
  const normalized = model.trim().toLowerCase();

  if (normalized === 'openai/gpt-oss-120b') {
    return [
      'openai/gpt-oss-120b:nitro',
      'openai/gpt-oss-120b:exacto',
      'openai/gpt-oss-20b',
    ];
  }

  if (normalized === 'openai/gpt-oss-120b:nitro') {
    return [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-120b:exacto',
      'openai/gpt-oss-20b',
    ];
  }

  if (normalized === 'openai/gpt-oss-120b:exacto') {
    return [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-120b:nitro',
      'openai/gpt-oss-20b',
    ];
  }

  return [];
};

export const OLLAMA_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gpt-oss:120b',
    name: 'gpt-oss 120B',
    description: 'OpenAI open-weight reasoning model for local runtimes',
    source: 'preset',
  },
  {
    id: 'gpt-oss:20b',
    name: 'gpt-oss 20B',
    description: 'Smaller OpenAI open-weight reasoning model for local runtimes',
    source: 'preset',
  },
  {
    id: AI.DEFAULT_OLLAMA_MODEL,
    name: 'Llama 3.1',
    description: 'Common local chat model name',
    source: 'preset',
  },
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    description: 'Compact local chat model',
    source: 'preset',
  },
  {
    id: 'gemma3',
    name: 'Gemma 3',
    description: 'Ollama documentation example model',
    source: 'preset',
  },
  {
    id: 'qwen3',
    name: 'Qwen 3',
    description: 'Local general-purpose reasoning model',
    source: 'preset',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Local Mistral chat model',
    source: 'preset',
  },
  {
    id: 'phi4',
    name: 'Phi 4',
    description: 'Compact local Microsoft model',
    source: 'preset',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: 'Local reasoning model',
    source: 'preset',
  },
  {
    id: 'llava',
    name: 'LLaVA',
    description: 'Local multimodal model for image-aware chats',
    source: 'preset',
  },
];

export const CLAUDE_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'claude-opus-4-8',
    name: 'Claude Opus 4.8',
    description: 'Most capable Opus-tier model for demanding, long-form work',
    source: 'preset',
  },
  {
    id: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    description: 'Previous-generation Opus; strong reasoning and vision',
    source: 'preset',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    description: 'Best balance of speed and intelligence; near-Opus quality',
    source: 'preset',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    description: 'Previous-generation Sonnet; fast general-purpose chat',
    source: 'preset',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    description: 'Fastest and most cost-effective Claude model',
    source: 'preset',
  },
];

// Current-generation Claude models (Opus 4.7+, Sonnet 5, Fable/Mythos 5) reject
// temperature/top_p/top_k and return a 400 if they are sent. Older models
// (Opus 4.6, Sonnet 4.6, Haiku 4.5) still accept sampling parameters.
const CLAUDE_NO_SAMPLING_MARKERS = [
  'opus-4-8',
  'opus-4-7',
  'sonnet-5',
  'fable-5',
  'mythos-5',
];

export const claudeModelRejectsSampling = (model: string): boolean => {
  const normalized = normalizeModelIdForCapabilities(model);
  return CLAUDE_NO_SAMPLING_MARKERS.some(marker => normalized.includes(marker));
};

export const normalizeAIProvider = (
  value?: string | null
): AIProvider | null => {
  if (
    value === 'openai' ||
    value === 'openrouter' ||
    value === 'ollama' ||
    value === 'claude'
  ) {
    return value;
  }
  return null;
};

export const detectAIProvider = (
  settings: Settings,
  keys?: Pick<
    ApiKeys,
    'OPENAI_API_KEY' | 'OPENROUTER_API_KEY' | 'ANTHROPIC_API_KEY'
  >
): AIProvider => {
  const configuredProvider = normalizeAIProvider(settings.aiProvider);
  if (configuredProvider) return configuredProvider;

  if (settings.selectedModel === 'Open Source') return 'ollama';
  if (settings.selectedModel === 'openai') return 'openai';
  if (settings.selectedModel === 'openrouter') return 'openrouter';
  if (settings.selectedModel === 'claude') return 'claude';

  if (keys?.OPENROUTER_API_KEY?.trim()) return 'openrouter';
  if (keys?.ANTHROPIC_API_KEY?.trim()) return 'claude';
  if (keys?.OPENAI_API_KEY?.trim()) return 'openai';

  return 'openai';
};

export const getModelForProvider = (
  provider: AIProvider,
  settings: Settings
): string => {
  switch (provider) {
    case 'openrouter':
      return getSafeOpenRouterModel(settings.openRouterModel);
    case 'ollama':
      return settings.ollamaModel || AI.DEFAULT_OLLAMA_MODEL;
    case 'claude':
      return settings.claudeModel || AI.DEFAULT_CLAUDE_MODEL;
    case 'openai':
    default:
      return settings.preferredLanguageModel || AI.DEFAULT_MODEL;
  }
};

export const getActiveModelLabel = (
  settings: Settings,
  keys?: Pick<
    ApiKeys,
    'OPENAI_API_KEY' | 'OPENROUTER_API_KEY' | 'ANTHROPIC_API_KEY'
  >
): string => {
  const provider = detectAIProvider(settings, keys);
  return `${AI_PROVIDER_LABELS[provider]}:${getModelForProvider(provider, settings)}`;
};
