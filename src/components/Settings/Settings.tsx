import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SoftwareDetails from './SoftwareDetails';
import PersonaManager from './PersonaManager';
import VoiceModelManager from './VoiceModelManager';
import ApiKeyManager from './ApiKeyManager';
import FactoryReset from './FactoryReset';
import { DesktopInstall } from './DesktopInstall';
import { loadSettings, saveSettings } from '../../utils/storageUtils';
import MemoryAndHistory from './MemoryAndHistory';
import OpenSourceWipInfo from './OpenSourceWipInfo';
import MiscellaneousSettings from './MiscellaneousSettings';
import OpenSourceSettings from './OpenSourceSettings';
import {
  handleOpenSourceSelection,
  getOpenSourceStatus,
} from '../../utils/openSourceWip';
import {
  KeyIcon,
  HeadphonesIcon,
  UserIcon,
  MemoryIcon,
  WrenchIcon,
  DownloadIcon,
  InfoIcon,
  WarningIcon,
} from '../Common/Icons';

const SettingsOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
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
  width: 50vw;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: 90vw; /* Fixed width for larger screens */
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
  margin-bottom: 1.5em;
`;

const SettingsCategory = styled.div`
  border: 1px solid #0f03;
  padding: 1em;
  border-radius: 0.3em;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: #0f01;
    border-color: #0f0;
  }
`;

const CategoryTitle = styled.h3`
  margin: 0;
  margin-bottom: 0.5em;
  font-size: 1em;
`;

const CategoryDescription = styled.p`
  margin: 0;
  font-size: 0.8em;
  color: #0f09;
`;

const CategoryIcon = styled.div`
  font-size: 1.5em;
  margin-bottom: 0.5em;
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
  z-index: 1000;

  /* Ensure the button has a proper click area */
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
  }

  &:hover {
    background: #0f0;
    color: #000;
  }

  @media (min-width: 769px) {
    width: 2.5em;
    height: 2.5em;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
    font-weight: bold;

    /* Larger click area for desktop */
    &::before {
      top: -8px;
      left: -8px;
      right: -8px;
      bottom: -8px;
    }
  }

  @media (max-width: 768px) {
    top: 1rem;
    right: 1rem;
    padding: 0.8em 1.2em;
    font-size: 1.1em;
    border-radius: 0.3em;
    min-height: 2.5em;
    min-width: 2.5em;
    touch-action: manipulation;

    /* Larger touch area for mobile */
    &::before {
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
    }
  }
`;

const ModelSelection = styled.div`
  margin-top: 1.5em;
  padding-top: 1em;
  border-top: 1px solid #0f03;

  @media (min-width: 769px) {
    margin-top: 2em;
    padding-top: 1.5em;
    border-top: 2px solid #0f03;
  }

  @media (max-width: 768px) {
    margin-top: 2em;
    padding-top: 1.5em;
    border-top: 2px solid #0f03;
  }
`;

const ModelTitle = styled.h3`
  font-size: 1em;
  margin-bottom: 0.5em;
`;

const ModelOptions = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5em;
  align-items: center;

  @media (min-width: 769px) {
    gap: 1em;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5em;
    align-items: stretch;
  }
`;

const WipInfoButton = styled.button`
  background: transparent;
  border: 1px solid #ff8800;
  color: #ff8800;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 0.7em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.3em;
  flex-shrink: 0;

  &:hover {
    background: #ff8800;
    color: #000;
  }

  @media (min-width: 769px) {
    width: 32px;
    height: 32px;
    font-size: 0.85em;
    margin-left: 0.5em;
    border-width: 2px;
    font-weight: bold;
  }

  @media (max-width: 768px) {
    width: 2.5em;
    height: 2.5em;
    font-size: 1em;
    margin-left: 0.8em;
    border-width: 2px;
    touch-action: manipulation;
  }
`;

// Fix the ModelButton styled component using shouldForwardProp
const ModelButton = styled.button.withConfig({
  shouldForwardProp: prop => !['isActive', 'isWip'].includes(prop),
})<{ isActive?: boolean; isWip?: boolean }>`
  padding: 0.5em 1em;
  margin: 0 0.5em;
  background: ${props => {
    if (props.isWip) return props.isActive ? '#ff8800' : 'transparent';
    return props.isActive ? '#0f0' : 'transparent';
  }};
  color: ${props => {
    if (props.isWip) return props.isActive ? '#000' : '#ff8800';
    return props.isActive ? '#000' : '#0f0';
  }};
  border: 1px solid ${props => (props.isWip ? '#ff8800' : '#0f0')};
  cursor: pointer;
  position: relative;
  border-radius: 0.3em;
  flex-shrink: 0;

  &:hover {
    background: ${props => {
      if (props.isWip) return '#ff8800';
      return props.isActive ? '#0f0' : '#0a0';
    }};
    color: #000;
  }

  ${props =>
    props.isWip &&
    `
    &::after {
      content: 'WIP';
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ff8800;
      color: #000;
      font-size: 0.6em;
      padding: 2px 4px;
      border-radius: 3px;
      font-weight: bold;
    }
  `}

  @media (min-width: 769px) {
    padding: 0.8em 1.6em;
    margin: 0 0.4em;
    font-size: 1em;
    min-width: 120px;
    border-width: 2px;
    font-weight: 500;

    ${props =>
      props.isWip &&
      `
      &::after {
        top: -10px;
        right: -10px;
        font-size: 0.65em;
        padding: 3px 5px;
      }
    `}
  }

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    margin: 0;
    font-size: 1.1em;
    border-radius: 0.3em;
    border-width: 2px;
    min-height: 3em;
    flex: 1;
    touch-action: manipulation;

    ${props =>
      props.isWip &&
      `
      &::after {
        top: -12px;
        right: -12px;
        font-size: 0.8em;
        padding: 4px 6px;
        border-radius: 4px;
      }
    `}
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
  initialView?: string;
}

const Settings: React.FC<SettingsProps> = ({
  onClose,
  onModelChange,
  initialView,
}) => {
  const [currentView, setCurrentView] = useState<string | null>(
    initialView || null
  );
  const [selectedModel, setSelectedModel] = useState<string>('Open Source');
  const [status, setStatus] = useState<string | null>(null);

  // Load the currently selected model
  useEffect(() => {
    const settings = loadSettings();
    if (settings.selectedModel) {
      setSelectedModel(settings.selectedModel);
    }
  }, []);
  // Scroll to top when view changes (fixes mobile scroll position issue)
  useEffect(() => {
    const settingsPanel = document.querySelector(
      '[data-settings-panel]'
    ) as HTMLElement;
    if (settingsPanel && currentView) {
      settingsPanel.scrollTop = 0;
    }
  }, [currentView]);

  // Scroll to top when Settings panel first opens
  useEffect(() => {
    const settingsPanel = document.querySelector(
      '[data-settings-panel]'
    ) as HTMLElement;
    if (settingsPanel) {
      settingsPanel.scrollTop = 0;
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

    // Handle Open Source selection with WIP check
    if (model === 'Open Source') {
      const wipStatus = getOpenSourceStatus();
      if (wipStatus.isWip) {
        handleOpenSourceSelection();
        return;
      }
    }

    setSelectedModel(model);

    // Save the new model selection
    const settings = loadSettings();
    saveSettings({
      ...settings,
      selectedModel: model,
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
      case 'Memory & History':
        return <MemoryAndHistory onBack={handleBack} />;
      case 'Open Source Setup':
        return <OpenSourceSettings onBack={handleBack} />;
      case 'Miscellaneous':
        return <MiscellaneousSettings onBack={handleBack} />;
      case 'Desktop Install':
        return <DesktopInstall onBack={handleBack} />;
      case 'Software Details':
        return <SoftwareDetails onBack={handleBack} />;
      case 'Factory Reset':
        return <FactoryReset onBack={handleBack} />;
      case 'OpenSourceWipInfo':
        return <OpenSourceWipInfo onBack={handleBack} />;
      default:
        return (
          <>
            <SettingsTitle>Settings</SettingsTitle>
            <SettingsGrid>
              <SettingsCategory
                onClick={() => handleMenuClick('Manage API Keys')}
              >
                <CategoryIcon>
                  <KeyIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>API Keys</CategoryTitle>
                <CategoryDescription>
                  Configure OpenAI and ElevenLabs API keys
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={() => handleMenuClick('Manage Voice Models')}
              >
                <CategoryIcon>
                  <HeadphonesIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Voice Models</CategoryTitle>
                <CategoryDescription>
                  Add and configure voice synthesis models
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={() => handleMenuClick('Manage Personas')}
              >
                <CategoryIcon>
                  <UserIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Personas</CategoryTitle>
                <CategoryDescription>
                  Create and edit AI character personas
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={() => handleMenuClick('Memory & History')}
              >
                <CategoryIcon>
                  <MemoryIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Memory & History</CategoryTitle>
                <CategoryDescription>
                  Review history, adjust memory limits, and clear stored data
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={
                  process.env.NODE_ENV === 'production'
                    ? undefined
                    : () => handleMenuClick('Open Source Setup')
                }
                style={{
                  cursor:
                    process.env.NODE_ENV === 'production'
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: process.env.NODE_ENV === 'production' ? 0.5 : 1,
                }}
              >
                <CategoryIcon>
                  <WrenchIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Open Source Setup</CategoryTitle>
                <CategoryDescription>
                  {process.env.NODE_ENV === 'production'
                    ? 'Backend not ready in production'
                    : 'Configure local AI models and backend'}
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={() => handleMenuClick('Miscellaneous')}
              >
                <CategoryIcon>
                  <WrenchIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Miscellaneous</CategoryTitle>
                <CategoryDescription>
                  Customize text speed and other preferences
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={() => handleMenuClick('Desktop Install')}
              >
                <CategoryIcon>
                  <DownloadIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Desktop Install</CategoryTitle>
                <CategoryDescription>
                  Install ALTER EGO as a desktop application
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={() => handleMenuClick('Software Details')}
              >
                <CategoryIcon>
                  <InfoIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Software Details</CategoryTitle>
                <CategoryDescription>
                  View version info and credits
                </CategoryDescription>
              </SettingsCategory>
            </SettingsGrid>
            <Divider />
            <SettingsCategory
              onClick={() => handleMenuClick('Factory Reset')}
              style={{ borderColor: '#f00', color: '#f00' }}
            >
              <CategoryIcon>
                <WarningIcon size={20} aria-hidden="true" />
              </CategoryIcon>
              <CategoryTitle>Factory Reset</CategoryTitle>
              <CategoryDescription style={{ color: '#f007' }}>
                Delete all data and restore default settings
              </CategoryDescription>
            </SettingsCategory>{' '}
            <ModelSelection>
              <ModelTitle>AI Provider:</ModelTitle>
              <ModelOptions>
                {' '}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ModelButton
                    isActive={selectedModel === 'Open Source'}
                    isWip={getOpenSourceStatus().isWip}
                    onClick={
                      process.env.NODE_ENV === 'production'
                        ? undefined
                        : () => handleModelSelect('Open Source')
                    }
                    style={{
                      cursor:
                        process.env.NODE_ENV === 'production'
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: process.env.NODE_ENV === 'production' ? 0.5 : 1,
                    }}
                  >
                    Open Source
                  </ModelButton>
                  {getOpenSourceStatus().isWip && (
                    <WipInfoButton
                      onClick={e => {
                        e.stopPropagation();
                        setCurrentView('OpenSourceWipInfo');
                      }}
                      title="Click for more information about Open Source WIP status"
                    >
                      i
                    </WipInfoButton>
                  )}
                </div>
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
      <SettingsPanel data-settings-panel>
        <CloseButton onClick={onClose}>X</CloseButton>
        {renderContent()}
      </SettingsPanel>
    </SettingsOverlay>
  );
};

export default Settings;
