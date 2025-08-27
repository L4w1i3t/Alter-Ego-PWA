import React, { useState } from 'react';
import styled from 'styled-components';
import { factoryReset } from '../../utils/storageUtils';
import { showSuccess, showError } from '../Common/NotificationManager';

const Container = styled.div`
  color: #0f0;

  @media (max-width: 768px) {
    padding: 0 0.5em;
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

const WarningText = styled.div`
  color: #f00;
  margin-bottom: 1.5em;
  padding: 1.2em;
  border: 1px solid #f00;
  background-color: #200000;
  border-radius: 0.3em;
  line-height: 1.5;

  @media (max-width: 768px) {
    margin-bottom: 2em;
    padding: 1.5em;
    font-size: 1.1em;
    font-weight: bold;
    text-align: center;
    border-width: 2px;
  }
`;

const DetailsText = styled.p`
  margin-bottom: 1.2em;
  line-height: 1.5;

  @media (max-width: 768px) {
    margin-bottom: 1.5em;
    font-size: 1.05em;
    line-height: 1.6;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2em;
  gap: 1em;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-top: 2.5em;
    gap: 1.2em;
  }
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

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
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

  @media (max-width: 768px) {
    margin-top: 2.5em;
    padding: 1.5em;
    border-width: 2px;
  }
`;

const ConfirmationText = styled.p`
  margin-bottom: 1em;
  color: #f00;
  font-weight: bold;

  @media (max-width: 768px) {
    margin-bottom: 1.5em;
    font-size: 1.1em;
    text-align: center;
  }
`;

const ConfirmationInput = styled.input`
  width: 100%;
  padding: 0.7em;
  background: #000;
  color: #f00;
  border: 1px solid #f00;
  border-radius: 0.2em;
  margin-bottom: 1.5em;

  @media (max-width: 768px) {
    padding: 1em;
    font-size: 1.1em;
    border-width: 2px;
    margin-bottom: 2em;
    text-align: center;
  }
`;

const StatusMessage = styled.p`
  margin-top: 1em;
  text-align: center;
  color: #0f0;
  font-weight: bold;

  @media (max-width: 768px) {
    margin-top: 1.5em;
    font-size: 1.1em;
  }
`;

const ResetList = styled.ul`
  margin: 1em 0 1.5em 1.5em;
  line-height: 1.6;

  @media (max-width: 768px) {
    margin: 1.5em 0 2em 1em;
    font-size: 1.05em;

    li {
      margin-bottom: 0.5em;
    }
  }
`;

interface FactoryResetProps {
  onBack: () => void;
}

const FactoryReset: React.FC<FactoryResetProps> = ({ onBack }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [status, setStatus] = useState<string>('');

  const handleInitiateReset = () => {
    setShowConfirmation(true);
  };

  const handleConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationText(e.target.value);
  };

  const handleReset = () => {
    if (confirmationText.toLowerCase() !== 'reset') {
      showError('Please type "RESET" to confirm');
      return;
    }

    try {
      // Set a flag to indicate reset is in progress
      localStorage.setItem('alterEgo_resetInProgress', 'false');

      factoryReset();
      setStatus('Factory reset completed successfully. Reloading app...');
      showSuccess('Factory reset completed successfully. Reloading app...');

      // Reload the app after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      const errorMsg = `Error during factory reset: ${error}`;
      setStatus(errorMsg);
      showError(errorMsg);
      console.error('Factory reset error:', error);
    }
  };

  return (
    <Container>
      <Title>Factory Reset</Title>

      <WarningText>
        WARNING: This will delete all user data and reset the application to
        factory defaults.
      </WarningText>
      <DetailsText>The following data will be permanently erased:</DetailsText>

      <ResetList>
        <li>All custom personas (except the default ALTER EGO)</li>
        <li>All voice models</li>
        <li>All API keys</li>
        <li>All conversation history</li>
        <li>All application settings</li>
      </ResetList>

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
