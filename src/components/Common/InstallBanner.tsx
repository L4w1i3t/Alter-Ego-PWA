/**
 * PWA Install Banner
 *
 * A non-intrusive, dismissible banner that appears at the top of the app
 * when the browser signals that PWA installation is available.
 * Makes installation discoverable without burying it inside Settings.
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { EVENTS } from '../../config/constants';
import { installPWA, isPWAInstalled, canInstallPWA } from '../../utils/pwaUtils';
import { isElectronEnvironment } from '../../utils/electronUtils';

const slideDown = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
`;

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75em;
  padding: 0.6em 1em;
  background: linear-gradient(90deg, rgba(0, 255, 0, 0.12) 0%, rgba(0, 180, 0, 0.08) 100%);
  border-bottom: 1px solid #0f0;
  animation: ${slideDown} 0.3s ease-out;
  flex-shrink: 0;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    padding: 0.75em;
    gap: 0.5em;
  }
`;

const BannerText = styled.span`
  font-size: 0.85em;
  color: #0f0;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    font-size: 0.8em;
    flex-basis: 100%;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5em;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const InstallBtn = styled.button`
  background: #0f0;
  color: #000;
  border: none;
  border-radius: 0.25em;
  padding: 0.35em 0.9em;
  font-weight: bold;
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;

  &:hover { background: #00e000; }
  &:disabled { background: #666; color: #999; cursor: not-allowed; }

  @media (max-width: 768px) {
    padding: 0.5em 1em;
    font-size: 0.9em;
  }
`;

const DismissBtn = styled.button`
  background: transparent;
  color: #0f0;
  border: 1px solid #0f04;
  border-radius: 0.25em;
  padding: 0.35em 0.6em;
  font-size: 0.85em;
  cursor: pointer;

  &:hover { border-color: #0f0; }

  @media (max-width: 768px) {
    padding: 0.5em 0.8em;
    font-size: 0.9em;
  }
`;

const DISMISSED_KEY = 'alterEgo_installBannerDismissed';

const InstallBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Never show inside Electron or if already installed
    if (isElectronEnvironment() || isPWAInstalled()) return;

    // Respect previous dismissal (resets once per session)
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Show immediately if the install prompt is already available
    if (canInstallPWA()) {
      setVisible(true);
    }

    // Listen for the deferred install prompt
    const handleAvailable = () => setVisible(true);
    const handleInstalled = () => setVisible(false);

    window.addEventListener(EVENTS.PWA_INSTALL_AVAILABLE, handleAvailable);
    window.addEventListener(EVENTS.PWA_INSTALLED, handleInstalled);

    return () => {
      window.removeEventListener(EVENTS.PWA_INSTALL_AVAILABLE, handleAvailable);
      window.removeEventListener(EVENTS.PWA_INSTALLED, handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    const result = await installPWA();
    if (result.success) {
      setVisible(false);
    }
    setInstalling(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Banner role="banner" aria-label="Install ALTER EGO">
      <BannerText>
        Install ALTER EGO as a desktop app for faster loading and offline access.
      </BannerText>
      <ButtonGroup>
        <InstallBtn onClick={handleInstall} disabled={installing}>
          {installing ? 'Installing...' : 'Install'}
        </InstallBtn>
        <DismissBtn onClick={handleDismiss} aria-label="Dismiss install banner">
          Not now
        </DismissBtn>
      </ButtonGroup>
    </Banner>
  );
};

export default InstallBanner;
