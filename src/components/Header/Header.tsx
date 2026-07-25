import React from 'react';
import styled from 'styled-components';
import { HamburgerIcon, UserIcon } from '../Common/Icons';
import { isElectronEnvironment, switchMode } from '../../utils/electronUtils';

/* Device safe areas are handled once by AppContainer, not here. */
const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6em;
  padding: 0.8em;
  background-color: #000;
  border-bottom: 1px solid #0f0;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
  }
`;

/*
 * "Load Character" and the footer's "Active Character: ..." readout used to be
 * two separate pieces of chrome describing the same thing. They are one control
 * now: it states who you are talking to and opens the picker.
 */
const PersonaButton = styled.button`
  && {
    display: flex;
    align-items: center;
    gap: 0.55em;
    min-width: 0;
    max-width: 100%;
    padding: 0.45em 0.8em;
    background: #000;
    color: #0f0;
    border: 1px solid #0f0;
    border-radius: var(--ae-radius-sm);
    text-align: left;
  }

  &&:hover {
    background: #0f0;
    color: #000;
  }

  @media (max-width: 768px) {
    && {
      padding: 0.4em 0.65em;
      touch-action: manipulation;
    }
  }
`;

const PersonaIcon = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
`;

const PersonaLabels = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
`;

const PersonaKicker = styled.span`
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  opacity: 0.7;
  text-transform: uppercase;
`;

const PersonaName = styled.span`
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex: none;
`;

const MenuIcon = styled.button`
  && {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0.25em;
    color: #0f0;
    background: transparent;
    border: none;
  }

  &&:hover {
    background: transparent;
    color: #8f8;
  }

  @media (max-width: 768px) {
    && {
      touch-action: manipulation;
    }
  }
`;

const OverlayToggle = styled.button`
  && {
    padding: 0.5em 0.8em;
    background: #000;
    color: #0f0;
    border: 1px solid #0f0;
    border-radius: var(--ae-radius-sm);
    font-size: 0.85em;
  }

  &&:hover {
    background: #0f0;
    color: #000;
  }
`;

interface HeaderProps {
  onSettingsClick: () => void;
  onLoadCharacter: () => void;
  activeCharacter?: string;
}

const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  onLoadCharacter,
  activeCharacter = 'ALTER EGO',
}) => {
  return (
    <HeaderContainer>
      <PersonaButton
        onClick={onLoadCharacter}
        title="Change the active character"
      >
        <PersonaIcon>
          <UserIcon size={18} aria-hidden="true" />
        </PersonaIcon>
        <PersonaLabels>
          <PersonaKicker>Talking to</PersonaKicker>
          <PersonaName>{activeCharacter}</PersonaName>
        </PersonaLabels>
      </PersonaButton>
      <HeaderActions>
        {isElectronEnvironment() && (
          <OverlayToggle
            onClick={() => switchMode('overlay')}
            title="Switch to compact overlay mode"
          >
            Overlay
          </OverlayToggle>
        )}
        <MenuIcon onClick={onSettingsClick} aria-label="Open settings menu">
          <HamburgerIcon size={24} aria-hidden="true" />
        </MenuIcon>
      </HeaderActions>
    </HeaderContainer>
  );
};

export default Header;
