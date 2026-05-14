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
  checkForCompromisedKeys,
  assessKeyStrength,
  sanitizeKeyForLogging,
} from '../../utils/keyValidation';

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

const Description = styled.p`
  font-size: 0.8em;
  margin-top: 0.5em;
  color: #0f09;
  line-height: 1.4; /* Improved readability */

  @media (max-width: 768px) {
    font-size: 0.95em;
    margin-top: 1em;
    line-height: 1.5;
    padding: 0 0.2em;
  }
`;

const SecurityNotice = styled.div`
  background: #330;
  border: 1px solid #ff0;
  padding: 1em;
  margin-bottom: 1.5em;
  border-radius: 0.3em;
  font-size: 0.9em;
  line-height: 1.4;

  @media (max-width: 768px) {
    padding: 1.2em;
    font-size: 1em;
  }
`;

const InfoBox = styled.div`
  padding: 1em;
  border: 1px solid #00f;
  background-color: #000020;
  margin-bottom: 2em;
  font-size: 0.9em;
  line-height: 1.5; /* Improved readability */

  @media (max-width: 768px) {
    padding: 1.5em;
    margin-bottom: 2.5em;
    font-size: 1em;
    line-height: 1.6;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

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
  ELEVENLABS_API_KEY: keys.ELEVENLABS_API_KEY.trim(),
});

const getProviderAfterKeySave = (
  currentProvider: AIProvider | undefined,
  keys: ApiKeys
): AIProvider | null => {
  if (currentProvider === 'ollama') return null;

  const hasOpenAIKey = !!keys.OPENAI_API_KEY;
  const hasOpenRouterKey = !!keys.OPENROUTER_API_KEY;

  if (currentProvider === 'openai' && !hasOpenAIKey && hasOpenRouterKey) {
    return 'openrouter';
  }

  if (currentProvider === 'openrouter' && !hasOpenRouterKey && hasOpenAIKey) {
    return 'openai';
  }

  if (!currentProvider) {
    if (hasOpenRouterKey && !hasOpenAIKey) return 'openrouter';
    if (hasOpenAIKey && !hasOpenRouterKey) return 'openai';
  }

  return null;
};

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onBack }) => {
  const [keys, setKeys] = useState<ApiKeys>({
    OPENAI_API_KEY: '',
    OPENROUTER_API_KEY: '',
    ELEVENLABS_API_KEY: '',
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    openai: { valid: boolean; error?: string; warnings?: string[] } | null;
    openrouter: { valid: boolean; error?: string; warnings?: string[] } | null;
    elevenlabs: { valid: boolean; error?: string; warnings?: string[] } | null;
  }>({
    openai: null,
    openrouter: null,
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

  // Function to mask API keys for display
  const maskApiKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return (
      key.substring(0, 4) +
      '*'.repeat(key.length - 8) +
      key.substring(key.length - 4)
    );
  };

  return (
    <Container>
      <Title>Manage API Keys</Title>

      <SecurityNotice>
        <strong>SECURITY NOTICE:</strong> Your API keys are stored locally.
        For maximum security: (1) Only use these keys on trusted
        devices, (2) Regularly rotate your keys, (3) Monitor your API usage for
        unusual activity, (4) Consider setting usage limits in your API
        provider's dashboard.
      </SecurityNotice>

      <InfoBox>
        Chat providers are mutually exclusive. Use either an OpenAI key or an
        OpenRouter key for hosted models, or use Ollama locally without a hosted
        API key. ElevenLabs is separate and only affects premium voice
        synthesis. Model and provider selection lives in the AI Models panel.
      </InfoBox>

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
        <Description>
          Required only when the active AI provider is OpenAI. OpenRouter and
          Ollama do not need an OpenAI API key. Get your API key from the{' '}
          <a
            href="https://platform.openai.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0af' }}
          >
            OpenAI dashboard
          </a>
          .
        </Description>
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
        <Description>
          Required only when the active AI provider is OpenRouter. OpenRouter
          runs independently from OpenAI in this app, including account-level
          BYOK routing configured in OpenRouter.
        </Description>
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
        <Description>
          Required for ElevenLabs voice synthesis. Get your API key from the{' '}
          <a
            href="https://elevenlabs.io/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0af' }}
          >
            ElevenLabs website
          </a>
          .
        </Description>
      </FormGroup>
      <ButtonContainer>
        <BackButton onClick={onBack}>Back</BackButton>
        <SaveButton onClick={handleSaveKeys}>Save</SaveButton>
      </ButtonContainer>
    </Container>
  );
};

export default ApiKeyManager;
