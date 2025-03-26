import React from 'react';
import styled from 'styled-components';

const DetailsContainer = styled.div`
  color: #0f0;
`;

const DetailsTitle = styled.h2`
  margin-top: 0;
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const DetailsList = styled.ul`
  list-style: none;
  padding-left: 1em;
  margin: 0.5em 0;
`;

const DetailsItem = styled.li`
  margin: 0.3em 0;
`;

const SectionTitle = styled.h3`
  margin: 0.8em 0 0.3em 0;
  font-size: 1em;
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

  return (
    <DetailsContainer>
      <DetailsTitle>Software Details</DetailsTitle>
      
      <p><strong>Software Name:</strong> {details.softwareName}</p>
      <p><strong>Version:</strong> {details.version}</p>
      <p><strong>Developed By:</strong> {details.developedBy}</p>
      
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