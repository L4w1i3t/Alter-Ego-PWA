import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import {
  loadPersonas,
  Persona,
  isExamplePersonaName,
} from '../../utils/storageUtils';

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
  padding: 1.2em 1.2em 1.2em;
  border-radius: 10px;
  width: min(920px, 92vw);
  max-height: min(86vh, 1000px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 40px rgba(0, 255, 0, 0.15);

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    padding: 2rem;
    border-radius: 0.5rem;
    border-width: 2px;
    margin-top: 2rem;
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.25em;
  letter-spacing: 0.02em;

  @media (max-width: 768px) {
    font-size: 1.5em;
    margin-bottom: 1.5em;
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1 1 280px;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.6em 0.8em;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #6f6;
  }
`;

const Toggle = styled.button.withConfig({
  shouldForwardProp: p => p !== 'active',
})<{ active?: boolean }>`
  background: transparent;
  color: ${p => (p.active ? '#000' : '#0f0')};
  border: 1px solid #0f0;
  padding: 0.5em 0.8em;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  ${p => (p.active ? 'background: #0f0;' : '')}

  &:hover {
    background: ${p => (p.active ? '#9f9' : '#0f0')};
    color: #000;
  }
`;

const CharacterList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.8rem;
  overflow: auto;
  padding-right: 0.4rem;
  flex: 1 1 auto;
  border-top: 1px solid #0f03;
  border-bottom: 1px solid #0f03;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
`;

const CharacterItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border: 1px solid #0f03;
  border-radius: 8px;
  padding: 0.8rem;
  background: #000;
  transition: border-color 0.2s ease, transform 0.08s ease;

  &:hover {
    border-color: #0f0;
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 1em 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0.8em;
    border-bottom: 2px solid #0f03;
  }
`;

const CharacterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
`;

const CharacterName = styled.span`
  font-weight: 600;
  letter-spacing: 0.02em;
  @media (max-width: 768px) {
    font-size: 1.2em;
    text-align: center;
    font-weight: bold;
  }
`;

const Tag = styled.span`
  border: 1px solid #0f03;
  color: #0f08;
  padding: 0.15em 0.45em;
  border-radius: 999px;
  font-size: 0.75em;
`;

const LoadButton = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em 0.8em;
  font-size: 0.9em;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;

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

const FooterRow = styled.div`
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  margin-top: 0.8rem;
`;

const CloseButton = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.8em 1.2em;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

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
  const [query, setQuery] = useState('');
  const [showExamplesOnly, setShowExamplesOnly] = useState(false);

  useEffect(() => {
    // Load personas from storage
    const loadedPersonas = loadPersonas();
    setPersonas(loadedPersonas);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personas.filter(p => {
      if (showExamplesOnly && !isExamplePersonaName(p.name)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    });
  }, [personas, query, showExamplesOnly]);

  const handleSelect = (name: string) => {
    onSelect(name);
  };

  return (
    <SelectorOverlay>
      <SelectorContent role="dialog" aria-modal="true" aria-label="Character selector">
        <TitleRow>
          <Title>Select Character</Title>
          <CloseButton onClick={onClose} aria-label="Close selector">Close</CloseButton>
        </TitleRow>
        <Toolbar>
          <SearchInput
            type="text"
            placeholder="Search by name or content..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search characters"
          />
          <Toggle
            type="button"
            active={showExamplesOnly}
            onClick={() => setShowExamplesOnly(v => !v)}
            aria-pressed={showExamplesOnly}
            aria-label="Show only example personas"
          >
            Examples only
          </Toggle>
        </Toolbar>
        <CharacterList>
          {filtered.map(persona => (
            <CharacterItem key={persona.name}>
              <CharacterHeader>
                <CharacterName>{persona.name}</CharacterName>
                {isExamplePersonaName(persona.name) && <Tag>Example</Tag>}
              </CharacterHeader>
              <LoadButton onClick={() => handleSelect(persona.name)}>
                Load
              </LoadButton>
            </CharacterItem>
          ))}
          {filtered.length === 0 && (
            <li style={{ color: '#0f08', padding: '0.6rem' }}>No matching characters.</li>
          )}
        </CharacterList>
        <FooterRow>
          <CloseButton onClick={onClose}>Close</CloseButton>
        </FooterRow>
      </SelectorContent>
    </SelectorOverlay>
  );
};

export default CharacterSelector;
