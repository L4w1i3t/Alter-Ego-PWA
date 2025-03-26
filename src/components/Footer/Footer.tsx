import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  display: flex;
  justify-content: space-between;
  padding: 0.5em 1em;
  background-color: #000;
  border-top: 1px solid #0f0;
  font-size: 0.8em;
`;

const FooterLeft = styled.div`
`;

const FooterRight = styled.div`
`;

const VoiceModelSelector = styled.select`
  background-color: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.2em;
  margin-left: 0.5em;

  option {
    background-color: #000;
    color: #0f0;
  }
`;

interface FooterProps {
  activeCharacter: string;
  voiceModel: string;
  onVoiceModelChange?: (model: string) => void;
}

const Footer: React.FC<FooterProps> = ({ 
  activeCharacter, 
  voiceModel,
  onVoiceModelChange 
}) => {
  const handleVoiceModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onVoiceModelChange) {
      onVoiceModelChange(e.target.value);
    }
  };

  return (
    <FooterContainer>
      <FooterLeft>
        Voice Model: 
        <VoiceModelSelector 
          value={voiceModel} 
          onChange={handleVoiceModelChange}
        >
          <option value="None">None</option>
          {/* Additional voice models would be loaded dynamically */}
        </VoiceModelSelector>
      </FooterLeft>
      <FooterRight>
        Active Character: <span>{activeCharacter}</span>
      </FooterRight>
    </FooterContainer>
  );
};

export default Footer;