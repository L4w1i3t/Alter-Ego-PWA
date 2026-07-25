import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SoftwareDetails from './SoftwareDetails';
import PersonaManager from './PersonaManager';
import VoiceModelManager from './VoiceModelManager';
import ApiKeyManager from './ApiKeyManager';
import ModelSettings from './ModelSettings';
import FactoryReset from './FactoryReset';
import { DesktopInstall } from './DesktopInstall';
import { isElectronEnvironment } from '../../utils/electronUtils';
import MemoryAndHistory from './MemoryAndHistory';
import OpenSourceWipInfo from './OpenSourceWipInfo';
import MiscellaneousSettings from './MiscellaneousSettings';
import DataManagement from './DataManagement';
import AppUpdates from './AppUpdates';
import { checkForUpdate, isVersionSkipped } from '../../services/updateService';
import {
  KeyIcon,
  HeadphonesIcon,
  UserIcon,
  MemoryIcon,
  WrenchIcon,
  DownloadIcon,
  InfoIcon,
  WarningIcon,
  ShieldIcon,
  StarIcon,
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
  z-index: var(--ae-z-modal);
  padding: calc(1.5rem + var(--ae-safe-top, 0px))
    calc(1.5rem + var(--ae-safe-right, 0px))
    calc(1.5rem + var(--ae-safe-bottom, 0px))
    calc(1.5rem + var(--ae-safe-left, 0px));

  @supports (height: 100dvh) {
    height: 100dvh;
  }

  @media (max-width: 768px) {
    padding: calc(0.75rem + var(--ae-safe-top, 0px))
      calc(0.75rem + var(--ae-safe-right, 0px))
      calc(0.75rem + var(--ae-safe-bottom, 0px))
      calc(0.75rem + var(--ae-safe-left, 0px));
  }
`;

const SettingsPanel = styled.div`
  background: #000;
  border: 1px solid #0f0;
  padding: 2em;
  border-radius: 0.5em;
  position: relative;
  /* Sized against the overlay's content box, which already has the device
     safe areas subtracted, so the panel can never run under a system bar. */
  width: clamp(560px, 72vw, 960px);
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;

  @media (max-width: 768px) {
    width: 100%;
    padding: 1.2em;
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 1em 0.8em;
    border-radius: 0.3em;
  }
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75em;
  margin-bottom: 1.4em;
  align-items: stretch;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

/* Small pip next to the Updates entry when a newer release exists. */
const UpdateDot = styled.span`
  display: inline-block;
  width: 0.5em;
  height: 0.5em;
  margin-left: 0.5em;
  border-radius: 50%;
  background: var(--ae-color-cyan);
  vertical-align: middle;
`;

const GroupLabel = styled.h3`
  margin: 0 0 0.6em;
  font-size: 0.7em;
  font-weight: normal;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ae-color-text-muted);
`;

const SettingsCategory = styled.button.attrs({ type: 'button' })`
  && {
    display: grid;
    grid-template-columns: 1.75rem minmax(7.5rem, max-content) minmax(0, 1fr);
    align-items: center;
    justify-content: stretch;
    column-gap: 0.85em;
    row-gap: 0.25em;
    min-height: 5rem;
  }

  border: 1px solid #0f03;
  padding: 1em;
  border-radius: 0.3em;
  background: #000;
  color: inherit;
  font: inherit;
  text-align: left;
  width: 100%;
  transition: all 0.2s ease;
  cursor: pointer;
  line-height: 1.25;

  &:hover {
    background-color: #0f01;
    border-color: #0f0;
    /* Ensure text/icon color stays visible on hover (override global button:hover)
       so only background and border change. Inline styles (e.g. danger) still win. */
    color: #0f0;
  }

  &:focus-visible {
    outline: 2px solid #0ff;
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    && {
      grid-template-columns: 1.5rem minmax(0, 1fr);
      min-height: 4.5rem;
      align-items: start;
    }
  }

  @media (max-width: 480px) {
    padding: 0.8em;
  }
`;

const CategoryTitle = styled.h3`
  margin: 0;
  font-size: 1em;
  line-height: 1.2;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const CategoryDescription = styled.p`
  margin: 0;
  font-size: 0.8em;
  color: #0f09;
  line-height: 1.35;
  min-width: 0;
  overflow-wrap: anywhere;

  @media (max-width: 640px) {
    grid-column: 2;
  }
`;

const CategoryIcon = styled.div`
  width: 1.75rem;
  min-width: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 480px) {
    width: 1.5rem;
    min-width: 1.5rem;
  }
`;

const SettingsTitle = styled.h2`
  margin-top: 0;
  margin-bottom: 1em;
  font-size: 1.2em;
  padding-right: 3rem;

  @media (max-width: 480px) {
    font-size: 1.1em;
    margin-bottom: 0.75em;
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
  z-index: 1;

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

interface SettingsProps {
  onClose: () => void;
  initialView?: string;
}

const Settings: React.FC<SettingsProps> = ({ onClose, initialView }) => {
  const [currentView, setCurrentView] = useState<string | null>(
    initialView || null
  );

  /*
   * Reads whatever the background check already found; passing force=false
   * means opening Settings never triggers a network request of its own.
   */
  const [hasUpdate, setHasUpdate] = useState(false);
  useEffect(() => {
    let cancelled = false;
    checkForUpdate(false)
      .then(result => {
        if (!cancelled && result && !isVersionSkipped(result.version)) {
          setHasUpdate(true);
        }
      })
      .catch(() => {
        /* never let an update check interfere with opening settings */
      });
    return () => {
      cancelled = true;
    };
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
  // Render the appropriate component based on the current view
  const renderContent = () => {
    switch (currentView) {
      case 'Manage API Keys':
        return <ApiKeyManager onBack={handleBack} />;
      case 'AI Models':
        return <ModelSettings onBack={handleBack} />;
      case 'Manage Voice Models':
        return <VoiceModelManager onBack={handleBack} />;
      case 'Manage Personas':
        return <PersonaManager onBack={handleBack} />;
      case 'Memory & History':
        return <MemoryAndHistory onBack={handleBack} />;
      case 'Miscellaneous':
        return <MiscellaneousSettings onBack={handleBack} />;
      case 'Data Management':
        return <DataManagement onBack={handleBack} />;
      case 'Desktop Install':
        return <DesktopInstall onBack={handleBack} />;
      case 'Updates':
        return <AppUpdates onBack={handleBack} />;
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
            {/*
             * Nine equally weighted cards gave no clue where to begin. Grouping
             * them puts the two things a new user must do first ("Connect")
             * ahead of the things they may never touch, without hiding anything.
             */}
            <GroupLabel>Connect</GroupLabel>
            <SettingsGrid>
              <SettingsCategory
                onClick={() => handleMenuClick('Manage API Keys')}
              >
                <CategoryIcon>
                  <KeyIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>API Keys</CategoryTitle>
                <CategoryDescription>
                  Add a key for your AI provider
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory onClick={() => handleMenuClick('AI Models')}>
                <CategoryIcon>
                  <StarIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>AI Models</CategoryTitle>
                <CategoryDescription>
                  Choose which provider and model to use
                </CategoryDescription>
              </SettingsCategory>
            </SettingsGrid>

            <GroupLabel>Personalize</GroupLabel>
            <SettingsGrid>
              <SettingsCategory
                onClick={() => handleMenuClick('Manage Personas')}
              >
                <CategoryIcon>
                  <UserIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Personas</CategoryTitle>
                <CategoryDescription>
                  Create and edit the characters you talk to
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
                  Let ALTER EGO speak out loud
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={() => handleMenuClick('Miscellaneous')}
              >
                <CategoryIcon>
                  <WrenchIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Preferences</CategoryTitle>
                <CategoryDescription>
                  Text size, typing speed, and other options
                </CategoryDescription>
              </SettingsCategory>
            </SettingsGrid>

            <GroupLabel>Your data</GroupLabel>
            <SettingsGrid>
              <SettingsCategory
                onClick={() => handleMenuClick('Memory & History')}
              >
                <CategoryIcon>
                  <MemoryIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Memory &amp; History</CategoryTitle>
                <CategoryDescription>
                  Review conversations and what is remembered
                </CategoryDescription>
              </SettingsCategory>
              <SettingsCategory
                onClick={() => handleMenuClick('Data Management')}
              >
                <CategoryIcon>
                  <ShieldIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Backup &amp; Restore</CategoryTitle>
                <CategoryDescription>
                  Export or import everything as one file
                </CategoryDescription>
              </SettingsCategory>
            </SettingsGrid>

            <GroupLabel>About</GroupLabel>
            <SettingsGrid>
              <SettingsCategory onClick={() => handleMenuClick('Updates')}>
                <CategoryIcon>
                  <DownloadIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>
                  Updates
                  {hasUpdate && <UpdateDot aria-label="Update available" />}
                </CategoryTitle>
                <CategoryDescription>
                  {hasUpdate
                    ? 'A new version is available'
                    : 'Check for new releases'}
                </CategoryDescription>
              </SettingsCategory>
              {!isElectronEnvironment() && (
                <SettingsCategory
                  onClick={() => handleMenuClick('Desktop Install')}
                >
                  <CategoryIcon>
                    <DownloadIcon size={20} aria-hidden="true" />
                  </CategoryIcon>
                  <CategoryTitle>Install App</CategoryTitle>
                  <CategoryDescription>
                    Run ALTER EGO as a desktop application
                  </CategoryDescription>
                </SettingsCategory>
              )}
              <SettingsCategory
                onClick={() => handleMenuClick('Software Details')}
              >
                <CategoryIcon>
                  <InfoIcon size={20} aria-hidden="true" />
                </CategoryIcon>
                <CategoryTitle>Software Details</CategoryTitle>
                <CategoryDescription>
                  Version info and credits
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
            </SettingsCategory>
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
