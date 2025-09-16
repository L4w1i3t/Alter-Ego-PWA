import React from 'react';
import styled from 'styled-components';
import { WrenchIcon, ArrowLeftIcon } from '../Common/Icons';

const WipInfoPanel = styled.div`
  background: #000;
  color: #ff8800;
  padding: 2em;
  border-radius: 0.5em;
  border: 2px solid #ff8800;
  position: relative;
  max-width: 500px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1.5em;
    margin: 1em;
    max-width: none;
    border-radius: 0.8em;
  }
`;

const WipTitle = styled.h2`
  margin: 0 0 1em 0;
  color: #ff8800;
  font-size: 1.4em;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;

  @media (max-width: 768px) {
    font-size: 1.5em;
    margin-bottom: 1.2em;
    line-height: 1.3;
    padding-right: 1em; /* Account for close button */
  }
`;

const WipIcon = styled.span`
  font-size: 1.2em;
`;

const WipSection = styled.div`
  margin-bottom: 1.5em;

  @media (max-width: 768px) {
    margin-bottom: 2em;
  }
`;

const WipSectionTitle = styled.h3`
  margin: 0 0 0.5em 0;
  color: #ff8800;
  font-size: 1.1em;
  display: flex;
  align-items: center;
  gap: 0.3em;

  @media (max-width: 768px) {
    font-size: 1.2em;
    margin-bottom: 0.8em;
  }
`;

const WipList = styled.ul`
  margin: 0.5em 0;
  padding-left: 1.5em;

  li {
    margin: 0.3em 0;
    color: #ffaa44;
  }

  @media (max-width: 768px) {
    margin: 1em 0;
    padding-left: 1.2em;

    li {
      margin: 0.6em 0;
      font-size: 1.05em;
      line-height: 1.4;
    }
  }
`;

const WipDescription = styled.p`
  margin: 0 0 1em 0;
  line-height: 1.5;
  color: #ffcc88;

  @media (max-width: 768px) {
    margin: 0 0 1.5em 0;
    line-height: 1.6;
    font-size: 1.05em;
  }
`;

const RecommendationBox = styled.div`
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid #0f0;
  padding: 1em;
  border-radius: 0.3em;
  margin-top: 1.5em;

  @media (max-width: 768px) {
    padding: 1.5em;
    margin-top: 2em;
    border-width: 2px;
    border-radius: 0.5em;
  }
`;

const RecommendationTitle = styled.h4`
  margin: 0 0 0.5em 0;
  color: #0f0;
  display: flex;
  align-items: center;
  gap: 0.3em;

  @media (max-width: 768px) {
    margin-bottom: 0.8em;
    font-size: 1.1em;
  }
`;

const BackButton = styled.button`
  background: transparent;
  color: #ff8800;
  border: 1px solid #ff8800;
  padding: 0.5em 1em;
  cursor: pointer;
  border-radius: 0.3em;
  margin-top: 1.5em;
  display: block;
  margin-left: auto;
  margin-right: auto;

  &:hover {
    background: #ff8800;
    color: #000;
  }

  @media (max-width: 768px) {
    margin-top: 2.5em;
    padding: 1em 2em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.5em;
    width: 100%;
    max-width: 250px;
    min-height: 2.5em;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  background: transparent;
  color: #ff8800;
  border: 1px solid #ff8800;
  border-radius: 0.2em;
  cursor: pointer;
  font-weight: bold;
  padding: 0.2em 0.5em;

  &:hover {
    background: #ff8800;
    color: #000;
  }

  @media (max-width: 768px) {
    top: 1em;
    right: 1em;
    padding: 0.5em 0.8em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
    min-height: 2.2em;
    min-width: 2.2em;
  }
`;

interface OpenSourceWipInfoProps {
  onBack: () => void;
}

const OpenSourceWipInfo: React.FC<OpenSourceWipInfoProps> = ({ onBack }) => {
  return (
    <WipInfoPanel>
      <CloseButton onClick={onBack}>X</CloseButton>

      <WipTitle>
        <WipIcon>
          <WrenchIcon size={18} aria-hidden="true" />
        </WipIcon>
        Open Source Model - Work in Progress
      </WipTitle>

      <WipDescription>
        The Open Source language model is currently under active development.
        We're working hard to bring you local AI capabilities with full privacy
        and offline functionality.
      </WipDescription>

      <WipSection>
        <WipSectionTitle> What's being developed:</WipSectionTitle>
        <WipList>
          <li>Local model integration and optimization</li>
          <li>Offline functionality for complete privacy</li>
          <li>Performance tuning for various hardware</li>
          <li>Advanced memory management</li>
          <li>Custom model support and fine-tuning</li>
        </WipList>
      </WipSection>

      <WipSection>
        <WipSectionTitle> Expected Timeline:</WipSectionTitle>
        <WipDescription>
          We're targeting the next major release for initial Open Source model
          support. Follow our development progress for the latest updates.
        </WipDescription>
      </WipSection>

      <RecommendationBox>
        <RecommendationTitle> Current Recommendation:</RecommendationTitle>
        <WipDescription style={{ color: '#aaffaa', margin: 0 }}>
          For the best experience right now, please use the{' '}
          <strong>OpenAI</strong> model which provides: full conversational AI
          capabilities, advanced reasoning, reliable performance, and regular
          updates.
        </WipDescription>
      </RecommendationBox>

      <BackButton onClick={onBack}>
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}
        >
          <ArrowLeftIcon size={16} aria-hidden="true" />
          <span>Back to Settings</span>
        </span>
      </BackButton>
    </WipInfoPanel>
  );
};

export default OpenSourceWipInfo;
