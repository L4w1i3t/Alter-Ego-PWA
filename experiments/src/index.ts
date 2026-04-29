/**
 * ALTER EGO Experiment Pipeline - CLI Entry Point
 *
 * A standalone Node.js application that connects to the running ALTER EGO
 * Electron app via WebSocket, collects telemetry data aligned with the
 * paper's experiment sections, and provides analysis/export commands.
 *
 * Usage:
 *   npx ts-node src/index.ts collect   -- Start live data collection
 *   npx ts-node src/index.ts status    -- Print collection status/summary
 *   npx ts-node src/index.ts export    -- Export all data to CSV/JSON
 *   npx ts-node src/index.ts analyze   -- Print analysis overview
 */

import { Command } from 'commander';
import { TelemetryStore } from './store';
import { TelemetryCollector } from './collector';
import { Analyzer } from './analyzer';
import http from 'http';

const program = new Command();

program
  .name('alter-ego-experiments')
  .description('Experiment data collection and analysis pipeline for ALTER EGO')
  .version('0.1.0');

// ── collect: live telemetry collection ──────────────────────────────────────

program
  .command('collect')
  .description('Connect to running ALTER EGO and collect telemetry in real-time')
  .option('--db-dir <path>', 'Directory for SQLite database', undefined)
  .option('--log-dir <path>', 'Directory for JSONL logs', undefined)
  .action(async (opts) => {
    console.log('====== ALTER EGO Experiment Pipeline - Live Collection ======');
    console.log('Press Ctrl+C to stop collecting.\n');

    const store = await TelemetryStore.open(opts.dbDir);
    console.log(`[Store] Database: ${store.dbPath}`);

    const collector = new TelemetryCollector(store, opts.logDir);

    // Check if ALTER EGO is reachable before starting
    checkAlterEgoRunning().then(running => {
      if (running) {
        console.log('[Collector] ALTER EGO detected, connecting...\n');
      } else {
        console.log('[Collector] ALTER EGO not detected yet. Will auto-connect when it starts.\n');
      }
    });

    collector.start();

    // Periodic status line
    const statusInterval = setInterval(() => {
      const s = collector.stats;
      const dbStats = store.getCollectionStats();
      process.stdout.write(
        `\r[${new Date().toLocaleTimeString()}] ` +
        `Connected: ${s.connected ? 'YES' : 'NO'} | ` +
        `Events: ${s.eventsReceived} | ` +
        `Queries: ${dbStats.totalQueries} | ` +
        `Emotions: ${dbStats.totalEmotions}   `
      );
    }, 2000);

    // Graceful shutdown
    const shutdown = () => {
      console.log('\n\n[Pipeline] Shutting down...');
      clearInterval(statusInterval);
      collector.stop();

      // Print final stats
      const analyzer = new Analyzer(store);
      analyzer.printStatus();

      store.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });

// ── status: show collection summary ─────────────────────────────────────────

program
  .command('status')
  .description('Print collection status and data summary')
  .option('--db-dir <path>', 'Directory for SQLite database', undefined)
  .action(async (opts) => {
    const store = await TelemetryStore.open(opts.dbDir);
    const analyzer = new Analyzer(store);
    analyzer.printStatus();
    store.close();
  });

// ── export: dump all data to CSV/JSON ───────────────────────────────────────

program
  .command('export')
  .description('Export all experiment data to CSV and JSON files')
  .option('--db-dir <path>', 'Directory for SQLite database', undefined)
  .option('--out <path>', 'Output directory for exports', undefined)
  .action(async (opts) => {
    const store = await TelemetryStore.open(opts.dbDir);
    const analyzer = new Analyzer(store, opts.out);
    analyzer.exportAll();
    store.close();
  });

// ── analyze: detailed analysis ──────────────────────────────────────────────

program
  .command('analyze')
  .description('Run analysis routines and print results')
  .option('--db-dir <path>', 'Directory for SQLite database', undefined)
  .action(async (opts) => {
    const store = await TelemetryStore.open(opts.dbDir);
    const analyzer = new Analyzer(store);

    analyzer.printStatus();

    // Emotion distribution analysis
    const emotions = store.getEmotionDistribution();
    if (emotions.length > 0) {
      const total = emotions.reduce((s, e) => s + e.count, 0);
      console.log('\n--- Sec 5.1: Affect Heuristic Distribution ---');
      console.log(`Total emotion analyses: ${total}`);
      for (const e of emotions) {
        const pct = ((e.count / total) * 100).toFixed(1);
        const bar = '#'.repeat(Math.round((e.count / total) * 50));
        console.log(`  ${e.emotion.padEnd(20)} ${String(e.count).padStart(5)} (${pct.padStart(5)}%) ${bar}`);
      }
    }

    // Working-memory context analysis
    const wmData = store.getContextSizeByBuffer();
    if (wmData.length > 0) {
      console.log('\n--- Sec 5.2: Working-Memory Buffer vs Context Size ---');
      for (const w of wmData) {
        console.log(`  buffer=${w.memory_buffer}  avg_context=${w.avg_context}  n=${w.count}`);
      }
    }

    // Latency analysis
    const latency = store.getLatencyByModel();
    if (latency.length > 0) {
      console.log('\n--- Sec 5.5: Latency by Model ---');
      for (const l of latency) {
        console.log(`  ${l.model.padEnd(24)} n=${String(l.count).padStart(4)}  avg=${String(l.avg_ms).padStart(6)}ms  min=${String(l.min_ms).padStart(6)}ms  max=${String(l.max_ms).padStart(6)}ms`);
      }
    }

    // Association timeline summary
    const timeline = store.getAssociationTimeline();
    if (timeline.length > 0) {
      console.log('\n--- Sec 5.3: Association Snapshots ---');
      console.log(`  Total snapshots: ${timeline.length}`);
      // Count unique associations across all snapshots
      const uniqueAssoc = new Set<string>();
      for (const t of timeline) {
        try {
          const assocs = JSON.parse(t.associations_json);
          for (const a of assocs) uniqueAssoc.add(`${a.left}=${a.right}`);
        } catch { /* skip */ }
      }
      console.log(`  Unique associations tracked: ${uniqueAssoc.size}`);
    }

    console.log('');
    store.close();
  });

// ── Utility: check if ALTER EGO ws relay is reachable ───────────────────────

function checkAlterEgoRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:45677', (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

program.parseAsync();
