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

// ── Styled components ──

const Container = styled.div`
  padding: 1em;
  @media (max-width: 768px) { padding: 0.5em; }
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
  &:hover { background: #0f0; color: #000; }
`;

const Section = styled.div`
  margin-bottom: 1.5em;
`;

const SectionTitle = styled.h3`
  font-size: 1em;
  margin-bottom: 0.5em;
  color: #0f0;
`;

const InfoBox = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'variant',
})<{ variant?: 'info' | 'success' | 'warning' | 'error' }>`
  padding: 0.8em 1em;
  border-radius: 0.3em;
  margin-bottom: 0.8em;
  border: 1px solid ${p => {
    switch (p.variant) {
      case 'success': return '#0f0';
      case 'warning': return '#ff0';
      case 'error': return '#f00';
      default: return '#0af';
    }
  }};
  background: ${p => {
    switch (p.variant) {
      case 'success': return 'rgba(0,255,0,0.08)';
      case 'warning': return 'rgba(255,255,0,0.08)';
      case 'error': return 'rgba(255,0,0,0.08)';
      default: return 'rgba(0,170,255,0.08)';
    }
  }};
  font-size: 0.85em;
  line-height: 1.5;
  word-break: break-word;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5em;
  margin-top: 0.5em;
`;

const StatItem = styled.div`
  padding: 0.5em;
  border: 1px solid #0f02;
  border-radius: 0.2em;
  font-size: 0.85em;
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
  &:disabled { opacity: 0.4; cursor: not-allowed; }
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

      {/* Storage location info */}
      <Section>
        <SectionTitle>Storage Location</SectionTitle>
        {isDesktop ? (
          <InfoBox variant="info">
            <strong>Electron Portable</strong> -- All databases and settings are
            stored next to the executable so you can copy the entire folder to
            another machine.
            {dataPath && <PathDisplay>{dataPath}</PathDisplay>}
          </InfoBox>
        ) : (
          <InfoBox variant="info">
            <strong>Browser Storage</strong> -- Data is stored in your browser's
            localStorage and IndexedDB, tied to this site's origin. Use the
            export button below to create a portable backup you can restore on
            any ALTER EGO instance (web or desktop).
          </InfoBox>
        )}
      </Section>

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
          <InfoBox>Loading statistics...</InfoBox>
        )}
      </Section>

      {/* Export / Import */}
      <Section>
        <SectionTitle>Export & Import</SectionTitle>
        <InfoBox variant="info">
          Exports produce a single <strong>.json</strong> file containing all
          settings, personas, API keys, conversation history, and long-term
          memory. This file is compatible between the web app and the desktop
          portable build.
        </InfoBox>

        <ButtonRow>
          <ActionButton onClick={handleExport} disabled={exporting || importing}>
            {exporting ? 'Exporting...' : 'Export Backup'}
          </ActionButton>
          <ActionButton onClick={handleImport} disabled={exporting || importing} variant="danger">
            {importing ? 'Importing...' : 'Import Backup'}
          </ActionButton>
        </ButtonRow>

        {importing && (
          <InfoBox variant="warning">
            Importing will <strong>replace</strong> all existing data. Make sure
            you have exported a backup first if you want to keep your current
            data.
          </InfoBox>
        )}

        {status && (
          <StatusMessage variant={status.variant}>{status.text}</StatusMessage>
        )}
      </Section>

      {/* Cross-platform note */}
      <Section>
        <SectionTitle>Cross-Platform Compatibility</SectionTitle>
        <InfoBox>
          Backups are fully interchangeable between the web PWA and the Electron
          desktop build. Export from one, import into the other to sync your
          data. The backup file contains everything needed to recreate your
          ALTER EGO experience on a different platform or machine.
        </InfoBox>
      </Section>
    </Container>
  );
};

export default DataManagement;
