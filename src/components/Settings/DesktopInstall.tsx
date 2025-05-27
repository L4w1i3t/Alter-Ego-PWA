import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  installPWA, 
  isPWAInstalled, 
  canInstallPWA,
  getManualInstallInstructions,
  getBrowserInfo,
  getPWABenefits
} from '../../utils/pwaUtils';

const Container = styled.div`
  padding: 1em;
`;

const Title = styled.h2`
  font-size: 1.2em;
  margin-bottom: 1em;
  display: flex;
  align-items: center;
  gap: 0.5em;
`;

const BackButton = styled.button`
  background: transparent;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  cursor: pointer;
  padding: 0.3em 0.6em;
  font-size: 0.9em;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const StatusCard = styled.div<{ type: 'success' | 'info' | 'warning' | 'error' }>`
  padding: 1em;
  border-radius: 0.3em;
  margin-bottom: 1em;
  border: 1px solid ${props => {
    switch (props.type) {
      case 'success': return '#0f0';
      case 'info': return '#00f';
      case 'warning': return '#ff0';
      case 'error': return '#f00';
      default: return '#0f0';
    }
  }};
  background: ${props => {
    switch (props.type) {
      case 'success': return 'rgba(0, 255, 0, 0.1)';
      case 'info': return 'rgba(0, 0, 255, 0.1)';
      case 'warning': return 'rgba(255, 255, 0, 0.1)';
      case 'error': return 'rgba(255, 0, 0, 0.1)';
      default: return 'rgba(0, 255, 0, 0.1)';
    }
  }};
`;

const StatusTitle = styled.h3`
  margin: 0 0 0.5em 0;
  font-size: 1em;
`;

const StatusText = styled.p`
  margin: 0;
  line-height: 1.5;
`;

const InstallButton = styled.button`
  background: #0f0;
  color: #000;
  border: none;
  border-radius: 0.3em;
  padding: 0.8em 1.5em;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  margin: 1em 0;
  
  &:hover {
    background: #00e000;
  }
  
  &:disabled {
    background: #666;
    color: #999;
    cursor: not-allowed;
  }
`;

const BenefitsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1em 0;
`;

const BenefitItem = styled.li`
  padding: 0.5em 0;
  display: flex;
  align-items: center;
  gap: 0.5em;
  
  &:before {
    content: '✓';
    color: #0f0;
    font-weight: bold;
  }
`;

const Instructions = styled.div`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #0ff;
  border-radius: 0.3em;
  padding: 1em;
  margin: 1em 0;
`;

const InstructionsTitle = styled.h4`
  margin: 0 0 0.5em 0;
  color: #0ff;
`;

const DebugInfo = styled.details`
  margin-top: 2em;
  padding: 1em;
  background: rgba(128, 128, 128, 0.1);
  border: 1px solid #666;
  border-radius: 0.3em;
`;

const DebugSummary = styled.summary`
  cursor: pointer;
  font-weight: bold;
  color: #888;
  margin-bottom: 1em;
`;

const DebugContent = styled.pre`
  background: #111;
  padding: 1em;
  border-radius: 0.3em;
  overflow-x: auto;
  font-size: 0.8em;
  color: #ccc;
`;

interface Props {
  onBack: () => void;
}

export const DesktopInstall: React.FC<Props> = ({ onBack }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [browserInfo, setBrowserInfo] = useState<any>(null);

  useEffect(() => {
    // Check initial states
    setIsInstalled(isPWAInstalled());
    setCanInstall(canInstallPWA());
    setBrowserInfo(getBrowserInfo());

    // Listen for PWA events
    const handleInstallAvailable = () => {
      setCanInstall(true);
      setInstallError(null);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setInstallError(null);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallError(null);

    try {
      const result = await installPWA();
      if (result.success) {
        setIsInstalled(true);
        setCanInstall(false);
      } else {
        setInstallError(result.error || 'Installation failed');
      }
    } catch (error) {
      setInstallError('Installation failed unexpectedly');
    } finally {
      setIsInstalling(false);
    }
  };

  const getBenefits = () => {
    return getPWABenefits();
  };

  const getTitle = () => {
    return browserInfo?.isMobile ? 'Mobile Installation' : 'Desktop Installation';
  };

  return (
    <Container>
      <Title>
        <BackButton onClick={onBack}>← Back</BackButton>
        {getTitle()}
      </Title>

      {/* Installation Status */}
      {isInstalled ? (
        <StatusCard type="success">
          <StatusTitle>✅ ALTER EGO is Installed!</StatusTitle>
          <StatusText>
            The app is installed and ready to use. You can find it in your apps menu or home screen.
          </StatusText>
        </StatusCard>
      ) : canInstall ? (
        <StatusCard type="info">
          <StatusTitle>🚀 Ready to Install</StatusTitle>
          <StatusText>
            Your browser supports automatic PWA installation. Click the button below to install ALTER EGO.
          </StatusText>
        </StatusCard>
      ) : (
        <StatusCard type="warning">
          <StatusTitle>📱 Manual Installation Available</StatusTitle>
          <StatusText>
            Automatic installation isn't available, but you can still install ALTER EGO manually using your browser's built-in features.
          </StatusText>
        </StatusCard>
      )}

      {/* Error Display */}
      {installError && (
        <StatusCard type="error">
          <StatusTitle>Installation Error</StatusTitle>
          <StatusText>{installError}</StatusText>
        </StatusCard>
      )}

      {/* Benefits */}
      <StatusCard type="info">
        <StatusTitle>Why Install ALTER EGO?</StatusTitle>        <BenefitsList>
          {getBenefits().map((benefit: string, index: number) => (
            <BenefitItem key={index}>{benefit}</BenefitItem>
          ))}
        </BenefitsList>
      </StatusCard>

      {/* Install Button */}
      {!isInstalled && canInstall && (
        <InstallButton 
          onClick={handleInstall} 
          disabled={isInstalling}
        >
          {isInstalling ? 'Installing...' : 'Install ALTER EGO'}
        </InstallButton>
      )}

      {/* Manual Instructions */}
      {!isInstalled && (
        <Instructions>
          <InstructionsTitle>Manual Installation Instructions</InstructionsTitle>
          <StatusText>{getManualInstallInstructions()}</StatusText>
        </Instructions>
      )}

      {/* Debug Information */}
      <DebugInfo>
        <DebugSummary>🔧 Debug Information</DebugSummary>
        <DebugContent>
          {JSON.stringify({
            timestamp: new Date().toLocaleTimeString(),
            isInstalled,
            canInstall,
            browserInfo,
            installError: installError || 'none'
          }, null, 2)}
        </DebugContent>
      </DebugInfo>
    </Container>
  );
};
