/**
 * LAN Service
 *
 * Renderer-side wrapper around the Electron LAN IPC bridge.
 * Provides type-safe access to LAN peer-to-peer functionality and
 * manages event subscriptions from the main process.
 *
 * All methods are no-ops when running outside Electron.
 */

import { isElectronEnvironment } from '../utils/electronUtils';
import { logger } from '../utils/logger';

// ── Types ──

export interface LanPeer {
  id: string;
  name: string;
  ip: string;
  port?: number;
  lastSeen?: number;
}

export interface LanStatus {
  isRunning: boolean;
  instanceId: string | null;
  isConnected: boolean;
  peer: { id: string; name: string } | null;
  role: 'initiator' | 'responder' | null;
  discoveredPeers: LanPeer[];
  localIPs: string[];
}

export interface LanPeerMessage {
  content: string;
  peerName: string;
  timestamp: string;
}

export interface LanConnectionInfo {
  peerId: string;
  peerName: string;
  role: 'initiator' | 'responder';
}

// ── Service Functions ──

/** Start LAN discovery and WebSocket server. */
export async function startLan(personaName: string): Promise<boolean> {
  if (!isElectronEnvironment()) return false;
  try {
    const result = await window.electronAPI!.lanStart(personaName);
    logger.debug(`[LAN] Started: ${result.instanceId}`);
    return result.success;
  } catch (err) {
    logger.error('[LAN] Failed to start:', err);
    return false;
  }
}

/** Stop all LAN networking. */
export async function stopLan(): Promise<void> {
  if (!isElectronEnvironment()) return;
  try {
    await window.electronAPI!.lanStop();
    logger.debug('[LAN] Stopped');
  } catch (err) {
    logger.error('[LAN] Failed to stop:', err);
  }
}

/** Get current LAN status. */
export async function getLanStatus(): Promise<LanStatus | null> {
  if (!isElectronEnvironment()) return null;
  try {
    return await window.electronAPI!.lanGetStatus();
  } catch {
    return null;
  }
}

/** Get discovered peers on the network. */
export async function getDiscoveredPeers(): Promise<LanPeer[]> {
  if (!isElectronEnvironment()) return [];
  try {
    return await window.electronAPI!.lanGetPeers();
  } catch {
    return [];
  }
}

/** Connect to a discovered peer. */
export async function connectToPeer(peerId: string): Promise<boolean> {
  if (!isElectronEnvironment()) return false;
  try {
    return await window.electronAPI!.lanConnect(peerId);
  } catch (err) {
    logger.error('[LAN] Connect failed:', err);
    return false;
  }
}

/** Disconnect from the currently connected peer. */
export async function disconnectFromPeer(): Promise<void> {
  if (!isElectronEnvironment()) return;
  try {
    await window.electronAPI!.lanDisconnect();
  } catch (err) {
    logger.error('[LAN] Disconnect failed:', err);
  }
}

/** Send a chat message to the connected peer. */
export async function sendMessageToPeer(content: string): Promise<boolean> {
  if (!isElectronEnvironment()) return false;
  try {
    return await window.electronAPI!.lanSendMessage(content);
  } catch {
    return false;
  }
}

/** Send a typing indicator to the connected peer. */
export async function sendTypingIndicator(): Promise<void> {
  if (!isElectronEnvironment()) return;
  try {
    await window.electronAPI!.lanSendTyping();
  } catch { /* best effort */ }
}

/** Update the persona name for LAN peer display. */
export function setLanPersona(name: string): void {
  if (!isElectronEnvironment()) return;
  window.electronAPI!.lanSetPersona(name);
}

/**
 * Subscribe to a LAN event from the main process.
 * Returns an unsubscribe function, or undefined if not in Electron.
 */
export function onLanEvent(
  channel: string,
  callback: (data: any) => void
): (() => void) | undefined {
  if (!isElectronEnvironment()) return undefined;
  return window.electronAPI!.onLanEvent(channel, callback);
}
