import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadApiKeys, saveApiKeys, ApiKeys } from '../../utils/storageUtils';

const Container = styled.div`
  color: #0f0;
  max-width: 100%;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5em; /* Increased spacing between form groups */
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.3em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  font-family: monospace;
`;

const Description = styled.p`
  font-size: 0.8em;
  margin-top: 0.5em;
  color: #0f09;
  line-height: 1.4; /* Improved readability */
`;

const InfoBox = styled.div`
  padding: 1em;
  border: 1px solid #00f;
  background-color: #000020;
  margin-bottom: 2em;
  font-size: 0.9em;
  line-height: 1.5; /* Improved readability */
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1.5em;
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
`;

const SaveButton = styled(Button)``;
const BackButton = styled(Button)``;

const StatusMessage = styled.p<{ success?: boolean }>`
  margin-top: 1em;
  font-weight: bold;
  color: ${props => props.success ? '#0f0' : '#f00'};
  transition: opacity 0.5s ease;
`;

interface ApiKeyManagerProps {
  onBack: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onBack }) => {
  const [keys, setKeys] = useState<ApiKeys>({
    OPENAI_API_KEY: '',
    ELEVENLABS_API_KEY: ''
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showStatus, setShowStatus] = useState(false);
  
  useEffect(() => {
    // Load existing API keys
    const savedKeys = loadApiKeys();
    setKeys(savedKeys);
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setKeys(prevKeys => ({
      ...prevKeys,
      [name]: value
    }));
  };
  
  const handleSave = () => {
    try {
      // Basic validation for OpenAI key format (starts with "sk-")
      if (keys.OPENAI_API_KEY && !keys.OPENAI_API_KEY.startsWith('sk-')) {
        setStatus('OpenAI API key should start with "sk-"');
        setIsSuccess(false);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 5000);
        return;
      }

      saveApiKeys(keys);
      setStatus('API keys saved successfully!');
      setIsSuccess(true);
      setShowStatus(true);
      setTimeout(() => {
        setShowStatus(false);
      }, 3000);
    } catch (error) {
      setStatus('Error saving API keys.');
      setIsSuccess(false);
      setShowStatus(true);
      console.error('Failed to save API keys:', error);
    }
  };
  
  // Function to mask API keys for display
  const maskApiKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };
  
  return (
    <Container>
      <Title>Manage API Keys</Title>
      
      <InfoBox>
        You'll need API keys to use certain features of ALTER EGO. 
        The OpenAI API key is required for using OpenAI models, and 
        the ElevenLabs key is needed for voice synthesis.
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
          Required for OpenAI models. Get your API key from the <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0af' }}>OpenAI dashboard</a>.
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
          Required for ElevenLabs voice synthesis. Get your API key from the <a href="https://elevenlabs.io/" target="_blank" rel="noopener noreferrer" style={{ color: '#0af' }}>ElevenLabs website</a>.
        </Description>
      </FormGroup>
      
      <ButtonContainer>
        <BackButton onClick={onBack}>Back</BackButton>
        <SaveButton onClick={handleSave}>Save</SaveButton>
      </ButtonContainer>
      
      {showStatus && status && (
        <StatusMessage success={isSuccess}>{status}</StatusMessage>
      )}
    </Container>
  );
};

export default ApiKeyManager;