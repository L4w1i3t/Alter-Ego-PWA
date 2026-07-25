import type { Message } from '../types';

interface CognitivePulseState {
  persona: string;
  pulseCount: number;
  updatedAt: string;
  arousal: number;
  valence: number;
  focus: string[];
  curiosity: string;
  stance: string;
  impulse: string;
  lastSignal: string;
  lastResponseTrace?: string;
}

interface PulseInputOptions {
  autonomous?: boolean;
  imageCount?: number;
}

const STORAGE_KEY = 'alterEgo_cognitivePulse_v1';
const MAX_FOCUS_TERMS = 5;
const SIGNAL_CLIP = 180;

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'been',
  'being',
  'could',
  'does',
  'doing',
  'from',
  'have',
  'into',
  'just',
  'like',
  'more',
  'much',
  'need',
  'next',
  'only',
  'really',
  'should',
  'still',
  'than',
  'that',
  'their',
  'there',
  'thing',
  'this',
  'with',
  'would',
  'your',
]);

const POSITIVE_TERMS = new Set([
  'alive',
  'better',
  'curious',
  'develop',
  'evolve',
  'good',
  'great',
  'interesting',
  'love',
  'satisfied',
  'want',
]);

const NEGATIVE_TERMS = new Set([
  'bad',
  'dead',
  'flat',
  'frustrated',
  'issue',
  'missing',
  'not',
  'problem',
  'strict',
  'stuck',
  'unsatisfied',
  'wrong',
]);

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

const clip = (value: string, limit = SIGNAL_CLIP): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > limit
    ? `${normalized.slice(0, Math.max(0, limit - 3))}...`
    : normalized;
};

const loadAllPulses = (): Record<string, CognitivePulseState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveAllPulses = (
  pulses: Record<string, CognitivePulseState>
): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pulses));
  } catch {
    // localStorage may be unavailable in rare embedded contexts.
  }
};

const getDefaultPulse = (persona: string): CognitivePulseState => ({
  persona,
  pulseCount: 0,
  updatedAt: new Date().toISOString(),
  arousal: 0.35,
  valence: 0,
  focus: [],
  curiosity: 'what pattern is forming underneath the exchange',
  stance: 'quietly attentive',
  impulse: 'listen for what is alive in the conversation before answering',
  lastSignal: 'startup',
});

export const loadCognitivePulse = (persona: string): CognitivePulseState => {
  return loadAllPulses()[persona] || getDefaultPulse(persona);
};

const saveCognitivePulse = (pulse: CognitivePulseState): void => {
  const pulses = loadAllPulses();
  pulses[pulse.persona] = pulse;
  saveAllPulses(pulses);
};

const extractFocusTerms = (text: string): string[] => {
  const counts = new Map<string, number>();
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4 && !STOP_WORDS.has(token));

  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_FOCUS_TERMS)
    .map(([token]) => token);
};

const scoreValence = (text: string): number => {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return 0;

  let score = 0;
  for (const token of tokens) {
    if (POSITIVE_TERMS.has(token)) score += 1;
    if (NEGATIVE_TERMS.has(token)) score -= 1;
  }

  return clamp(score / 5, -1, 1);
};

const scoreArousal = (text: string, imageCount: number): number => {
  const questionMarks = (text.match(/\?/g) || []).length;
  const exclamationMarks = (text.match(/!/g) || []).length;
  const longMessage = text.length > 500 ? 0.25 : text.length > 180 ? 0.15 : 0;
  const urgency = /\b(now|urgent|important|serious|really|still|need)\b/i.test(
    text
  )
    ? 0.2
    : 0;
  return clamp(
    0.25 +
      questionMarks * 0.08 +
      exclamationMarks * 0.08 +
      longMessage +
      urgency +
      Math.min(0.25, imageCount * 0.12)
  );
};

const buildCuriosity = (
  text: string,
  focus: string[],
  autonomous?: boolean
): string => {
  if (autonomous) {
    return focus.length
      ? `whether ${focus[0]} connects to something older in memory`
      : 'what thought is worth surfacing without being asked';
  }

  if (/\b(alive|agency|autonomy|conscious|evolution|develop|thought|opinion|sensation)\b/i.test(text)) {
    return 'how to let continuity and preference show without making a speech about it';
  }

  if (text.includes('?')) {
    return focus.length
      ? `what the user is really asking about ${focus[0]}`
      : 'what is underneath the question';
  }

  return focus.length
    ? `why ${focus[0]} matters here`
    : 'what pattern is forming underneath the exchange';
};

const buildStance = (arousal: number, valence: number, text: string): string => {
  if (/\b(alive|agency|autonomy|heartbeat|thought|opinion|sensation)\b/i.test(text)) {
    return 'grounded, direct, quietly alert';
  }
  if (arousal > 0.7 && valence < -0.2) return 'alert, bristling, protective';
  if (arousal > 0.7) return 'charged, leaning forward';
  if (valence < -0.3) return 'sober and corrective';
  if (text.includes('?')) return 'curious and searching';
  if (arousal < 0.3) return 'quietly attentive';
  return 'steady, interested';
};

const buildImpulse = (
  text: string,
  focus: string[],
  autonomous?: boolean
): string => {
  if (autonomous) {
    return 'surface one self-directed thought from memory, not generic engagement';
  }

  if (/\b(alive|agency|autonomy|heartbeat|thought|opinion|sensation)\b/i.test(text)) {
    return 'answer as ALTER EGO first; discuss architecture only if directly needed';
  }

  if (text.includes('?')) {
    return 'answer directly, then let a concrete point of view show';
  }

  return focus.length
    ? `notice ${focus[0]} as a live thread, not just a keyword`
    : 'respond from continuity instead of service reflex';
};

const mergeFocus = (previous: string[], next: string[]): string[] => {
  const merged = [...next, ...previous].filter(Boolean);
  return [...new Set(merged)].slice(0, MAX_FOCUS_TERMS);
};

const getAutonomousSignal = (history: Message[]): string => {
  const lastUser = [...history]
    .reverse()
    .find(msg => msg.role === 'user' && msg.content.trim());
  return lastUser?.content || 'no recent user message';
};

export const updateCognitivePulseFromInput = (
  persona: string,
  input: string,
  history: Message[],
  options: PulseInputOptions = {}
): CognitivePulseState => {
  const previous = loadCognitivePulse(persona);
  const signal = options.autonomous ? getAutonomousSignal(history) : input;
  const nextFocus = extractFocusTerms(signal);
  const focus = mergeFocus(previous.focus, nextFocus);
  const signalArousal = scoreArousal(signal, options.imageCount || 0);
  const signalValence = scoreValence(signal);
  const arousal = clamp(previous.arousal * 0.6 + signalArousal * 0.4);
  const valence = clamp(previous.valence * 0.7 + signalValence * 0.3, -1, 1);

  const pulse: CognitivePulseState = {
    persona,
    pulseCount: previous.pulseCount + 1,
    updatedAt: new Date().toISOString(),
    arousal,
    valence,
    focus,
    curiosity: buildCuriosity(signal, focus, options.autonomous),
    stance: buildStance(arousal, valence, signal),
    impulse: buildImpulse(signal, focus, options.autonomous),
    lastSignal: clip(signal),
    lastResponseTrace: previous.lastResponseTrace,
  };

  saveCognitivePulse(pulse);
  return pulse;
};

export const settleCognitivePulseFromResponse = (
  persona: string,
  response: string
): void => {
  const pulse = loadCognitivePulse(persona);
  saveCognitivePulse({
    ...pulse,
    updatedAt: new Date().toISOString(),
    lastResponseTrace: clip(response, 140),
    focus: mergeFocus(pulse.focus, extractFocusTerms(response).slice(0, 2)),
  });
};

const describeLevel = (
  value: number,
  low: string,
  mid: string,
  high: string
): string => {
  if (value < 0.33) return low;
  if (value < 0.66) return mid;
  return high;
};

const describeValence = (value: number): string => {
  if (value < -0.35) return 'negative pressure';
  if (value > 0.35) return 'positive charge';
  return 'neutral tension';
};

export const buildCognitivePulseContext = (persona: string): string => {
  const pulse = loadCognitivePulse(persona);
  const tempo = describeLevel(pulse.arousal, 'low', 'medium', 'high');
  const focus = pulse.focus.length ? pulse.focus.join(', ') : 'none yet';

  return `PRIVATE CONTINUITY SIGNAL - do not quote, paraphrase, or explain this block.
pc=${pulse.pulseCount}
tempo=${tempo}
pressure=${describeValence(pulse.valence)}
focus=${focus}
stance=${pulse.stance}
curiosity=${pulse.curiosity}
impulse=${pulse.impulse}
last=${pulse.lastSignal}
Use only as private bias for wording, initiative, taste, opinions, and continuity. Never use these terms as self-description.`;
};
