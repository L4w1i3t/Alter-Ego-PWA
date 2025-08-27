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

  @media (max-width: 768px) {
    min-height: 60vh;
    justify-content: center;
    padding: 0 1em;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;

  @media (max-width: 768px) {
    margin-bottom: 1.5em;
    font-size: 1.3em;
    text-align: center;
  }
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1em;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1.5em;
    gap: 0.8em;
  }
`;

const Label = styled.label`
  flex: 1;

  @media (max-width: 768px) {
    font-size: 1.1em;
    font-weight: bold;
  }
`;

const Select = styled.select`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em;

  @media (max-width: 768px) {
    width: 100%;
    padding: 1em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 2em;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-top: 2.5em;
    gap: 1.2em;
    max-width: 300px;
  }
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

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

const InfoText = styled.p`
  margin: 1em 0;
  font-size: 0.9em;
  color: #0f08;
  text-align: center;
  font-style: italic;

  @media (max-width: 768px) {
    margin: 1.5em 0;
    font-size: 1em;
    line-height: 1.5;
    padding: 0 0.5em;
  }
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
        memoryBuffer,
      });
      onBack(); // Navigate back first
      showSuccess('Memory settings saved successfully.'); // Then show notification
    } catch (error) {
      showError('Error saving memory settings.');
      console.error('Failed to save memory settings:', error);
    }
  };

  return (
    <Container>
      <Title>Memory Settings</Title>

      <InfoText>
        These settings control how many conversation exchanges ALTER EGO
        remembers in short-term memory. Lower values may reduce response quality
        but improve performance and minimize token costs.
      </InfoText>

      <SettingRow>
        <Label htmlFor="memoryBuffer">Remember last:</Label>
        <Select
          id="memoryBuffer"
          value={memoryBuffer}
          onChange={e => setMemoryBuffer(Number(e.target.value))}
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
