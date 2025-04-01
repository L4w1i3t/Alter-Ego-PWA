import React, { useState } from 'react';
import styled from 'styled-components';
import { factoryReset } from '../../utils/storageUtils';

const Container = styled.div`
  color: #0f0;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const WarningText = styled.div`
  color: #f00;
  margin-bottom: 1.5em;
  padding: 1.2em;
  border: 1px solid #f00;
  background-color: #200000;
  border-radius: 0.3em;
  line-height: 1.5;
`;

const DetailsText = styled.p`
  margin-bottom: 1.2em;
  line-height: 1.5;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2em;
`;

const Button = styled.button`
  padding: 0.5em 1em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  cursor: pointer;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const ResetButton = styled(Button)`
  color: #f00;
  border-color: #f00;
  
  &:hover {
    background: #f00;
    color: #000;
  }
`;

const ConfirmationPrompt = styled.div`
  margin-top: 2em;
  padding: 1.2em;
  border: 1px solid #f00;
  border-radius: 0.3em;
  background-color: #200000;
`;

const ConfirmationText = styled.p`
  margin-bottom: 1em;
  color: #f00;
  font-weight: bold;
`;

const ConfirmationInput = styled.input`
  width: 100%;
  padding: 0.7em;
  background: #000;
  color: #f00;
  border: 1px solid #f00;
  border-radius: 0.2em;
  margin-bottom: 1.5em;
`;

const StatusMessage = styled.p`
  margin-top: 1em;
  text-align: center;
  color: #0f0;
  font-weight: bold;
`;

interface FactoryResetProps {
  onBack: () => void;
}

const FactoryReset: React.FC<FactoryResetProps> = ({ onBack }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  
  const handleInitiateReset = () => {
    setShowConfirmation(true);
  };
  
  const handleConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationText(e.target.value);
  };
  
  const handleReset = () => {
    if (confirmationText.toLowerCase() !== 'reset') {
      setStatus('Please type "RESET" to confirm');
      return;
    }
    
    try {
      // Set a flag to indicate reset is in progress
      localStorage.setItem('alterEgo_resetInProgress', 'false');
      
      factoryReset();
      setStatus('Factory reset completed successfully. Reloading app...');
      
      // Reload the app after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setStatus(`Error during factory reset: ${error}`);
      console.error('Factory reset error:', error);
    }
  };
  
  return (
    <Container>
      <Title>Factory Reset</Title>
      
      <WarningText>
        WARNING: This will delete all user data and reset the application to factory defaults.
      </WarningText>
      
      <DetailsText>
        The following data will be permanently erased:
      </DetailsText>
      
      <ul>
        <li>All custom personas (except the default ALTER EGO)</li>
        <li>All voice models</li>
        <li>All API keys</li>
        <li>All conversation history</li>
        <li>All application settings</li>
      </ul>
      
      <DetailsText>
        After the reset, the application will reload with the default settings.
      </DetailsText>
      
      {!showConfirmation ? (
        <ButtonContainer>
          <Button onClick={onBack}>Back</Button>
          <ResetButton onClick={handleInitiateReset}>Factory Reset</ResetButton>
        </ButtonContainer>
      ) : (
        <ConfirmationPrompt>
          <ConfirmationText>
            To confirm factory reset, type "RESET" below:
          </ConfirmationText>
          <ConfirmationInput 
            type="text"
            value={confirmationText}
            onChange={handleConfirmationChange}
            placeholder="Type RESET to confirm"
          />
          <ButtonContainer>
            <Button onClick={() => setShowConfirmation(false)}>Cancel</Button>
            <ResetButton onClick={handleReset}>Confirm Reset</ResetButton>
          </ButtonContainer>
        </ConfirmationPrompt>
      )}
      
      {status && <StatusMessage>{status}</StatusMessage>}
    </Container>
  );
};

export default FactoryReset;