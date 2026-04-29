/**
 * Experiment Pipeline - WebSocket Collector
 *
 * Connects to the ALTER EGO Electron app's telemetry relay WebSocket and
 * routes incoming events to the SQLite store. Also writes a JSONL log file
 * for redundancy and human-readable inspection.
 */

import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { TelemetryStore } from './store';

const WS_URL = 'ws://127.0.0.1:45677';
const RECONNECT_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15000;

export class TelemetryCollector {
  private ws: WebSocket | null = null;
  private store: TelemetryStore;
  private logStream: fs.WriteStream;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private running = false;
  private eventsReceived = 0;
  private connectionAttempts = 0;

  constructor(store: TelemetryStore, logDir?: string) {
    this.store = store;
    const dir = logDir ?? path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const logFile = path.join(
      dir,
      `telemetry-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.jsonl`
    );
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
    console.log(`[Collector] JSONL log: ${logFile}`);
  }

  /** Begin collecting. Connects to the WebSocket and auto-reconnects. */
  start(): void {
    this.running = true;
    this.connect();
  }

  /** Stop collecting and close resources. */
  stop(): void {
    this.running = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.logStream.end();
  }

  get stats() {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      eventsReceived: this.eventsReceived,
      connectionAttempts: this.connectionAttempts,
    };
  }

  private connect(): void {
    if (!this.running) return;
    this.connectionAttempts++;

    try {
      this.ws = new WebSocket(WS_URL);
    } catch (err) {
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log(`[Collector] Connected to ALTER EGO telemetry relay at ${WS_URL}`);
      this.connectionAttempts = 0;
      this.startHeartbeat();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const raw = data.toString('utf-8');
        const event = JSON.parse(raw);
        this.eventsReceived++;

        // Write to JSONL log
        this.logStream.write(raw + '\n');

        // Route to appropriate store table
        this.routeEvent(event);

        // Periodic status to console
        if (this.eventsReceived % 10 === 0) {
          console.log(`[Collector] ${this.eventsReceived} events collected`);
        }
      } catch (err) {
        console.error('[Collector] Failed to parse event:', err);
      }
    });

    this.ws.on('close', () => {
      console.log('[Collector] Connection closed');
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      // Suppress noisy ECONNREFUSED when the Electron app isn't running
      if ((err as any).code === 'ECONNREFUSED') {
        if (this.connectionAttempts <= 1 || this.connectionAttempts % 20 === 0) {
          console.log('[Collector] ALTER EGO not detected, waiting...');
        }
      } else {
        console.error('[Collector] WebSocket error:', err.message);
      }
    });
  }

  private scheduleReconnect(): void {
    if (!this.running) return;
    if (this.reconnectTimer) return; // already scheduled
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_INTERVAL_MS);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  /**
   * Route an incoming telemetry event to the appropriate store tables.
   * Every event goes to raw_events; typed events also go to their specific tables.
   */
  private routeEvent(event: any): void {
    const { eventId, timestamp, sessionId, persona, type, payload } = event;

    // Always persist to the raw catch-all
    this.store.insertRawEvent({ eventId, timestamp, sessionId, persona, type, payload });

    switch (type) {
      case 'query_start':
        this.store.insertQueryStart(sessionId, persona, timestamp, payload);
        break;

      case 'query_complete':
        this.store.updateQueryComplete(sessionId, timestamp, payload);
        break;

      case 'query_error':
        this.store.updateQueryError(sessionId, timestamp, payload.errorMessage ?? '');
        break;

      case 'emotion_analysis':
        this.store.insertEmotionAnalysis(sessionId, persona, timestamp, payload);
        break;

      case 'memory_retrieval':
        this.store.insertMemoryRetrieval(sessionId, persona, timestamp, payload);
        break;

      case 'association_update':
        this.store.insertAssociationEvent(sessionId, persona, timestamp, payload);
        break;

      case 'settings_snapshot':
        this.store.insertSettingsSnapshot(sessionId, persona, timestamp, payload);
        break;

      case 'session_start':
      case 'session_end':
        this.store.insertSession(sessionId, persona, type, timestamp, payload);
        break;

      default:
        // Unknown types still land in raw_events
        break;
    }
  }
}
