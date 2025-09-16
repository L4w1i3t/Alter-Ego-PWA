export type ChatMsg = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // optional images for vision history
};

interface BuildOpts {
  memoryPairs: number; // number of user/assistant pairs
  charBudget?: number; // rough character budget for all included messages
  minPairs?: number; // ensure at least this many pairs if possible
}

const DEFAULTS = {
  charBudget: 2000,
  minPairs: 1,
};

const isTrivial = (s: string): boolean => {
  const t = s.trim().toLowerCase();
  if (!t) return true;
  if (t.startsWith('error:')) return true;
  if (t === 'ok' || t === 'k' || t === 'thanks' || t === 'thank you')
    return true;
  if (t.length < 2) return true;
  return false;
};

const clip = (s: string, max: number): string => {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
};

const approxTokens = (s: string): number => Math.ceil(s.length / 4);

export function buildShortTermContext(
  history: ChatMsg[],
  opts: BuildOpts
): { pruned: ChatMsg[]; summary?: string } {
  const memoryPairs = Math.max(1, opts.memoryPairs);
  const charBudget = opts.charBudget ?? DEFAULTS.charBudget;
  const minPairs = opts.minPairs ?? DEFAULTS.minPairs;

  // Walk backwards, collect messages while roughly respecting pairs and budget
  const out: ChatMsg[] = [];
  let pairs = 0;
  let budgetLeft = charBudget;

  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role === 'system') continue; // system memory handled separately
    if (isTrivial(m.content)) continue;

    // Try truncating long content to keep more turns
    const maxLen = 600;
    const clipped = clip(m.content, maxLen);
    const images = (m as any).images as string[] | undefined;
    const cost = approxTokens(clipped) * 4;
    if (budgetLeft - cost < 0 && pairs >= minPairs) break;

    out.push({ role: m.role, content: clipped, ...(images && { images }) });
    budgetLeft -= cost;

    // Count pairs when we see a user message following an assistant (or vice versa)
    // (since we are iterating backwards, just count on user messages)
    if (m.role === 'user') pairs++;
    if (pairs >= memoryPairs && budgetLeft < charBudget * 0.25) break;
  }

  out.reverse();

  // Build a micro-summary from the last meaningful user message
  const lastUser = [...history]
    .reverse()
    .find(m => m.role === 'user' && !isTrivial(m.content));
  const summary = lastUser
    ? `Context: Recent focus — ${clip(lastUser.content.replace(/\s+/g, ' '), 140)}`
    : undefined;

  return { pruned: out, summary };
}
