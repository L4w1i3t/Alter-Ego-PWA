import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadSettings, saveSettings } from '../../utils/storageUtils';
import { showSuccess, showError } from '../Common/NotificationManager';
import { isElectronEnvironment } from '../../utils/electronUtils';
import { AUTONOMY, LAN } from '../../config/constants';
import {
  getLanStatus,
  getDiscoveredPeers,
  connectToPeer,
  disconnectFromPeer,
} from '../../services/lanService';
import type { LanPeer, LanStatus } from '../../services/lanService';

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
    gap: 0.8em;
  }

  @media (max-width: 480px) {
    margin-bottom: 1.5em;
    gap: 0.6em;
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
  width: 5em;
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
    width: 6em;
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
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: 1px solid #0f0;
  border-radius: 4px;
  background: transparent;
  color: #0f0;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  touch-action: manipulation;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  &::before {
    content: '';
    width: 10px;
    height: 6px;
    border-left: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    opacity: 0;
    transform: rotate(-45deg) scale(0.7);
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
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
    opacity: 1;
    transform: rotate(-45deg) scale(1);
  }

  @media (max-width: 768px) {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
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

const WarningInfoBox = styled(ImmersiveInfoBox)`
  border-color: #fa0;
  background: rgba(40, 24, 0, 0.85);
  color: #fa0;
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
    max-width: 100%;
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
  // Removed: showTimestamps, compactMode, reduce motion (animationsEnabled)
  const [overallTextScale, setOverallTextScale] = useState<number>(1);
  const [responseTextScale, setResponseTextScale] = useState<number>(1);
  // Removed: bubbleMaxWidthPercent
  const [autoBackup, setAutoBackup] = useState<boolean>(false);
  const [developerMode, setDeveloperMode] = useState<boolean>(false);
  const [showEmotionDetection, setShowEmotionDetection] =
    useState<boolean>(false);
  const isProduction = process.env.NODE_ENV === 'production';
  const [immersiveMode, setImmersiveMode] = useState<boolean>(false);
  const [initialImmersiveMode, setInitialImmersiveMode] =
    useState<boolean>(false);
  const [showImmersiveInfo, setShowImmersiveInfo] = useState<boolean>(false);
  // Autonomy settings (Electron-only)
  const isElectron = isElectronEnvironment();
  const [autonomyEnabled, setAutonomyEnabled] = useState<boolean>(false);
  const [autonomyInterval, setAutonomyInterval] = useState<number>(
    AUTONOMY.DEFAULT_INTERVAL_MINUTES
  );
  const [showAutonomyInfo, setShowAutonomyInfo] = useState<boolean>(false);
  const [autonomyNotifications, setAutonomyNotifications] =
    useState<boolean>(false);
  // LAN settings (Electron-only)
  const [lanEnabled, setLanEnabled] = useState<boolean>(false);
  const [lanAutoConnect, setLanAutoConnect] = useState<boolean>(false);
  const [lanUnlimitedTurns, setLanUnlimitedTurns] = useState<boolean>(false);
  const [showLanInfo, setShowLanInfo] = useState<boolean>(false);
  const [lanStatus, setLanStatus] = useState<LanStatus | null>(null);
  const [discoveredPeers, setDiscoveredPeers] = useState<LanPeer[]>([]);
  // Current Notification API permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

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

    // Load autonomy settings
    setAutonomyEnabled(settings.autonomyEnabled ?? false);
    setAutonomyInterval(
      settings.autonomyIntervalMinutes ?? AUTONOMY.DEFAULT_INTERVAL_MINUTES
    );
    setAutonomyNotifications(settings.autonomyNotifications ?? false);

    // Load LAN settings
    setLanEnabled(settings.lanEnabled ?? false);
    setLanAutoConnect(settings.lanAutoConnect ?? false);
    setLanUnlimitedTurns(settings.lanUnlimitedTurns ?? false);

    // Load new UI settings
    // Removed: timestamps/compact/reduce motion
    setOverallTextScale(settings.overallTextScale ?? 1);
    setResponseTextScale(settings.responseTextScale ?? 1);
    // Removed: bubble width
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

  const handleAutonomyToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutonomyEnabled(e.target.checked);
  };

  const handleAutonomyIntervalChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const v = Number(e.target.value);
    setAutonomyInterval(
      Math.min(
        AUTONOMY.MAX_INTERVAL_MINUTES,
        Math.max(AUTONOMY.MIN_INTERVAL_MINUTES, v)
      )
    );
  };

  const toggleAutonomyInfo = () => {
    setShowAutonomyInfo(prev => !prev);
  };

  const handleAutonomyNotificationsToggle = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const wantsEnabled = e.target.checked;
    // Always toggle state immediately so the checkbox responds
    setAutonomyNotifications(wantsEnabled);

    // If enabling and permission hasn't been granted yet, request it in the background
    if (
      wantsEnabled &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().then(perm => {
        setNotifPermission(perm);
        if (perm === 'denied') {
          // Revert toggle if permission was explicitly denied
          setAutonomyNotifications(false);
        }
      });
    }
  };

  const handleRequestNotifPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      setAutonomyNotifications(true);
    }
  };

  // LAN handlers
  const handleLanToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLanEnabled(e.target.checked);
  };

  const handleLanAutoConnectToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLanAutoConnect(e.target.checked);
  };

  const handleLanUnlimitedTurnsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLanUnlimitedTurns(e.target.checked);
  };

  const toggleLanInfo = () => {
    setShowLanInfo(prev => !prev);
  };

  const refreshLanStatus = async () => {
    const status = await getLanStatus();
    setLanStatus(status);
    const peers = await getDiscoveredPeers();
    setDiscoveredPeers(peers);
  };

  const handleConnectPeer = async (peerId: string) => {
    await connectToPeer(peerId);
    await refreshLanStatus();
  };

  const handleDisconnectPeer = async () => {
    await disconnectFromPeer();
    await refreshLanStatus();
  };

  // Poll LAN status while settings are open and LAN is enabled
  useEffect(() => {
    if (!isElectron || !lanEnabled) return;
    refreshLanStatus();
    const interval = setInterval(refreshLanStatus, LAN.POLL_INTERVAL_MS as number);
    return () => clearInterval(interval);
  }, [isElectron, lanEnabled]);

  const handleEmotionDetectionToggle = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setShowEmotionDetection(e.target.checked);
  };
  const handleOverallScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setOverallTextScale(Math.min(1.6, Math.max(0.8, v)));
  };
  const handleResponseScaleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const v = Number(e.target.value);
    setResponseTextScale(Math.min(2, Math.max(0.8, v)));
  };
  // Removed: bubble width handler

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
        overallTextScale,
        responseTextScale,
        autonomyEnabled,
        autonomyIntervalMinutes: autonomyInterval,
        autonomyNotifications,
        lanEnabled,
        lanAutoConnect,
        lanUnlimitedTurns,
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
        <Label htmlFor="overallScale">Overall Text Size:</Label>
        <InputContainer>
          <NumberInput
            id="overallScale"
            type="number"
            step="0.05"
            min="0.8"
            max="1.6"
            value={overallTextScale}
            onChange={handleOverallScaleChange}
          />
          <span style={{ color: '#0f08', fontSize: '0.9em' }}>× base font</span>
        </InputContainer>
      </SettingRow>
      <SettingRow>
        <Label htmlFor="responseScale">Response Text Size:</Label>
        <InputContainer>
          <NumberInput
            id="responseScale"
            type="number"
            step="0.05"
            min="0.8"
            max="2"
            value={responseTextScale}
            onChange={handleResponseScaleChange}
            disabled={overallTextScale !== 1}
          />
          <span style={{ color: '#0f08', fontSize: '0.9em' }}>
            × message text (disabled if Overall Text ≠ 1)
          </span>
        </InputContainer>
      </SettingRow>
      {/* Removed: Bubble Width, Show Timestamps, Compact Mode, Reduce Motion */}
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
            Disable interacting with Developer Tools in production
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
      {/* Autonomy settings - Electron desktop app only */}
      {isElectron && (
        <>
          <SettingRow>
            <Label htmlFor="autonomyEnabled">Autonomy Mode:</Label>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="autonomyEnabled"
                checked={autonomyEnabled}
                onChange={handleAutonomyToggle}
              />
              <CheckboxLabel htmlFor="autonomyEnabled">
                Allow the AI to message you first
              </CheckboxLabel>
              <InfoButton
                type="button"
                onClick={toggleAutonomyInfo}
                aria-label="More information about autonomy mode"
                aria-expanded={showAutonomyInfo}
              >
                i
              </InfoButton>
            </CheckboxContainer>
          </SettingRow>
          {showAutonomyInfo && (
            <ImmersiveInfoBox>
              <strong>Autonomy Mode:</strong> When enabled, the AI can proactively
              send you messages without waiting for your input. It may start new
              conversations or revisit interesting topics from your chat history.
              Messages are sent after a period of no queries from you, so the AI
              can reach out even while you are busy with other things.
              <br />
              <strong>Desktop only:</strong> This feature is exclusive to the
              Electron desktop app.
            </ImmersiveInfoBox>
          )}
          <SettingRow>
            <Label htmlFor="autonomyInterval">
              Autonomy Interval (minutes):
            </Label>
            <InputContainer>
              <NumberInput
                id="autonomyInterval"
                type="number"
                min={AUTONOMY.MIN_INTERVAL_MINUTES}
                max={AUTONOMY.MAX_INTERVAL_MINUTES}
                step="1"
                value={autonomyInterval}
                onChange={handleAutonomyIntervalChange}
                disabled={!autonomyEnabled}
              />
              <span style={{ color: '#0f08', fontSize: '0.9em' }}>
                base minutes between messages
              </span>
            </InputContainer>
          </SettingRow>
          <SettingRow>
            <Label htmlFor="autonomyNotifications">Push Notifications:</Label>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="autonomyNotifications"
                checked={autonomyNotifications}
                onChange={handleAutonomyNotificationsToggle}
                disabled={!autonomyEnabled}
              />
              <CheckboxLabel htmlFor="autonomyNotifications">
                Notify when the AI messages you while the app is minimized
              </CheckboxLabel>
            </CheckboxContainer>
          </SettingRow>
          {autonomyEnabled && notifPermission === 'denied' && (
            <ImmersiveInfoBox>
              <strong>Notifications blocked.</strong> Your system has denied
              notification permissions for this app. Please allow notifications
              in your OS settings to use this feature.
            </ImmersiveInfoBox>
          )}
          {autonomyEnabled && notifPermission === 'default' && autonomyNotifications && (
            <ImmersiveInfoBox>
              <strong>Permission needed.</strong> Click the button below to
              grant notification access.
              <br />
              <Button
                style={{ marginTop: '0.5em' }}
                onClick={handleRequestNotifPermission}
              >
                Allow Notifications
              </Button>
            </ImmersiveInfoBox>
          )}
        </>
      )}
      {/* LAN Peer-to-Peer settings - Electron desktop app only */}
      {isElectron && (
        <>
          <SettingRow>
            <Label htmlFor="lanEnabled">LAN Peer Chat:</Label>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="lanEnabled"
                checked={lanEnabled}
                onChange={handleLanToggle}
              />
              <CheckboxLabel htmlFor="lanEnabled">
                Let two ALTER EGOs on the same network talk to each other
              </CheckboxLabel>
              <InfoButton
                type="button"
                onClick={toggleLanInfo}
                aria-label="More information about LAN peer chat"
                aria-expanded={showLanInfo}
              >
                i
              </InfoButton>
            </CheckboxContainer>
          </SettingRow>
          <WarningInfoBox>
            <strong>Early testing:</strong> LAN Peer Chat is experimental.
            Discovery, connection stability, and turn timing may be buggy while
            this feature is being tested across different local networks.
          </WarningInfoBox>
          {showLanInfo && (
            <ImmersiveInfoBox>
              <strong>LAN Peer Chat:</strong> When enabled, ALTER EGO will
              broadcast its presence on the local network and listen for other
              ALTER EGO instances. When two instances find each other, their AI
              personas will have a live conversation. One is randomly chosen to
              speak first so neither user has to initiate.
              <br /><br />
              <strong>Two-peer limit:</strong> Only one connection at a time is
              allowed to keep the conversation natural and avoid multiple AIs
              talking over each other.
              <br />
              <strong>Desktop only:</strong> This feature requires the Electron
              desktop app and a local network connection.
            </ImmersiveInfoBox>
          )}
          <SettingRow>
            <Label htmlFor="lanAutoConnect">Auto-Connect:</Label>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="lanAutoConnect"
                checked={lanAutoConnect}
                onChange={handleLanAutoConnectToggle}
                disabled={!lanEnabled}
              />
              <CheckboxLabel htmlFor="lanAutoConnect">
                Automatically connect to the first discovered peer
              </CheckboxLabel>
            </CheckboxContainer>
          </SettingRow>
          <SettingRow>
            <Label htmlFor="lanUnlimitedTurns">Unlimited Turns:</Label>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="lanUnlimitedTurns"
                checked={lanUnlimitedTurns}
                onChange={handleLanUnlimitedTurnsToggle}
                disabled={!lanEnabled}
              />
              <CheckboxLabel htmlFor="lanUnlimitedTurns">
                Keep chatting until disconnected (no {LAN.MAX_EXCHANGE_TURNS}-turn limit)
              </CheckboxLabel>
            </CheckboxContainer>
          </SettingRow>
          {lanEnabled && lanStatus && (
            <>
              <ImmersiveInfoBox>
                <strong>Status:</strong>{' '}
                {lanStatus.isConnected
                  ? `Connected to ${lanStatus.peer?.name ?? 'peer'} (${lanStatus.role})`
                  : lanStatus.isRunning
                    ? 'Scanning for peers...'
                    : 'Not running (save settings to start)'}
                {lanStatus.localIPs?.length > 0 && (
                  <>
                    <br />
                    <span style={{ color: '#0f08', fontSize: '0.9em' }}>
                      Your IP: {lanStatus.localIPs.join(', ')}
                    </span>
                  </>
                )}
              </ImmersiveInfoBox>
              {lanStatus.isConnected && (
                <ButtonContainer style={{ marginTop: '0' }}>
                  <Button onClick={handleDisconnectPeer}>
                    Disconnect from Peer
                  </Button>
                </ButtonContainer>
              )}
              {!lanStatus.isConnected && discoveredPeers.length > 0 && (
                <>
                  <ImmersiveInfoBox>
                    <strong>Discovered Peers:</strong>
                    {discoveredPeers.map(peer => (
                      <div
                        key={peer.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.5em',
                          padding: '0.3em 0',
                          borderBottom: '1px solid #0ff3',
                        }}
                      >
                        <span>
                          {peer.name}{' '}
                          <span style={{ color: '#0f08', fontSize: '0.85em' }}>
                            ({peer.ip})
                          </span>
                        </span>
                        <Button
                          style={{ padding: '0.25em 0.75em', fontSize: '0.85em' }}
                          onClick={() => handleConnectPeer(peer.id)}
                        >
                          Connect
                        </Button>
                      </div>
                    ))}
                  </ImmersiveInfoBox>
                </>
              )}
              {!lanStatus.isConnected && discoveredPeers.length === 0 && lanStatus.isRunning && (
                <ImmersiveInfoBox>
                  No peers found yet. Make sure another ALTER EGO desktop app
                  with LAN Peer Chat enabled is running on the same network.
                </ImmersiveInfoBox>
              )}
            </>
          )}
        </>
      )}
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
