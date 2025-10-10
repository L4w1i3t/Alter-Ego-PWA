import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadSettings, saveSettings } from '../../utils/storageUtils';
import { showSuccess, showError } from '../Common/NotificationManager';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: #0f0;
  width: 100%;

  @media (max-width: 768px) {
    padding: 0 0.5em;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;

  @media (max-width: 768px) {
    margin-bottom: 1.5em;
    font-size: 1.3em;
    text-align: center;
  }
`;

const InfoBox = styled.div`
  padding: 1em;
  border: 1px solid #00f;
  background-color: #000020;
  margin-bottom: 2em;
  font-size: 0.9em;
  line-height: 1.5;

  @media (max-width: 768px) {
    padding: 1.5em;
    margin-bottom: 2.5em;
    font-size: 1em;
    line-height: 1.6;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1.5em;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 2em;
    gap: 1em;
  }
`;

const Label = styled.label`
  flex: 1;
  margin-right: 1em;

  @media (max-width: 768px) {
    margin-right: 0;
    font-size: 1.1em;
    font-weight: bold;
  }
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1em;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
    gap: 1.5em;
  }
`;

const NumberInput = styled.input`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em;
  width: 80px;
  text-align: center;
  font-family: monospace;

  &:focus {
    outline: none;
    border-color: #0ff;
  }

  &:disabled {
    background: #111;
    color: #666;
    border-color: #333;
  }

  @media (max-width: 768px) {
    width: 100px;
    padding: 0.8em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75em;

  @media (max-width: 768px) {
    gap: 1em;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
`;

const Checkbox = styled.input`
  appearance: none;
  width: 18px;
  height: 18px;
  border: 1px solid #0f0;
  border-radius: 4px;
  background: transparent;
  color: #0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  &::before {
    content: '✕';
    font-size: 0.75em;
    opacity: 0.6;
    line-height: 1;
  }

  &:hover {
    border-color: #0ff;
  }

  &:focus-visible {
    outline: 2px solid #0ff;
    outline-offset: 2px;
  }

  &:checked {
    background: #0f0;
    border-color: #0ff;
    color: #000;
  }

  &:checked::before {
    content: '✔';
    opacity: 1;
  }

  @media (max-width: 768px) {
    width: 22px;
    height: 22px;
  }
`;

const CheckboxLabel = styled.label`
  color: #0f0;
  font-size: 0.9em;
  cursor: pointer;

  @media (max-width: 768px) {
    font-size: 1em;
  }
`;

const InfoButton = styled.button`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid #0ff;
  background: rgba(0, 40, 60, 0.6);
  color: #0ff;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background: rgba(0, 120, 160, 0.4);
    border-color: #0ff;
  }

  &:focus-visible {
    outline: 2px solid #0ff;
    outline-offset: 2px;
  }
`;

const ImmersiveInfoBox = styled.div`
  margin-top: -0.25em;
  margin-bottom: 1em;
  padding: 0.75em 1em;
  border: 1px solid #0ff;
  background: rgba(0, 20, 40, 0.85);
  color: #0ff;
  font-size: 0.9em;
  line-height: 1.5;
  border-radius: 0.25em;

  strong {
    color: #fff;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 2em;
  gap: 1em;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-top: 2.5em;
    gap: 1.2em;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  cursor: pointer;

  &:hover {
    background: #0f0;
    color: #000;
  }

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

const InfoText = styled.p`
  margin: 1em 0;
  font-size: 0.9em;
  color: #0f08;
  text-align: center;
  font-style: italic;

  @media (max-width: 768px) {
    margin: 1.5em 0;
    font-size: 1em;
    line-height: 1.5;
    padding: 0 0.5em;
  }
`;

const PreviewSection = styled.div`
  margin: 1.5em 0;
  padding: 1em;
  border: 1px solid #0f03;
  border-radius: 0.3em;
  background-color: #000510;

  @media (max-width: 768px) {
    margin: 2em 0;
    padding: 1.5em;
    border-width: 2px;
  }
`;

const PreviewLabel = styled.h4`
  margin: 0 0 0.5em 0;
  color: #0ff;

  @media (max-width: 768px) {
    margin-bottom: 1em;
    font-size: 1.1em;
  }
`;

const PreviewText = styled.div`
  font-family: inherit;
  color: #0f0;
  min-height: 1.5em;
  padding: 0.5em;
  border: 1px solid #0f03;
  background-color: #000;

  @media (max-width: 768px) {
    min-height: 2em;
    padding: 1em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

interface MiscellaneousSettingsProps {
  onBack: () => void;
}

const MiscellaneousSettings: React.FC<MiscellaneousSettingsProps> = ({
  onBack,
}) => {
  const [textSpeed, setTextSpeed] = useState<number>(40);
  const [isInstantText, setIsInstantText] = useState<boolean>(false);
  const [previewText, setPreviewText] = useState<string>('');
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [isPreviewRunning, setIsPreviewRunning] = useState<boolean>(false);
  // New settings states
  const [notificationDuration, setNotificationDuration] =
    useState<number>(5000);
  const [soundNotifications, setSoundNotifications] = useState<boolean>(false);
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);
  const [autoBackup, setAutoBackup] = useState<boolean>(false);
  const [developerMode, setDeveloperMode] = useState<boolean>(false);
  const [showEmotionDetection, setShowEmotionDetection] =
    useState<boolean>(false);
  const isProduction = process.env.NODE_ENV === 'production';
  const [immersiveMode, setImmersiveMode] = useState<boolean>(false);
  const [initialImmersiveMode, setInitialImmersiveMode] =
    useState<boolean>(false);
  const [showImmersiveInfo, setShowImmersiveInfo] = useState<boolean>(false);

  const sampleText =
    'Hello! This is how ALTER EGO will type responses at this speed.';
  useEffect(() => {
    // Load current settings
    const settings = loadSettings();
    if (settings.textSpeed !== undefined) {
      // If textSpeed is 0 or very high (like 1000), treat it as instant
      if (settings.textSpeed === 0 || settings.textSpeed >= 1000) {
        setIsInstantText(true);
        setTextSpeed(40); // Default value for when instant is disabled
      } else {
        setTextSpeed(settings.textSpeed);
        setIsInstantText(false);
      }
    }

    // Load emotion detection setting
    setShowEmotionDetection(
      isProduction ? false : (settings.showEmotionDetection ?? false)
    );

    const immersiveEnabled = settings.immersiveMode ?? false;
    setImmersiveMode(immersiveEnabled);
    setInitialImmersiveMode(immersiveEnabled);
  }, []);

  useEffect(() => {
    // Preview text typing effect
    if (isPreviewRunning) {
      if (isInstantText) {
        // Show text instantly
        setPreviewText(sampleText);
        setIsPreviewRunning(false);
      } else if (previewIndex < sampleText.length) {
        const timeout = setTimeout(() => {
          setPreviewText(sampleText.slice(0, previewIndex + 1));
          setPreviewIndex(previewIndex + 1);
        }, 1000 / textSpeed);

        return () => clearTimeout(timeout);
      } else if (previewIndex >= sampleText.length) {
        setIsPreviewRunning(false);
      }
    }
  }, [previewIndex, textSpeed, isPreviewRunning, isInstantText]);

  const handleTextSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(200, Number(e.target.value))); // Clamp between 1-200
    setTextSpeed(value);
  };
  const handleInstantToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsInstantText(e.target.checked);
  };

  const handleImmersiveToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImmersiveMode(e.target.checked);
  };

  const toggleImmersiveInfo = () => {
    setShowImmersiveInfo(prev => !prev);
  };

  const handleEmotionDetectionToggle = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setShowEmotionDetection(e.target.checked);
  };

  const handlePreview = () => {
    setPreviewText('');
    setPreviewIndex(0);
    setIsPreviewRunning(true);
  };
  const handleSave = () => {
    try {
      const currentSettings = loadSettings();
      const speedToSave = isInstantText ? 1000 : textSpeed; // Use 1000 for instant
      const immersiveChanged = initialImmersiveMode !== immersiveMode;

      saveSettings({
        ...currentSettings,
        textSpeed: speedToSave,
        showEmotionDetection: showEmotionDetection,
        immersiveMode,
      });

      if (immersiveMode) {
        localStorage.setItem('alterEgo_immersiveMode', 'true');
      } else {
        localStorage.removeItem('alterEgo_immersiveMode');
      }
      setInitialImmersiveMode(immersiveMode);
      setShowImmersiveInfo(false);
      onBack(); // Navigate back first
      const successMessage = immersiveChanged
        ? 'Miscellaneous settings saved. Reload to apply immersive mode changes.'
        : 'Miscellaneous settings saved successfully.';
      showSuccess(successMessage); // Then show notification
    } catch (error) {
      showError('Error saving miscellaneous settings.');
      console.error('Failed to save miscellaneous settings:', error);
    }
  };
  return (
    <Container>
      <Title>Miscellaneous Settings</Title>
      <InfoBox>
        Customize your ALTER EGO experience with these additional settings.
        These options allow you to fine-tune how the application behaves and
        feels during use.
      </InfoBox>{' '}
      <SettingRow>
        <Label htmlFor="immersiveMode">Immersive Mode:</Label>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="immersiveMode"
            checked={immersiveMode}
            onChange={handleImmersiveToggle}
          />
          <CheckboxLabel htmlFor="immersiveMode">
            Disable interating with Developer Tools in production
          </CheckboxLabel>
          <InfoButton
            type="button"
            onClick={toggleImmersiveInfo}
            aria-label="More information about immersive mode"
            aria-expanded={showImmersiveInfo}
          >
            i
          </InfoButton>
        </CheckboxContainer>
      </SettingRow>
      {showImmersiveInfo && (
        <ImmersiveInfoBox>
          <strong>Immersive Mode:</strong> Activates gentle warnings when
          developer tools open in production. This keeps you aware of debugging
          on live deployments without blocking interactions.
          <br />
          <strong>Tip:</strong> Reload after saving to apply changes.
        </ImmersiveInfoBox>
      )}
      <SettingRow>
        <Label htmlFor="instantText">Instant Text:</Label>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="instantText"
            checked={isInstantText}
            onChange={handleInstantToggle}
          />
          <CheckboxLabel htmlFor="instantText">
            Show text immediately (no typing animation)
          </CheckboxLabel>
        </CheckboxContainer>
      </SettingRow>
      <SettingRow>
        <Label htmlFor="textSpeed">Text Speed (CPS):</Label>
        <InputContainer>
          <NumberInput
            type="number"
            id="textSpeed"
            min="1"
            max="200"
            value={textSpeed}
            onChange={handleTextSpeedChange}
            disabled={isInstantText}
            placeholder="40"
          />
          <span style={{ color: '#0f08', fontSize: '0.9em' }}>
            characters per second
          </span>
        </InputContainer>
      </SettingRow>
      <InfoText>
        {isInstantText
          ? "Instant text will show ALTER EGO's complete responses immediately without any typing animation."
          : `Text speed controls how fast ALTER EGO's responses appear on screen (${textSpeed} characters per second). 
             Slower speeds create a more dramatic, visual novel-like experience, while faster speeds 
             provide quicker response delivery.`}
      </InfoText>
      <PreviewSection>
        <PreviewLabel>Preview Text Speed:</PreviewLabel>
        <PreviewText>{previewText}</PreviewText>
        <ButtonContainer style={{ marginTop: '1em' }}>
          <Button onClick={handlePreview} disabled={isPreviewRunning}>
            {isPreviewRunning ? 'Playing Preview...' : 'Test Speed'}
          </Button>
        </ButtonContainer>
      </PreviewSection>
      {process.env.NODE_ENV === 'development' && (
        <SettingRow>
          <Label htmlFor="emotionDetection">Show Emotion Detection:</Label>
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="emotionDetection"
              checked={showEmotionDetection}
              onChange={handleEmotionDetectionToggle}
            />
            <CheckboxLabel htmlFor="emotionDetection">
              Display user and AI emotion analysis boxes
            </CheckboxLabel>
          </CheckboxContainer>
        </SettingRow>
      )}
      <InfoText style={{ fontSize: '0.9em', color: '#0f06' }}>
        {process.env.NODE_ENV === 'development' &&
          'In development mode, you can toggle this feature on/off above.'}
      </InfoText>
      <ButtonContainer>
        <Button onClick={onBack}>Cancel</Button>
        <Button onClick={handleSave}>Save Settings</Button>
      </ButtonContainer>
    </Container>
  );
};

export default MiscellaneousSettings;
