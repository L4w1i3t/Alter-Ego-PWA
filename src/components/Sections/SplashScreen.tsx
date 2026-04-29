import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #0f0;
  padding: 1rem;
`;

const Panel = styled.div`
  width: min(420px, 100%);
  border: 1px solid #0f0;
  padding: 1.5rem;
  text-align: center;
  background: #000;
`;

const Logo = styled.img`
  width: 88px;
  height: 88px;
  object-fit: contain;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  margin: 0 0 0.35rem;
  font-size: 1.6rem;
  letter-spacing: 0;
`;

const Subtitle = styled.p`
  margin: 0 0 1.25rem;
  color: #0f0b;
  line-height: 1.4;
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const Button = styled.button`
  min-height: 2.75rem;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  cursor: pointer;
  font-family: monospace;

  &:hover {
    background: #0f0;
    color: #000;
  }
`;

interface SplashScreenProps {
  onStart: () => void;
  onConfigure: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onStart,
  onConfigure,
}) => {
  return (
    <Overlay>
      <Panel>
        <Logo src="assets/readmeicon.png" alt="" aria-hidden="true" />
        <Title>ALTER EGO</Title>
        <Subtitle>Glad to see you!</Subtitle>
        <Actions>
          <Button onClick={onStart}>Start</Button>
          <Button onClick={onConfigure}>Settings</Button>
        </Actions>
      </Panel>
    </Overlay>
  );
};

export default SplashScreen;
