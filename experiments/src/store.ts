/**
 * Experiment Pipeline - SQLite Data Store (sql.js / pure WASM)
 *
 * All telemetry events are persisted to a local SQLite database with tables
 * designed to support every experiment outlined in the paper. The schema is
 * intentionally denormalized for analysis convenience -- each event type
 * gets its own table with typed columns, plus a raw_events catch-all.
 *
 * Uses sql.js (Emscripten-compiled SQLite) so no native compilation is needed.
 * The database is loaded from disk on init and flushed back after each write.
 */

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DEFAULT_DB_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_DB_FILE = 'experiment_telemetry.db';

export class TelemetryStore {
  private db!: SqlJsDatabase;
  readonly dbPath: string;
  private _ready = false;
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;
  private _dirty = false;

  /** Use TelemetryStore.open() to create instances. */
  private constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /** Async factory: initializes WASM, loads/creates the database, runs schema. */
  static async open(dbDir?: string): Promise<TelemetryStore> {
    const dir = dbDir ?? DEFAULT_DB_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const dbPath = path.join(dir, DEFAULT_DB_FILE);
    const store = new TelemetryStore(dbPath);

    const SQL = await initSqlJs();

    // Load existing database from disk if present
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      store.db = new SQL.Database(buffer);
    } else {
      store.db = new SQL.Database();
    }

    store.initSchema();
    store._ready = true;

    // Auto-flush every 5 seconds if dirty
    store._saveTimer = setInterval(() => {
      if (store._dirty) store.flush();
    }, 5000);

    return store;
  }

  get ready(): boolean { return this._ready; }

  /** Write current database state to disk. */
  flush(): void {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
    this._dirty = false;
  }

  /** Mark database as modified (will be flushed on next interval or close). */
  private markDirty(): void {
    this._dirty = true;
  }

  // Helper: run a parameterized INSERT/UPDATE and mark dirty
  private run(sql: string, params: unknown[]): void {
    this.db.run(sql, params as any[]);
    this.markDirty();
  }

  // Helper: run a parameterized SELECT and return rows as objects
  private query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    if (params.length > 0) stmt.bind(params as any[]);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  // Helper: run a SELECT and return a single row
  private queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    const rows = this.query<T>(sql, params);
    return rows[0];
  }

  private initSchema(): void {
    this.db.exec(`
      -- Catch-all table: every event as raw JSON
      CREATE TABLE IF NOT EXISTS raw_events (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id      INTEGER NOT NULL,
        timestamp     TEXT    NOT NULL,
        session_id    TEXT    NOT NULL,
        persona       TEXT    NOT NULL,
        event_type    TEXT    NOT NULL,
        payload_json  TEXT    NOT NULL,
        ingested_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_raw_ts       ON raw_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_raw_session  ON raw_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_raw_type     ON raw_events(event_type);

      -- Sec 5.5: Query-level latency and token usage
      CREATE TABLE IF NOT EXISTS queries (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id        TEXT    NOT NULL UNIQUE,
        persona           TEXT    NOT NULL,
        timestamp_start   TEXT,
        timestamp_end     TEXT,
        user_input        TEXT,
        ai_response       TEXT,
        input_char_count  INTEGER,
        input_word_count  INTEGER,
        response_char_count INTEGER,
        response_word_count INTEGER,
        image_count       INTEGER DEFAULT 0,
        model             TEXT,
        temperature       REAL,
        max_tokens        INTEGER,
        memory_buffer     INTEGER,
        latency_ms        INTEGER,
        prompt_tokens     INTEGER,
        completion_tokens INTEGER,
        total_tokens      INTEGER,
        error_message     TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_q_persona ON queries(persona);
      CREATE INDEX IF NOT EXISTS idx_q_model   ON queries(model);

      -- Sec 5.1: Emotion analysis per query
      CREATE TABLE IF NOT EXISTS emotion_analyses (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id              TEXT    NOT NULL,
        persona                 TEXT    NOT NULL,
        timestamp               TEXT    NOT NULL,
        user_input              TEXT,
        ai_response             TEXT,
        avatar_emotion          TEXT,
        user_primary_emotion    TEXT,
        response_primary_emotion TEXT,
        user_emotion_scores     TEXT,   -- JSON: { emotion: confidence }
        response_emotion_scores TEXT,   -- JSON
        user_emotion_labels     TEXT,   -- JSON array of "EMOTION (XX%)"
        response_emotion_labels TEXT,   -- JSON array
        emotional_trajectory    TEXT,
        FOREIGN KEY (session_id) REFERENCES queries(session_id)
      );
      CREATE INDEX IF NOT EXISTS idx_emo_session ON emotion_analyses(session_id);
      CREATE INDEX IF NOT EXISTS idx_emo_avatar  ON emotion_analyses(avatar_emotion);

      -- Sec 5.3 & 5.4: Memory retrieval context per query
      CREATE TABLE IF NOT EXISTS memory_retrievals (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id              TEXT    NOT NULL,
        persona                 TEXT    NOT NULL,
        timestamp               TEXT    NOT NULL,
        query_text              TEXT,
        episodic_result_count   INTEGER,
        association_count       INTEGER,
        associations_json       TEXT,   -- JSON array of association snapshots
        short_term_msg_count    INTEGER,
        summary_injected        INTEGER, -- boolean
        summary_text            TEXT,
        total_context_messages  INTEGER,
        FOREIGN KEY (session_id) REFERENCES queries(session_id)
      );
      CREATE INDEX IF NOT EXISTS idx_mem_session ON memory_retrievals(session_id);

      -- Sec 5.3: Association-level mutations (add, reinforce, prune)
      CREATE TABLE IF NOT EXISTS association_events (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id              TEXT    NOT NULL,
        persona                 TEXT    NOT NULL,
        timestamp               TEXT    NOT NULL,
        action                  TEXT    NOT NULL,  -- add | reinforce | touch | prune
        associations_json       TEXT,
        total_association_count INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_assoc_action ON association_events(action);

      -- Sec 5.2: Settings snapshots for ablation tracing
      CREATE TABLE IF NOT EXISTS settings_snapshots (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id        TEXT NOT NULL,
        persona           TEXT NOT NULL,
        timestamp         TEXT NOT NULL,
        model             TEXT,
        temperature       REAL,
        max_tokens        INTEGER,
        memory_buffer     INTEGER,
        immersive_mode    INTEGER,
        animations_enabled INTEGER,
        compact_mode      INTEGER,
        show_timestamps   INTEGER
      );

      -- Session-level lifecycle
      CREATE TABLE IF NOT EXISTS sessions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id      TEXT    NOT NULL,
        persona         TEXT    NOT NULL,
        event_type      TEXT    NOT NULL, -- session_start | session_end
        timestamp       TEXT    NOT NULL,
        details_json    TEXT
      );
    `);
  }

  /** Insert any event into the raw catch-all table. */
  insertRawEvent(event: {
    eventId: number;
    timestamp: string;
    sessionId: string;
    persona: string;
    type: string;
    payload: Record<string, unknown>;
  }): void {
    this.run(
      `INSERT INTO raw_events (event_id, timestamp, session_id, persona, event_type, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [event.eventId, event.timestamp, event.sessionId, event.persona, event.type, JSON.stringify(event.payload)]
    );
  }

  /** Insert a query_start event, creating the queries row. */
  insertQueryStart(sessionId: string, persona: string, timestamp: string, payload: Record<string, unknown>): void {
    this.run(
      `INSERT OR IGNORE INTO queries
        (session_id, persona, timestamp_start, user_input, input_char_count, input_word_count,
         image_count, model, temperature, max_tokens, memory_buffer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId, persona, timestamp,
        payload.userInput ?? '',
        payload.inputCharCount ?? 0,
        payload.inputWordCount ?? 0,
        payload.imageCount ?? 0,
        payload.model ?? '',
        payload.temperature ?? 0,
        payload.maxTokens ?? 0,
        payload.memoryBufferSize ?? 0,
      ]
    );
  }

  /** Update the queries row with completion data. */
  updateQueryComplete(sessionId: string, timestamp: string, payload: Record<string, unknown>): void {
    this.run(
      `UPDATE queries SET
        timestamp_end = ?,
        ai_response = ?,
        response_char_count = ?,
        response_word_count = ?,
        latency_ms = ?,
        prompt_tokens = ?,
        completion_tokens = ?,
        total_tokens = ?
       WHERE session_id = ?`,
      [
        timestamp,
        payload.aiResponse ?? '',
        payload.responseCharCount ?? 0,
        payload.responseWordCount ?? 0,
        payload.latencyMs ?? 0,
        payload.promptTokens ?? 0,
        payload.completionTokens ?? 0,
        payload.totalTokens ?? 0,
        sessionId,
      ]
    );
  }

  /** Record a query error. */
  updateQueryError(sessionId: string, timestamp: string, errorMessage: string): void {
    this.run(
      `UPDATE queries SET timestamp_end = ?, error_message = ? WHERE session_id = ?`,
      [timestamp, errorMessage, sessionId]
    );
  }

  /** Insert emotion analysis data. */
  insertEmotionAnalysis(sessionId: string, persona: string, timestamp: string, payload: Record<string, unknown>): void {
    this.run(
      `INSERT INTO emotion_analyses
        (session_id, persona, timestamp, user_input, ai_response,
         avatar_emotion, user_primary_emotion, response_primary_emotion,
         user_emotion_scores, response_emotion_scores,
         user_emotion_labels, response_emotion_labels, emotional_trajectory)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId, persona, timestamp,
        payload.userInput ?? '',
        payload.aiResponse ?? '',
        payload.avatarEmotion ?? '',
        payload.userPrimaryEmotion ?? '',
        payload.responsePrimaryEmotion ?? '',
        JSON.stringify(payload.userEmotionScores ?? {}),
        JSON.stringify(payload.responseEmotionScores ?? {}),
        JSON.stringify(payload.userEmotionLabels ?? []),
        JSON.stringify(payload.responseEmotionLabels ?? []),
        payload.emotionalTrajectory ?? '',
      ]
    );
  }

  /** Insert memory retrieval context. */
  insertMemoryRetrieval(sessionId: string, persona: string, timestamp: string, payload: Record<string, unknown>): void {
    this.run(
      `INSERT INTO memory_retrievals
        (session_id, persona, timestamp, query_text, episodic_result_count,
         association_count, associations_json, short_term_msg_count,
         summary_injected, summary_text, total_context_messages)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId, persona, timestamp,
        payload.query ?? '',
        payload.episodicResultCount ?? 0,
        payload.associationCount ?? 0,
        JSON.stringify(payload.associations ?? []),
        payload.shortTermMessageCount ?? 0,
        payload.summaryInjected ? 1 : 0,
        payload.summaryText ?? '',
        payload.totalContextMessages ?? 0,
      ]
    );
  }

  /** Insert association mutation event. */
  insertAssociationEvent(sessionId: string, persona: string, timestamp: string, payload: Record<string, unknown>): void {
    this.run(
      `INSERT INTO association_events
        (session_id, persona, timestamp, action, associations_json, total_association_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId, persona, timestamp,
        payload.action ?? '',
        JSON.stringify(payload.associations ?? []),
        payload.totalAssociationCount ?? 0,
      ]
    );
  }

  /** Insert settings snapshot. */
  insertSettingsSnapshot(sessionId: string, persona: string, timestamp: string, payload: Record<string, unknown>): void {
    this.run(
      `INSERT INTO settings_snapshots
        (session_id, persona, timestamp, model, temperature, max_tokens,
         memory_buffer, immersive_mode, animations_enabled, compact_mode, show_timestamps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId, persona, timestamp,
        payload.model ?? '',
        payload.temperature ?? 0,
        payload.maxTokens ?? 0,
        payload.memoryBuffer ?? 0,
        payload.immersiveMode ? 1 : 0,
        payload.animationsEnabled ? 1 : 0,
        payload.compactMode ? 1 : 0,
        payload.showTimestamps ? 1 : 0,
      ]
    );
  }

  /** Insert session lifecycle event. */
  insertSession(sessionId: string, persona: string, eventType: string, timestamp: string, details: Record<string, unknown>): void {
    this.run(
      `INSERT INTO sessions (session_id, persona, event_type, timestamp, details_json)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, persona, eventType, timestamp, JSON.stringify(details)]
    );
  }

  // ── Analysis Queries ──────────────────────────────────────────────────────

  /** Return total event counts by type. */
  getEventCounts(): Record<string, number> {
    const rows = this.query<{ event_type: string; cnt: number }>(
      `SELECT event_type, COUNT(*) as cnt FROM raw_events GROUP BY event_type`
    );
    const result: Record<string, number> = {};
    for (const r of rows) result[r.event_type] = r.cnt;
    return result;
  }

  /** Sec 5.5: Latency statistics by model. */
  getLatencyByModel(): Array<{ model: string; count: number; avg_ms: number; median_ms: number; p95_ms: number; min_ms: number; max_ms: number }> {
    return this.query(`
      SELECT
        model,
        COUNT(*)                 AS count,
        ROUND(AVG(latency_ms))   AS avg_ms,
        latency_ms               AS median_ms,
        latency_ms               AS p95_ms,
        MIN(latency_ms)          AS min_ms,
        MAX(latency_ms)          AS max_ms
      FROM queries
      WHERE latency_ms IS NOT NULL AND error_message IS NULL
      GROUP BY model
    `);
  }

  /** Sec 5.1: Emotion distribution across all analyses. */
  getEmotionDistribution(): Array<{ emotion: string; count: number }> {
    return this.query(`
      SELECT avatar_emotion AS emotion, COUNT(*) AS count
      FROM emotion_analyses
      GROUP BY avatar_emotion
      ORDER BY count DESC
    `);
  }

  /** Sec 5.3: All association snapshots for salience-over-time analysis. */
  getAssociationTimeline(persona?: string): Array<{ timestamp: string; associations_json: string }> {
    if (persona) {
      return this.query(
        `SELECT timestamp, associations_json FROM memory_retrievals WHERE persona = ? ORDER BY timestamp`,
        [persona]
      );
    }
    return this.query(
      `SELECT timestamp, associations_json FROM memory_retrievals ORDER BY timestamp`
    );
  }

  /** Sec 5.2: Recall context size by memory buffer setting. */
  getContextSizeByBuffer(): Array<{ memory_buffer: number; avg_context: number; count: number }> {
    return this.query(`
      SELECT q.memory_buffer, ROUND(AVG(mr.total_context_messages)) AS avg_context, COUNT(*) AS count
      FROM queries q
      JOIN memory_retrievals mr ON q.session_id = mr.session_id
      WHERE q.memory_buffer IS NOT NULL
      GROUP BY q.memory_buffer
      ORDER BY q.memory_buffer
    `);
  }

  /** Sec 5.4: Queries with their emotion + memory data joined, for mood-congruent analysis. */
  getMoodCongruenceData(): Array<Record<string, unknown>> {
    return this.query(`
      SELECT
        q.session_id,
        q.persona,
        q.user_input,
        q.ai_response,
        ea.avatar_emotion,
        ea.user_primary_emotion,
        ea.user_emotion_scores,
        ea.response_emotion_scores,
        mr.associations_json,
        mr.episodic_result_count,
        mr.summary_text
      FROM queries q
      LEFT JOIN emotion_analyses ea ON q.session_id = ea.session_id
      LEFT JOIN memory_retrievals mr ON q.session_id = mr.session_id
      WHERE q.error_message IS NULL
      ORDER BY q.timestamp_start
    `);
  }

  /** Export all queries as flat objects for CSV. */
  exportQueries(): Array<Record<string, unknown>> {
    return this.query(`SELECT * FROM queries ORDER BY timestamp_start`);
  }

  /** Export all emotion analyses. */
  exportEmotions(): Array<Record<string, unknown>> {
    return this.query(`SELECT * FROM emotion_analyses ORDER BY timestamp`);
  }

  /** Export all raw events. */
  exportRawEvents(): Array<Record<string, unknown>> {
    return this.query(`SELECT * FROM raw_events ORDER BY timestamp`);
  }

  /** Get overall collection stats. */
  getCollectionStats(): {
    totalEvents: number;
    totalQueries: number;
    totalEmotions: number;
    totalMemRetrieval: number;
    totalAssocEvents: number;
    uniquePersonas: number;
    uniqueModels: number;
    dateRange: { earliest: string | null; latest: string | null };
  } {
    const total = (this.queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM raw_events`))?.c ?? 0;
    const queries = (this.queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM queries`))?.c ?? 0;
    const emotions = (this.queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM emotion_analyses`))?.c ?? 0;
    const mem = (this.queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM memory_retrievals`))?.c ?? 0;
    const assoc = (this.queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM association_events`))?.c ?? 0;
    const personas = (this.queryOne<{ c: number }>(`SELECT COUNT(DISTINCT persona) as c FROM raw_events`))?.c ?? 0;
    const models = (this.queryOne<{ c: number }>(`SELECT COUNT(DISTINCT model) as c FROM queries WHERE model IS NOT NULL`))?.c ?? 0;
    const dates = this.queryOne<{ earliest: string | null; latest: string | null }>(
      `SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM raw_events`
    );
    return {
      totalEvents: total,
      totalQueries: queries,
      totalEmotions: emotions,
      totalMemRetrieval: mem,
      totalAssocEvents: assoc,
      uniquePersonas: personas,
      uniqueModels: models,
      dateRange: { earliest: dates?.earliest ?? null, latest: dates?.latest ?? null },
    };
  }

  close(): void {
    if (this._saveTimer) clearInterval(this._saveTimer);
    this.flush(); // Final persist before closing
    this.db.close();
    this._ready = false;
  }
}
