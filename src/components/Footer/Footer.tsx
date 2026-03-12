import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadVoiceModels, VoiceModel } from '../../utils/storageUtils';
import { EVENTS } from '../../utils/events';
import { HeadphonesIcon, WaveIcon } from '../Common/Icons';

const FooterContainer = styled.footer`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em 1em;
  background-color: #000;
  border-top: 1px solid #0f0;
  font-size: 0.8em;
  flex-shrink: 0;

  @media (max-width: 768px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
  }
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
`;

const FooterRight = styled.div`
  flex-shrink: 0;

  @media (max-width: 768px) {
    font-size: 0.9em;
    max-width: 40%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    padding: 0.25em;
    margin-left: 0.35em;
    font-size: 14px;
    min-height: 36px;
    max-width: 120px;
    touch-action: manipulation;
  }
`;

const VoiceProviderIcon = styled.span.withConfig({
  shouldForwardProp: prop => prop !== 'provider',
})<{ provider?: string }>`
  color: ${props => (props.provider === 'elevenlabs' ? '#0af' : '#0f0')};
  margin-right: 0.5em;
  font-size: 1.2em;
`;

const VoiceInfo = styled.span.withConfig({
  shouldForwardProp: prop => prop !== 'provider',
})<{ provider?: string }>`
  color: ${props => (props.provider === 'elevenlabs' ? '#0af' : '#0f0')};
  margin-left: 0.5em;
  font-size: 0.8em;

  @media (max-width: 768px) {
    display: none;
  }
`;

interface FooterProps {
  activeCharacter: string;
  voiceModel: string;
  onVoiceModelChange?: (model: string) => void;
}

const Footer: React.FC<FooterProps> = ({
  activeCharacter,
  voiceModel,
  onVoiceModelChange,
}) => {
  const [availableModels, setAvailableModels] = useState<
    Record<string, VoiceModel>
  >({});
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

    window.addEventListener(
      EVENTS.VOICE_MODELS_UPDATED,
      handleVoiceModelsUpdated
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        EVENTS.VOICE_MODELS_UPDATED,
        handleVoiceModelsUpdated
      );
    };
  }, []); // Empty dependency array means this runs once on mount

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
        return <HeadphonesIcon size={16} aria-hidden="true" />;
      case 'browser':
        return <WaveIcon size={16} aria-hidden="true" />;
      default:
        return null;
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
          <option className="none-option" value="None">
            None
          </option>
          {Object.values(availableModels).map(model => (
            <option
              key={model.id}
              value={model.id}
              className={
                model.provider === 'elevenlabs'
                  ? 'elevenlabs-option'
                  : 'browser-option'
              }
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
