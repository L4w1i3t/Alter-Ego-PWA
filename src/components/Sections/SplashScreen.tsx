import React from 'react';
import styled from 'styled-components';
import { loadApiKeys, loadSettings } from '../../utils/storageUtils';
import { safeAreaInset } from '../../styles/safeArea';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: var(--ae-z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #0f0;
  ${safeAreaInset('1rem')}
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
  line-height: 1.5;
  font-size: 0.9rem;
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const Button = styled.button<{ $primary?: boolean }>`
  && {
    min-height: 2.75rem;
    background: ${p => (p.$primary ? '#0f0' : '#000')};
    color: ${p => (p.$primary ? '#000' : '#0f0')};
    border: 1px solid #0f0;
    font-family: monospace;
  }

  &&:hover {
    background: #0f0;
    color: #000;
  }
`;

interface SplashScreenProps {
  onStart: () => void;
  onConfigure: () => void;
}

const hasAnyChatKey = (): boolean => {
  try {
    const keys = loadApiKeys();
    if (
      keys.OPENAI_API_KEY ||
      keys.OPENROUTER_API_KEY ||
      keys.ANTHROPIC_API_KEY
    ) {
      return true;
    }
    // Ollama runs locally and needs no key, so selecting it counts as set up.
    return loadSettings().aiProvider === 'ollama';
  } catch {
    return false;
  }
};

const SplashScreen: React.FC<SplashScreenProps> = ({
  onStart,
  onConfigure,
}) => {
  /*
   * A first-time user has no provider configured, so "Start" drops them into a
   * chat where every message fails. Lead with setup in that case, and keep the
   * emphasis on chatting once they are actually ready.
   */
  const configured = hasAnyChatKey();

  return (
    <Overlay>
      <Panel>
        <Logo src="assets/readmeicon.png" alt="" aria-hidden="true" />
        <Title>ALTER EGO</Title>
        <Subtitle>
          {configured
            ? 'Glad to see you. Pick up where you left off.'
            : 'Talk to a character of your own making. Add an AI provider key to get started -- it takes a minute.'}
        </Subtitle>
        <Actions>
          {configured ? (
            <>
              <Button $primary onClick={onStart}>
                Start
              </Button>
              <Button onClick={onConfigure}>Settings</Button>
            </>
          ) : (
            <>
              <Button $primary onClick={onConfigure}>
                Set up
              </Button>
              <Button onClick={onStart}>Skip for now</Button>
            </>
          )}
        </Actions>
      </Panel>
    </Overlay>
  );
};

export default SplashScreen;
