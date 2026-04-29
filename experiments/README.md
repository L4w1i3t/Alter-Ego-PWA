# ALTER EGO Experiment Pipeline

A standalone Node.js application that collects, stores, and analyzes telemetry
data from the ALTER EGO Electron app. Data is aligned with the experiment
sections in the research paper (`docs/paper/alter_ego.tex`).

## Architecture

```
ALTER EGO Electron App            Experiment Pipeline
+-------------------+            +--------------------+
| Renderer          |            |                    |
| experimentTelemetry.ts         |  collector.ts      |
|   -> IPC bridge   |            |    (ws client)     |
|   -> preload.js   |            |        |           |
+--------+----------+            |        v           |
         |                       |  store.ts          |
+--------v----------+   ws://    |   (SQLite via      |
| Main Process      +----------->    sql.js WASM)     |
| telemetry relay   |  :45677   |        |           |
| (RFC 6455 server) |            |        v           |
+-------------------+            |  analyzer.ts       |
                                 |   (CSV/JSON export)|
                                 +--------------------+
```

### Components

| Layer | File | Role |
|-------|------|------|
| Emitter | `src/utils/experimentTelemetry.ts` | Singleton in renderer; fires typed events at each pipeline stage |
| IPC Bridge | `electron/preload.js` + `electron/main.js` | Forwards events from renderer to WebSocket broadcast |
| Collector | `experiments/src/collector.ts` | WebSocket client with auto-reconnect; routes events to store + JSONL log |
| Store | `experiments/src/store.ts` | SQLite database (sql.js/WASM) with 7 tables covering all paper experiments |
| Analyzer | `experiments/src/analyzer.ts` | Exports CSV/JSON per experiment section; prints console summaries |
| CLI | `experiments/src/index.ts` | Commander-based entry point with `collect`, `status`, `export`, `analyze` |

### Event Types Captured

- **query_start** -- user input, model, temperature, buffer size, image count
- **query_complete** -- latency, token counts, response stats
- **emotion_analysis** -- full 28-label heuristic scores for both user and AI text, avatar emotion, trajectory
- **memory_retrieval** -- episodic recall results, association salience snapshots, context composition
- **association_update** -- add/reinforce/prune mutations with full association state
- **settings_snapshot** -- model, temperature, memory buffer, UI toggles
- **session_start / session_end** -- lifecycle markers

### Database Tables

| Table | Paper Section | Purpose |
|-------|--------------|---------|
| `raw_events` | All | Catch-all JSON log of every event |
| `queries` | Sec 5.5 | Per-query latency, tokens, model info |
| `emotion_analyses` | Sec 5.1, 5.4 | Emotion scores, avatar state, trajectory |
| `memory_retrievals` | Sec 5.2, 5.3 | Context composition, association salience per query |
| `association_events` | Sec 5.3 | Mutation-level tracking for forgetting curves |
| `settings_snapshots` | Sec 5.2 | Ablation tracing (buffer size, model, etc.) |
| `sessions` | All | Session lifecycle |

## Setup

```bash
cd experiments
npm install
npm run build
```

Or from the project root:

```bash
npm run experiment:build
```

## Usage

### 1. Start ALTER EGO

Launch the Electron app normally. The telemetry relay starts automatically on
port 45677.

### 2. Collect Data

```bash
# From project root:
npm run experiment:collect

# Or directly:
cd experiments && node dist/index.js collect
```

The collector will auto-reconnect whenever ALTER EGO restarts.

### 3. Check Status

```bash
npm run experiment:status
```

### 4. Export Data

```bash
npm run experiment:export
```

Outputs CSV and JSON files to `experiments/exports/` (or `--out <dir>`).

### 5. Analyze

```bash
npm run experiment:analyze
```

Prints per-section analysis to the console with distribution tables and key
metrics.

## Data Location

- **SQLite database**: `experiments/data/experiment_telemetry.db`
- **JSONL event logs**: `experiments/data/telemetry_<date>.jsonl`
- **Exports**: `experiments/exports/`

## CLI Options

All commands accept `--db-dir <path>` to override the database directory.

```
alter-ego-experiments collect [--db-dir <path>] [--log-dir <path>]
alter-ego-experiments status  [--db-dir <path>]
alter-ego-experiments export  [--db-dir <path>] [--out <dir>]
alter-ego-experiments analyze [--db-dir <path>]
```
