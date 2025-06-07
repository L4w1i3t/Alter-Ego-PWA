import React from 'react';
import styled from 'styled-components';

const DetailsContainer = styled.div`
  color: #0f0;
  
  @media (max-width: 768px) {
    padding: 0 0.5em;
  }
`;

const DetailsTitle = styled.h2`
  margin-top: 0;
  margin-bottom: 1em;
  font-size: 1.2em;
  
  @media (max-width: 768px) {
    margin-bottom: 1.5em;
    font-size: 1.3em;
    text-align: center;
  }
`;

const DetailsList = styled.ul`
  list-style: none;
  padding-left: 1em;
  margin: 0.5em 0;
  
  @media (max-width: 768px) {
    padding-left: 1.5em;
    margin: 1em 0;
    line-height: 1.6;
  }
`;

const DetailsItem = styled.li`
  margin: 0.3em 0;
  
  @media (max-width: 768px) {
    margin: 0.6em 0;
    font-size: 1.05em;
  }
`;

const SectionTitle = styled.h3`
  margin: 0.8em 0 0.3em 0;
  font-size: 1em;
  
  @media (max-width: 768px) {
    margin: 1.5em 0 0.8em 0;
    font-size: 1.1em;
    font-weight: bold;
    color: #0ff;
  }
`;

const InfoParagraph = styled.p`
  margin: 0.5em 0;
  
  @media (max-width: 768px) {
    margin: 1em 0;
    font-size: 1.05em;
    line-height: 1.5;
  }
`;

const BackButton = styled.button`
  margin-top: 1em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  cursor: pointer;
  padding: 0.3em 0.8em;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
  
  @media (max-width: 768px) {
    margin-top: 2em;
    padding: 1em 1.5em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
    width: 100%;
    max-width: 200px;
    margin-left: auto;
    margin-right: auto;
    display: block;
  }
`;

interface SoftwareDetailsProps {
  onBack: () => void;
}

const SoftwareDetails: React.FC<SoftwareDetailsProps> = ({ onBack }) => {
  // These details should be stored in a central config or fetched from an API
  const details = {
    softwareName: "ALTER EGO (PWA Version)",
    version: "1.0.0",
    developedBy: "L4w1i3t",
    tools: [
      "React",
      "TypeScript",
      "Styled Components",
      "Web Speech API",
      "Local Storage API"
    ],
    credits: [
      "Open Source Community",
      "React Team",
      "Original ALTER EGO Desktop Application"
    ],
    legal: [
      "This software is provided as-is with no warranty.",
      "All AI interactions should comply with AI provider terms of service."
    ],
    knownIssues: [
      "Limited offline functionality",
      "Voice recognition dependent on browser support"
    ]
  };

  return (    <DetailsContainer>
      <DetailsTitle>Software Details</DetailsTitle>
      
      <InfoParagraph><strong>Software Name:</strong> {details.softwareName}</InfoParagraph>
      <InfoParagraph><strong>Version:</strong> {details.version}</InfoParagraph>
      <InfoParagraph><strong>Developed By:</strong> {details.developedBy}</InfoParagraph>
      
      <SectionTitle>Tools:</SectionTitle>
      <DetailsList>
        {details.tools.map((tool, index) => (
          <DetailsItem key={`tool-${index}`}>{tool}</DetailsItem>
        ))}
      </DetailsList>
      
      <SectionTitle>Credits:</SectionTitle>
      <DetailsList>
        {details.credits.map((credit, index) => (
          <DetailsItem key={`credit-${index}`}>{credit}</DetailsItem>
        ))}
      </DetailsList>
      
      <SectionTitle>Legal:</SectionTitle>
      <DetailsList>
        {details.legal.map((legal, index) => (
          <DetailsItem key={`legal-${index}`}>{legal}</DetailsItem>
        ))}
      </DetailsList>
      
      <SectionTitle>Known Issues:</SectionTitle>
      <DetailsList>
        {details.knownIssues.map((issue, index) => (
          <DetailsItem key={`issue-${index}`}>{issue}</DetailsItem>
        ))}
      </DetailsList>
      
      <BackButton onClick={onBack}>Back</BackButton>
    </DetailsContainer>
  );
};

export default SoftwareDetails;