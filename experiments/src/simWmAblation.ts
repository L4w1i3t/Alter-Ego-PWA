/**
 * Experiment 5.2: Working-Memory Ablation Simulation
 *
 * Creates a synthetic conversation with 20 seeded atomic facts, then varies
 * the memoryPairs parameter from 1 to 7 and measures how many facts survive
 * in the pruned context. Tests H1 (sigmoid-like recall drop at capacity limits).
 *
 * Usage:
 *   npx ts-node src/simWmAblation.ts
 *
 * Output:
 *   exports/wm_ablation/  -- CSV tables and fit results
 */

import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import { buildShortTermContext, ChatMsg } from '../../src/utils/contextBuilder';

// ── Seed 20 atomic facts into a synthetic conversation ─────────────────────

/**
 * Each fact is a user message asserting something specific, followed by
 * an assistant acknowledgement. Facts are designed to be short, distinct,
 * and easily searchable in the pruned output.
 */
const FACTS: Array<{ userMsg: string; assistantMsg: string; keyword: string }> = [
  { userMsg: 'My favorite color is cerulean blue.', assistantMsg: 'Cerulean blue, noted.', keyword: 'cerulean' },
  { userMsg: 'I was born in Portland, Oregon.', assistantMsg: 'Portland, Oregon -- got it.', keyword: 'portland' },
  { userMsg: 'I have a cat named Whiskers.', assistantMsg: 'Whiskers the cat, lovely name.', keyword: 'whiskers' },
  { userMsg: 'My birthday is March 15th.', assistantMsg: 'March 15th, I will remember that.', keyword: 'march 15' },
  { userMsg: 'I work as a structural engineer.', assistantMsg: 'Structural engineering, fascinating field.', keyword: 'structural engineer' },
  { userMsg: 'I run five kilometers every morning.', assistantMsg: 'Five kilometers daily, impressive routine.', keyword: 'five kilometers' },
  { userMsg: 'My favorite book is Dune by Frank Herbert.', assistantMsg: 'Dune is a masterpiece, agreed.', keyword: 'dune' },
  { userMsg: 'I prefer Earl Grey tea over coffee.', assistantMsg: 'Earl Grey, a distinguished choice.', keyword: 'earl grey' },
  { userMsg: 'I studied at MIT for my masters degree.', assistantMsg: 'MIT, that is quite the institution.', keyword: 'mit' },
  { userMsg: 'My sister lives in Tokyo.', assistantMsg: 'Tokyo, what a vibrant city.', keyword: 'tokyo' },
  { userMsg: 'I play the violin in a local chamber group.', assistantMsg: 'Violin in a chamber group, that is wonderful.', keyword: 'violin' },
  { userMsg: 'I am allergic to shellfish.', assistantMsg: 'Shellfish allergy, important to know.', keyword: 'shellfish' },
  { userMsg: 'My car is a 2019 Subaru Outback.', assistantMsg: 'Subaru Outback, solid choice for adventures.', keyword: 'subaru' },
  { userMsg: 'I have been learning Mandarin for two years.', assistantMsg: 'Two years of Mandarin, that takes dedication.', keyword: 'mandarin' },
  { userMsg: 'My favorite movie is Blade Runner 2049.', assistantMsg: 'Blade Runner 2049, visually stunning film.', keyword: 'blade runner' },
  { userMsg: 'I volunteer at the local animal shelter on weekends.', assistantMsg: 'Volunteering at a shelter, admirable work.', keyword: 'animal shelter' },
  { userMsg: 'I broke my left wrist skiing last winter.', assistantMsg: 'A broken wrist from skiing, hopefully healed well.', keyword: 'wrist' },
  { userMsg: 'My favorite restaurant is a ramen place called Ichiran.', assistantMsg: 'Ichiran ramen, they are legendary.', keyword: 'ichiran' },
  { userMsg: 'I am training for a half marathon in October.', assistantMsg: 'Half marathon in October, you will be ready.', keyword: 'half marathon' },
  { userMsg: 'I collect vintage typewriters as a hobby.', assistantMsg: 'Vintage typewriters, what a distinctive hobby.', keyword: 'typewriter' },
];

// ── Filler turns to intersperse between facts ──────────────────────────────

const FILLERS: Array<{ user: string; assistant: string }> = [
  { user: 'Alright, what else...', assistant: 'Take your time, I am listening.' },
  { user: 'Hmm, let me think.', assistant: 'No rush at all.' },
  { user: 'Oh, here is another one.', assistant: 'Go ahead, I am ready.' },
  { user: 'This is kind of random but...', assistant: 'Random is fine, bring it on.' },
  { user: 'Almost done I think.', assistant: 'Whenever you are ready.' },
  { user: 'You know what, one more thing.', assistant: 'Sure, keep going.' },
];

// ── Seeded PRNG (xorshift128+) for reproducible shuffles ────────────────────

function makeRng(seed: number) {
  let s0 = seed | 0 || 1;
  let s1 = (seed * 2654435761) | 0 || 1;
  return () => {
    let a = s0;
    const b = s1;
    s0 = b;
    a ^= a << 23;
    a ^= a >> 17;
    a ^= b;
    a ^= b >> 26;
    s1 = a;
    return ((s0 + s1) >>> 0) / 0x100000000;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build a conversation history with all 20 facts in a random order
 * (determined by the given seed), interleaved with a variable number
 * of filler turns. Varying filler density changes total conversation
 * length, which in turn affects how many fact-bearing pairs fall within
 * a given buffer window.
 */
function buildSyntheticHistory(seed: number): { history: ChatMsg[]; factOrder: number[]; totalMsgs: number } {
  const rng = makeRng(seed);
  const factOrder = shuffleArray(
    Array.from({ length: FACTS.length }, (_, i) => i),
    rng
  );
  const shuffledFillers = shuffleArray(FILLERS, rng);

  const history: ChatMsg[] = [];

  // Opening exchange
  history.push({ role: 'user', content: 'Hey, I wanted to tell you some things about myself.' });
  history.push({ role: 'assistant', content: 'Of course, I am all ears. Tell me whatever comes to mind.' });

  // Interleave facts (in shuffled order) with randomly spaced filler turns
  let fillerIdx = 0;
  for (let i = 0; i < factOrder.length; i++) {
    // Insert 0-2 filler turns before each fact (random per seed)
    const fillerCount = Math.floor(rng() * 3); // 0, 1, or 2
    for (let f = 0; f < fillerCount; f++) {
      const filler = shuffledFillers[fillerIdx % shuffledFillers.length];
      history.push({ role: 'user', content: filler.user });
      history.push({ role: 'assistant', content: filler.assistant });
      fillerIdx++;
    }
    const fact = FACTS[factOrder[i]];
    history.push({ role: 'user', content: fact.userMsg });
    history.push({ role: 'assistant', content: fact.assistantMsg });
  }

  // Trailing exchange so the last turn is never a seeded fact
  history.push({ role: 'user', content: 'That is everything for now.' });
  history.push({ role: 'assistant', content: 'Thanks for sharing all of that. I will keep it in mind.' });

  return { history, factOrder, totalMsgs: history.length };
}

// ── Recall measurement ─────────────────────────────────────────────────────

interface AblationResult {
  bufferSize: number;
  totalFacts: number;
  recalledFacts: number;
  recallAccuracy: number;
  prunedMessageCount: number;
  prunedCharCount: number;
  hasSummary: boolean;
  /** Which facts (by index) were recalled */
  recalledIndices: number[];
  /** Which facts were missed */
  missedIndices: number[];
}

function measureRecall(history: ChatMsg[], bufferSize: number): AblationResult {
  const { pruned, summary } = buildShortTermContext(history, { memoryPairs: bufferSize });

  // Concatenate all pruned content for keyword search
  const prunedText = pruned.map(m => m.content).join(' ').toLowerCase();
  const summaryText = (summary ?? '').toLowerCase();
  const searchText = prunedText + ' ' + summaryText;

  const recalledIndices: number[] = [];
  const missedIndices: number[] = [];

  for (let i = 0; i < FACTS.length; i++) {
    if (searchText.includes(FACTS[i].keyword.toLowerCase())) {
      recalledIndices.push(i);
    } else {
      missedIndices.push(i);
    }
  }

  const totalChars = pruned.reduce((s, m) => s + m.content.length, 0);

  return {
    bufferSize,
    totalFacts: FACTS.length,
    recalledFacts: recalledIndices.length,
    recallAccuracy: Math.round((recalledIndices.length / FACTS.length) * 1000) / 1000,
    prunedMessageCount: pruned.length,
    prunedCharCount: totalChars,
    hasSummary: !!summary,
    recalledIndices,
    missedIndices,
  };
}

// ── Sigmoid fit ────────────────────────────────────────────────────────────

/**
 * Attempt to fit a sigmoid: accuracy = L / (1 + exp(-k*(x - x0)))
 * using a simple grid search over parameters.
 */
function fitSigmoid(
  xs: number[],
  ys: number[]
): { L: number; k: number; x0: number; r2: number } {
  let bestR2 = -Infinity;
  let bestParams = { L: 1, k: 1, x0: 3 };

  const meanY = ys.reduce((s, y) => s + y, 0) / ys.length;
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);

  // Grid search
  for (let L = 0.5; L <= 1.05; L += 0.05) {
    for (let k = 0.3; k <= 5; k += 0.1) {
      for (let x0 = 1; x0 <= 6; x0 += 0.25) {
        const predicted = xs.map(x => L / (1 + Math.exp(-k * (x - x0))));
        const ssRes = ys.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0);
        const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
        if (r2 > bestR2) {
          bestR2 = r2;
          bestParams = { L, k, x0 };
        }
      }
    }
  }

  return {
    L: Math.round(bestParams.L * 1000) / 1000,
    k: Math.round(bestParams.k * 1000) / 1000,
    x0: Math.round(bestParams.x0 * 1000) / 1000,
    r2: Math.round(bestR2 * 10000) / 10000,
  };
}

// ── Extended buffer range experiment ───────────────────────────────────────

const BUFFER_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15];
const NUM_SEEDS = 50; // independent shuffles for confidence estimates

// ── Statistics helpers ─────────────────────────────────────────────────────

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function stddev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}
function ci95(xs: number[]): number { return 1.96 * stddev(xs) / Math.sqrt(xs.length); }

// ── Main ───────────────────────────────────────────────────────────────────

interface SeedResult {
  seed: number;
  bufferSize: number;
  recallAccuracy: number;
  recalledFacts: number;
}

function main() {
  const outDir = path.join(__dirname, '..', 'exports', 'wm_ablation');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('====== Working-Memory Ablation Simulation ======');
  console.log(`Seeds: ${NUM_SEEDS} | Buffer sizes: ${BUFFER_SIZES.join(', ')}\n`);

  const allSeedResults: SeedResult[] = [];

  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const { history } = buildSyntheticHistory(seed);
    for (const bufferSize of BUFFER_SIZES) {
      const result = measureRecall(history, bufferSize);
      allSeedResults.push({
        seed,
        bufferSize,
        recallAccuracy: result.recallAccuracy,
        recalledFacts: result.recalledFacts,
      });
    }
  }

  // Aggregate per buffer size: mean, SD, CI
  interface AggRow {
    bufferSize: number;
    meanAccuracy: number;
    sdAccuracy: number;
    ci95Accuracy: number;
    minAccuracy: number;
    maxAccuracy: number;
    meanRecalled: number;
  }
  const aggRows: AggRow[] = [];

  for (const b of BUFFER_SIZES) {
    const accs = allSeedResults.filter(r => r.bufferSize === b).map(r => r.recallAccuracy);
    const recalled = allSeedResults.filter(r => r.bufferSize === b).map(r => r.recalledFacts);
    aggRows.push({
      bufferSize: b,
      meanAccuracy: Math.round(mean(accs) * 10000) / 10000,
      sdAccuracy: Math.round(stddev(accs) * 10000) / 10000,
      ci95Accuracy: Math.round(ci95(accs) * 10000) / 10000,
      minAccuracy: Math.min(...accs),
      maxAccuracy: Math.max(...accs),
      meanRecalled: Math.round(mean(recalled) * 100) / 100,
    });
  }

  // Print summary table
  console.log('Buffer  Mean     SD      CI95     Min      Max      Recalled');
  console.log('------  ------   ------  ------   ------   ------   --------');
  for (const row of aggRows) {
    console.log(
      String(row.bufferSize).padEnd(8) +
      (row.meanAccuracy * 100).toFixed(1).padStart(5) + '%  ' +
      (row.sdAccuracy * 100).toFixed(1).padStart(5) + '%  ' +
      (row.ci95Accuracy * 100).toFixed(1).padStart(5) + '%  ' +
      (row.minAccuracy * 100).toFixed(1).padStart(5) + '%  ' +
      (row.maxAccuracy * 100).toFixed(1).padStart(5) + '%  ' +
      row.meanRecalled.toFixed(1).padStart(5)
    );
  }

  // Fit sigmoid to mean accuracies (core 1-7 range)
  const coreAgg = aggRows.filter(r => r.bufferSize >= 1 && r.bufferSize <= 7);
  const sigmoidFit = fitSigmoid(
    coreAgg.map(r => r.bufferSize),
    coreAgg.map(r => r.meanAccuracy)
  );
  console.log(`\nSigmoid fit (buffer 1-7): L=${sigmoidFit.L}, k=${sigmoidFit.k}, x0=${sigmoidFit.x0}, R2=${sigmoidFit.r2}`);

  // Also fit full range
  const fullFit = fitSigmoid(
    aggRows.map(r => r.bufferSize),
    aggRows.map(r => r.meanAccuracy)
  );
  console.log(`Sigmoid fit (full range): L=${fullFit.L}, k=${fullFit.k}, x0=${fullFit.x0}, R2=${fullFit.r2}`);

  // ── Export ───────────────────────────────────────────────────────────────

  // Per-seed raw results
  const rawCsv = allSeedResults.map(r => ({
    seed: r.seed,
    buffer_size: r.bufferSize,
    recall_accuracy: r.recallAccuracy,
    recalled_facts: r.recalledFacts,
  }));
  fs.writeFileSync(path.join(outDir, 'raw_per_seed.csv'), stringify(rawCsv, { header: true }));

  // Aggregated results (for paper table / pgfplots)
  const aggCsv = aggRows.map(r => ({
    buffer_size: r.bufferSize,
    mean_accuracy: r.meanAccuracy,
    sd: r.sdAccuracy,
    ci95: r.ci95Accuracy,
    min: r.minAccuracy,
    max: r.maxAccuracy,
    mean_recalled: r.meanRecalled,
  }));
  fs.writeFileSync(path.join(outDir, 'ablation_results.csv'), stringify(aggCsv, { header: true }));

  // pgfplots-friendly table with error bars
  const plotRows = aggRows.map(r => ({
    x: r.bufferSize,
    y: r.meanAccuracy,
    y_err: r.ci95Accuracy,
    y_lo: Math.max(0, r.meanAccuracy - r.ci95Accuracy),
    y_hi: Math.min(1, r.meanAccuracy + r.ci95Accuracy),
  }));
  fs.writeFileSync(path.join(outDir, 'ablation_plot.csv'), stringify(plotRows, { header: true }));

  // Full JSON export
  fs.writeFileSync(
    path.join(outDir, 'ablation_results.json'),
    JSON.stringify({
      config: { numSeeds: NUM_SEEDS, bufferSizes: BUFFER_SIZES, factCount: FACTS.length },
      aggregated: aggRows,
      sigmoidFit: { core: sigmoidFit, full: fullFit },
    }, null, 2)
  );

  console.log(`\n[Export] Results saved to ${outDir}`);
}

main();
