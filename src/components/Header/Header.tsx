import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import MobileOptimizations from '../../utils/mobileOptimizations';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8em;
  background-color: #000;
  border-bottom: 1px solid #0f0;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    min-height: 50px;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
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

const FullscreenButton = styled.button`
  background-color: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em;
  cursor: pointer;
  font-size: 1.2em;
  border-radius: 3px;
  
  &:hover {
    background-color: #0f0;
    color: #000;
  }
  
  @media (max-width: 768px) {
    display: none; /* Hide on mobile since fullscreen is auto-handled */
  }
`;

const MenuIcon = styled.div`
  font-size: 1.5em;
  cursor: pointer;
  
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

interface HeaderProps {
  onSettingsClick: () => void;
  onLoadCharacter: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onLoadCharacter }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  const handleFullscreenToggle = async () => {
    const mobileOpt = MobileOptimizations.getInstance();
    await mobileOpt.toggleFullscreen();
  };

  return (
    <HeaderContainer>
      <LeftSection>
        <LoadCharacterButton onClick={onLoadCharacter}>
          Load Character
        </LoadCharacterButton>
      </LeftSection>
      <RightSection>
        <FullscreenButton 
          onClick={handleFullscreenToggle}
          title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
        >
          {isFullscreen ? "⛶" : "⛶"}
        </FullscreenButton>
        <MenuIcon onClick={onSettingsClick}>☰</MenuIcon>
      </RightSection>
    </HeaderContainer>
  );
};

export default Header;