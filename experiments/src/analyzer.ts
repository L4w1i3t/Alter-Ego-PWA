/**
 * Experiment Pipeline - Analysis & Export Module
 *
 * Provides analysis routines that map to each experiment section in the paper,
 * plus CSV/JSON export for figure generation in pgfplots or Python notebooks.
 */

import { TelemetryStore } from './store';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';

const DEFAULT_EXPORT_BASE = path.join(__dirname, '..', 'exports');

/** Generate a filesystem-safe ISO timestamp string. */
function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export class Analyzer {
  private store: TelemetryStore;
  private exportDir: string;

  constructor(store: TelemetryStore, exportDir?: string) {
    this.store = store;
    // If the caller provides an explicit dir, use it as-is (no timestamp nesting).
    // Otherwise, each exportAll() call will create a timestamped subfolder.
    this.exportDir = exportDir ?? DEFAULT_EXPORT_BASE;
  }

  /** Print a summary of collected data to the console. */
  printStatus(): void {
    const stats = this.store.getCollectionStats();
    console.log('\n====== ALTER EGO Experiment Pipeline - Collection Status ======');
    console.log(`  Database:          ${this.store.dbPath}`);
    console.log(`  Total raw events:  ${stats.totalEvents}`);
    console.log(`  Queries:           ${stats.totalQueries}`);
    console.log(`  Emotion analyses:  ${stats.totalEmotions}`);
    console.log(`  Memory retrievals: ${stats.totalMemRetrieval}`);
    console.log(`  Association events:${stats.totalAssocEvents}`);
    console.log(`  Unique personas:   ${stats.uniquePersonas}`);
    console.log(`  Unique models:     ${stats.uniqueModels}`);
    console.log(`  Date range:        ${stats.dateRange.earliest ?? 'N/A'} to ${stats.dateRange.latest ?? 'N/A'}`);
    console.log('='.repeat(60));

    // Event breakdown
    const counts = this.store.getEventCounts();
    if (Object.keys(counts).length > 0) {
      console.log('\n  Event type breakdown:');
      for (const [type, count] of Object.entries(counts)) {
        console.log(`    ${type.padEnd(20)} ${count}`);
      }
    }

    // Emotion distribution
    const emotions = this.store.getEmotionDistribution();
    if (emotions.length > 0) {
      console.log('\n  Avatar emotion distribution (top 10):');
      for (const e of emotions.slice(0, 10)) {
        console.log(`    ${e.emotion.padEnd(20)} ${e.count}`);
      }
    }

    // Latency by model
    const latency = this.store.getLatencyByModel();
    if (latency.length > 0) {
      console.log('\n  Latency by model:');
      for (const l of latency) {
        console.log(`    ${l.model.padEnd(20)} n=${l.count} avg=${l.avg_ms}ms min=${l.min_ms}ms max=${l.max_ms}ms`);
      }
    }

    console.log('');
  }

  // ── Experiment-Specific Analyses ────────────────────────────────────────

  /**
   * Sec 5.1: Affect heuristic analysis.
   * Exports per-query emotion data for offline scoring against GoEmotions/EmoBank.
   */
  exportAffectData(): string {
    ensureDir(this.exportDir);
    const rows = this.store.exportEmotions();
    const csvPath = path.join(this.exportDir, 'affect_analysis.csv');

    // Flatten JSON columns for CSV readability
    const flat = rows.map((r: any) => ({
      session_id: r.session_id,
      persona: r.persona,
      timestamp: r.timestamp,
      avatar_emotion: r.avatar_emotion,
      user_primary_emotion: r.user_primary_emotion,
      response_primary_emotion: r.response_primary_emotion,
      user_input_preview: (r.user_input ?? '').slice(0, 200),
      ai_response_preview: (r.ai_response ?? '').slice(0, 200),
      emotional_trajectory: r.emotional_trajectory,
    }));

    const csv = stringify(flat, { header: true });
    fs.writeFileSync(csvPath, csv);
    console.log(`[Export] Affect data -> ${csvPath} (${rows.length} rows)`);

    // Also export full JSON with score distributions
    const jsonPath = path.join(this.exportDir, 'affect_analysis_full.json');
    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
    console.log(`[Export] Affect data (full JSON) -> ${jsonPath}`);

    return csvPath;
  }

  /**
   * Sec 5.2: Working-memory ablation data.
   * Groups queries by memory_buffer setting and exports recall-related metrics.
   */
  exportWorkingMemoryAblation(): string {
    ensureDir(this.exportDir);
    const data = this.store.getContextSizeByBuffer();
    const csvPath = path.join(this.exportDir, 'wm_ablation.csv');
    const csv = stringify(data, { header: true });
    fs.writeFileSync(csvPath, csv);
    console.log(`[Export] WM ablation data -> ${csvPath} (${data.length} rows)`);
    return csvPath;
  }

  /**
   * Sec 5.3: Forgetting-curve data.
   * Exports association salience snapshots over time for curve fitting.
   */
  exportForgettingCurveData(persona?: string): string {
    ensureDir(this.exportDir);
    const timeline = this.store.getAssociationTimeline(persona);

    // Flatten: one row per association per timestamp
    const flat: Array<Record<string, unknown>> = [];
    for (const entry of timeline) {
      let associations: any[];
      try { associations = JSON.parse(entry.associations_json); } catch { continue; }
      for (const a of associations) {
        flat.push({
          timestamp: entry.timestamp,
          left: a.left,
          right: a.right,
          salience: a.salience,
          strength: a.strength,
          exposures: a.exposures,
          days_since_created: a.daysSinceCreated?.toFixed(2) ?? '',
          days_since_last_used: a.daysSinceLastUsed?.toFixed(2) ?? '',
          days_since_reinforced: a.daysSinceReinforced?.toFixed(2) ?? '',
        });
      }
    }

    const csvPath = path.join(this.exportDir, 'forgetting_curve.csv');
    const csv = stringify(flat, { header: true });
    fs.writeFileSync(csvPath, csv);
    console.log(`[Export] Forgetting curve data -> ${csvPath} (${flat.length} rows)`);
    return csvPath;
  }

  /**
   * Sec 5.4: Mood-congruent retrieval analysis.
   * Exports joined query + emotion + memory data for congruence analysis.
   */
  exportMoodCongruenceData(): string {
    ensureDir(this.exportDir);
    const data = this.store.getMoodCongruenceData();
    const csvPath = path.join(this.exportDir, 'mood_congruence.csv');

    const flat = data.map((r: any) => ({
      session_id: r.session_id,
      persona: r.persona,
      avatar_emotion: r.avatar_emotion,
      user_primary_emotion: r.user_primary_emotion,
      user_input_preview: (r.user_input ?? '').slice(0, 200),
      ai_response_preview: (r.ai_response ?? '').slice(0, 200),
      episodic_result_count: r.episodic_result_count,
      user_emotion_scores: r.user_emotion_scores,
      response_emotion_scores: r.response_emotion_scores,
    }));

    const csv = stringify(flat, { header: true });
    fs.writeFileSync(csvPath, csv);
    console.log(`[Export] Mood congruence data -> ${csvPath} (${data.length} rows)`);

    const jsonPath = path.join(this.exportDir, 'mood_congruence.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    return csvPath;
  }

  /**
   * Sec 5.5: Latency and token usage.
   * Exports per-query latency/token data stratified by model.
   */
  exportLatencyTokenData(): string {
    ensureDir(this.exportDir);
    const rows = this.store.exportQueries();
    const csvPath = path.join(this.exportDir, 'latency_tokens.csv');

    const flat = rows.map((r: any) => ({
      session_id: r.session_id,
      persona: r.persona,
      model: r.model,
      timestamp_start: r.timestamp_start,
      timestamp_end: r.timestamp_end,
      latency_ms: r.latency_ms,
      prompt_tokens: r.prompt_tokens,
      completion_tokens: r.completion_tokens,
      total_tokens: r.total_tokens,
      input_char_count: r.input_char_count,
      input_word_count: r.input_word_count,
      response_char_count: r.response_char_count,
      response_word_count: r.response_word_count,
      memory_buffer: r.memory_buffer,
      temperature: r.temperature,
      error: r.error_message ?? '',
    }));

    const csv = stringify(flat, { header: true });
    fs.writeFileSync(csvPath, csv);
    console.log(`[Export] Latency & token data -> ${csvPath} (${rows.length} rows)`);
    return csvPath;
  }

  /**
   * Export everything into a timestamped subfolder under exportDir.
   * Also updates a `latest` folder (copy) so scripts can always find the most recent export.
   */
  exportAll(): string {
    // Create a timestamped subfolder: exports/2026-03-20T21-32-00-123/
    const slug = timestampSlug();
    const snapshotDir = path.join(this.exportDir, slug);
    ensureDir(snapshotDir);

    // Temporarily point individual exporters at the snapshot directory
    const prevDir = this.exportDir;
    this.exportDir = snapshotDir;

    console.log(`\nExporting all experiment data to ${snapshotDir}\n`);
    this.exportAffectData();
    this.exportWorkingMemoryAblation();
    this.exportForgettingCurveData();
    this.exportMoodCongruenceData();
    this.exportLatencyTokenData();

    // Dump raw events as JSON for archival
    const rawPath = path.join(snapshotDir, 'raw_events.json');
    const rawEvents = this.store.exportRawEvents();
    fs.writeFileSync(rawPath, JSON.stringify(rawEvents, null, 2));
    console.log(`[Export] Raw events -> ${rawPath} (${rawEvents.length} events)`);

    // Write a small metadata file with export context
    const meta = {
      exportedAt: new Date().toISOString(),
      slug,
      stats: this.store.getCollectionStats(),
    };
    fs.writeFileSync(path.join(snapshotDir, 'export_meta.json'), JSON.stringify(meta, null, 2));

    // Update the "latest" symlink/directory so consumers can always reference it
    const latestDir = path.join(prevDir, 'latest');
    try {
      // On Windows, junctions/symlinks can be unreliable -- use a plain text pointer
      fs.writeFileSync(path.join(prevDir, 'latest.txt'), slug);
      // Also mirror the snapshot to a `latest` folder for direct access
      if (fs.existsSync(latestDir)) fs.rmSync(latestDir, { recursive: true, force: true });
      fs.cpSync(snapshotDir, latestDir, { recursive: true });
      console.log(`[Export] Updated latest/ -> ${slug}`);
    } catch (err) {
      // Non-critical; the timestamped folder is the source of truth
      console.warn(`[Export] Could not update latest pointer: ${err}`);
    }

    // Restore
    this.exportDir = prevDir;

    console.log(`\nExport complete: ${snapshotDir}\n`);
    return snapshotDir;
  }
}
