import React from 'react';
import styled from 'styled-components';
import { HamburgerIcon, GearIcon } from '../Common/Icons';
import { isElectronEnvironment, switchMode } from '../../utils/electronUtils';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8em;
  background-color: #000;
  border-bottom: 1px solid #0f0;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 0.6rem 0.75rem;
    min-height: 48px;
  }
`;

const LoadCharacterButton = styled.button`
  background-color: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  cursor: pointer;

  &:hover {
    background-color: #0f0;
    color: #000;
  }

  @media (max-width: 768px) {
    padding: 0.6em 0.8em;
    font-size: 0.9rem;
    min-height: 40px;
    touch-action: manipulation;
  }
`;

const MenuIcon = styled.button`
  font-size: 1.5em;
  cursor: pointer;
  color: #0f0;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25em;

  &:hover {
    color: #8f8;
  }

  @media (max-width: 768px) {
    font-size: 1.8em;
    padding: 0.2em;
    min-width: 40px;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }
`;

const OverlayToggle = styled.button`
  background-color: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em 0.8em;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85em;

  &:hover {
    background-color: #0f0;
    color: #000;
  }

  @media (max-width: 768px) {
    padding: 0.6em 0.8em;
    font-size: 0.9rem;
    min-height: 40px;
    touch-action: manipulation;
  }
`;

interface HeaderProps {
  onSettingsClick: () => void;
  onLoadCharacter: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  onLoadCharacter,
}) => {
  return (
    <HeaderContainer>
      <LoadCharacterButton onClick={onLoadCharacter}>
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}
        >
          <GearIcon size={18} aria-hidden="true" />
          <span>Load Character</span>
        </span>
      </LoadCharacterButton>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em' }}>
        {isElectronEnvironment() && (
          <OverlayToggle
            onClick={() => switchMode('overlay')}
            title="Switch to compact overlay mode"
          >
            Overlay
          </OverlayToggle>
        )}
        <MenuIcon onClick={onSettingsClick} aria-label="Open menu">
          <HamburgerIcon size={24} aria-hidden="true" />
        </MenuIcon>
      </div>
    </HeaderContainer>
  );
};

export default Header;
