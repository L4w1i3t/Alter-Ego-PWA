import React from 'react';
import styled from 'styled-components';

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

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const handleMenuClick = (item: string) => {
    console.log(`Clicked on ${item}`);
    // Handle different menu options here
  };
  
  return (
    <SettingsOverlay>
      <SettingsPanel>
        <CloseButton onClick={onClose}>X</CloseButton>
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
        </SettingsList>
      </SettingsPanel>
    </SettingsOverlay>
  );
};

export default Settings;