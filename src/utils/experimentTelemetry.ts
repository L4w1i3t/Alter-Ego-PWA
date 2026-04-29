/**
 * Experiment Telemetry Emitter
 *
 * Captures rich per-interaction telemetry from the ALTER EGO renderer process
 * and forwards it to the Electron main process via IPC for relay to the
 * external experiment pipeline. When running outside Electron (plain PWA),
 * events are buffered in-memory and can be exported manually.
 *
 * Data emitted here maps directly to the paper's experiment subsections:
 *   - Affect heuristic output   (Sec 5.1)
 *   - Working-memory context    (Sec 5.2)
 *   - Associative salience      (Sec 5.3)
 *   - Mood-congruent retrieval  (Sec 5.4)
 *   - Latency & token usage     (Sec 5.5)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface TelemetryEvent {
  /** Monotonically increasing event ID within this session */
  eventId: number;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Unique session ID from tokenTracker (query_<epoch>_<rand>) */
  sessionId: string;
  /** Active persona at the time of the event */
  persona: string;
  /** Discriminated union tag */
  type:
    | 'query_start'
    | 'query_complete'
    | 'query_error'
    | 'emotion_analysis'
    | 'memory_retrieval'
    | 'association_update'
    | 'settings_snapshot'
    | 'session_start'
    | 'session_end';
  /** Type-specific payload */
  payload: Record<string, unknown>;
}

export interface QueryStartPayload {
  userInput: string;
  inputTokenEstimate: number;
  inputCharCount: number;
  inputWordCount: number;
  imageCount: number;
  memoryBufferSize: number;
  model: string;
  temperature: number;
  maxTokens: number;
  autonomous?: boolean;
}

export interface QueryCompletePayload {
  userInput: string;
  aiResponse: string;
  responseCharCount: number;
  responseWordCount: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  autonomous?: boolean;
}

export interface EmotionAnalysisPayload {
  userInput: string;
  aiResponse: string;
  avatarEmotion: string;
  userPrimaryEmotion: string;
  responsePrimaryEmotion: string;
  /** Full scored distribution: { emotion: confidence } */
  userEmotionScores: Record<string, number>;
  responseEmotionScores: Record<string, number>;
  /** String labels like "JOY (67%)" */
  userEmotionLabels: string[];
  responseEmotionLabels: string[];
  emotionalTrajectory: string;
  autonomous?: boolean;
}

export interface MemoryRetrievalPayload {
  query: string;
  /** Number of episodic (LTM) results returned */
  episodicResultCount: number;
  /** Top relevance scores from semantic search */
  episodicTopScores: number[];
  /** Number of associative facts injected into context */
  associationCount: number;
  /** Associations with their current salience values */
  associations: Array<{
    left: string;
    right: string;
    salience: number;
    strength: number;
    exposures: number;
    daysSinceCreated: number;
    daysSinceLastUsed: number;
    daysSinceReinforced: number;
  }>;
  /** Short-term context messages used */
  shortTermMessageCount: number;
  /** Working-memory summary injected (if any) */
  summaryInjected: boolean;
  summaryText: string;
  /** Total context messages sent to the model (excluding system prompt) */
  totalContextMessages: number;
}

export interface AssociationUpdatePayload {
  action: 'add' | 'reinforce' | 'touch' | 'prune';
  persona: string;
  associations: Array<{
    left: string;
    right: string;
    strength: number;
    salience: number;
    exposures: number;
  }>;
  totalAssociationCount: number;
}

export interface SettingsSnapshotPayload {
  model: string;
  temperature: number;
  maxTokens: number;
  memoryBuffer: number;
  persona: string;
  immersiveMode: boolean;
  animationsEnabled: boolean;
  compactMode: boolean;
  showTimestamps: boolean;
}

// ── Singleton Emitter ────────────────────────────────────────────────────────

class ExperimentTelemetry {
  private eventCounter = 0;
  private buffer: TelemetryEvent[] = [];
  private sessionStartTime = Date.now();
  /** Cap the in-memory buffer to prevent runaway memory usage */
  private static readonly MAX_BUFFER = 10_000;

  /** Emit a telemetry event. Forwards to Electron IPC if available, else buffers. */
  emit(
    type: TelemetryEvent['type'],
    sessionId: string,
    persona: string,
    payload: Record<string, unknown>
  ): void {
    const event: TelemetryEvent = {
      eventId: ++this.eventCounter,
      timestamp: new Date().toISOString(),
      sessionId,
      persona,
      type,
      payload,
    };

    // Push to local buffer (ring-buffer style if full)
    if (this.buffer.length >= ExperimentTelemetry.MAX_BUFFER) {
      this.buffer.shift();
    }
    this.buffer.push(event);

    // Forward via Electron IPC if available
    if (window.electronAPI?.emitTelemetry) {
      try {
        window.electronAPI.emitTelemetry(event);
      } catch {
        // IPC not ready or unavailable; event is still in the buffer
      }
    }
  }

  /** Convenience: emit a query_start event. */
  emitQueryStart(
    sessionId: string,
    persona: string,
    data: QueryStartPayload
  ): void {
    this.emit('query_start', sessionId, persona, data as unknown as Record<string, unknown>);
  }

  /** Convenience: emit a query_complete event with timing. */
  emitQueryComplete(
    sessionId: string,
    persona: string,
    data: QueryCompletePayload
  ): void {
    this.emit('query_complete', sessionId, persona, data as unknown as Record<string, unknown>);
  }

  /** Convenience: emit emotion analysis results. */
  emitEmotionAnalysis(
    sessionId: string,
    persona: string,
    data: EmotionAnalysisPayload
  ): void {
    this.emit('emotion_analysis', sessionId, persona, data as unknown as Record<string, unknown>);
  }

  /** Convenience: emit memory retrieval details. */
  emitMemoryRetrieval(
    sessionId: string,
    persona: string,
    data: MemoryRetrievalPayload
  ): void {
    this.emit('memory_retrieval', sessionId, persona, data as unknown as Record<string, unknown>);
  }

  /** Convenience: emit association mutation events. */
  emitAssociationUpdate(
    sessionId: string,
    persona: string,
    data: AssociationUpdatePayload
  ): void {
    this.emit('association_update', sessionId, persona, data as unknown as Record<string, unknown>);
  }

  /** Convenience: emit a snapshot of current settings. */
  emitSettingsSnapshot(
    sessionId: string,
    persona: string,
    data: SettingsSnapshotPayload
  ): void {
    this.emit('settings_snapshot', sessionId, persona, data as unknown as Record<string, unknown>);
  }

  /** Emit session lifecycle events. */
  emitSessionStart(persona: string): void {
    this.sessionStartTime = Date.now();
    this.emit('session_start', `session_${Date.now()}`, persona, {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      isElectron: !!window.electronAPI,
    });
  }

  emitSessionEnd(persona: string): void {
    this.emit('session_end', `session_${Date.now()}`, persona, {
      durationMs: Date.now() - this.sessionStartTime,
      totalEventsEmitted: this.eventCounter,
    });
  }

  /** Return all buffered events (for manual export when not using Electron). */
  getBuffer(): TelemetryEvent[] {
    return [...this.buffer];
  }

  /** Export buffer as a downloadable JSON file. */
  exportBuffer(): void {
    const blob = new Blob([JSON.stringify(this.buffer, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment-telemetry-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Clear the in-memory buffer. */
  clearBuffer(): void {
    this.buffer = [];
    this.eventCounter = 0;
  }
}

/** Global singleton -- import this from anywhere in the renderer. */
export const experimentTelemetry = new ExperimentTelemetry();
