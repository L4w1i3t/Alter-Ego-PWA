import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  loadApiKeys,
  loadSettings,
  saveApiKeys,
  saveSettings,
  ApiKeys,
} from '../../utils/storageUtils';
import { AI_PROVIDER_LABELS } from '../../utils/aiProviders';
import type { AIProvider } from '../../types';
import {
  showSuccess,
  showError,
  showWarning,
} from '../Common/NotificationManager';
import {
  validateOpenAIKey,
  validateElevenLabsKey,
  validateOpenRouterKey,
  validateAnthropicKey,
  checkForCompromisedKeys,
  assessKeyStrength,
  sanitizeKeyForLogging,
} from '../../utils/keyValidation';
import { Disclosure, Hint, ScreenIntro } from '../Common/Disclosure';

const Container = styled.div`
  color: #0f0;
  max-width: 100%;

  @media (max-width: 768px) {
    padding: 0 0.5em;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;

  @media (max-width: 768px) {
    margin-bottom: 1.5em;
    font-size: 1.3em;
    text-align: center;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5em; /* Increased spacing between form groups */

  @media (max-width: 768px) {
    margin-bottom: 2em;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.3em;

  @media (max-width: 768px) {
    margin-bottom: 0.8em;
    font-size: 1.1em;
    font-weight: bold;
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

  @media (max-width: 768px) {
    padding: 1em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

/* Field-level help now uses the shared Hint primitive; see the render below. */

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1.5em;
  gap: 1em;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-top: 2.5em;
    gap: 1.2em;
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
  }
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  cursor: pointer;

  &:hover {
    background: #0f0;
    color: #000;
  }

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

const SaveButton = styled(Button)``;
const BackButton = styled(Button)``;

interface ApiKeyManagerProps {
  onBack: () => void;
}

const trimApiKeys = (keys: ApiKeys): ApiKeys => ({
  OPENAI_API_KEY: keys.OPENAI_API_KEY.trim(),
  OPENROUTER_API_KEY: keys.OPENROUTER_API_KEY.trim(),
  ANTHROPIC_API_KEY: keys.ANTHROPIC_API_KEY.trim(),
  ELEVENLABS_API_KEY: keys.ELEVENLABS_API_KEY.trim(),
});

const getProviderAfterKeySave = (
  currentProvider: AIProvider | undefined,
  keys: ApiKeys
): AIProvider | null => {
  if (currentProvider === 'ollama') return null;

  // Which hosted providers now have a usable key.
  const available: AIProvider[] = [];
  if (keys.OPENAI_API_KEY) available.push('openai');
  if (keys.OPENROUTER_API_KEY) available.push('openrouter');
  if (keys.ANTHROPIC_API_KEY) available.push('claude');

  // Keep the active provider if it still has its key.
  if (currentProvider && available.includes(currentProvider)) return null;

  // Otherwise adopt the sole available provider (unambiguous case only).
  if (available.length === 1) return available[0];

  return null;
};

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onBack }) => {
  const [keys, setKeys] = useState<ApiKeys>({
    OPENAI_API_KEY: '',
    OPENROUTER_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    ELEVENLABS_API_KEY: '',
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    openai: { valid: boolean; error?: string; warnings?: string[] } | null;
    openrouter: { valid: boolean; error?: string; warnings?: string[] } | null;
    anthropic: { valid: boolean; error?: string; warnings?: string[] } | null;
    elevenlabs: { valid: boolean; error?: string; warnings?: string[] } | null;
  }>({
    openai: null,
    openrouter: null,
    anthropic: null,
    elevenlabs: null,
  });

  useEffect(() => {
    // Load existing API keys
    const savedKeys = loadApiKeys();
    setKeys(savedKeys);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setKeys(prevKeys => ({
      ...prevKeys,
      [name]: value,
    }));
  };
  const handleSaveKeys = async () => {
    setIsValidating(true);

    try {
      const nextKeys = trimApiKeys(keys);
      setKeys(nextKeys);

      // Enhanced validation
      let hasErrors = false;

      // Check for compromised keys
      const compromisedWarnings = checkForCompromisedKeys(nextKeys);
      compromisedWarnings.forEach(warning => showWarning(warning));

      // Validate OpenAI key if provided
      if (nextKeys.OPENAI_API_KEY) {
        const openaiResult = await validateOpenAIKey(nextKeys.OPENAI_API_KEY);
        setValidationResults(prev => ({ ...prev, openai: openaiResult }));

        if (!openaiResult.valid) {
          showError(`OpenAI API Key: ${openaiResult.error}`);
          hasErrors = true;
        } else {
          console.log(
            `OpenAI key validated: ${sanitizeKeyForLogging(nextKeys.OPENAI_API_KEY)}`
          );
          if (openaiResult.warnings) {
            openaiResult.warnings.forEach(warning => showWarning(warning));
          }

          // Assess key strength
          const strength = assessKeyStrength(nextKeys.OPENAI_API_KEY);
          if (strength.strength === 'weak') {
            showWarning(
              "OpenAI key appears to have weak patterns. Ensure you're using a genuine API key."
            );
          }
        }
      }

      if (nextKeys.OPENROUTER_API_KEY) {
        const openRouterResult = await validateOpenRouterKey(
          nextKeys.OPENROUTER_API_KEY
        );
        setValidationResults(prev => ({
          ...prev,
          openrouter: openRouterResult,
        }));

        if (!openRouterResult.valid) {
          showError(`OpenRouter API Key: ${openRouterResult.error}`);
          hasErrors = true;
        } else {
          console.log(
            `OpenRouter key validated: ${sanitizeKeyForLogging(nextKeys.OPENROUTER_API_KEY)}`
          );
          openRouterResult.warnings?.forEach(warning => showWarning(warning));
        }
      }

      if (nextKeys.ANTHROPIC_API_KEY) {
        const anthropicResult = await validateAnthropicKey(
          nextKeys.ANTHROPIC_API_KEY
        );
        setValidationResults(prev => ({
          ...prev,
          anthropic: anthropicResult,
        }));

        if (!anthropicResult.valid) {
          showError(`Anthropic API Key: ${anthropicResult.error}`);
          hasErrors = true;
        } else {
          console.log(
            `Anthropic key validated: ${sanitizeKeyForLogging(nextKeys.ANTHROPIC_API_KEY)}`
          );
          anthropicResult.warnings?.forEach(warning => showWarning(warning));
        }
      }

      // Validate ElevenLabs key if provided
      if (nextKeys.ELEVENLABS_API_KEY) {
        const elevenlabsResult = await validateElevenLabsKey(
          nextKeys.ELEVENLABS_API_KEY
        );
        setValidationResults(prev => ({
          ...prev,
          elevenlabs: elevenlabsResult,
        }));

        if (!elevenlabsResult.valid) {
          showError(`ElevenLabs API Key: ${elevenlabsResult.error}`);
          hasErrors = true;
        } else {
          console.log(
            `ElevenLabs key validated: ${sanitizeKeyForLogging(nextKeys.ELEVENLABS_API_KEY)}`
          );
          if (elevenlabsResult.warnings) {
            elevenlabsResult.warnings.forEach(warning => showWarning(warning));
          }
        }
      }

      if (hasErrors) {
        setIsValidating(false);
        return;
      }

      await saveApiKeys(nextKeys);

      const currentSettings = loadSettings();
      const nextProvider = getProviderAfterKeySave(
        currentSettings.aiProvider,
        nextKeys
      );

      if (nextProvider) {
        saveSettings({
          ...currentSettings,
          aiProvider: nextProvider,
          selectedModel: nextProvider,
        });
        showSuccess(
          `API keys saved. Active AI provider set to ${AI_PROVIDER_LABELS[nextProvider]}.`
        );
      } else {
        showSuccess('API keys saved successfully!');
      }
    } catch (error) {
      showError('Error saving API keys.');
      console.error('Failed to save API keys:', error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Container>
      <Title>Manage API Keys</Title>

      <ScreenIntro>
        Add a key for the provider you want to chat with. You only need one.
      </ScreenIntro>

      <Disclosure
        id="api-keys-how-providers-work"
        summary="Which key do I need?"
      >
        <p>
          Chat providers are alternatives, not layers: pick <strong>one</strong>{' '}
          of OpenAI, OpenRouter, or Anthropic (Claude) and add only that key. Or
          run <strong>Ollama</strong> locally and add no hosted key at all.
        </p>
        <p>
          ElevenLabs is separate and only affects premium voice synthesis --
          it's never required for chat. Choose which provider is active in{' '}
          <strong>Settings -&gt; AI Models</strong>.
        </p>
      </Disclosure>

      <Disclosure
        id="api-keys-security"
        tone="warn"
        summary="How your keys are stored"
      >
        <p>
          Keys are saved in this device's local storage in plain text and are
          sent only to the provider they belong to. They are never uploaded
          anywhere else, and they are not included in Android system backups.
        </p>
        <ul>
          <li>Only enter keys on devices you trust.</li>
          <li>Rotate keys periodically.</li>
          <li>Set spending limits in your provider's dashboard.</li>
          <li>Check your provider's usage page if something looks off.</li>
        </ul>
      </Disclosure>

      <FormGroup>
        <Label htmlFor="OPENAI_API_KEY">OpenAI API Key:</Label>
        <Input
          type="password"
          id="OPENAI_API_KEY"
          name="OPENAI_API_KEY"
          value={keys.OPENAI_API_KEY}
          onChange={handleChange}
          placeholder="sk-..."
        />
        <Hint>
          From the{' '}
          <a
            href="https://platform.openai.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenAI dashboard
          </a>
          .
        </Hint>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="OPENROUTER_API_KEY">OpenRouter API Key:</Label>
        <Input
          type="password"
          id="OPENROUTER_API_KEY"
          name="OPENROUTER_API_KEY"
          value={keys.OPENROUTER_API_KEY}
          onChange={handleChange}
          placeholder="sk-or-..."
        />
        <Hint>
          From{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            openrouter.ai/keys
          </a>
          . Works on its own -- no OpenAI key needed.
        </Hint>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="ANTHROPIC_API_KEY">Anthropic (Claude) API Key:</Label>
        <Input
          type="password"
          id="ANTHROPIC_API_KEY"
          name="ANTHROPIC_API_KEY"
          value={keys.ANTHROPIC_API_KEY}
          onChange={handleChange}
          placeholder="sk-ant-..."
        />
        <Hint>
          From the{' '}
          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Anthropic Console
          </a>
          .
        </Hint>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="ELEVENLABS_API_KEY">ElevenLabs API Key:</Label>
        <Input
          type="password"
          id="ELEVENLABS_API_KEY"
          name="ELEVENLABS_API_KEY"
          value={keys.ELEVENLABS_API_KEY}
          onChange={handleChange}
          placeholder="..."
        />
        <Hint>
          Optional -- premium voices only. From{' '}
          <a
            href="https://elevenlabs.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            elevenlabs.io
          </a>
          .
        </Hint>
      </FormGroup>
      <ButtonContainer>
        <BackButton onClick={onBack} disabled={isValidating}>
          Back
        </BackButton>
        {/* Saving round-trips to each provider to check the key, which can take
            a second or two. Without this the button looked inert. */}
        <SaveButton onClick={handleSaveKeys} disabled={isValidating}>
          {isValidating ? 'Checking keys...' : 'Save'}
        </SaveButton>
      </ButtonContainer>
    </Container>
  );
};

export default ApiKeyManager;
