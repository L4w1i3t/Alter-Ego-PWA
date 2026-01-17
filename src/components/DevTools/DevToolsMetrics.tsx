/**
 * Development Tools - Performance Metrics Monitor
 * Displays real-time FPS, memory usage, and token statistics
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getTokenUsageStats } from '../../utils/openaiApi';
import { migrateApiKeysIfNeeded } from '../../utils/storageUtils';

// Styled Components
const DevMetricsControl = styled.div<{ $collapsed?: boolean }>`
  position: fixed;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 20, 0, 0.8);
  border: 1px solid #0f0;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.8em;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  transition: all 0.3s ease;
  backdrop-filter: blur(2px);

  ${props =>
    props.$collapsed &&
    `
    padding: 8px;
    gap: 0;
    max-width: 50px;
    max-height: 50px;
    overflow: hidden;
  `}

  @media (max-width: 768px) {
    bottom: 70px;
    right: 10px;
    left: auto;
    max-width: calc(100vw - 20px);
    font-size: 0.75em;
    padding: 10px;
    opacity: 0.95;
    border-width: 2px;

    ${props =>
      props.$collapsed &&
      `
      left: auto;
      right: 10px;
      max-width: 50px;
      max-height: 50px;
      padding: 8px;
    `}
  }
`;

const CollapseButton = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-family: monospace;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  align-self: flex-end;
  margin-bottom: 5px;
  min-width: 24px;
  min-height: 24px;
  position: relative;

  &:hover {
    background: #0f0;
    color: #000;
    box-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    font-size: 16px;
    margin-bottom: 3px;
    border-width: 2px;
  }
`;

const DevMetricsContent = styled.div<{ $collapsed?: boolean }>`
  display: ${props => (props.$collapsed ? 'none' : 'flex')};
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.3s ease;
`;

const DevButton = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 3px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: monospace;
  transition: all 0.2s ease;

  &:hover {
    background: #0f0;
    color: #000;
    box-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
  }
`;

const MetricsTitle = styled.div`
  font-size: 12px;
  color: #0f0;
  text-align: center;
  font-weight: bold;
  border-bottom: 1px solid #0f0;
  padding-bottom: 5px;
  margin-bottom: 5px;
`;

const MetricsRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 2px 0;
`;

const MetricsLabel = styled.span`
  color: #0f0;
`;

const MetricsValue = styled.span`
  color: #fff;
  font-weight: bold;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 5px;
`;

const HotkeyInfo = styled.div`
  margin-top: 5px;
  color: #0f0;
  font-size: 10px;
  text-align: center;
  opacity: 0.8;
`;

const PerformanceIndicator = styled.div<{ value: number }>`
  width: 100%;
  height: 4px;
  background: #003300;
  margin-top: 2px;
  border-radius: 2px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => Math.min(100, props.value)}%;
    background: ${props =>
      props.value > 80
        ? '#00ff00'
        : props.value > 50
          ? '#aaff00'
          : props.value > 30
            ? '#ffaa00'
            : '#ff3300'};
    transition:
      width 0.5s ease,
      background 0.5s ease;
  }
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: #0f0;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;

  &:hover {
    text-decoration: underline;
  }
`;

// Component Props
interface DevToolsMetricsProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onGenerateReport: () => void;
  onClearMetrics: () => void;
  onExportDb: () => void;
}

// LiveMetrics component to show real-time performance data
const LiveMetrics: React.FC<{ expanded: boolean; onToggle: () => void }> = ({
  expanded,
  onToggle,
}) => {
  const [fps, setFps] = useState<number>(0);
  const [memory, setMemory] = useState<{
    used: number;
    total: number;
    percent: number;
  }>({
    used: 0,
    total: 0,
    percent: 0,
  });
  const [tokenStats, setTokenStats] = useState<{
    total: number;
    byModel: Record<string, number>;
  }>({
    total: 0,
    byModel: {},
  });

  // Update metrics using shared tracking with performance monitor
  useEffect(() => {
    // Migrate legacy encrypted API keys to plaintext JSON for reliable reads
    migrateApiKeysIfNeeded();

    let rafId: number;
    let memoryIntervalId: number;

    // Synchronize with the FPS tracking in performanceMetrics.ts
    const updateStats = () => {
      // Access the FPS from the external performanceMetrics value
      if (window.ALTER_EGO_METRICS) {
        setFps(window.ALTER_EGO_METRICS.currentFPS || 0);
      }

      rafId = requestAnimationFrame(updateStats);
    };

    // Start animation frame loop for smooth updates
    rafId = requestAnimationFrame(updateStats);

    // Update memory and token stats on interval
    memoryIntervalId = window.setInterval(() => {
      // Update memory stats
      const memory = (performance as any).memory;
      if (memory) {
        const used = Math.round(memory.usedJSHeapSize / (1024 * 1024));
        const total = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
        const percent = Math.round(
          (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        );

        setMemory({ used, total, percent });
      }

      // Update token usage stats
      setTokenStats(getTokenUsageStats());
    }, 1000);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(memoryIntervalId);
    };
  }, []);

  return (
    <>
      <MetricsTitle>ALTER EGO Performance Monitor</MetricsTitle>

      <MetricsRow>
        <MetricsLabel>FPS:</MetricsLabel>
        <MetricsValue>{fps}</MetricsValue>
      </MetricsRow>
      <PerformanceIndicator value={fps > 60 ? 100 : (fps / 60) * 100} />

      <MetricsRow>
        <MetricsLabel>Memory:</MetricsLabel>
        <MetricsValue>
          {memory.used} MB / {memory.total} MB
        </MetricsValue>
      </MetricsRow>
      <PerformanceIndicator value={100 - memory.percent} />

      <MetricsRow>
        <MetricsLabel>Tokens Used:</MetricsLabel>
        <MetricsValue>{tokenStats.total.toLocaleString()}</MetricsValue>
      </MetricsRow>

      {expanded && (
        <>
          <MetricsTitle>Token Usage by Model</MetricsTitle>
          {Object.entries(tokenStats.byModel).map(([model, count]) => (
            <MetricsRow key={model}>
              <MetricsLabel>{model}:</MetricsLabel>
              <MetricsValue>{count.toLocaleString()}</MetricsValue>
            </MetricsRow>
          ))}

          <MetricsTitle>System Info</MetricsTitle>
          <MetricsRow>
            <MetricsLabel>Screen:</MetricsLabel>
            <MetricsValue>
              {window.innerWidth}x{window.innerHeight}
            </MetricsValue>
          </MetricsRow>
          <MetricsRow>
            <MetricsLabel>Platform:</MetricsLabel>
            <MetricsValue>{navigator.platform}</MetricsValue>
          </MetricsRow>
        </>
      )}

      <ExpandButton onClick={onToggle}>
        {expanded ? '▼ Show Less' : '▲ Show More'}
      </ExpandButton>
    </>
  );
};

// Main DevTools Component
export const DevToolsMetrics: React.FC<DevToolsMetricsProps> = ({
  collapsed,
  onToggleCollapse,
  onGenerateReport,
  onClearMetrics,
  onExportDb,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <DevMetricsControl $collapsed={collapsed}>
      <CollapseButton
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand Performance Monitor' : 'Collapse Performance Monitor'}
      >
        {collapsed ? '▼' : '▲'}
      </CollapseButton>
      <DevMetricsContent $collapsed={collapsed}>
        <LiveMetrics expanded={expanded} onToggle={() => setExpanded(!expanded)} />

        <ButtonRow>
          <DevButton onClick={onGenerateReport}>Generate Metrics Report</DevButton>
        </ButtonRow>
        <ButtonRow>
          <DevButton onClick={onClearMetrics}>Clear Metrics</DevButton>
        </ButtonRow>
        <ButtonRow>
          <DevButton onClick={onExportDb}>Export Dexie DB</DevButton>
        </ButtonRow>

        <HotkeyInfo>
          Hotkey: Ctrl+Alt+P
          <br />
          Clear metrics: Ctrl+Alt+M
          <br />
          Toggle panel: Ctrl+Shift+D
          <br />
          Collapse/Expand: Ctrl+Shift+C
        </HotkeyInfo>
      </DevMetricsContent>
    </DevMetricsControl>
  );
};

export default DevToolsMetrics;
