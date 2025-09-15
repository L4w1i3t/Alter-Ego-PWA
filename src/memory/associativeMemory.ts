/**
 * Lightweight associative memory for per‑persona facts like "box = red".
 * Stores in localStorage to avoid Dexie schema migrations.
 */

export interface Association {
  left: string; // e.g., object: "box"
  right: string; // e.g., color: "red"
  strength: number; // reinforcement score (base strength)
  exposures?: number; // number of times reinforced/seen
  createdAt: string;
  lastUsed?: string;
  lastReinforcedAt?: string;
}

interface AssocStore {
  [persona: string]: Association[];
}

const STORAGE_KEY = 'alterEgo_assocMemory';

function loadStore(): AssocStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore(store: AssocStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function addAssociations(
  persona: string,
  pairs: Array<{ left: string; right: string }>
): void {
  const store = loadStore();
  const list: Association[] = store[persona] || [];
  const now = new Date().toISOString();

  pairs.forEach(({ left, right }) => {
    const l = left.trim().toLowerCase();
    const r = right.trim().toLowerCase();
    if (!l || !r) return;
    if (!isAssociationToken(l) || !isAssociationToken(r)) return;
    const idx = list.findIndex(a => a.left === l && a.right === r);
    if (idx >= 0) {
      list[idx].strength = Math.min(1e6, (list[idx].strength || 1) + 1);
      list[idx].exposures = (list[idx].exposures || 0) + 1;
      list[idx].lastUsed = now;
      list[idx].lastReinforcedAt = now;
    } else {
      list.push({
        left: l,
        right: r,
        strength: 1,
        exposures: 1,
        createdAt: now,
        lastUsed: now,
        lastReinforcedAt: now,
      });
    }
  });

  // Apply decay/prune before saving
  store[persona] = pruneAndDecay(list);
  saveStore(store);
}

export function getAssociations(persona: string): Association[] {
  const store = loadStore();
  return (store[persona] || []).slice();
}

export function touchAssociations(
  persona: string,
  used: Array<{ left: string; right: string }>
): void {
  const store = loadStore();
  const list: Association[] = store[persona] || [];
  const now = new Date().toISOString();
  used.forEach(({ left, right }) => {
    const l = left.trim().toLowerCase();
    const r = right.trim().toLowerCase();
    const idx = list.findIndex(a => a.left === l && a.right === r);
    if (idx >= 0) {
      list[idx].lastUsed = now;
      list[idx].strength = Math.min(1e6, (list[idx].strength || 1) + 0.5);
      list[idx].exposures = (list[idx].exposures || 0) + 1;
      list[idx].lastReinforcedAt = now;
    }
  });
  store[persona] = pruneAndDecay(list);
  saveStore(store);
}

/**
 * Parse simple association statements from text.
 * Supports patterns like:
 *  - "remember ...: box = red, barrel = green"
 *  - "box = red"
 *  - "box is red" / "box equals red"
 */
export function parseAssociationsFromText(
  text: string
): Array<{ left: string; right: string }> {
  const result: Array<{ left: string; right: string }> = [];
  if (!text) return result;
  const lc = text.toLowerCase();
  const trainingMode = /(\bremember\b|\bassociate\b|\bassociations\b|\bmap\b|\bmapping\b|\bdefine\b|\bset\b|\bmeans\b)/.test(
    lc
  );
  const normalized = lc.replace(/\s+/g, ' ');

  // Split by commas and semicolons to find potential pairs
  const chunks = normalized.split(/[;,]/);
  // Only accept '=' always; accept 'is|equals' only in explicit training mode
  const eqRe = trainingMode
    ? /\b([a-z0-9_\-]{3,})\s*(=|is|equals)\s*([a-z0-9_\-]{3,})\b/
    : /\b([a-z0-9_\-]{3,})\s*(=)\s*([a-z0-9_\-]{3,})\b/;
  for (const chunk of chunks) {
    const m = chunk.match(eqRe);
    if (m) {
      const left = m[1];
      const right = m[3];
      if (left && right && isAssociationToken(left) && isAssociationToken(right))
        result.push({ left, right });
    }
  }
  return result;
}

/**
 * Given a sequence like ["red","green"], translate using known pairs.
 * Returns array of left-side translations.
 */
export function translateRightSequence(
  persona: string,
  rights: string[]
): string[] {
  const map = new Map<string, string>(); // right -> left
  getAssociations(persona)
    .sort((a, b) => salience(b) - salience(a))
    .forEach(a => {
      if (!map.has(a.right)) map.set(a.right, a.left);
    });
  return rights.map(r => map.get(r.toLowerCase()) || r);
}

/**
 * Build a compact "facts" string for system prompt injection.
 */
export function buildFactsLine(
  persona: string,
  charBudget: number = 160
): string | null {
  const assocs = pruneAndDecay(getAssociations(persona));
  if (!assocs.length) return null;
  // Deduplicate by right value, rank by salience
  const seen = new Set<string>();
  const ordered = assocs.sort((a, b) => salience(b) - salience(a));
  const parts: string[] = [];
  let total = 'Facts: '.length;
  for (const a of ordered) {
    if (!isAssociationToken(a.left) || !isAssociationToken(a.right)) continue;
    if (seen.has(a.right)) continue;
    const frag = `${a.right}→${a.left}`;
    const addLen = (parts.length ? 2 : 0) + frag.length; // account for '; '
    if (total + addLen > charBudget) break;
    parts.push(frag);
    total += addLen;
    seen.add(a.right);
  }
  return parts.length ? `Facts: ${parts.join('; ')}` : null;
}

/**
 * Scan text for right-side tokens that match known associations and
 * return the concrete pairs encountered (for reinforcement).
 */
export function getRightsUsedInText(
  persona: string,
  text: string
): Array<{ left: string; right: string }> {
  const assocs = getAssociations(persona);
  if (!assocs.length || !text) return [];
  const rightsSet = new Set(
    assocs.map(a => a.right.toLowerCase())
  );
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_,\s-]/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  const used: Array<{ left: string; right: string }> = [];
  tokens.forEach(t => {
    if (rightsSet.has(t)) {
      // choose strongest association for this right token
      const best = assocs
        .filter(a => a.right === t)
        .sort((a, b) => salience(b) - salience(a))[0];
      if (best) used.push({ left: best.left, right: best.right });
    }
  });
  // Deduplicate
  const uniq: Array<{ left: string; right: string }> = [];
  const seen = new Set<string>();
  for (const u of used) {
    const k = `${u.left}|${u.right}`;
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(u);
    }
  }
  return uniq;
}

/**
 * Clear all associations for a persona.
 */
export function clearPersonaAssociations(persona: string): void {
  const store = loadStore();
  if (store[persona]) {
    delete store[persona];
    saveStore(store);
  }
}

/**
 * Clear the entire associative memory store.
 */
export function clearAllAssociations(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ===== Internals: salience, decay, pruning =====

const STOP_WORDS = new Set([
  'the',
  'this',
  'that',
  'there',
  'here',
  'and',
  'but',
  'with',
  'then',
  'when',
  'what',
  'why',
  'are',
  'you',
  'your',
  'have',
  'has',
  'was',
  'all',
  'any',
  'each',
  'every',
]);

function isAssociationToken(tok: string): boolean {
  if (!tok) return false;
  if (tok.length < 3) return false;
  if (STOP_WORDS.has(tok)) return false;
  // Must contain at least one letter
  if (!/[a-z]/.test(tok)) return false;
  return true;
}

function daysSince(iso?: string): number {
  if (!iso) return 1e6;
  const dt = Date.now() - new Date(iso).getTime();
  return Math.max(0, dt / (1000 * 60 * 60 * 24));
}

// Ebbinghaus-like decay: strength * exp(-ln(2) * days / halfLife)
function decayedStrength(a: Association, halfLifeDays = 14): number {
  const base = a.strength || 0;
  const days = daysSince(a.lastReinforcedAt || a.lastUsed || a.createdAt);
  const k = Math.log(2) / halfLifeDays;
  return base * Math.exp(-k * days);
}

function recencyBoost(a: Association): number {
  const d = daysSince(a.lastUsed || a.createdAt);
  // Recent use gets up to 50% boost, decaying over ~3 days
  return 1 + Math.exp(-d / 3) * 0.5;
}

function salience(a: Association): number {
  const ds = decayedStrength(a);
  const rb = recencyBoost(a);
  const exp = (a.exposures || 1) ** 0.25; // diminishing returns
  return ds * rb * exp;
}

function pruneAndDecay(list: Association[]): Association[] {
  // Apply decay and prune weak/ancient entries
  const now = Date.now();
  const kept = list
    .filter(a => {
      if (!isAssociationToken(a.left) || !isAssociationToken(a.right)) return false;
      const s = salience(a);
      const tooOld = daysSince(a.createdAt) > 120 && s < 0.2;
      return s >= 0.05 && !tooOld;
    })
    .sort((a, b) => salience(b) - salience(a));

  // Cap per persona to avoid runaway growth
  const MAX = 200;
  return kept.slice(0, MAX);
}
