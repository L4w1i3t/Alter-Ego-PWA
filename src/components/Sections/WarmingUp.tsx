import React, { useState } from 'react';
import styled from 'styled-components';

const WarningOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;

  @media (max-width: 768px) {
    align-items: center;
    padding: 1rem;
  }
`;

const WarningContent = styled.div`
  background: #000;
  border: 1px solid #0f0;
  padding: 20px;
  border-radius: 5px;
  max-width: 500px;
  text-align: center;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    padding: 2rem;
    border-radius: 0.5rem;
    border-width: 2px;
  }
`;

const WarmupTitle = styled.h1`
  color: white;
  font-size: 1.5em;
  margin-bottom: 15px;

  @media (max-width: 768px) {
    font-size: 1.8em;
    margin-bottom: 1.5rem;
    line-height: 1.3;
  }
`;

const ProgressContainer = styled.div`
  width: 100%;
  height: 20px;
  background-color: #002000;
  border-radius: 10px;
  margin: 15px 0;
  overflow: hidden;

  @media (max-width: 768px) {
    height: 1.5rem;
    margin: 1.5rem 0;
    border-radius: 0.75rem;
  }
`;

const ProgressBar = styled.div`
  height: 100%;
  background-color: #0f0;
  border-radius: 10px;
  transition: width 0.5s ease-in-out;
  width: 10%;

  @media (max-width: 768px) {
    border-radius: 0.75rem;
    transition: width 0.3s ease-in-out;
  }
`;

const StatusText = styled.h2`
  color: white;
  font-size: 1em;
  margin: 10px 0;

  @media (max-width: 768px) {
    font-size: 1.2em;
    margin: 1.5rem 0;
    line-height: 1.4;
  }
`;

const InfoText = styled.h3`
  color: white;
  font-size: 0.9em;
  margin-top: 15px;

  @media (max-width: 768px) {
    font-size: 1.1em;
    margin-top: 2rem;
    line-height: 1.5;
    padding: 0 0.5rem;
  }
`;

const ErrorContainer = styled.div`
  display: none;
  margin-top: 20px;

  @media (max-width: 768px) {
    margin-top: 2rem;
    padding: 1rem;
  }
`;

const ErrorTitle = styled.h2`
  color: #ff4444;

  @media (max-width: 768px) {
    font-size: 1.4em;
    margin-bottom: 1rem;
    line-height: 1.3;
  }
`;

const ErrorMessage = styled.div`
  background: #200000;
  padding: 10px;
  border: 1px solid #ff4444;
  margin-top: 10px;
  text-align: left;
  color: white;

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-width: 2px;
    margin-top: 1rem;
    border-radius: 0.5rem;
    font-size: 1.1em;
    line-height: 1.5;
  }
`;

const RestartButton = styled.button`
  margin-top: 15px;
  background-color: #400000;
  color: white;
  border: 1px solid #ff4444;
  padding: 8px 15px;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background-color: #ff4444;
    color: black;
  }

  @media (max-width: 768px) {
    margin-top: 2rem;
    padding: 1rem 2rem;
    border-width: 2px;
    border-radius: 0.5rem;
    font-size: 1.1em;
    min-height: 3rem;
    touch-action: manipulation;
    width: 100%;
  }
`;

interface WarmingUpProps {}

const WarmingUp: React.FC<WarmingUpProps> = () => {
  const [status, setStatus] = useState('Starting up...');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <WarningOverlay>
      <WarningContent>
        <WarmupTitle>Warming up, please wait...</WarmupTitle>
        <ProgressContainer>
          <ProgressBar id="warmup-progress-bar" />
        </ProgressContainer>
        <StatusText id="warmup-status">{status}</StatusText>
        <InfoText>
          If you're running for the first time, this may take a couple minutes.
        </InfoText>

        {showError && (
          <ErrorContainer style={{ display: 'block' }}>
            <ErrorTitle>Error during warmup:</ErrorTitle>
            <ErrorMessage>{errorMessage}</ErrorMessage>
            <RestartButton onClick={handleRestart}>
              Restart Application
            </RestartButton>
          </ErrorContainer>
        )}
      </WarningContent>
    </WarningOverlay>
  );
};

export default WarmingUp;
