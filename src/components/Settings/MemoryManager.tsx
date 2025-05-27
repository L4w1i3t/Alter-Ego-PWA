import React, { useState } from 'react';
import styled from 'styled-components';
import { loadSettings, saveSettings } from '../../utils/storageUtils';
import { showSuccess, showError } from '../Common/NotificationManager';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #0f0;
  width: 100%;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1em;
`;

const Label = styled.label`
  flex: 1;
`;

const Select = styled.select`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 2em;
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

const InfoText = styled.p`
  margin: 1em 0;
  font-size: 0.9em;
  color: #0f08;
  text-align: center;
  font-style: italic;
`;

interface MemorySettingsProps {
  onBack: () => void;
}

const MemorySettings: React.FC<MemorySettingsProps> = ({ onBack }) => {
  const settings = loadSettings();
  const [memoryBuffer, setMemoryBuffer] = useState(settings.memoryBuffer || 3);

  const handleSave = () => {
    try {
      saveSettings({
        ...settings,
        memoryBuffer
      });
      showSuccess("Memory settings saved successfully.");
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      showError("Error saving memory settings.");
      console.error("Failed to save memory settings:", error);
    }
  };

  return (
    <Container>
      <Title>Memory Settings</Title>
      
      <InfoText>
        These settings control how many conversation exchanges ALTER EGO remembers in short-term memory.
        Lower values may reduce response quality but improve performance and minimize token costs.
      </InfoText>
      
      <SettingRow>
        <Label htmlFor="memoryBuffer">Remember last:</Label>
        <Select 
          id="memoryBuffer" 
          value={memoryBuffer} 
          onChange={(e) => setMemoryBuffer(Number(e.target.value))}
        >
          <option value="1">1 exchange (worst quality, least tokens)</option>
          <option value="2">2 exchanges</option>
          <option value="3">3 exchanges (recommended)</option>
          <option value="5">5 exchanges</option>
          <option value="10">10 exchanges (best quality, most tokens)</option>
        </Select>
      </SettingRow>
      
      <InfoText>
        Note: Each exchange includes both your message and ALTER EGO's response.
        Changes will apply to new messages only.
      </InfoText>
        <ButtonContainer>
        <Button onClick={onBack}>Cancel</Button>
        <Button onClick={handleSave}>Save Settings</Button>
      </ButtonContainer>
    </Container>
  );
};

export default MemorySettings;