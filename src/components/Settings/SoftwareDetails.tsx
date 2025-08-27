import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 255, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 0, 0);
  }
`;

const DetailsContainer = styled.div`
  color: #0f0;
  position: relative;
  animation: ${fadeIn} 0.8s ease-out;

  @media (max-width: 768px) {
    padding: 0 0.5em;
  }
`;

const DetailsTitle = styled.h2`
  margin-top: 0;
  margin-bottom: 1.5em;
  font-size: 1.8em;
  text-align: center;
  text-shadow: 0 0 10px #0f0;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #0f0, transparent);
  }

  @media (max-width: 768px) {
    margin-bottom: 2em;
    font-size: 1.6em;
  }
`;

const matrixSplit = keyframes`
  0% {
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  50% {
    clip-path: polygon(0% 0%, 100% 0%, 95% 45%, 85% 55%, 75% 45%, 65% 55%, 55% 45%, 45% 55%, 35% 45%, 25% 55%, 15% 45%, 5% 55%, 0% 100%);
  }
  100% {
    clip-path: polygon(0% 0%, 100% 0%, 95% 40%, 85% 60%, 75% 40%, 65% 60%, 55% 40%, 45% 60%, 35% 40%, 25% 60%, 15% 40%, 5% 60%, 0% 100%);
  }
`;

const digitalGlitch = keyframes`
  0%, 100% { transform: translateX(0); opacity: 1; }
  25% { transform: translateX(-1px); opacity: 0.8; }
  50% { transform: translateX(1px); opacity: 1; }
  75% { transform: translateX(-0.5px); opacity: 0.9; }
`;

const HeaderSection = styled.div`
  background: linear-gradient(135deg, #000811, #001122);
  border: 1px solid rgba(0, 255, 0, 0.3);
  border-radius: 10px;
  padding: 1.5em;
  margin-bottom: 2em;
  text-align: center;
  position: relative;
  overflow: visible;
  animation: ${fadeIn} 0.8s ease-out 0.1s both;
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 255, 0, 0.15) 0%,
      rgba(0, 255, 0, 0.05) 25%,
      rgba(0, 0, 0, 0.8) 50%,
      rgba(0, 255, 0, 0.05) 75%,
      rgba(0, 255, 0, 0.15) 100%
    );
    border-radius: 10px;
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    background: linear-gradient(
      45deg,
      #0f0 0%,
      transparent 20%,
      #00ff88 40%,
      transparent 60%,
      #0f0 80%,
      transparent 100%
    );
    border-radius: 10px;
    z-index: -1;
    animation: ${pulse} 3s infinite;
    opacity: 0.6;
  }
`;

const HeaderContent = styled.div`
  position: relative;
  z-index: 2;
  animation: ${fadeIn} 1.2s ease-out 0.5s both;
  padding: 15px 0;

  &::before {
    content: '';
    position: absolute;
    top: 5px;
    left: 20%;
    right: 20%;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      #0f0 30%,
      #00ff88 50%,
      #0f0 70%,
      transparent 100%
    );
    box-shadow:
      0 0 8px #0f0,
      0 0 16px rgba(0, 255, 0, 0.3);
    animation: ${digitalGlitch} 0.8s infinite;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 5px;
    left: 20%;
    right: 20%;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      #0f0 30%,
      #00ff88 50%,
      #0f0 70%,
      transparent 100%
    );
    box-shadow:
      0 0 8px #0f0,
      0 0 16px rgba(0, 255, 0, 0.3);
    animation: ${digitalGlitch} 0.8s infinite reverse;
  }
`;

const AppIcon = styled.img`
  width: 16em;
  height: 16em;
  margin-bottom: 1em;
  filter: drop-shadow(0 0 20px #0f0);
  object-fit: contain;

  @media (max-width: 768px) {
    width: 15em;
    height: 15em;
`;

const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const Version = styled.div`
  font-size: 1.2em;
  margin-top: 0.5em;
  color: #0ff;
  opacity: 0.8;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5em;
  margin-bottom: 2em;
`;

const InfoCard = styled.div<{ $delay?: number }>`
  background: rgba(0, 255, 0, 0.05);
  border: 1px solid rgba(0, 255, 0, 0.3);
  border-radius: 8px;
  padding: 1.5em;
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.8s ease-out ${props => props.$delay || 0}s both;

  &:hover {
    background: rgba(0, 255, 0, 0.1);
    border-color: #0f0;
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 255, 0, 0.2);
  }
`;

const CardTitle = styled.h3`
  margin: 0 0 1em 0;
  font-size: 1.3em;
  color: #0ff;
  display: flex;
  align-items: center;
  gap: 0.5em;

  &::before {
    content: attr(data-icon);
    font-size: 1.2em;
  }
`;

const CardContent = styled.div`
  line-height: 1.6;
`;

const DetailsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const DetailsItem = styled.li`
  margin: 0.5em 0;
  padding-left: 1.5em;
  position: relative;

  &::before {
    content: '▶';
    position: absolute;
    left: 0;
    color: #0f0;
    transition: transform 0.2s ease;
  }

  &:hover::before {
    transform: translateX(3px);
  }
`;

const TechBadge = styled.span`
  display: inline-block;
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.5);
  padding: 0.3em 0.8em;
  margin: 0.2em;
  border-radius: 15px;
  font-size: 0.9em;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(0, 255, 0, 0.2);
    transform: scale(1.05);
  }
`;

const BackButton = styled.button`
  margin-top: 2em;
  background: linear-gradient(135deg, #000, #001100);
  color: #0f0;
  border: 2px solid #0f0;
  border-radius: 8px;
  cursor: pointer;
  padding: 1em 2em;
  font-size: 1.1em;
  font-weight: bold;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 255, 0, 0.2),
      transparent
    );
    transition: left 0.5s;
  }

  &:hover {
    background: #0f0;
    color: #000;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 255, 0, 0.4);

    &::before {
      left: 100%;
    }
  }

  @media (max-width: 768px) {
    width: 100%;
    max-width: 300px;
    margin: 2em auto 0;
    display: block;
  }
`;

const DigitalTear = styled.div<{ $side: 'left' | 'right'; $delay: number }>`
  position: absolute;
  top: 30%;
  ${props => props.$side}: 8px;
  width: 2px;
  height: 40%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    #0f0 20%,
    #ffffff 50%,
    #0f0 80%,
    transparent 100%
  );
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
  animation: ${digitalGlitch} 0.4s infinite;
  animation-delay: ${props => props.$delay}s;
  z-index: 2;
  border-radius: 1px;

  &::before {
    content: '';
    position: absolute;
    top: -10px;
    ${props => props.$side}: 0;
    width: 100%;
    height: calc(100% + 20px);
    background: inherit;
    opacity: 0.3;
    filter: blur(2px);
  }
`;

interface SoftwareDetailsProps {
  onBack: () => void;
}

const SoftwareDetails: React.FC<SoftwareDetailsProps> = ({ onBack }) => {
  const currentYear = new Date().getFullYear();

  const details = {
    softwareName: 'ALTER EGO',
    version: '0.8.0',
    buildDate: 'July 2024',
    developedBy: 'L4w1i3t',
    technologies: [
      'React 18.2.0',
      'TypeScript',
      'Python 3.12',
      'Styled Components',
      'Web Speech API',
      'Dexie.js',
      'Service Workers',
      'PWA Technologies',
      'OpenAI API',
      'OpenAI Vision API (GPT-4o)',
      'ElevenLabs API',
      'Webpack 5',
    ],
    features: [
      'Real-time AI conversations',
      'Advanced image vision and analysis',
      'Image upload and parsing capabilities',
      'Smart image cache with AI descriptions',
      'Voice synthesis (ElevenLabs)',
      'Custom persona management',
      'Short-term and long-term memory system',
      'Offline capability',
      'Cross-platform compatibility',
      'Basic emotion processing',
      'API key management',
      'Desktop installation support',
    ],
    credits: [
      'React Development Team',
      'OpenAI GPT Models & Vision',
      'ElevenLabs TTS',
    ],
    legal: [
      'Licensed under MIT License',
      'Complies with OpenAI Terms of Service',
      'Complies with ElevenLabs API Guidelines',
      'Privacy-focused data handling',
      'No personal data tracking',
      'Local storage for user preferences',
    ],
    knownIssues: [
      'Voice recognition is not yet implemented',
      'Open-source language models are still in development',
      'Emotion detection algorithm is basic and may produce false positives',
      'Limited offline AI processing capabilities',
      'Voice synthesis latency depends on internet connection',
      'Open-source backend integration is work-in-progress',
    ],
    roadmap: [
      'Implement Web Speech API for voice recognition',
      'Add support for local language models (Ollama, etc.)',
      'Enhance emotion detection with advanced algorithms',
      'Improve offline functionality with local AI processing',
      'Add conversation export/import features',
      'Create plugin system for custom AI providers',
      'Expand image analysis with OCR and document processing',
      'Add multi-image batch analysis capabilities',
    ],
  };
  return (
    <DetailsContainer>
      <DetailsTitle>Software Information</DetailsTitle>
      <HeaderSection>
        <HeaderContent>
          <AppIcon src="../assets/logo.webp" alt="ALTER EGO Logo" />
          <Version> v{details.version}</Version>
        </HeaderContent>
      </HeaderSection>
      <InfoGrid>
        <InfoCard $delay={0.2}>
          <CardTitle data-icon="🔧">Technologies</CardTitle>
          <CardContent>
            {details.technologies.map((tech, index) => (
              <TechBadge key={`tech-${index}`}>{tech}</TechBadge>
            ))}
          </CardContent>
        </InfoCard>{' '}
        <InfoCard $delay={0.3}>
          <CardTitle data-icon="⚡">Key Features</CardTitle>
          <CardContent>
            <DetailsList>
              {details.features.map((feature, index) => (
                <DetailsItem key={`feature-${index}`}>{feature}</DetailsItem>
              ))}
            </DetailsList>
          </CardContent>
        </InfoCard>{' '}
        <InfoCard $delay={0.4}>
          <CardTitle data-icon="📝">Project Info</CardTitle>
          <CardContent>
            <DetailsList>
              <DetailsItem>
                <strong>Developer:</strong> {details.developedBy}
              </DetailsItem>
              <DetailsItem>
                <strong>Build Date:</strong> {details.buildDate}
              </DetailsItem>
              <DetailsItem>
                <strong>Copyright:</strong> © {currentYear}{' '}
                {details.developedBy}
              </DetailsItem>
              <DetailsItem>
                <strong>Platform:</strong> Progressive Web App
              </DetailsItem>
              <DetailsItem>
                <strong>License:</strong> MIT License
              </DetailsItem>
            </DetailsList>
          </CardContent>
        </InfoCard>
        <InfoCard $delay={0.5}>
          <CardTitle data-icon="👏">Credits & Acknowledgments</CardTitle>
          <CardContent>
            <DetailsList>
              {details.credits.map((credit, index) => (
                <DetailsItem key={`credit-${index}`}>{credit}</DetailsItem>
              ))}
            </DetailsList>
          </CardContent>
        </InfoCard>{' '}
        <InfoCard $delay={0.6}>
          <CardTitle data-icon="⚖️">Legal & Compliance</CardTitle>
          <CardContent>
            <DetailsList>
              {details.legal.map((legal, index) => (
                <DetailsItem key={`legal-${index}`}>{legal}</DetailsItem>
              ))}
            </DetailsList>
          </CardContent>
        </InfoCard>
        <InfoCard $delay={0.7} style={{ gridColumn: '1 / -1' }}>
          <CardTitle data-icon="⚠️">Known Issues & Limitations</CardTitle>
          <CardContent>
            <DetailsList>
              {details.knownIssues.map((issue, index) => (
                <DetailsItem
                  key={`issue-${index}`}
                  style={{ color: '#ffaa00' }}
                >
                  {issue}
                </DetailsItem>
              ))}
            </DetailsList>
          </CardContent>
        </InfoCard>{' '}
        <InfoCard $delay={0.8} style={{ gridColumn: '1 / -1' }}>
          <CardTitle data-icon="🚧">Development Roadmap</CardTitle>
          <CardContent>
            <DetailsList>
              {details.roadmap.map((item, index) => (
                <DetailsItem
                  key={`roadmap-${index}`}
                  style={{ color: '#00aaff' }}
                >
                  {item}
                </DetailsItem>
              ))}
            </DetailsList>
          </CardContent>
        </InfoCard>
      </InfoGrid>

      <BackButton onClick={onBack}>← Back to Settings</BackButton>
    </DetailsContainer>
  );
};

export default SoftwareDetails;
