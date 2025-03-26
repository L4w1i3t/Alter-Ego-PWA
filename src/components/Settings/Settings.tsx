import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SoftwareDetails from './SoftwareDetails';
import PersonaManager from './PersonaManager';
import VoiceModelManager from './VoiceModelManager';
import ApiKeyManager from './ApiKeyManager';
import ChatHistory from './ChatHistory';
import ClearMemory from './ClearMemory';
import FactoryReset from './FactoryReset';
import { loadSettings, saveSettings } from '../../utils/storageUtils';

const SettingsOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
`;

const SettingsPanel = styled.div`
  background: #000;
  border: 1px solid #0f0;
  padding: 2em;
  border-radius: 0.5em;
  position: relative;
  width: 300px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
`;

const SettingsTitle = styled.h2`
  margin-top: 0;
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const SettingsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const SettingsItem = styled.li`
  margin: 0.5em 0;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

const DangerSettingsItem = styled(SettingsItem)`
  color: #f00;
  
  &:hover {
    color: #f55;
  }
`;

const Divider = styled.hr`
  border: 0;
  border-top: 1px solid #0f03;
  margin: 1em 0;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  cursor: pointer;
  font-weight: bold;
  padding: 0.2em 0.5em;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const ModelSelection = styled.div`
  margin-top: 1.5em;
  padding-top: 1em;
  border-top: 1px solid #0f03;
`;

const ModelTitle = styled.h3`
  font-size: 1em;
  margin-bottom: 0.5em;
`;

const ModelOptions = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5em;
`;

const ModelButton = styled.button<{ isActive?: boolean }>`
  flex: 1;
  background: ${props => props.isActive ? '#0f0' : '#000'};
  color: ${props => props.isActive ? '#000' : '#0f0'};
  border: 1px solid #0f0;
  padding: 0.5em;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.isActive ? '#0f0' : '#0a0'};
    color: ${props => props.isActive ? '#000' : '#000'};
  }
`;

const StatusMessage = styled.p`
  margin-top: 1em;
  text-align: center;
  font-style: italic;
  color: #0f0;
`;

interface SettingsProps {
  onClose: () => void;
  onModelChange?: (model: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose, onModelChange }) => {
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('ollama');
  const [status, setStatus] = useState<string | null>(null);
  
  // Load the currently selected model
  useEffect(() => {
    const settings = loadSettings();
    if (settings.selectedModel) {
      setSelectedModel(settings.selectedModel);
    }
  }, []);
  
  const handleMenuClick = (item: string) => {
    setCurrentView(item);
  };
  
  const handleBack = () => {
    setCurrentView(null);
  };
  
  const handleModelSelect = (model: string) => {
    if (model === selectedModel) return;
    
    setSelectedModel(model);
    
    // Save the new model selection
    const settings = loadSettings();
    saveSettings({
      ...settings,
      selectedModel: model
    });
    
    setStatus('Model changed to ' + model + '. Reloading...');
    
    // Trigger the model change in the parent
    if (onModelChange) {
      onModelChange(model);
    }
    
    // Reload the app after a short delay
    // This reload won't show the warming up screen because we've saved the model selection
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };
  
  // Render the appropriate component based on the current view
  const renderContent = () => {
    switch (currentView) {
      case 'Manage API Keys':
        return <ApiKeyManager onBack={handleBack} />;
      case 'Manage Voice Models':
        return <VoiceModelManager onBack={handleBack} />;
      case 'Manage Personas':
        return <PersonaManager onBack={handleBack} />;
      case 'Chat History':
        return <ChatHistory onBack={handleBack} />;
      case 'Clear Memory':
        return <ClearMemory onBack={handleBack} />;
      case 'Software Details':
        return <SoftwareDetails onBack={handleBack} />;
      case 'Factory Reset':
        return <FactoryReset onBack={handleBack} />;
      default:
        return (
          <>
            <SettingsTitle>Settings</SettingsTitle>
            <SettingsList>
              <SettingsItem onClick={() => handleMenuClick('Manage API Keys')}>
                Manage API Keys
              </SettingsItem>
              <SettingsItem onClick={() => handleMenuClick('Manage Voice Models')}>
                Manage Voice Models
              </SettingsItem>
              <SettingsItem onClick={() => handleMenuClick('Manage Personas')}>
                Manage Personas
              </SettingsItem>
              <SettingsItem onClick={() => handleMenuClick('Chat History')}>
                Chat History
              </SettingsItem>
              <SettingsItem onClick={() => handleMenuClick('Clear Memory')}>
                Clear Memory
              </SettingsItem>
              <SettingsItem onClick={() => handleMenuClick('Software Details')}>
                Software Details
              </SettingsItem>
              
              <Divider />
              
              <DangerSettingsItem onClick={() => handleMenuClick('Factory Reset')}>
                Factory Reset
              </DangerSettingsItem>
            </SettingsList>
            
            <ModelSelection>
              <ModelTitle>AI Provider:</ModelTitle>
              <ModelOptions>
                <ModelButton 
                  isActive={selectedModel === 'ollama'}
                  onClick={() => handleModelSelect('ollama')}
                >
                  Ollama
                </ModelButton>
                <ModelButton 
                  isActive={selectedModel === 'openai'}
                  onClick={() => handleModelSelect('openai')}
                >
                  OpenAI
                </ModelButton>
              </ModelOptions>
            </ModelSelection>
            
            {status && <StatusMessage>{status}</StatusMessage>}
          </>
        );
    }
  };
  
  return (
    <SettingsOverlay>
      <SettingsPanel>
        <CloseButton onClick={onClose}>X</CloseButton>
        {renderContent()}
      </SettingsPanel>
    </SettingsOverlay>
  );
};

export default Settings;