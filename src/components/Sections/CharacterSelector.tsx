import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadPersonas, Persona } from '../../utils/storageUtils';

const SelectorOverlay = styled.div`
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
`;

const SelectorContent = styled.div`
  background: #000;
  border: 1px solid #0f0;
  padding: 1.5em;
  border-radius: 5px;
  width: 300px;
  max-width: 90vw;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
  text-align: center;
`;

const CharacterList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const CharacterItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em 0;
  border-bottom: 1px solid #0f03;
  
  &:last-child {
    border-bottom: none;
  }
`;

const CharacterName = styled.span``;

const LoadButton = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.3em 0.5em;
  font-size: 0.8em;
  cursor: pointer;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const CloseButton = styled.button`
  margin-top: 1.5em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  width: 100%;
  cursor: pointer;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

interface CharacterSelectorProps {
  onSelect: (characterName: string) => void;
  onClose: () => void;
}

const CharacterSelector: React.FC<CharacterSelectorProps> = ({ onSelect, onClose }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  
  useEffect(() => {
    // Load personas from storage
    const loadedPersonas = loadPersonas();
    setPersonas(loadedPersonas);
  }, []);
  
  const handleSelect = (name: string) => {
    onSelect(name);
  };
  
  return (
    <SelectorOverlay>
      <SelectorContent>
        <Title>Select Character</Title>
        <CharacterList>
          {personas.map(persona => (
            <CharacterItem key={persona.name}>
              <CharacterName>{persona.name}</CharacterName>
              <LoadButton onClick={() => handleSelect(persona.name)}>
                Load
              </LoadButton>
            </CharacterItem>
          ))}
        </CharacterList>
        <CloseButton onClick={onClose}>Close</CloseButton>
      </SelectorContent>
    </SelectorOverlay>
  );
};

export default CharacterSelector;