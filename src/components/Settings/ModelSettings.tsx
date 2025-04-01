import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AIConfig, getAIConfig, saveAIConfig, getModels, getUsageStats } from '../../services/aiService';

const Container = styled.div`
  color: #0f0;
  max-width: 100%;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5em;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.3em;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.7em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  font-family: monospace;
`;

const Slider = styled.input`
  width: 100%;
  margin: 10px 0;
`;

const SliderValue = styled.span`
  font-family: monospace;
  margin-left: 1em;
`;

const InfoBox = styled.div`
  padding: 1em;
  border: 1px solid #00f;
  background-color: #000020;
  margin-bottom: 2em;
  font-size: 0.9em;
  line-height: 1.5;
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
`;

interface ModelSettingsProps {
  onBack: () => void;
}

const ModelSettings: React.FC<ModelSettingsProps> = ({ onBack }) => {
  const [config, setConfig] = useState<AIConfig>({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1000
  });
  
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [tokenStats, setTokenStats] = useState<{ total: number, byModel: Record<string, number> }>({ 
    total: 0, 
    byModel: {} 
  });
  
  useEffect(() => {
    // Load current configuration
    setConfig(getAIConfig());
    
    // Get available models
    setAvailableModels(getModels());
    
    // Get token usage statistics
    setTokenStats(getUsageStats());
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: parseFloat(value) }));
  };
  
  const handleSave = () => {
    saveAIConfig(config);
    // Optional: add a success message or toast here
  };
  
  return (
    <Container>
      <Title>AI Model Settings</Title>
      
      <InfoBox>
        Configure the parameters for the OpenAI model. Different models have different capabilities, 
        token limits, and pricing. Temperature controls creativity (higher = more creative).
      </InfoBox>
      
      <FormGroup>
        <Label htmlFor="model">AI Model:</Label>
        <Select
          id="model"
          name="model"
          value={config.model}
          onChange={handleChange}
        >
          {availableModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </Select>
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="temperature">Temperature: {config.temperature}</Label>
        <Slider
          type="range"
          id="temperature"
          name="temperature"
          min="0"
          max="1"
          step="0.1"
          value={config.temperature}
          onChange={handleSliderChange}
        />
        <SliderValue>{config.temperature}</SliderValue>
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="maxTokens">Max Tokens: {config.maxTokens}</Label>
        <Slider
          type="range"
          id="maxTokens"
          name="maxTokens"
          min="100"
          max="4000"
          step="100"
          value={config.maxTokens}
          onChange={handleSliderChange}
        />
        <SliderValue>{config.maxTokens}</SliderValue>
      </FormGroup>
      
      <ButtonContainer>
        <BackButton onClick={onBack}>Back</BackButton>
        <SaveButton onClick={handleSave}>Save</SaveButton>
      </ButtonContainer>
      
      {tokenStats.total > 0 && (
        <StatsContainer>
          <StatsTitle>Token Usage Statistics</StatsTitle>
          <StatsList>
            <StatsItem>Total tokens used: {tokenStats.total}</StatsItem>
            {Object.entries(tokenStats.byModel).map(([model, tokens]) => (
              <StatsItem key={model}>{model}: {tokens} tokens</StatsItem>
            ))}
          </StatsList>
        </StatsContainer>
      )}
    </Container>
  );
};

export default ModelSettings;
