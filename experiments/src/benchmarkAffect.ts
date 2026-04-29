/**
 * Experiment 5.1: Affect Heuristic Benchmarking against GoEmotions
 *
 * Downloads the GoEmotions test split, runs each example through ALTER EGO's
 * rule-based emotion pipeline, and computes per-class precision/recall/F1.
 *
 * Usage:
 *   npx ts-node src/benchmarkAffect.ts
 *   npx ts-node src/benchmarkAffect.ts --limit 1000  (subset for quick tests)
 *
 * Output:
 *   exports/affect_benchmark/  -- per-class CSV, summary JSON, confusion data
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { stringify } from 'csv-stringify/sync';
import { analyzeEmotions, EMOTION_LABELS } from '../../src/services/emotionService';

// GoEmotions label order (matches the original dataset's index mapping)
const GO_EMOTIONS_LABELS = [
  'admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring',
  'confusion', 'curiosity', 'desire', 'disappointment', 'disapproval',
  'disgust', 'embarrassment', 'excitement', 'fear', 'gratitude', 'grief',
  'joy', 'love', 'nervousness', 'neutral', 'optimism', 'pride',
  'realization', 'relief', 'remorse', 'sadness', 'surprise',
] as const;

// Map GoEmotions indices to ALTER EGO labels (identical taxonomy)
function goIndexToLabel(idx: number): string {
  return GO_EMOTIONS_LABELS[idx] ?? 'unknown';
}

// ── Data download ──────────────────────────────────────────────────────────

const GOEMOTIONS_TEST_URL =
  'https://raw.githubusercontent.com/google-research/google-research/master/goemotions/data/test.tsv';

const DATA_DIR = path.join(__dirname, '..', 'data');
const TEST_FILE = path.join(DATA_DIR, 'goemotions_test.tsv');

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`[Data] Using cached ${dest}`);
      return resolve();
    }
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
    console.log(`[Data] Downloading GoEmotions test split...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve, reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// ── Parse TSV ──────────────────────────────────────────────────────────────

interface GoEmotionExample {
  text: string;
  labels: string[]; // multi-label: list of emotion names
}

function parseTSV(filepath: string): GoEmotionExample[] {
  const raw = fs.readFileSync(filepath, 'utf-8');
  const lines = raw.trim().split('\n');
  const examples: GoEmotionExample[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const text = parts[0];
    const labelIndices = parts[1].split(',').map(Number);
    const labels = labelIndices.map(goIndexToLabel).filter(l => l !== 'unknown');
    if (text && labels.length > 0) {
      examples.push({ text, labels });
    }
  }
  return examples;
}

// ── Metrics computation ────────────────────────────────────────────────────

interface PerClassMetrics {
  emotion: string;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
  support: number; // total gold instances
}

interface BenchmarkResults {
  perClass: PerClassMetrics[];
  macroF1: number;
  weightedF1: number;
  microF1: number;
  accuracy: number; // top-1 accuracy for single-label examples
  totalExamples: number;
}

function computeMetrics(
  examples: GoEmotionExample[],
  predictions: string[][]
): BenchmarkResults {
  // Build per-class counters
  const metrics: Record<string, { tp: number; fp: number; fn: number; support: number }> = {};
  for (const label of EMOTION_LABELS) {
    metrics[label] = { tp: 0, fp: 0, fn: 0, support: 0 };
  }

  let correctTop1 = 0;
  let singleLabelCount = 0;

  for (let i = 0; i < examples.length; i++) {
    const goldSet = new Set(examples[i].labels);
    const predSet = new Set(predictions[i]);

    // Per-class: multi-label evaluation
    for (const label of EMOTION_LABELS) {
      const isGold = goldSet.has(label);
      const isPred = predSet.has(label);
      if (isGold) metrics[label].support++;
      if (isGold && isPred) metrics[label].tp++;
      else if (!isGold && isPred) metrics[label].fp++;
      else if (isGold && !isPred) metrics[label].fn++;
    }

    // Top-1 accuracy (only for single-label examples)
    if (examples[i].labels.length === 1) {
      singleLabelCount++;
      if (predSet.has(examples[i].labels[0])) correctTop1++;
    }
  }

  // Compute per-class P/R/F1
  const perClass: PerClassMetrics[] = [];
  let macroF1Sum = 0;
  let macroCount = 0;
  let totalTP = 0, totalFP = 0, totalFN = 0;
  let weightedF1Sum = 0;
  let totalSupport = 0;

  for (const label of EMOTION_LABELS) {
    const m = metrics[label];
    const precision = m.tp + m.fp > 0 ? m.tp / (m.tp + m.fp) : 0;
    const recall = m.tp + m.fn > 0 ? m.tp / (m.tp + m.fn) : 0;
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;

    perClass.push({
      emotion: label,
      tp: m.tp,
      fp: m.fp,
      fn: m.fn,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1: Math.round(f1 * 1000) / 1000,
      support: m.support,
    });

    if (m.support > 0) {
      macroF1Sum += f1;
      macroCount++;
      weightedF1Sum += f1 * m.support;
      totalSupport += m.support;
    }
    totalTP += m.tp;
    totalFP += m.fp;
    totalFN += m.fn;
  }

  const microP = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const microR = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const microF1 = microP + microR > 0 ? 2 * microP * microR / (microP + microR) : 0;

  return {
    perClass,
    macroF1: Math.round((macroF1Sum / Math.max(1, macroCount)) * 1000) / 1000,
    weightedF1: Math.round((weightedF1Sum / Math.max(1, totalSupport)) * 1000) / 1000,
    microF1: Math.round(microF1 * 1000) / 1000,
    accuracy: singleLabelCount > 0
      ? Math.round((correctTop1 / singleLabelCount) * 1000) / 1000
      : 0,
    totalExamples: examples.length,
  };
}

// ── Category grouping ──────────────────────────────────────────────────────

const EMOTION_CATEGORIES: Record<string, string[]> = {
  positive: ['admiration', 'amusement', 'approval', 'caring', 'desire', 'excitement',
    'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief'],
  negative: ['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust',
    'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'],
  ambiguous: ['confusion', 'curiosity', 'realization', 'surprise'],
  neutral: ['neutral'],
};

function categoryF1(perClass: PerClassMetrics[]): Record<string, { macroF1: number; count: number }> {
  const result: Record<string, { macroF1: number; count: number }> = {};
  for (const [cat, labels] of Object.entries(EMOTION_CATEGORIES)) {
    const inCat = perClass.filter(p => labels.includes(p.emotion) && p.support > 0);
    const avg = inCat.length > 0
      ? inCat.reduce((s, p) => s + p.f1, 0) / inCat.length
      : 0;
    result[cat] = { macroF1: Math.round(avg * 1000) / 1000, count: inCat.length };
  }
  return result;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const limit = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0');

  // Download GoEmotions test split
  await downloadFile(GOEMOTIONS_TEST_URL, TEST_FILE);
  let examples = parseTSV(TEST_FILE);
  console.log(`[Data] Loaded ${examples.length} test examples`);

  if (limit > 0) {
    examples = examples.slice(0, limit);
    console.log(`[Data] Limited to ${examples.length} examples`);
  }

  // Run predictions
  console.log('[Eval] Running emotion analysis on all examples...');
  const startTime = Date.now();
  const predictions: string[][] = [];

  for (let i = 0; i < examples.length; i++) {
    const result = analyzeEmotions(examples[i].text);

    // Take primary prediction (top-1) and also any prediction above 0.3 confidence
    // for multi-label evaluation
    const preds: string[] = [];
    if (result.length > 0) {
      preds.push(result[0].emotion);
      // Also include strong secondary predictions for multi-label matching
      for (let j = 1; j < result.length && j < 3; j++) {
        if (result[j].confidence >= 0.3) {
          preds.push(result[j].emotion);
        }
      }
    }
    predictions.push(preds);

    if ((i + 1) % 500 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  [${i + 1}/${examples.length}] ${elapsed}s elapsed`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Eval] Completed in ${elapsed}s (${(examples.length / parseFloat(elapsed)).toFixed(0)} examples/sec)`);

  // Compute metrics
  const results = computeMetrics(examples, predictions);
  const catF1 = categoryF1(results.perClass);

  // Print summary
  console.log('\n====== Affect Heuristic Benchmark Results ======');
  console.log(`  Total examples:    ${results.totalExamples}`);
  console.log(`  Macro F1:          ${results.macroF1}`);
  console.log(`  Weighted F1:       ${results.weightedF1}`);
  console.log(`  Micro F1:          ${results.microF1}`);
  console.log(`  Top-1 Accuracy:    ${results.accuracy}`);
  console.log('');
  console.log('  Category macro-F1:');
  for (const [cat, data] of Object.entries(catF1)) {
    console.log(`    ${cat.padEnd(12)} ${data.macroF1.toFixed(3)} (${data.count} labels with support)`);
  }
  console.log('');
  console.log('  Per-class results:');
  console.log('  ' + 'Emotion'.padEnd(18) + 'Prec'.padStart(7) + 'Rec'.padStart(7) + 'F1'.padStart(7) + 'Support'.padStart(9));
  console.log('  ' + '-'.repeat(48));
  for (const p of results.perClass.sort((a, b) => b.f1 - a.f1)) {
    console.log(
      '  ' +
      p.emotion.padEnd(18) +
      p.precision.toFixed(3).padStart(7) +
      p.recall.toFixed(3).padStart(7) +
      p.f1.toFixed(3).padStart(7) +
      String(p.support).padStart(9)
    );
  }

  // Export results
  const outDir = path.join(__dirname, '..', 'exports', 'affect_benchmark');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Per-class CSV (for pgfplots in paper)
  const perClassCSV = stringify(
    results.perClass.map(p => ({
      emotion: p.emotion,
      precision: p.precision,
      recall: p.recall,
      f1: p.f1,
      support: p.support,
    })),
    { header: true }
  );
  fs.writeFileSync(path.join(outDir, 'per_class_metrics.csv'), perClassCSV);

  // Category CSV
  const catCSV = stringify(
    Object.entries(catF1).map(([cat, d]) => ({ category: cat, macro_f1: d.macroF1, label_count: d.count })),
    { header: true }
  );
  fs.writeFileSync(path.join(outDir, 'category_f1.csv'), catCSV);

  // Full results JSON
  fs.writeFileSync(
    path.join(outDir, 'benchmark_results.json'),
    JSON.stringify({ ...results, categoryF1: catF1, elapsed_seconds: parseFloat(elapsed) }, null, 2)
  );

  // Per-example predictions (for error analysis)
  const examplePreds = examples.map((ex, i) => ({
    text: ex.text.slice(0, 200),
    gold: ex.labels.join(';'),
    predicted: predictions[i].join(';'),
    correct: predictions[i].some(p => ex.labels.includes(p)) ? 1 : 0,
  }));
  fs.writeFileSync(
    path.join(outDir, 'per_example_predictions.csv'),
    stringify(examplePreds, { header: true })
  );

  console.log(`\n[Export] Results saved to ${outDir}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
