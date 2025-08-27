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

  @media (max-width: 768px) {
    align-items: flex-start;
    padding: 1rem;
    overflow-y: auto;
  }
`;

const SelectorContent = styled.div`
  background: #000;
  border: 1px solid #0f0;
  padding: 1.5em;
  border-radius: 5px;
  width: 300px;
  max-width: 90vw;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    padding: 2rem;
    border-radius: 0.5rem;
    border-width: 2px;
    margin-top: 2rem;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.5em;
    margin-bottom: 1.5em;
  }
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

  @media (max-width: 768px) {
    padding: 1em 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0.8em;
    border-bottom: 2px solid #0f03;
  }
`;

const CharacterName = styled.span`
  @media (max-width: 768px) {
    font-size: 1.2em;
    text-align: center;
    font-weight: bold;
  }
`;

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

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
    min-height: 3em;
    width: 100%;
    touch-action: manipulation;
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

  @media (max-width: 768px) {
    margin-top: 2.5em;
    padding: 1.2em 1.5em;
    font-size: 1.2em;
    border-width: 2px;
    border-radius: 0.3em;
    min-height: 3.5em;
    touch-action: manipulation;
  }
`;

interface CharacterSelectorProps {
  onSelect: (characterName: string) => void;
  onClose: () => void;
}

const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  onSelect,
  onClose,
}) => {
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
