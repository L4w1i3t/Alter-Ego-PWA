/**
 * DataManagement
 *
 * Settings panel for exporting, importing, and backing up all ALTER EGO data.
 * Works on both the web PWA and the Electron portable build. Shows where data
 * is stored, current statistics, and one-click export / import.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { isElectronEnvironment, getDataPath } from '../../utils/electronUtils';
import {
  exportAllAppData,
  importAllAppData,
  downloadBackup,
  pickBackupFile,
  getDataStats,
  type DataStats,
} from '../../utils/dataManager';
import {
  Disclosure,
  Hint,
  Notice,
  ScreenIntro,
} from '../Common/Disclosure';

// ── Styled components ──

const Container = styled.div`
  padding: 1em;

  @media (max-width: 768px) {
    padding: 0.5em;
  }

  @media (max-width: 480px) {
    padding: 0.4em 0.2em;
  }
`;

const Title = styled.h2`
  font-size: 1.2em;
  margin-bottom: 1em;
  display: flex;
  align-items: center;
  gap: 0.5em;

  @media (max-width: 768px) {
    font-size: 1.1em;
    flex-wrap: wrap;
  }

  @media (max-width: 480px) {
    font-size: 1em;
    gap: 0.4em;
  }
`;

const BackButton = styled.button`
  background: transparent;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  cursor: pointer;
  padding: 0.3em 0.6em;
  font-size: 0.9em;
  flex-shrink: 0;

  &:hover {
    background: #0f0;
    color: #000;
  }

  @media (max-width: 768px) {
    padding: 0.5em 1em;
    font-size: 1em;
    min-height: 2.2em;
    touch-action: manipulation;
  }
`;

const Section = styled.div`
  margin-bottom: 1.5em;
`;

const SectionTitle = styled.h3`
  font-size: 1em;
  margin-bottom: 0.5em;
  color: #0f0;
`;

/* Info panels here now use the shared Notice / Hint / Disclosure primitives. */

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5em;
  margin-top: 0.5em;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.4em;
  }
`;

const StatItem = styled.div`
  padding: 0.5em;
  border: 1px solid #0f02;
  border-radius: 0.2em;
  font-size: 0.85em;

  @media (max-width: 480px) {
    padding: 0.6em;
    font-size: 0.9em;
  }
`;

const StatLabel = styled.span`
  color: #0f09;
  display: block;
  font-size: 0.8em;
  margin-bottom: 0.2em;
`;

const StatValue = styled.span`
  font-weight: bold;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.8em;
  flex-wrap: wrap;
  margin-top: 0.5em;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.6em;
  }
`;

const ActionButton = styled.button.withConfig({
  shouldForwardProp: prop => prop !== 'variant',
})<{ variant?: 'primary' | 'danger' }>`
  background: transparent;
  color: ${p => p.variant === 'danger' ? '#f00' : '#0f0'};
  border: 1px solid ${p => p.variant === 'danger' ? '#f00' : '#0f0'};
  border-radius: 0.3em;
  padding: 0.6em 1.2em;
  font-family: inherit;
  font-size: 0.9em;
  cursor: pointer;

  &:hover {
    background: ${p => p.variant === 'danger' ? '#f00' : '#0f0'};
    color: #000;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.8em 1.4em;
    font-size: 1em;
    min-height: 2.5em;
    touch-action: manipulation;
  }

  @media (max-width: 480px) {
    width: 100%;
    text-align: center;
  }
`;

const StatusMessage = styled.p.withConfig({
  shouldForwardProp: prop => prop !== 'variant',
})<{ variant?: 'success' | 'error' }>`
  margin-top: 0.5em;
  font-size: 0.85em;
  color: ${p => p.variant === 'error' ? '#f00' : '#0f0'};
`;

const PathDisplay = styled.code`
  display: block;
  padding: 0.5em;
  background: rgba(0, 255, 0, 0.05);
  border: 1px solid #0f02;
  border-radius: 0.2em;
  font-size: 0.8em;
  word-break: break-all;
  margin-top: 0.3em;
`;

// ── Component ──

interface DataManagementProps {
  onBack: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ onBack }) => {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [dataPath, setDataPath] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);
  const isDesktop = isElectronEnvironment();

  // Load stats and data path on mount
  useEffect(() => {
    getDataStats().then(setStats).catch(() => {});
    if (isDesktop) {
      getDataPath().then(setDataPath).catch(() => {});
    }
  }, [isDesktop]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setStatus(null);
    try {
      const payload = await exportAllAppData();
      downloadBackup(payload);
      setStatus({ text: 'Backup exported successfully.', variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      setStatus({ text: msg, variant: 'error' });
    } finally {
      setExporting(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setStatus(null);
    try {
      const payload = await pickBackupFile();
      if (!payload) {
        setImporting(false);
        return; // User cancelled
      }
      await importAllAppData(payload);
      setStatus({ text: 'Backup restored. Reloading...', variant: 'success' });
      // Reload after a short delay so the user sees the success message
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setStatus({ text: msg, variant: 'error' });
      setImporting(false);
    }
  }, []);

  return (
    <Container>
      <Title>
        <BackButton onClick={onBack}>Back</BackButton>
        Data Management
      </Title>

      <ScreenIntro>
        Everything ALTER EGO knows lives on this device. Export a backup to move
        it elsewhere.
      </ScreenIntro>

      {/* Storage location info */}
      <Disclosure
        id="data-management-storage-location"
        summary={
          isDesktop ? 'Where your data is stored' : 'Where your data is stored'
        }
      >
        {isDesktop ? (
          <>
            <p>
              <strong>Electron portable</strong> -- databases and settings sit
              next to the executable, so copying the folder moves everything.
            </p>
            {dataPath && <PathDisplay>{dataPath}</PathDisplay>}
          </>
        ) : (
          <p>
            <strong>Browser storage</strong> -- data lives in this browser's
            localStorage and IndexedDB, tied to this site's origin. Clearing
            site data erases it, so export a backup first.
          </p>
        )}
      </Disclosure>

      {/* Statistics */}
      <Section>
        <SectionTitle>Data Summary</SectionTitle>
        {stats ? (
          <StatGrid>
            <StatItem>
              <StatLabel>localStorage entries</StatLabel>
              <StatValue>{stats.localStorageKeys}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel>Memory messages</StatLabel>
              <StatValue>{stats.consolidatedMessages}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel>Associations</StatLabel>
              <StatValue>{stats.consolidatedAssociations}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel>Persona states</StatLabel>
              <StatValue>{stats.consolidatedPersonas}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel>Legacy memory entries</StatLabel>
              <StatValue>{stats.legacyPersonas}</StatValue>
            </StatItem>
          </StatGrid>
        ) : (
          <Hint>Loading statistics...</Hint>
        )}
      </Section>

      {/* Export / Import */}
      <Section>
        <SectionTitle>Export &amp; Import</SectionTitle>
        <Hint>
          One <strong>.json</strong> file with every setting, persona, API key,
          conversation and memory. Interchangeable between the web app and the
          desktop build.
        </Hint>

        <ButtonRow>
          <ActionButton onClick={handleExport} disabled={exporting || importing}>
            {exporting ? 'Exporting...' : 'Export Backup'}
          </ActionButton>
          <ActionButton onClick={handleImport} disabled={exporting || importing} variant="danger">
            {importing ? 'Importing...' : 'Import Backup'}
          </ActionButton>
        </ButtonRow>

        {importing && (
          <Notice $tone="warn">
            Importing <strong>replaces</strong> all existing data. Export first
            if you want to keep what is here.
          </Notice>
        )}

        {status && (
          <StatusMessage variant={status.variant}>{status.text}</StatusMessage>
        )}
      </Section>
    </Container>
  );
};

export default DataManagement;
