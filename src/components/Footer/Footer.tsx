import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  display: flex;
  justify-content: space-between;
  padding: 1vh 2vw;
  border-top: 1px solid #0f0;
  font-size: 0.9em;
`;

const FooterLeft = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const FooterRight = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const FooterSpan = styled.span`
  font-weight: bold;
`;

interface FooterProps {
  activeCharacter: string;
  voiceModel: string;
}

const Footer: React.FC<FooterProps> = ({ activeCharacter, voiceModel }) => {
  return (
    <FooterContainer>
      <FooterLeft>
        <FooterSpan>Voice Model: <span>{voiceModel}</span><br/></FooterSpan>
        {/* Speech Recognition disabled for now
        <FooterSpan>Speech Recognition (F4): <span className="sr-status sr-off">OFF</span></FooterSpan>
        */}
      </FooterLeft>
      <FooterRight>
        Active Character: <span>{activeCharacter}</span>
      </FooterRight>
    </FooterContainer>
  );
};

export default Footer;