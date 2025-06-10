import React from 'react';
import styled from 'styled-components';
import { handleOpenSourceSelection, getWipIndicatorText } from '../../utils/openSourceWip';

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
  
  @media (max-width: 768px) {
    padding: 1rem;
    align-items: flex-start;
    overflow-y: auto;
  }
`;

const OverlayContent = styled.div`
  background: black;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
  border: 1px solid #0f0;
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: none;
    padding: 2rem;
    margin-top: 2rem;
    border-radius: 0;
  }
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

const ModelButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isWip',
})<{ isWip?: boolean }>`
  margin: 10px;
  padding: 10px 20px;
  background: #000;
  color: ${props => props.isWip ? '#ff6b00' : '#0f0'};
  border: 1px solid ${props => props.isWip ? '#ff6b00' : '#0f0'};
  position: relative;
  
  &:hover {
    background: ${props => props.isWip ? '#ff6b00' : '#0f0'};
    color: #000;
  }
  
  @media (max-width: 768px) {
    padding: 1rem 2rem;
    margin: 0.5rem;
    font-size: 1.1rem;
    min-height: 60px;
    min-width: 80%;
    touch-action: manipulation;
  }
`;

const WipIndicator = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff6b00;
  color: #000;
  font-size: 0.7em;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
  border: 1px solid #000;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
`;

const WipInfoButton = styled.button`
  background: transparent;
  color: #ff6b00;
  border: 1px solid #ff6b00;
  padding: 5px 15px;
  margin-top: 10px;
  font-size: 0.8em;
  cursor: pointer;
  
  &:hover {
    background: #ff6b00;
    color: #000;
  }
`;

interface ModelSelectionProps {
  onSelectModel: (model: string) => void;
  onShowWipInfo?: () => void;
}

const ModelSelection: React.FC<ModelSelectionProps> = ({ onSelectModel, onShowWipInfo }) => {
  const wipIndicator = getWipIndicatorText();
    const handleOpenSourceClick = () => {
    // Disable in production mode
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    
    if (handleOpenSourceSelection()) {
      // If WIP mode is disabled or selection is allowed, proceed normally
      onSelectModel('Open Source');
    }
    // If blocked, the handleOpenSourceSelection already showed the warning
  };const handleWipInfoClick = () => {
    if (onShowWipInfo) {
      onShowWipInfo();
    } else {
      // Fallback if callback not provided
      alert('🚧 Open Source model is under development.\n\nFor detailed information, check the Settings panel (⚙️ icon).\n\nFor full functionality, please use OpenAI.');
    }
  };
  
  return (
    <Overlay>
      <OverlayContent>
        <Title>Choose Language Model.</Title>
        <Subtitle>If unsure, select OpenAI for full functionality.</Subtitle>
        <ButtonContainer>          <div style={{ position: 'relative', display: 'inline-block' }}>
            <ModelButton 
              isWip={!!wipIndicator}
              onClick={handleOpenSourceClick}
              style={{ 
                cursor: process.env.NODE_ENV === 'production' ? 'not-allowed' : 'pointer',
                opacity: process.env.NODE_ENV === 'production' ? 0.5 : 1 
              }}
            >
              Open Source
              {wipIndicator && <WipIndicator>WIP</WipIndicator>}
            </ModelButton>
          </div>
          <ModelButton onClick={() => onSelectModel('openai')}>
            OpenAI
          </ModelButton>
        </ButtonContainer>
      </OverlayContent>
    </Overlay>
  );
};

export default ModelSelection;