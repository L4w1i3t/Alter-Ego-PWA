import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1vh 2vw;
  border-bottom: 1px solid #0f0;
`;

const LoadCharacterButton = styled.button`
  font-family: inherit;
  color: #0f0;
  background: #000;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  border-radius: 0.2em;
  
  &:hover {
    background: #0f0;
    color: #000;
    cursor: pointer;
  }
`;

const MenuIcon = styled.div`
  font-size: 1.5em;
  cursor: pointer;
  
  &:hover {
    color: #fff;
  }
`;

interface HeaderProps {
  onSettingsClick: () => void;
  onLoadCharacter: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onLoadCharacter }) => {
  return (
    <HeaderContainer>
      <LoadCharacterButton onClick={onLoadCharacter}>
        Load Character
      </LoadCharacterButton>
      <MenuIcon onClick={onSettingsClick}>☰</MenuIcon>
    </HeaderContainer>
  );
};

export default Header;