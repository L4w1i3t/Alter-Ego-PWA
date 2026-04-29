/**
 * Time-awareness utility for system prompt injection.
 *
 * Generates a concise, human-readable temporal context string so the AI
 * understands what time it is for the user. Computed fresh on every call
 * to stay current across long sessions.
 */

type TimeOfDay = 'early morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late night';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Classify hour (0-23) into a human-friendly period label.
 */
const classifyTimeOfDay = (hour: number): TimeOfDay => {
  if (hour >= 5 && hour < 8) return 'early morning';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'night';
  return 'late night'; // 0-4
};

/**
 * Format a 24-hour value into 12-hour time with AM/PM.
 */
const formatTime12h = (hours: number, minutes: number): string => {
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${suffix}`;
};

/**
 * Try to resolve the user's IANA timezone name (e.g. "America/New_York").
 * Falls back to the numeric UTC offset if unavailable.
 */
const getTimezoneLabel = (now: Date): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    const offsetMin = now.getTimezoneOffset();
    const sign = offsetMin <= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const hh = Math.floor(absMin / 60).toString().padStart(2, '0');
    const mm = (absMin % 60).toString().padStart(2, '0');
    return `UTC${sign}${hh}:${mm}`;
  }
};

/**
 * Ordinal suffix for a day-of-month number (1st, 2nd, 3rd, 4th, ...).
 */
const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Build a compact temporal context block for the system prompt.
 *
 * Example output:
 *   "Current time: Tuesday, March 25th, 2026 at 2:47 PM (afternoon) | Timezone: America/New_York"
 */
export const buildTimeContext = (now: Date = new Date()): string => {
  const day = WEEKDAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const date = ordinal(now.getDate());
  const year = now.getFullYear();
  const time = formatTime12h(now.getHours(), now.getMinutes());
  const period = classifyTimeOfDay(now.getHours());
  const tz = getTimezoneLabel(now);

  return `Current time: ${day}, ${month} ${date}, ${year} at ${time} (${period}) | Timezone: ${tz}`;
};
