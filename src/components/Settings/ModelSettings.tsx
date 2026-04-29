import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { AIProvider } from '../../types';
import {
  AI_PROVIDER_LABELS,
  OPENAI_MODEL_OPTIONS,
  OPENROUTER_MODEL_OPTIONS,
  OLLAMA_MODEL_OPTIONS,
  detectAIProvider,
  filterOpenRouterOpenAIModels,
  getModelForProvider,
  getSafeOpenRouterModel,
  sanitizeOpenRouterModelCsv,
  type ModelOption,
} from '../../utils/aiProviders';
import {
  getAIConfig,
  getUsageStats,
  saveAIConfig,
} from '../../services/aiService';
import { getOpenRouterModels } from '../../utils/openaiApi';
import {
  getOllamaModelOptions,
  testOllamaConnection,
} from '../../utils/ollamaApi';
import {
  loadApiKeys,
  loadSettings,
  saveSettings,
} from '../../utils/storageUtils';
import { AI, EVENTS } from '../../config/constants';
import { showError, showSuccess } from '../Common/NotificationManager';

const Container = styled.div`
  color: #0f0;
  max-width: 100%;
  min-height: 60vh;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: 1em;
    min-height: 70vh;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;

  @media (max-width: 768px) {
    font-size: 1.4em;
    margin-bottom: 1.5em;
    text-align: center;
  }
`;

const InfoBox = styled.div`
  padding: 1em;
  border: 1px solid #00f;
  background-color: #000020;
  margin-bottom: 1.5em;
  font-size: 0.9em;
  line-height: 1.5;
`;

const GuideGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75em;
  margin-bottom: 1.5em;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const GuidePanel = styled.div`
  border: 1px solid #0af6;
  background: #000814;
  padding: 0.85em;
  min-height: 8.5em;
`;

const GuideTitle = styled.h3`
  color: #0af;
  font-size: 0.95em;
  margin: 0 0 0.45em;
`;

const GuideText = styled.p`
  margin: 0;
  color: #0f0;
  font-size: 0.84em;
  line-height: 1.45;
`;

const HelpList = styled.ul`
  margin: 0 0 1.5em;
  padding-left: 1.25em;
  color: #0f0;
  font-size: 0.84em;
  line-height: 1.45;
`;

const HelpItem = styled.li`
  margin-bottom: 0.45em;
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75em;
  margin-bottom: 1.5em;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StatusCell = styled.div`
  border: 1px solid #0f04;
  padding: 0.8em;
  min-height: 4em;
`;

const StatusLabel = styled.div`
  color: #0af;
  font-size: 0.8em;
  margin-bottom: 0.4em;
`;

const StatusValue = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'status',
})<{ status?: 'good' | 'warning' }>`
  color: ${props => (props.status === 'warning' ? '#fa0' : '#0f0')};
  overflow-wrap: anywhere;
`;

const ProviderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75em;
  margin-bottom: 1.5em;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const ProviderButton = styled.button.withConfig({
  shouldForwardProp: prop => prop !== 'active',
})<{ active?: boolean }>`
  min-height: 4.25em;
  background: ${props => (props.active ? '#0f0' : '#000')};
  color: ${props => (props.active ? '#000' : '#0f0')};
  border: 1px solid #0f0;
  padding: 0.85em;
  text-align: left;
  cursor: pointer;
  font-family: monospace;

  &:hover {
    background: #0f0;
    color: #000;
  }

  &:focus-visible {
    outline: 2px solid #0ff;
    outline-offset: 2px;
  }
`;

const ProviderName = styled.div`
  font-weight: bold;
  margin-bottom: 0.35em;
`;

const ProviderMeta = styled.div`
  font-size: 0.8em;
  line-height: 1.35;
`;

const FormGroup = styled.div`
  margin-bottom: 1.3em;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.45em;
  color: #0af;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.7em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  font-family: monospace;

  option {
    background: #000;
    color: #0f0;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  font-family: monospace;
  box-sizing: border-box;
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75em;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const ToggleButton = styled.button.withConfig({
  shouldForwardProp: prop => prop !== 'active',
})<{ active?: boolean }>`
  min-height: 5.3em;
  padding: 0.85em;
  background: ${props => (props.active ? '#063' : '#000')};
  color: #0f0;
  border: 1px solid ${props => (props.active ? '#0f0' : '#0f06')};
  font-family: monospace;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  overflow-wrap: anywhere;

  &:hover {
    border-color: #0ff;
    background: ${props => (props.active ? '#074' : '#001810')};
  }

  &:focus-visible {
    outline: 2px solid #0ff;
    outline-offset: 2px;
  }
`;

const ToggleTitle = styled.div`
  font-weight: bold;
  margin-bottom: 0.35em;
`;

const ToggleDescription = styled.div`
  color: #0f0b;
  font-size: 0.78em;
  line-height: 1.35;
`;

const RoutingSummary = styled.div`
  margin-top: 0.75em;
  padding: 0.75em;
  border: 1px solid #0af4;
  color: #0af;
  background: #000610;
  font-size: 0.78em;
  line-height: 1.4;
`;

const Slider = styled.input`
  width: 100%;
  margin: 10px 0;
`;

const Description = styled.p`
  margin: 0.5em 0 0;
  color: #0f09;
  font-size: 0.82em;
  line-height: 1.4;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1em;
  margin-top: 1.5em;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.65em 1em;
  cursor: pointer;

  &:hover {
    background: #0f0;
    color: #000;
  }

  &:focus-visible {
    outline: 2px solid #0ff;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  border-color: #0af;
  color: #0af;

  &:hover {
    background: #0af;
    color: #000;
  }
`;

const StatsContainer = styled.div`
  margin-top: 2em;
  padding: 1em;
  border: 1px solid #0f0;
  background-color: #001000;
`;

const StatsTitle = styled.h3`
  margin-bottom: 0.5em;
  font-size: 1em;
`;

const StatsList = styled.ul`
  list-style: none;
  padding: 0;
`;

const StatsItem = styled.li`
  margin-bottom: 0.5em;
  font-family: monospace;
  overflow-wrap: anywhere;
`;

interface ModelSettingsProps {
  onBack: () => void;
}

const providerNotes: Record<AIProvider, string> = {
  openai: 'Uses the OpenAI API key from API Keys.',
  openrouter: 'Uses your OpenRouter key with OpenAI model ids only.',
  ollama: 'Uses a local Ollama server.',
};

type OpenRouterFlagKey =
  | 'openRouterByokOptimized'
  | 'openRouterAllowFallbacks'
  | 'openRouterRequireParameters'
  | 'openRouterZdr';

const routingToggles: Array<{
  key: OpenRouterFlagKey;
  label: string;
  defaultValue: boolean;
  description: string;
}> = [
  {
    key: 'openRouterByokOptimized',
    label: 'BYOK optimization',
    defaultValue: true,
    description:
      'Prioritizes lower-cost routes across fallback models so OpenRouter can prefer your provider keys when available.',
  },
  {
    key: 'openRouterAllowFallbacks',
    label: 'Provider fallbacks',
    defaultValue: true,
    description:
      'Lets OpenRouter try another provider if the preferred provider is unavailable.',
  },
  {
    key: 'openRouterRequireParameters',
    label: 'Strict parameters',
    defaultValue: false,
    description:
      'Only routes to providers that support every request parameter sent by ALTER EGO.',
  },
  {
    key: 'openRouterZdr',
    label: 'ZDR only',
    defaultValue: false,
    description:
      'Requires zero-data-retention endpoints when OpenRouter reports that option for the route.',
  },
];

const recommendationPanels = [
  {
    title: 'Convenience',
    text: 'Use OpenAI with GPT-5 Chat or GPT-5 mini when you want the least setup. Use OpenRouter when you want one key for OpenAI models.',
  },
  {
    title: 'Highest quality',
    text: 'Start with GPT-5.5 or an OpenAI frontier model through OpenRouter. Keep temperature moderate so persona details and memory remain stable.',
  },
  {
    title: 'Token efficiency',
    text: 'Use GPT-5 mini, GPT-4.1 mini, or gpt-oss 20B. Lower max output tokens to cap response length and cost.',
  },
];

const ModelSettings: React.FC<ModelSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState(() => loadSettings());
  const [provider, setProvider] = useState<AIProvider>(() =>
    detectAIProvider(loadSettings(), loadApiKeys())
  );
  const [temperature, setTemperature] = useState(
    () => getAIConfig().temperature
  );
  const [maxTokens, setMaxTokens] = useState(() => getAIConfig().maxTokens);
  const [modelSearch, setModelSearch] = useState('');
  const [openRouterModels, setOpenRouterModels] = useState<ModelOption[]>([]);
  const [openRouterModelError, setOpenRouterModelError] = useState<
    string | null
  >(null);
  const [loadingOpenRouterModels, setLoadingOpenRouterModels] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<ModelOption[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [testingOllama, setTestingOllama] = useState(false);
  const [tokenStats] = useState(getUsageStats());

  const apiKeys = useMemo(() => loadApiKeys(), []);
  const activeModel = getModelForProvider(provider, settings);

  useEffect(() => {
    if (provider !== 'ollama') return;
    void refreshOllamaModels();
  }, [provider, settings.ollamaBaseUrl]);

  useEffect(() => {
    if (provider !== 'openrouter') return;
    void refreshOpenRouterModels();
  }, [provider]);

  useEffect(() => {
    setModelSearch('');
  }, [provider]);

  const updateSettings = (patch: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  const filterModelOptions = (models: ModelOption[]) => {
    const query = modelSearch.trim().toLowerCase();
    if (!query) return models;

    return models.filter(model =>
      [model.id, model.name, model.description]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query))
    );
  };

  const ensureActiveModelVisible = (
    filteredModels: ModelOption[],
    sourceModels: ModelOption[]
  ) => {
    if (filteredModels.some(model => model.id === activeModel)) {
      return filteredModels;
    }

    const activeOption = sourceModels.find(model => model.id === activeModel);
    return activeOption ? [activeOption, ...filteredModels] : filteredModels;
  };

  const formatOptionLabel = (model: ModelOption) => {
    const meta = model.contextLength
      ? ` (${model.contextLength.toLocaleString()} ctx)`
      : '';
    return `${model.name}${meta} - ${model.id}`;
  };

  const renderModelSearch = (placeholder: string) => (
    <FormGroup>
      <Label htmlFor="modelSearch">Search models:</Label>
      <Input
        id="modelSearch"
        value={modelSearch}
        onChange={e => setModelSearch(e.target.value)}
        placeholder={placeholder}
      />
    </FormGroup>
  );

  const refreshOpenRouterModels = async () => {
    setLoadingOpenRouterModels(true);
    setOpenRouterModelError(null);
    try {
      const models = await getOpenRouterModels();
      setOpenRouterModels(models);
    } catch (error) {
      setOpenRouterModels([]);
      setOpenRouterModelError(
        error instanceof Error ? error.message : 'Unable to load models'
      );
    } finally {
      setLoadingOpenRouterModels(false);
    }
  };

  const refreshOllamaModels = async () => {
    setTestingOllama(true);
    try {
      const connected = await testOllamaConnection();
      setOllamaConnected(connected);
      if (!connected) {
        setOllamaModels([]);
        return;
      }
      const models = await getOllamaModelOptions();
      setOllamaModels(models);
    } catch {
      setOllamaConnected(false);
      setOllamaModels([]);
    } finally {
      setTestingOllama(false);
    }
  };

  const handleModelChange = (model: string) => {
    if (provider === 'openai') {
      updateSettings({ preferredLanguageModel: model });
    } else if (provider === 'openrouter') {
      updateSettings({ openRouterModel: model });
    } else {
      updateSettings({ ollamaModel: model });
    }
  };

  const handleOpenRouterFlagToggle = (
    key: OpenRouterFlagKey,
    value: boolean
  ) => {
    updateSettings({ [key]: value } as Partial<typeof settings>);
  };

  const getOpenRouterFlag = (
    key: OpenRouterFlagKey,
    defaultValue: boolean
  ) => settings[key] ?? defaultValue;

  const getOpenRouterRoutingSummary = () => {
    const parts = [];
    if (settings.openRouterProviderOrder?.trim()) {
      parts.push(`order: ${settings.openRouterProviderOrder.trim()}`);
    }
    if (settings.openRouterOnlyProviders?.trim()) {
      parts.push(`only: ${settings.openRouterOnlyProviders.trim()}`);
    }
    if (settings.openRouterAllowFallbacks === false) {
      parts.push('fallbacks: disabled');
    }
    if (settings.openRouterRequireParameters) {
      parts.push('require parameters: enabled');
    }
    if (settings.openRouterDataCollection === 'deny') {
      parts.push('data collection: deny');
    }
    if (settings.openRouterZdr) {
      parts.push('ZDR: required');
    }
    if (settings.openRouterByokOptimized ?? true) {
      parts.push('sort: price across fallback models');
    }
    return parts.length
      ? parts.join(' | ')
      : 'default OpenRouter load balancing';
  };

  const handleSave = () => {
    try {
      const openRouterModel = getSafeOpenRouterModel(settings.openRouterModel);
      const openRouterFallbackModels = sanitizeOpenRouterModelCsv(
        settings.openRouterFallbackModels
      );
      const nextSettings = {
        ...settings,
        aiProvider: provider,
        selectedModel: provider === 'ollama' ? 'Open Source' : 'openai',
        preferredLanguageModel:
          settings.preferredLanguageModel || AI.DEFAULT_MODEL,
        openRouterModel,
        openRouterFallbackModels,
        openRouterByokOptimized: settings.openRouterByokOptimized ?? true,
        openRouterProviderOrder: settings.openRouterProviderOrder || '',
        openRouterOnlyProviders: settings.openRouterOnlyProviders || '',
        openRouterAllowFallbacks: settings.openRouterAllowFallbacks ?? true,
        openRouterRequireParameters:
          settings.openRouterRequireParameters ?? false,
        openRouterDataCollection: settings.openRouterDataCollection || 'allow',
        openRouterZdr: settings.openRouterZdr ?? false,
        ollamaModel: settings.ollamaModel || AI.DEFAULT_OLLAMA_MODEL,
        ollamaBaseUrl: settings.ollamaBaseUrl || AI.DEFAULT_OLLAMA_BASE_URL,
      };

      saveSettings(nextSettings);
      setSettings(nextSettings);
      saveAIConfig({
        model: getModelForProvider(provider, nextSettings),
        temperature,
        maxTokens,
      });
      window.dispatchEvent(new CustomEvent(EVENTS.SETTINGS_UPDATED));
      showSuccess('AI model settings saved successfully.');
    } catch (error) {
      showError('Failed to save AI model settings.');
      console.error('Failed to save AI model settings:', error);
    }
  };

  const renderModelControl = () => {
    if (provider === 'openrouter') {
      const modelOptions = filterOpenRouterOpenAIModels(
        openRouterModels.length ? openRouterModels : OPENROUTER_MODEL_OPTIONS
      );
      const filteredModels = ensureActiveModelVisible(
        filterModelOptions(modelOptions).slice(0, 200),
        modelOptions
      );

      return (
        <>
          {renderModelSearch('Search OpenAI models on OpenRouter')}
          <FormGroup>
            <Label htmlFor="openRouterModelPreset">OpenRouter models:</Label>
            <Select
              id="openRouterModelPreset"
              value={
                modelOptions.some(m => m.id === activeModel) ? activeModel : ''
              }
              onChange={e =>
                e.target.value && handleModelChange(e.target.value)
              }
            >
              <option value="">Custom model id</option>
              {filteredModels.map(model => (
                <option key={model.id} value={model.id}>
                  {formatOptionLabel(model)}
                </option>
              ))}
            </Select>
            <Description>
              {openRouterModels.length
                ? `${filteredModels.length} shown from ${modelOptions.length} OpenAI models on OpenRouter.`
                : openRouterModelError ||
                  'Using built-in OpenAI presets until OpenRouter models are loaded.'}
            </Description>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="openRouterModel">OpenRouter model id:</Label>
            <Input
              id="openRouterModel"
              value={settings.openRouterModel || AI.DEFAULT_OPENROUTER_MODEL}
              onChange={e => handleModelChange(e.target.value)}
              placeholder={AI.DEFAULT_OPENROUTER_MODEL}
            />
            <Description>
              Only model ids beginning with openai/ are used. Other namespaces
              are reset to {AI.DEFAULT_OPENROUTER_MODEL} when saved or sent.
            </Description>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="openRouterFallbackModels">
              Fallback model ids:
            </Label>
            <Input
              id="openRouterFallbackModels"
              value={settings.openRouterFallbackModels || ''}
              onChange={e =>
                updateSettings({ openRouterFallbackModels: e.target.value })
              }
              placeholder="openai/gpt-oss-120b:nitro, openai/gpt-oss-20b"
            />
            <Description>
              Optional comma-separated OpenAI model ids for model fallback
              routing through OpenRouter.
            </Description>
          </FormGroup>
          <FormGroup>
            <Label>OpenRouter routing:</Label>
            <CheckboxGrid>
              {routingToggles.map(toggle => {
                const active = getOpenRouterFlag(
                  toggle.key,
                  toggle.defaultValue
                );
                return (
                  <ToggleButton
                    key={toggle.key}
                    type="button"
                    active={active}
                    aria-pressed={active}
                    onClick={() =>
                      handleOpenRouterFlagToggle(toggle.key, !active)
                    }
                  >
                    <ToggleTitle>{toggle.label}</ToggleTitle>
                    <ToggleDescription>{toggle.description}</ToggleDescription>
                  </ToggleButton>
                );
              })}
            </CheckboxGrid>
            <RoutingSummary>
              Current routing request: {getOpenRouterRoutingSummary()}
            </RoutingSummary>
            <Description>
              Routing changes are saved with this panel and sent in the
              OpenRouter provider object on the next request.
            </Description>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="openRouterProviderOrder">Provider order:</Label>
            <Input
              id="openRouterProviderOrder"
              value={settings.openRouterProviderOrder || ''}
              onChange={e =>
                updateSettings({ openRouterProviderOrder: e.target.value })
              }
              placeholder="openai"
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="openRouterOnlyProviders">Allowed providers:</Label>
            <Input
              id="openRouterOnlyProviders"
              value={settings.openRouterOnlyProviders || ''}
              onChange={e =>
                updateSettings({ openRouterOnlyProviders: e.target.value })
              }
              placeholder="openai"
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="openRouterDataCollection">Data policy:</Label>
            <Select
              id="openRouterDataCollection"
              value={settings.openRouterDataCollection || 'allow'}
              onChange={e =>
                updateSettings({
                  openRouterDataCollection: e.target.value as 'allow' | 'deny',
                })
              }
            >
              <option value="allow">Allow provider data collection</option>
              <option value="deny">Deny provider data collection</option>
            </Select>
          </FormGroup>
          <SecondaryButton
            type="button"
            onClick={refreshOpenRouterModels}
            disabled={loadingOpenRouterModels}
          >
            {loadingOpenRouterModels
              ? 'Loading OpenRouter...'
              : 'Refresh OpenRouter'}
          </SecondaryButton>
        </>
      );
    }

    if (provider === 'ollama') {
      const modelOptions = ollamaModels.length
        ? ollamaModels
        : OLLAMA_MODEL_OPTIONS;
      const filteredModels = ensureActiveModelVisible(
        filterModelOptions(modelOptions),
        modelOptions
      );

      return (
        <>
          <FormGroup>
            <Label htmlFor="ollamaBaseUrl">Ollama URL:</Label>
            <Input
              id="ollamaBaseUrl"
              value={settings.ollamaBaseUrl || AI.DEFAULT_OLLAMA_BASE_URL}
              onChange={e => updateSettings({ ollamaBaseUrl: e.target.value })}
              placeholder={AI.DEFAULT_OLLAMA_BASE_URL}
            />
            <Description>
              Status:{' '}
              {ollamaConnected === null
                ? 'not checked'
                : ollamaConnected
                  ? 'connected'
                  : 'disconnected'}
            </Description>
          </FormGroup>
          {renderModelSearch('Search installed or preset Ollama models')}
          <FormGroup>
            <Label htmlFor="ollamaModel">Ollama model:</Label>
            <Select
              id="ollamaModel"
              value={
                modelOptions.some(model => model.id === activeModel)
                  ? activeModel
                  : ''
              }
              onChange={e =>
                e.target.value && handleModelChange(e.target.value)
              }
            >
              <option value="">Custom model id</option>
              {filteredModels.map(model => (
                <option key={model.id} value={model.id}>
                  {formatOptionLabel(model)}
                </option>
              ))}
            </Select>
            <Description>
              {ollamaModels.length
                ? `${filteredModels.length} shown from ${ollamaModels.length} installed models.`
                : 'Using built-in Ollama presets until a local server responds.'}
            </Description>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="ollamaModelCustom">Ollama model id:</Label>
            <Input
              id="ollamaModelCustom"
              value={settings.ollamaModel || AI.DEFAULT_OLLAMA_MODEL}
              onChange={e => handleModelChange(e.target.value)}
              placeholder={AI.DEFAULT_OLLAMA_MODEL}
            />
          </FormGroup>
          <SecondaryButton
            type="button"
            onClick={refreshOllamaModels}
            disabled={testingOllama}
          >
            {testingOllama ? 'Checking...' : 'Refresh Ollama'}
          </SecondaryButton>
        </>
      );
    }

    const filteredModels = ensureActiveModelVisible(
      filterModelOptions(OPENAI_MODEL_OPTIONS),
      OPENAI_MODEL_OPTIONS
    );
    return (
      <>
        {renderModelSearch('Search OpenAI model presets')}
        <FormGroup>
          <Label htmlFor="openaiModel">OpenAI model:</Label>
          <Select
            id="openaiModel"
            value={settings.preferredLanguageModel || AI.DEFAULT_MODEL}
            onChange={e => handleModelChange(e.target.value)}
          >
            {filteredModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.description}
              </option>
            ))}
          </Select>
        </FormGroup>
      </>
    );
  };

  return (
    <Container>
      <Title>AI Models</Title>

      <InfoBox>
        Active provider is controlled by this panel. Persona instructions,
        associative memory, long-term memory, and identity context are applied
        through the same request path for OpenAI, OpenRouter, and Ollama.
      </InfoBox>

      <GuideGrid>
        {recommendationPanels.map(panel => (
          <GuidePanel key={panel.title}>
            <GuideTitle>{panel.title}</GuideTitle>
            <GuideText>{panel.text}</GuideText>
          </GuidePanel>
        ))}
      </GuideGrid>

      <HelpList>
        <HelpItem>
          Temperature controls variation. Lower values are steadier; higher
          values are more exploratory.
        </HelpItem>
        <HelpItem>
          Max output tokens caps response length. Higher caps allow longer
          answers but can cost more and take longer.
        </HelpItem>
        <HelpItem>
          OpenRouter model choices are restricted to the openai/ namespace.
          Provider order and allowed providers still use OpenRouter provider
          slugs when you need endpoint-level routing.
        </HelpItem>
        <HelpItem>
          OpenRouter's default routing weighs stable low-cost providers most
          heavily. Setting provider order or sort makes routing more explicit.
        </HelpItem>
      </HelpList>

      <StatusGrid>
        <StatusCell>
          <StatusLabel>Detected provider</StatusLabel>
          <StatusValue>{AI_PROVIDER_LABELS[provider]}</StatusValue>
        </StatusCell>
        <StatusCell>
          <StatusLabel>Detected model</StatusLabel>
          <StatusValue>{activeModel}</StatusValue>
        </StatusCell>
        <StatusCell>
          <StatusLabel>OpenAI key</StatusLabel>
          <StatusValue status={apiKeys.OPENAI_API_KEY ? 'good' : 'warning'}>
            {apiKeys.OPENAI_API_KEY ? 'configured' : 'missing'}
          </StatusValue>
        </StatusCell>
        <StatusCell>
          <StatusLabel>OpenRouter key</StatusLabel>
          <StatusValue status={apiKeys.OPENROUTER_API_KEY ? 'good' : 'warning'}>
            {apiKeys.OPENROUTER_API_KEY ? 'configured' : 'missing'}
          </StatusValue>
        </StatusCell>
      </StatusGrid>

      <ProviderGrid>
        {(Object.keys(AI_PROVIDER_LABELS) as AIProvider[]).map(item => (
          <ProviderButton
            key={item}
            type="button"
            active={provider === item}
            aria-pressed={provider === item}
            onClick={() => setProvider(item)}
          >
            <ProviderName>{AI_PROVIDER_LABELS[item]}</ProviderName>
            <ProviderMeta>{providerNotes[item]}</ProviderMeta>
          </ProviderButton>
        ))}
      </ProviderGrid>

      {renderModelControl()}

      <FormGroup>
        <Label htmlFor="temperature">Temperature: {temperature}</Label>
        <Slider
          type="range"
          id="temperature"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={e => setTemperature(parseFloat(e.target.value))}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="maxTokens">Max output tokens: {maxTokens}</Label>
        <Slider
          type="range"
          id="maxTokens"
          min="100"
          max="8000"
          step="100"
          value={maxTokens}
          onChange={e => setMaxTokens(parseInt(e.target.value, 10))}
        />
      </FormGroup>

      <ButtonContainer>
        <Button onClick={onBack}>Back</Button>
        <Button onClick={handleSave}>Save</Button>
      </ButtonContainer>

      {tokenStats.total > 0 && (
        <StatsContainer>
          <StatsTitle>Token Usage Statistics</StatsTitle>
          <StatsList>
            <StatsItem>Total tokens used: {tokenStats.total}</StatsItem>
            {Object.entries(tokenStats.byModel).map(([model, tokens]) => (
              <StatsItem key={model}>
                {model}: {tokens} tokens
              </StatsItem>
            ))}
          </StatsList>
        </StatsContainer>
      )}
    </Container>
  );
};

export default ModelSettings;
