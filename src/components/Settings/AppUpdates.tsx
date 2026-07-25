import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  applyUpdate,
  checkForUpdate,
  clearSkippedVersion,
  getCurrentVersion,
  getUpdatePlatform,
  openReleasePage,
  RELEASES_PAGE,
  skipVersion,
  updatesSupported,
  type UpdateInfo,
  type UpdateProgress,
} from '../../services/updateService';
import { Disclosure, Hint, Notice, ScreenIntro } from '../Common/Disclosure';
import { showError, showInfo } from '../Common/NotificationManager';

const Container = styled.div`
  color: #0f0;
  max-width: 100%;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const StatusCard = styled.div`
  border: 1px solid #0f04;
  border-radius: var(--ae-radius-sm);
  padding: 1em;
  margin-bottom: 1.2em;
`;

const VersionRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1em;

  & + & {
    margin-top: 0.5em;
  }
`;

const VersionLabel = styled.span`
  color: var(--ae-color-blue);
  font-size: 0.85em;
`;

const VersionValue = styled.span`
  overflow-wrap: anywhere;
`;

const ReleaseNotes = styled.pre`
  margin: 0.8em 0 0;
  padding: 0.8em;
  max-height: 14em;
  overflow: auto;
  border: 1px solid #0f03;
  border-radius: var(--ae-radius-sm);
  background: #00140c;
  font-family: inherit;
  font-size: 0.8em;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const ProgressTrack = styled.div`
  margin-top: 0.8em;
  height: 6px;
  border: 1px solid #0f06;
  border-radius: 999px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  width: ${p => p.$percent}%;
  height: 100%;
  background: var(--ae-color-cyan);
  transition: width 0.15s linear;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75em;
  margin-top: 1.2em;
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.6em 1em;
  border-radius: var(--ae-radius-sm);

  &:hover:not(:disabled) {
    background: #0f0;
    color: #000;
  }
`;

const SecondaryButton = styled(Button)`
  border-color: #0f06;
  color: #0f0b;
`;

interface AppUpdatesProps {
  onBack: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AppUpdates: React.FC<AppUpdatesProps> = ({ onBack }) => {
  const platform = getUpdatePlatform();
  const supported = updatesSupported();
  const currentVersion = getCurrentVersion();

  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checked, setChecked] = useState(false);

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      // Manual checks bypass the six-hour rate limit.
      const result = await checkForUpdate(true);
      setUpdate(result);
      setChecked(true);
      if (!result) showInfo('You are on the latest version.');
    } finally {
      setChecking(false);
    }
  }, []);

  // Show anything already found by the background check on startup.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    checkForUpdate(false).then(result => {
      if (!cancelled && result) {
        setUpdate(result);
        setChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const handleApply = useCallback(async () => {
    if (!update) return;
    setBusy(true);
    setProgress(0);
    try {
      const result = await applyUpdate(update, (p: UpdateProgress) =>
        setProgress(p.percent)
      );

      switch (result.outcome) {
        case 'installing':
          showInfo('Confirm the install on the system dialog to finish.');
          break;
        case 'downloaded':
          showInfo(`Downloaded to ${result.path}`);
          break;
        case 'needs-permission':
          showInfo(
            'Allow ALTER EGO to install apps, then run the update again.'
          );
          break;
        case 'opened-page':
          break;
        case 'failed':
          showError(`Update failed: ${result.message}`);
          break;
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [update]);

  const handleSkip = useCallback(() => {
    if (!update) return;
    skipVersion(update.version);
    setUpdate(null);
    showInfo(`Version ${update.version} will not be mentioned again.`);
  }, [update]);

  return (
    <Container>
      <Title>Updates</Title>

      {supported ? (
        <ScreenIntro>
          ALTER EGO checks GitHub for new releases in the background, at most
          once every six hours.
        </ScreenIntro>
      ) : (
        <ScreenIntro>
          You are running the web version, which updates itself when you reload.
        </ScreenIntro>
      )}

      <StatusCard>
        <VersionRow>
          <VersionLabel>Installed</VersionLabel>
          <VersionValue>{currentVersion}</VersionValue>
        </VersionRow>
        <VersionRow>
          <VersionLabel>Build</VersionLabel>
          <VersionValue>
            {platform === 'android'
              ? 'Android app'
              : platform === 'electron'
                ? 'Desktop app'
                : 'Web app'}
          </VersionValue>
        </VersionRow>
        {update && (
          <VersionRow>
            <VersionLabel>Available</VersionLabel>
            <VersionValue>
              {update.version}
              {update.assetSize ? ` (${formatBytes(update.assetSize)})` : ''}
            </VersionValue>
          </VersionRow>
        )}
      </StatusCard>

      {!supported && (
        <Notice>
          Reload the page to pick up the newest version. Installing the app from{' '}
          <strong>Settings -&gt; Install App</strong> adds background update
          checks.
        </Notice>
      )}

      {supported && update && (
        <>
          <Notice>
            Version <strong>{update.version}</strong> is available. Your
            conversations, personas and keys are kept.
          </Notice>
          {update.releaseNotes && (
            <Disclosure
              id="update-release-notes"
              summary={`What's new in ${update.version}`}
              defaultOpen
            >
              <ReleaseNotes>{update.releaseNotes}</ReleaseNotes>
            </Disclosure>
          )}
        </>
      )}

      {supported && checked && !update && (
        <Notice $tone="neutral">You are on the latest version.</Notice>
      )}

      {progress !== null && (
        <>
          <Hint>Downloading... {progress}%</Hint>
          <ProgressTrack>
            <ProgressFill $percent={progress} />
          </ProgressTrack>
        </>
      )}

      {platform === 'electron' && update && (
        <Disclosure
          id="update-desktop-howto"
          summary="How the desktop update is applied"
        >
          <p>
            The Windows build is a single portable executable, and Windows will
            not let a running program overwrite its own file. So the new build is
            downloaded next to the current one and shown in Explorer.
          </p>
          <p>
            Close ALTER EGO, replace the old <strong>.exe</strong> with the new
            one, and start it again. Your data lives in the{' '}
            <strong>ALTER EGO Data</strong> folder beside the executable and is
            not touched.
          </p>
        </Disclosure>
      )}

      {platform === 'android' && update && (
        <Disclosure
          id="update-android-howto"
          summary="How the Android update is applied"
        >
          <p>
            The APK downloads and Android's package installer asks you to
            confirm. Because the update has the same signature as what you have
            installed, it upgrades in place -- nothing is erased.
          </p>
          <p>
            If Android has not been told to trust installs from ALTER EGO it will
            send you to a settings screen first. You can always download the APK
            yourself from the{' '}
            <a
              href={RELEASES_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              onClick={event => {
                event.preventDefault();
                void openReleasePage(RELEASES_PAGE);
              }}
            >
              releases page
            </a>
            .
          </p>
        </Disclosure>
      )}

      <ButtonRow>
        <Button onClick={onBack} disabled={busy}>
          Back
        </Button>
        {supported && (
          <Button onClick={runCheck} disabled={checking || busy}>
            {checking ? 'Checking...' : 'Check now'}
          </Button>
        )}
        {update && (
          <Button onClick={handleApply} disabled={busy}>
            {busy
              ? 'Working...'
              : platform === 'android'
                ? 'Download & install'
                : 'Download'}
          </Button>
        )}
        {update && (
          <SecondaryButton onClick={handleSkip} disabled={busy}>
            Skip this version
          </SecondaryButton>
        )}
        <SecondaryButton
          onClick={() => {
            clearSkippedVersion();
            void openReleasePage(RELEASES_PAGE);
          }}
          disabled={busy}
        >
          All releases
        </SecondaryButton>
      </ButtonRow>
    </Container>
  );
};

export default AppUpdates;
