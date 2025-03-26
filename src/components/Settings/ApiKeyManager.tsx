import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadApiKeys, saveApiKeys, ApiKeys } from '../../utils/storageUtils';

const Container = styled.div`
  color: #0f0;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const FormGroup = styled.div`
  margin-bottom: 1em;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.3em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  font-family: monospace;
`;

const Description = styled.p`
  font-size: 0.8em;
  margin-top: 0.3em;
  color: #0f09;
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

const StatusMessage = styled.p`
  margin-top: 1em;
  font-weight: bold;
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
      saveApiKeys(keys);
      setStatus('API keys saved successfully!');
      setShowStatus(true);
      setTimeout(() => {
        setShowStatus(false);
      }, 3000);
    } catch (error) {
      setStatus('Error saving API keys.');
      setShowStatus(true);
      console.error('Failed to save API keys:', error);
    }
  };
  
  return (
    <Container>
      <Title>Manage API Keys</Title>
      
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
          Required for OpenAI models. Get your API key from the OpenAI dashboard.
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
          Required for ElevenLabs voice synthesis. Get your API key from the ElevenLabs website.
        </Description>
      </FormGroup>
      
      <ButtonContainer>
        <BackButton onClick={onBack}>Back</BackButton>
        <SaveButton onClick={handleSave}>Save</SaveButton>
      </ButtonContainer>
      
      {showStatus && status && (
        <StatusMessage>{status}</StatusMessage>
      )}
    </Container>
  );
};

export default ApiKeyManager;