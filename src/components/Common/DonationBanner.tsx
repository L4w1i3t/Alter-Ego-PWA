/**
 * DonationBanner
 *
 * A non-intrusive toast in the bottom-left corner that gently requests
 * Ko-fi donations. Fades in after a short delay, and can be permanently
 * dismissed via a "Don't show this again" checkbox stored in localStorage.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';

const STORAGE_KEY = 'alterEgo_hideDonationBanner';
// Wait a few seconds after load so the user is settled before showing the prompt
const SHOW_DELAY_MS = 4000;
const KOFI_URL = 'https://ko-fi.com/l4w1i3t';

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
`;

const Wrapper = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'closing',
})<{ closing?: boolean }>`
  position: fixed;
  bottom: 1.2em;
  left: 1.2em;
  z-index: 9000;
  max-width: 340px;
  background: rgba(0, 12, 0, 0.94);
  border: 1px solid #0f04;
  border-radius: 8px;
  padding: 1em 1.2em;
  font-family: monospace, 'Courier New', Courier;
  color: #0f0;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  animation: ${p => (p.closing ? slideOut : slideIn)} 0.35s ease forwards;

  @media (max-width: 480px) {
    left: 0.5em;
    right: 0.5em;
    max-width: none;
  }
`;

const Heading = styled.p`
  margin: 0 0 0.5em 0;
  font-size: 0.9em;
  font-weight: bold;
  color: #0f0;
`;

const Body = styled.p`
  margin: 0 0 0.8em 0;
  font-size: 0.8em;
  line-height: 1.5;
  color: #0f0c;
`;

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6em;
  flex-wrap: wrap;
`;

const KofiLink = styled.a`
  display: inline-block;
  background: #0f0;
  color: #000;
  border: none;
  border-radius: 4px;
  padding: 0.4em 0.9em;
  font-family: inherit;
  font-size: 0.85em;
  font-weight: bold;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    background: #8f8;
  }
`;

const DismissBtn = styled.button`
  background: transparent;
  color: #0f09;
  border: 1px solid #0f03;
  border-radius: 4px;
  padding: 0.35em 0.7em;
  font-family: inherit;
  font-size: 0.8em;
  cursor: pointer;
  &:hover {
    color: #0f0;
    border-color: #0f06;
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-top: 0.6em;
  font-size: 0.75em;
  color: #0f08;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;

  &:hover {
    color: #0f0b;
  }


`;

const CheckMark = styled.span.withConfig({
  shouldForwardProp: prop => prop !== 'checked',
})<{ checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid ${p => (p.checked ? '#0f0' : '#0f06')};
  border-radius: 3px;
  background: ${p => (p.checked ? 'rgba(0, 255, 0, 0.15)' : 'transparent')};
  transition: all 0.2s ease;
  flex-shrink: 0;

  &::after {
    content: '${p => (p.checked ? '\\2713' : '')}';
    color: #0f0;
    font-size: 11px;
    line-height: 1;
  }
`;

const DonationBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [suppress, setSuppress] = useState(false);

  useEffect(() => {
    // Respect the user's previous choice
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    } catch {
      return;
    }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    if (suppress) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
    }
    setClosing(true);
    // Remove from DOM after the exit animation
    setTimeout(() => setVisible(false), 400);
  }, [suppress]);

  if (!visible) return null;

  return (
    <Wrapper closing={closing}>
      <Heading>Consider supporting ALTER EGO</Heading>
      <Body>
        Like and support my work? A small donation helps me dedicate more time to developing ALTER EGO, other projects, and my research!
      </Body>
      <ButtonRow>
        <KofiLink href={KOFI_URL} target="_blank" rel="noopener noreferrer">
          Support on Ko-fi
        </KofiLink>
        <DismissBtn onClick={dismiss}>Maybe later</DismissBtn>
      </ButtonRow>
      <CheckboxRow onClick={() => setSuppress(prev => !prev)}>
        <CheckMark checked={suppress} />
        Don't show this again
      </CheckboxRow>
    </Wrapper>
  );
};

export default DonationBanner;
