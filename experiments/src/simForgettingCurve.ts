/**
 * Experiment 5.3: Forgetting-Curve Simulation
 *
 * Simulates the associative memory decay equations from associativeMemory.ts
 * under scripted rehearsal schedules, fits exponential and power-law models,
 * and exports data for pgfplots in the paper.
 *
 * Usage:
 *   npx ts-node src/simForgettingCurve.ts
 *
 * Output:
 *   exports/forgetting_curve/  -- CSV tables and fit results
 */

import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

// ── Exact decay equations from associativeMemory.ts ────────────────────────

const HALF_LIFE_DAYS = 14;
const PRUNE_THRESHOLD = 0.05;
const K = Math.log(2) / HALF_LIFE_DAYS;

interface SimAssociation {
  label: string;
  strength: number;
  exposures: number;
  createdAtDay: number;
  lastUsedDay: number;
  lastReinforcedDay: number;
}

/**
 * Mirrors the code-level decay formula:
 *   decay(a) = strength * exp(-k * daysSinceReinforced)
 *   recency(a) = 1 + 0.5 * exp(-daysSinceLastUsed / 3)
 *   salience(a) = decay * recency * exposures^0.25
 */
function computeSalience(a: SimAssociation, currentDay: number): number {
  const daysSinceReinforced = Math.max(0, currentDay - a.lastReinforcedDay);
  const daysSinceLastUsed = Math.max(0, currentDay - a.lastUsedDay);

  const decayed = a.strength * Math.exp(-K * daysSinceReinforced);
  const recency = 1 + 0.5 * Math.exp(-daysSinceLastUsed / 3);
  const salience = decayed * recency * Math.pow(Math.max(1, a.exposures), 0.25);
  return salience;
}

/** Reinforce an association (mimics addAssociations logic). */
function reinforce(a: SimAssociation, day: number): void {
  a.strength += 1;
  a.exposures += 1;
  a.lastReinforcedDay = day;
  a.lastUsedDay = day;
}

/** Passive touch (mimics touchAssociations). */
function touch(a: SimAssociation, day: number): void {
  a.strength += 0.5;
  a.exposures += 1;
  a.lastUsedDay = day;
  a.lastReinforcedDay = day;
}

// ── Curve fitting (least-squares) ──────────────────────────────────────────

interface FitResult {
  model: string;
  params: Record<string, number>;
  r2: number;
  residuals: number[];
}

/**
 * Fit y = a * exp(-lambda * x) to data points via log-linearisation.
 */
function fitExponential(xs: number[], ys: number[]): FitResult {
  // Filter out zero or negative y values
  const valid = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.y > 0);
  if (valid.length < 2) return { model: 'exponential', params: { a: 0, lambda: 0 }, r2: 0, residuals: [] };

  const logYs = valid.map(p => Math.log(p.y));
  const n = valid.length;
  const sumX = valid.reduce((s, p) => s + p.x, 0);
  const sumLogY = logYs.reduce((s, v) => s + v, 0);
  const sumXLogY = valid.reduce((s, p, i) => s + p.x * logYs[i], 0);
  const sumX2 = valid.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return { model: 'exponential', params: { a: 0, lambda: 0 }, r2: 0, residuals: [] };

  const slope = (n * sumXLogY - sumX * sumLogY) / denom;
  const intercept = (sumLogY - slope * sumX) / n;

  const a = Math.exp(intercept);
  const lambda = -slope;

  // Compute R^2
  const predicted = xs.map(x => a * Math.exp(-lambda * x));
  const residuals = ys.map((y, i) => y - predicted[i]);
  const meanY = ys.reduce((s, y) => s + y, 0) / ys.length;
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = residuals.reduce((s, r) => s + r ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    model: 'exponential',
    params: { a: Math.round(a * 1000) / 1000, lambda: Math.round(lambda * 10000) / 10000 },
    r2: Math.round(r2 * 10000) / 10000,
    residuals,
  };
}

/**
 * Fit y = a * x^(-beta) via log-log linearisation.
 * Excludes x=0 points.
 */
function fitPowerLaw(xs: number[], ys: number[]): FitResult {
  const valid = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.x > 0 && p.y > 0);
  if (valid.length < 2) return { model: 'power_law', params: { a: 0, beta: 0 }, r2: 0, residuals: [] };

  const logXs = valid.map(p => Math.log(p.x));
  const logYs = valid.map(p => Math.log(p.y));
  const n = valid.length;
  const sumLX = logXs.reduce((s, v) => s + v, 0);
  const sumLY = logYs.reduce((s, v) => s + v, 0);
  const sumLXLY = logXs.reduce((s, v, i) => s + v * logYs[i], 0);
  const sumLX2 = logXs.reduce((s, v) => s + v * v, 0);

  const denom = n * sumLX2 - sumLX * sumLX;
  if (Math.abs(denom) < 1e-12) return { model: 'power_law', params: { a: 0, beta: 0 }, r2: 0, residuals: [] };

  const slope = (n * sumLXLY - sumLX * sumLY) / denom;
  const intercept = (sumLY - slope * sumLX) / n;

  const a = Math.exp(intercept);
  const beta = -slope;

  // R^2 on original scale
  const predicted = xs.map(x => x > 0 ? a * Math.pow(x, -beta) : a);
  const residuals = ys.map((y, i) => y - predicted[i]);
  const meanY = ys.reduce((s, y) => s + y, 0) / ys.length;
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = residuals.reduce((s, r) => s + r ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    model: 'power_law',
    params: { a: Math.round(a * 1000) / 1000, beta: Math.round(beta * 10000) / 10000 },
    r2: Math.round(r2 * 10000) / 10000,
    residuals,
  };
}

// ── Simulation scenarios ───────────────────────────────────────────────────

interface Scenario {
  name: string;
  description: string;
  rehearsalDays: number[];
  initialStrength: number;
  simDays: number;
}

const SCENARIOS: Scenario[] = [
  {
    name: 'no_rehearsal',
    description: 'Pure decay from initial encoding, no rehearsal events',
    rehearsalDays: [],
    initialStrength: 1,
    simDays: 60,
  },
  {
    name: 'spaced_rehearsal',
    description: 'Rehearsal at days 1, 3, 7, 14, 28 (expanding schedule)',
    rehearsalDays: [1, 3, 7, 14, 28],
    initialStrength: 1,
    simDays: 60,
  },
  {
    name: 'massed_rehearsal',
    description: 'Rehearsal at days 1, 2, 3, 4, 5 (massed practice)',
    rehearsalDays: [1, 2, 3, 4, 5],
    initialStrength: 1,
    simDays: 60,
  },
  {
    name: 'high_initial',
    description: 'Higher initial strength (s0=3), spaced rehearsal',
    rehearsalDays: [1, 3, 7, 14, 28],
    initialStrength: 3,
    simDays: 60,
  },
  {
    name: 'no_decay_control',
    description: 'Control condition: infinite half-life (decay disabled)',
    rehearsalDays: [1, 3, 7, 14, 28],
    initialStrength: 1,
    simDays: 60,
  },
];

interface DayPoint {
  day: number;
  salience: number;
  strength: number;
  exposures: number;
  rehearsed: boolean;
}

function runScenario(scenario: Scenario): DayPoint[] {
  const assoc: SimAssociation = {
    label: scenario.name,
    strength: scenario.initialStrength,
    exposures: 1,
    createdAtDay: 0,
    lastUsedDay: 0,
    lastReinforcedDay: 0,
  };

  const points: DayPoint[] = [];
  const rehearsalSet = new Set(scenario.rehearsalDays);

  for (let day = 0; day <= scenario.simDays; day++) {
    const wasRehearsed = rehearsalSet.has(day) && day > 0;
    if (wasRehearsed) {
      reinforce(assoc, day);
    }

    let salience: number;
    if (scenario.name === 'no_decay_control') {
      // Disable decay: use raw strength * recency * exposures^0.25
      const daysSinceLastUsed = Math.max(0, day - assoc.lastUsedDay);
      const recency = 1 + 0.5 * Math.exp(-daysSinceLastUsed / 3);
      salience = assoc.strength * recency * Math.pow(Math.max(1, assoc.exposures), 0.25);
    } else {
      salience = computeSalience(assoc, day);
    }

    points.push({
      day,
      salience: Math.round(salience * 10000) / 10000,
      strength: Math.round(assoc.strength * 100) / 100,
      exposures: assoc.exposures,
      rehearsed: wasRehearsed,
    });
  }

  return points;
}

// ── Ebbinghaus reference curve ─────────────────────────────────────────────

/**
 * Ebbinghaus savings curve: R(t) = exp(-t/S) where S is stability.
 * Generates a reference curve normalized to start at the same value as
 * the no_rehearsal condition.
 */
function ebbinghausReference(initialSalience: number, days: number): Array<{ day: number; salience: number }> {
  const S = HALF_LIFE_DAYS / Math.log(2); // match initial slope
  const points: Array<{ day: number; salience: number }> = [];
  for (let d = 0; d <= days; d++) {
    points.push({
      day: d,
      salience: Math.round(initialSalience * Math.exp(-d / S) * 10000) / 10000,
    });
  }
  return points;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const outDir = path.join(__dirname, '..', 'exports', 'forgetting_curve');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('====== Forgetting-Curve Simulation ======\n');

  const allResults: Record<string, DayPoint[]> = {};
  const fitResults: Record<string, { exponential: FitResult; powerLaw: FitResult }> = {};

  for (const scenario of SCENARIOS) {
    console.log(`Running: ${scenario.name} -- ${scenario.description}`);
    const points = runScenario(scenario);
    allResults[scenario.name] = points;

    // Fit curves to the non-rehearsal points (post day-0)
    // For fitting, use only days where no rehearsal happened to isolate decay
    const decayOnly = points.filter(p => !p.rehearsed && p.day > 0);
    const xs = decayOnly.map(p => p.day);
    const ys = decayOnly.map(p => p.salience);

    const expFit = fitExponential(xs, ys);
    const powFit = fitPowerLaw(xs, ys);
    fitResults[scenario.name] = { exponential: expFit, powerLaw: powFit };

    console.log(`  Exponential fit: a=${expFit.params.a}, lambda=${expFit.params.lambda}, R2=${expFit.r2}`);
    console.log(`  Power-law fit:   a=${powFit.params.a}, beta=${powFit.params.beta}, R2=${powFit.r2}`);
    console.log(`  Day 0 salience: ${points[0].salience}, Day 60 salience: ${points[60].salience}`);
    console.log(`  Above prune threshold at day 60: ${points[60].salience >= PRUNE_THRESHOLD ? 'YES' : 'NO'}`);
    console.log('');
  }

  // Generate Ebbinghaus reference
  const noRehearsalStart = allResults['no_rehearsal'][0].salience;
  const ebbRef = ebbinghausReference(noRehearsalStart, 60);

  // ── Export combined CSV for pgfplots ─────────────────────────────────────

  // Main trajectories table: one row per day, columns per scenario
  const combinedRows: Array<Record<string, unknown>> = [];
  for (let day = 0; day <= 60; day++) {
    const row: Record<string, unknown> = { day };
    for (const scenario of SCENARIOS) {
      row[`${scenario.name}_salience`] = allResults[scenario.name][day].salience;
      row[`${scenario.name}_strength`] = allResults[scenario.name][day].strength;
      row[`${scenario.name}_rehearsed`] = allResults[scenario.name][day].rehearsed ? 1 : 0;
    }
    row['ebbinghaus_ref'] = ebbRef[day].salience;
    row['prune_threshold'] = PRUNE_THRESHOLD;
    combinedRows.push(row);
  }

  const combinedCSV = stringify(combinedRows, { header: true });
  fs.writeFileSync(path.join(outDir, 'trajectories.csv'), combinedCSV);

  // Per-scenario detail CSVs
  for (const scenario of SCENARIOS) {
    const csv = stringify(allResults[scenario.name], { header: true });
    fs.writeFileSync(path.join(outDir, `${scenario.name}.csv`), csv);
  }

  // Fit results summary
  const fitSummary = Object.entries(fitResults).map(([name, fits]) => ({
    scenario: name,
    exp_a: fits.exponential.params.a,
    exp_lambda: fits.exponential.params.lambda,
    exp_r2: fits.exponential.r2,
    pow_a: fits.powerLaw.params.a,
    pow_beta: fits.powerLaw.params.beta,
    pow_r2: fits.powerLaw.r2,
  }));
  fs.writeFileSync(
    path.join(outDir, 'fit_results.csv'),
    stringify(fitSummary, { header: true })
  );

  // Full JSON for reference
  fs.writeFileSync(
    path.join(outDir, 'simulation_results.json'),
    JSON.stringify({ scenarios: allResults, fits: fitResults, ebbinghausReference: ebbRef }, null, 2)
  );

  console.log(`\n[Export] All results saved to ${outDir}`);

  // Print summary table for the paper
  console.log('\n====== Summary for Paper ======');
  console.log('Scenario'.padEnd(22) + 'Exp R2'.padStart(8) + 'Pow R2'.padStart(8) + 'Day-60 sal.'.padStart(12) + 'Survives prune'.padStart(16));
  console.log('-'.repeat(66));
  for (const scenario of SCENARIOS) {
    const fits = fitResults[scenario.name];
    const day60 = allResults[scenario.name][60].salience;
    console.log(
      scenario.name.padEnd(22) +
      fits.exponential.r2.toFixed(4).padStart(8) +
      fits.powerLaw.r2.toFixed(4).padStart(8) +
      day60.toFixed(4).padStart(12) +
      (day60 >= PRUNE_THRESHOLD ? 'YES' : 'NO').padStart(16)
    );
  }
}

main();
