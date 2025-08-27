import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadApiKeys, saveApiKeys, ApiKeys } from '../../utils/storageUtils';
import { showSuccess, showError } from '../Common/NotificationManager';

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
    max-width: 300px;
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

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onBack }) => {
  const [keys, setKeys] = useState<ApiKeys>({
    OPENAI_API_KEY: '',
    ELEVENLABS_API_KEY: '',
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
  const handleSaveKeys = () => {
    try {
      // Basic validation for OpenAI key format (starts with "sk-")
      if (keys.OPENAI_API_KEY && !keys.OPENAI_API_KEY.startsWith('sk-')) {
        showError('OpenAI API key should start with "sk-"');
        return;
      }

      // Validate ElevenLabs key is not empty if provided
      if (keys.ELEVENLABS_API_KEY && keys.ELEVENLABS_API_KEY.trim() === '') {
        showError('ElevenLabs API key cannot be empty');
        return;
      }

      saveApiKeys(keys);
      showSuccess('API keys saved successfully!');
    } catch (error) {
      showError('Error saving API keys.');
      console.error('Failed to save API keys:', error);
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

      <InfoBox>
        You'll need API keys to use certain features of ALTER EGO. The OpenAI
        API key is required for using OpenAI models, and the ElevenLabs key is
        needed for voice synthesis.
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
          Required for OpenAI models. Get your API key from the{' '}
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
