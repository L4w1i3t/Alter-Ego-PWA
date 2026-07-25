/**
 * useAutonomy Hook
 *
 * Manages the lifecycle of autonomous (AI-initiated) messages.
 * Electron-only: the hook is a no-op when running as a plain PWA.
 *
 * Responsibilities:
 *  - Reads autonomy settings (enabled, interval, notifications).
 *  - Tracks time since last user-sent query to define "idle".
 *  - Schedules the next autonomous message via a jittered timer.
 *  - Calls sendQuery() through ApiContext and dispatches the standard
 *    'query-response' CustomEvent so both MainContent and Chat pick it up.
 *  - Sends an OS-level push notification when the app window is not focused.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useApi } from '../context/ApiContext';
import { loadSettings, getPersona } from '../utils/storageUtils';
import { isElectronEnvironment } from '../utils/electronUtils';
import { AUTONOMY, EVENTS } from '../config/constants';
import {
  buildConversationStarterPrompt,
  buildTopicContinuationPrompt,
  buildCooloffPrompt,
  computeNextInterval,
} from '../services/autonomyService';
import { logger } from '../utils/logger';

// ── Persist autonomy cooloff state across page reloads / app restarts ──
// Using sessionStorage so the freeze only survives within the same browser
// session (a full app quit naturally resets it).
const AUTO_STATE_KEY = 'alterEgo_autonomyState';

interface PersistedAutonomyState {
  consecutiveCount: number;
  cooloffSent: boolean;
  lastActivityTs: number;
}

function loadAutonomyState(): PersistedAutonomyState | null {
  try {
    const raw = sessionStorage.getItem(AUTO_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedAutonomyState;
  } catch {
    return null;
  }
}

function saveAutonomyState(state: PersistedAutonomyState): void {
  try {
    sessionStorage.setItem(AUTO_STATE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may be unavailable in rare cases; silently ignore.
  }
}

/**
 * Mounts an autonomous-message scheduler when running inside Electron
 * and the user has toggled the feature on.
 */
export function useAutonomy(): void {
  const { sendQuery, isLoading, conversationHistory, currentPersona } =
    useApi();

  // Restore persisted state so a page reload doesn't erase the cooloff freeze
  const persisted = loadAutonomyState();

  // Track the last time the user actually sent a query
  const lastActivityRef = useRef<number>(persisted?.lastActivityTs ?? Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard against overlapping sends
  const isSendingRef = useRef(false);
  // Track whether the hook should be active (read from settings)
  const enabledRef = useRef(false);
  const intervalRef = useRef<number>(AUTONOMY.DEFAULT_INTERVAL_MINUTES as number);
  const notificationsRef = useRef(false);
  // Track consecutive autonomous messages without a user reply
  const consecutiveCountRef = useRef(persisted?.consecutiveCount ?? 0);
  // Prevent sending more than one cooloff sign-off per idle streak
  const cooloffSentRef = useRef(persisted?.cooloffSent ?? false);

  /** Persist the current autonomy state to sessionStorage. */
  const persistState = useCallback(() => {
    saveAutonomyState({
      consecutiveCount: consecutiveCountRef.current,
      cooloffSent: cooloffSentRef.current,
      lastActivityTs: lastActivityRef.current,
    });
  }, []);

  // ------- Helpers -------

  /** Refresh cached settings values. */
  const syncSettings = useCallback(() => {
    const s = loadSettings();
    enabledRef.current = !!s.autonomyEnabled;
    intervalRef.current =
      s.autonomyIntervalMinutes ?? AUTONOMY.DEFAULT_INTERVAL_MINUTES;
    notificationsRef.current = !!s.autonomyNotifications;
  }, []);

  /** True when the user has been idle longer than the threshold. */
  const isUserIdle = useCallback(() => {
    return Date.now() - lastActivityRef.current >= AUTONOMY.IDLE_THRESHOLD_MS;
  }, []);

  // ------- Core send logic -------

  const sendAutonomousMessage = useCallback(async () => {
    // Bail-out conditions
    if (!enabledRef.current || isSendingRef.current || isLoading) return;
    if (!isElectronEnvironment()) return;
    // Only send when the user is idle to avoid interrupting active conversation
    if (!isUserIdle()) {
      scheduleNext();
      return;
    }
    // Stop if the AI has sent too many unanswered messages in a row.
    // On exactly hitting the limit, send a cooloff (sign-off) message first.
    if (consecutiveCountRef.current >= (AUTONOMY.MAX_CONSECUTIVE_MESSAGES as number)) {
      if (!cooloffSentRef.current) {
        cooloffSentRef.current = true;
        persistState();
        await sendCooloffMessage();
      }
      logger.debug(
        `[Autonomy] Reached ${AUTONOMY.MAX_CONSECUTIVE_MESSAGES} consecutive messages without reply — pausing until user responds`
      );
      return; // Don't schedule next; the counter resets on user-query
    }

    isSendingRef.current = true;

    try {
      const persona = getPersona(currentPersona);
      const personaContent = persona?.content ?? '';

      const hasRecentConversation = conversationHistory.length > 0;

      // Choose the appropriate system prompt based on conversation state
      const systemPrompt = hasRecentConversation
        ? buildTopicContinuationPrompt(
            personaContent,
            currentPersona,
            conversationHistory
          )
        : buildConversationStarterPrompt(personaContent, currentPersona);

      // Vary the behind-the-scenes nudge so the model doesn't fall into a
      // repetitive pattern from seeing the same instruction every time.
      const continuationNudges = [
        '[Surface one concrete thought from your current inner state -- do NOT rehash the last topic.]',
        '[Bring forward an unresolved tension, preference, or question that has become sharper.]',
        '[Pivot only if the pivot feels like your own curiosity, not a bid for engagement.]',
        '[Say something the user might not expect because it follows from your memory or developing taste.]',
        '[Ask a genuine question only if you actually have a specific curiosity.]',
      ];
      const starterNudges = [
        '[Start with a concrete thought from your current inner state.]',
        '[Share one observation, preference, or question that feels worth surfacing.]',
        '[Begin quietly but deliberately. Avoid generic conversation starters.]',
      ];
      const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

      const nudge = hasRecentConversation
        ? pickRandom(continuationNudges)
        : pickRandom(starterNudges);

      const result = await sendQuery(
        nudge,
        systemPrompt,
        undefined,
        currentPersona,
        undefined,
        { autonomous: true }
      );

      // Dispatch an autonomous-message event for any listeners that want to
      // distinguish proactive messages (e.g. for notification sounds).
      window.dispatchEvent(
        new CustomEvent('autonomous-message', {
          detail: {
            ...result,
            autonomous: true,
          },
        })
      );

      // Dispatch the standard query-response so existing listeners
      // (voice synthesis, avatar emotion, MainContent display) react normally.
      window.dispatchEvent(
        new CustomEvent('query-response', {
          detail: {
            ...result,
            autonomous: true,
          },
        })
      );

      logger.debug(
        `[Autonomy] Sent autonomous message for "${currentPersona}"`
      );

      // Increment consecutive counter and persist
      consecutiveCountRef.current += 1;
      persistState();

      // Send an OS push notification if the window is not focused
      if (notificationsRef.current && document.hidden) {
        try {
          const preview =
            result.response.length > 120
              ? result.response.slice(0, 117) + '...'
              : result.response;
          const notification = new Notification(currentPersona, {
            body: preview,
            silent: false,
          });
          // Clicking the notification focuses the app window
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (notifErr) {
          logger.warn('[Autonomy] Failed to show notification:', notifErr);
        }
      }
    } catch (err) {
      logger.error('[Autonomy] Failed to send autonomous message:', err);
    } finally {
      isSendingRef.current = false;
      scheduleNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sendQuery,
    isLoading,
    conversationHistory,
    currentPersona,
    isUserIdle,
  ]);

  // ------- Cooloff sign-off message -------

  /**
   * Send a final "I'll be quiet now" message when the consecutive limit is
   * reached. Uses a dedicated cooloff prompt so the AI stays in character
   * while acknowledging the user isn't responding.
   */
  const sendCooloffMessage = useCallback(async () => {
    if (isSendingRef.current || isLoading) return;
    isSendingRef.current = true;

    try {
      const persona = getPersona(currentPersona);
      const personaContent = persona?.content ?? '';

      const systemPrompt = buildCooloffPrompt(
        personaContent,
        currentPersona,
        conversationHistory
      );

      const nudge =
        '[The user has not responded to your recent messages. Acknowledge this gracefully and let them know you will be here when they return.]';

      const result = await sendQuery(
        nudge,
        systemPrompt,
        undefined,
        currentPersona,
        undefined,
        { autonomous: true }
      );

      window.dispatchEvent(
        new CustomEvent('autonomous-message', {
          detail: { ...result, autonomous: true },
        })
      );
      window.dispatchEvent(
        new CustomEvent('query-response', {
          detail: { ...result, autonomous: true },
        })
      );

      logger.debug(
        `[Autonomy] Sent cooloff sign-off for "${currentPersona}"`
      );

      // Send notification for cooloff message too
      if (notificationsRef.current && document.hidden) {
        try {
          const preview =
            result.response.length > 120
              ? result.response.slice(0, 117) + '...'
              : result.response;
          const notification = new Notification(currentPersona, {
            body: preview,
            silent: false,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (notifErr) {
          logger.warn('[Autonomy] Failed to show cooloff notification:', notifErr);
        }
      }
    } catch (err) {
      logger.error('[Autonomy] Failed to send cooloff message:', err);
    } finally {
      isSendingRef.current = false;
    }
  }, [sendQuery, isLoading, conversationHistory, currentPersona]);

  // ------- Scheduling -------

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Declared as a function so sendAutonomousMessage can reference it via hoisting.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function scheduleNext() {
    clearTimer();
    if (!enabledRef.current || !isElectronEnvironment()) return;

    const delayMs = computeNextInterval(intervalRef.current);
    logger.debug(
      `[Autonomy] Next message in ${(delayMs / 60_000).toFixed(1)} min`
    );
    timerRef.current = setTimeout(() => {
      sendAutonomousMessage();
    }, delayMs);
  }

  // ------- Activity tracking -------
  // Only track actual user-sent queries -- not mouse moves or key presses.
  // This means "idle" = the user hasn't sent a message in a while, so the AI
  // can reach out even if the user is browsing other apps with the window open.

  useEffect(() => {
    if (!isElectronEnvironment()) return;

    const bump = () => {
      lastActivityRef.current = Date.now();
      // User replied -- reset consecutive counter and restart scheduling
      const wasMaxed =
        consecutiveCountRef.current >= (AUTONOMY.MAX_CONSECUTIVE_MESSAGES as number);
      consecutiveCountRef.current = 0;
      cooloffSentRef.current = false;
      persistState();
      if (wasMaxed && enabledRef.current) {
        scheduleNext();
      }
    };

    window.addEventListener('user-query', bump);

    return () => {
      window.removeEventListener('user-query', bump);
    };
  }, []);

  // ------- React to settings changes -------

  useEffect(() => {
    if (!isElectronEnvironment()) return;

    const onSettingsChanged = () => {
      syncSettings();
      if (enabledRef.current) {
        scheduleNext();
      } else {
        clearTimer();
      }
    };

    // Initial sync
    onSettingsChanged();

    window.addEventListener(
      EVENTS.SETTINGS_UPDATED,
      onSettingsChanged as EventListener
    );
    return () => {
      window.removeEventListener(
        EVENTS.SETTINGS_UPDATED,
        onSettingsChanged as EventListener
      );
      clearTimer();
    };
    // Re-bind when core deps change so the scheduled callback captures fresh state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendAutonomousMessage, syncSettings, clearTimer]);
}
