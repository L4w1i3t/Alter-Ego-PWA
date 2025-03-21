import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const OverlayContent = styled.div`
  background: black;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
  border: 1px solid #0f0;
`;

const Title = styled.h1`
  color: #0f0;
  margin-bottom: 10px;
`;

const Subtitle = styled.h2`
  color: #0f0;
  font-size: 1em;
  font-style: italic;
  margin-bottom: 20px;
`;

const ModelButton = styled.button`
  margin: 10px;
  padding: 10px 20px;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

interface ModelSelectionProps {
  onSelectModel: (model: string) => void;
}

const ModelSelection: React.FC<ModelSelectionProps> = ({ onSelectModel }) => {
  return (
    <Overlay>
      <OverlayContent>
        <Title>Choose Language Model.</Title>
        <Subtitle>If unsure, select Ollama.</Subtitle>
        <ModelButton onClick={() => onSelectModel('ollama')}>
          Ollama
        </ModelButton>
        <ModelButton onClick={() => onSelectModel('openai')}>
          OpenAI
        </ModelButton>
      </OverlayContent>
    </Overlay>
  );
};

export default ModelSelection;