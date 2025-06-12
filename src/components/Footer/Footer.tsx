import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadVoiceModels, VoiceModel } from '../../utils/storageUtils';
import { EVENTS } from '../../utils/events';

const FooterContainer = styled.footer`
  display: flex;
  justify-content: space-between;
  padding: 0.5em 1em;
  background-color: #000;
  border-top: 1px solid #0f0;
  font-size: 0.8em;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    font-size: 0.75rem;
    min-height: 50px;
  }
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const FooterRight = styled.div`
  @media (max-width: 768px) {
    text-align: center;
    font-size: 0.9em;
  }
`;

const VoiceModelSelector = styled.select`
  background-color: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.2em;
  margin-left: 0.5em;

  option {
    background-color: #000;
    color: #0f0;
  }
  
  option.elevenlabs-option {
    color: #0af;
  }
  
  option.browser-option {
    color: #0f0;
  }
    @media (max-width: 768px) {
    padding: 0.4em;
    margin: 0.2em;
    font-size: 16px; /* Prevent zoom on iOS */
    min-height: 40px;
    touch-action: manipulation;
  }
`;

const VoiceProviderIcon = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'provider',
})<{ provider?: string }>`
  color: ${props => props.provider === 'elevenlabs' ? '#0af' : '#0f0'};
  margin-right: 0.5em;
  font-size: 1.2em;
`;

const VoiceInfo = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'provider',
})<{ provider?: string }>`
  color: ${props => props.provider === 'elevenlabs' ? '#0af' : '#0f0'};
  margin-left: 0.5em;
  font-size: 0.8em;
`;

interface FooterProps {
  activeCharacter: string;
  voiceModel: string;
  onVoiceModelChange?: (model: string) => void;
}

const Footer: React.FC<FooterProps> = ({ 
  activeCharacter, 
  voiceModel,
  onVoiceModelChange 
}) => {
  const [availableModels, setAvailableModels] = useState<Record<string, VoiceModel>>({});
  const [currentProvider, setCurrentProvider] = useState<string>('none');
  
  // Function to update models from localStorage
  const loadVoiceModelData = () => {
    const models = loadVoiceModels();
    setAvailableModels(models);
    
    // Update provider if needed
    if (voiceModel !== 'None') {
      if (models[voiceModel]) {
        setCurrentProvider(models[voiceModel].provider);
      } else {
        // If the current model was deleted, reset to 'none'
        setCurrentProvider('none');
        if (onVoiceModelChange) {
          onVoiceModelChange('None');
        }
      }
    }
  };
  
  useEffect(() => {
    // Initial load
    loadVoiceModelData();
    
    // Listen for changes to voice models
    const handleVoiceModelsUpdated = () => {
      loadVoiceModelData();
    };
    
    window.addEventListener(EVENTS.VOICE_MODELS_UPDATED, handleVoiceModelsUpdated);
    
    // Cleanup
    return () => {
      window.removeEventListener(EVENTS.VOICE_MODELS_UPDATED, handleVoiceModelsUpdated);
    };
  }, []);  // Empty dependency array means this runs once on mount
  
  // Update provider when voiceModel changes
  useEffect(() => {
    if (voiceModel !== 'None' && availableModels[voiceModel]) {
      setCurrentProvider(availableModels[voiceModel].provider);
    } else {
      setCurrentProvider('none');
    }
  }, [voiceModel, availableModels]);
  
  const handleVoiceModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = e.target.value;
    
    // Update the provider display
    if (newModelId !== 'None' && availableModels[newModelId]) {
      setCurrentProvider(availableModels[newModelId].provider);
    } else {
      setCurrentProvider('none');
    }
    
    if (onVoiceModelChange) {
      onVoiceModelChange(newModelId);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'elevenlabs':
        return '🌟';
      case 'browser':
        return '🔊';
      default:
        return '🔇';
    }
  };

  return (
    <FooterContainer>
      <FooterLeft>
        <VoiceProviderIcon provider={currentProvider}>
          {getProviderIcon(currentProvider)}
        </VoiceProviderIcon>
        Voice: 
        <VoiceModelSelector 
          value={voiceModel} 
          onChange={handleVoiceModelChange}
        >
          <option className="none-option" value="None">None</option>
          {Object.values(availableModels).map(model => (
            <option 
              key={model.id} 
              value={model.id} 
              className={model.provider === 'elevenlabs' ? 'elevenlabs-option' : 'browser-option'}
            >
              {model.name}
            </option>
          ))}
        </VoiceModelSelector>
        
        {currentProvider !== 'none' && (
          <VoiceInfo provider={currentProvider}>
            ({currentProvider === 'elevenlabs' ? 'Premium' : 'Browser'})
          </VoiceInfo>
        )}
      </FooterLeft>
      <FooterRight>
        Active Character: <span>{activeCharacter}</span>
      </FooterRight>
    </FooterContainer>
  );
};

export default Footer;