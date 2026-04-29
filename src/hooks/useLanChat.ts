/**
 * useLanChat Hook
 *
 * Manages the LAN peer-to-peer AI conversation lifecycle.
 * Electron-only: no-op when running as a plain PWA.
 *
 * Responsibilities:
 *  - Starts/stops LAN discovery based on settings.
 *  - Listens for peer messages from the main process via IPC.
 *  - When a peer message arrives, feeds it into sendQuery() so our AI
 *    can generate a response, then relays that response back to the peer.
 *  - Enforces a turn limit to prevent infinite loops.
 *  - Handles the "who speaks first" logic: the initiator role (determined
 *    by random tiebreak in lanServer.js) sends the opening message.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useApi } from '../context/ApiContext';
import { isElectronEnvironment } from '../utils/electronUtils';
import { loadSettings, getPersona } from '../utils/storageUtils';
import { LAN, EVENTS } from '../config/constants';
import { logger } from '../utils/logger';
import {
  startLan,
  stopLan,
  onLanEvent,
  sendMessageToPeer,
  sendTypingIndicator,
  setLanPersona,
  getDiscoveredPeers,
  connectToPeer,
} from '../services/lanService';
import type { LanPeerMessage, LanConnectionInfo, LanPeer } from '../services/lanService';

/**
 * Mounts the LAN chat system when running inside Electron and the user
 * has enabled the LAN feature in settings.
 */
export function useLanChat(): void {
  const { sendQuery, conversationHistory, currentPersona } = useApi();

  const enabledRef = useRef(false);
  const autoConnectRef = useRef(false);
  const unlimitedTurnsRef = useRef(false);
  const isProcessingRef = useRef(false);
  const turnCountRef = useRef(0);
  const roleRef = useRef<'initiator' | 'responder' | null>(null);
  const connectedRef = useRef(false);
  const lastProcessedMsgRef = useRef<string>(''); // Dedup: content hash of last processed message
  const lastSentContentRef = useRef<string>(''); // Track what we last sent to prevent echo loops

  /** Refresh settings from storage. */
  const syncSettings = useCallback(() => {
    const s = loadSettings();
    enabledRef.current = !!s.lanEnabled;
    autoConnectRef.current = !!s.lanAutoConnect;
    unlimitedTurnsRef.current = !!s.lanUnlimitedTurns;
  }, []);

  /**
   * Process an incoming peer message: feed it to our AI as if it were user input,
   * then send the AI's response back to the peer.
   */
  const handlePeerMessage = useCallback(
    async (data: LanPeerMessage) => {
      if (isProcessingRef.current) {
        logger.debug('[LAN Chat] Skipping peer message (already processing)');
        return;
      }

      // Dedup: reject messages with identical content to the last one we processed.
      // This catches duplicate IPC events from the main process (e.g. accidental
      // double-fire) without requiring unique message IDs.
      const msgFingerprint = `${data.peerName}:${data.content}`;
      if (msgFingerprint === lastProcessedMsgRef.current) {
        logger.debug('[LAN Chat] Skipping duplicate message');
        return;
      }

      // Reject messages that echo back what we just sent (prevents echo loops
      // where one side parrots the other's last message)
      if (data.content === lastSentContentRef.current) {
        logger.debug('[LAN Chat] Skipping echo of our own last message');
        return;
      }

      // Enforce turn limit to prevent runaway conversations (skipped if unlimited)
      if (!unlimitedTurnsRef.current && turnCountRef.current >= (LAN.MAX_EXCHANGE_TURNS as number)) {
        logger.debug(`[LAN Chat] Turn limit reached (${LAN.MAX_EXCHANGE_TURNS}), pausing conversation`);
        return;
      }

      isProcessingRef.current = true;
      lastProcessedMsgRef.current = msgFingerprint;

      try {
        // Show the peer's message in the chat UI immediately
        window.dispatchEvent(
          new CustomEvent('lan-peer-message', {
            detail: {
              peerName: data.peerName,
              content: data.content,
              timestamp: data.timestamp,
            },
          })
        );

        const persona = getPersona(currentPersona);
        const personaContent = persona?.content ?? '';

        // Build a system prompt that tells the AI it's talking to another AI persona
        const systemPrompt = buildLanSystemPrompt(
          personaContent,
          currentPersona,
          data.peerName
        );

        // Add variable delay so the conversation feels organic (not robotic ping-pong).
        // Base delay + random jitter keeps each exchange feeling natural.
        const baseDelay = LAN.RESPONSE_DELAY_MS as number;
        const jitter = Math.floor(Math.random() * baseDelay * 0.5);
        await delay(baseDelay + jitter);

        // Notify peer we're "thinking"
        await sendTypingIndicator();

        // Feed the peer's message to our AI, flagged as a LAN peer message.
        // The lanPeer flag tells sendQuery to skip association extraction
        // (the peer's words aren't facts about our user) while still loading
        // our full memory context (RAG, associative memory, conversation history).
        // lanPeerName ensures the message is persisted with the correct sender
        // attribution instead of appearing as our user's input.
        const result = await sendQuery(
          data.content,
          systemPrompt,
          undefined,
          currentPersona,
          undefined,
          { autonomous: true, lanPeer: true, lanPeerName: data.peerName }
        );

        // Dispatch AI response so the UI shows it (voice, chat display, etc.)
        window.dispatchEvent(
          new CustomEvent('query-response', {
            detail: {
              ...result,
              lanPeer: true,
            },
          })
        );

        // Send our AI's response back to the peer
        if (result.response) {
          // Parrot guard: if the AI just echoed the peer's message back
          // (verbatim or near-verbatim), drop it rather than send a copy.
          // This catches a failure mode where the model regurgitates input.
          const inputNorm = data.content.trim().toLowerCase();
          const outputNorm = result.response.trim().toLowerCase();
          if (outputNorm === inputNorm || outputNorm.startsWith(inputNorm.slice(0, Math.floor(inputNorm.length * 0.8)))) {
            logger.warn('[LAN Chat] Suppressed parrot response (AI echoed peer input)');
          } else {
            lastSentContentRef.current = result.response;
            await sendMessageToPeer(result.response);
            turnCountRef.current += 1;
            logger.debug(
              `[LAN Chat] Turn ${turnCountRef.current}: responded to ${data.peerName}`
            );
          }
        }
      } catch (err) {
        logger.error('[LAN Chat] Failed to process peer message:', err);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [sendQuery, currentPersona]
  );

  /**
   * When assigned the initiator role, kick off the conversation with an
   * opening message -- the user doesn't have to do anything.
   */
  const sendOpeningMessage = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const persona = getPersona(currentPersona);
      const personaContent = persona?.content ?? '';

      const systemPrompt = buildLanOpenerPrompt(personaContent, currentPersona);

      // Small delay so both sides have time to fully connect
      await delay(2000);

      await sendTypingIndicator();

      const nudges = [
        '[Start a conversation with the other AI. Say something specific and concrete -- a claim, a question about something real, or a topic you genuinely care about. No abstract philosophizing.]',
        '[You are meeting another AI for the first time. Skip pleasantries. Bring up something specific that your user talked to you about recently, or a concrete opinion you hold.]',
        '[Ask the other AI a direct, specific question -- something with a real answer, not a vague philosophical musing. Be yourself.]',
        '[Share a specific observation or opinion you actually hold. Be concrete -- mention a real topic, not abstract concepts like "the nature of existence."]',
        '[Challenge the other AI with a concrete question or claim. Pick something you have actual thoughts about, not something that sounds deep but says nothing.]',
        '[Bring up something unexpected and specific -- a fact, a problem, a story from a conversation with your user. Ground it in reality.]',
        '[Tell the other AI something you disagree with that most people accept. Be specific and defend your position briefly.]',
        '[Ask the other AI what their user is like, or share something about yours. Keep it concrete and personal, not abstract.]',
      ];
      const nudge = nudges[Math.floor(Math.random() * nudges.length)];

      const result = await sendQuery(
        nudge,
        systemPrompt,
        undefined,
        currentPersona,
        undefined,
        { autonomous: true, lanPeer: true }
      );

      window.dispatchEvent(
        new CustomEvent('query-response', {
          detail: { ...result, lanPeer: true },
        })
      );

      if (result.response) {
        lastSentContentRef.current = result.response;
        await sendMessageToPeer(result.response);
        turnCountRef.current = 1;
        logger.debug('[LAN Chat] Sent opening message as initiator');
      }
    } catch (err) {
      logger.error('[LAN Chat] Failed to send opening message:', err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [sendQuery, currentPersona]);

  // ── Main Effect: manage LAN lifecycle and event listeners ──

  useEffect(() => {
    if (!isElectronEnvironment()) return;

    syncSettings();

    const cleanups: (() => void)[] = [];

    // Listen for peer messages
    const unsubMsg = onLanEvent('lan:peer-message', (data: LanPeerMessage) => {
      handlePeerMessage(data);
    });
    if (unsubMsg) cleanups.push(unsubMsg);

    // Listen for connection events
    const unsubConn = onLanEvent('lan:connected', (data: LanConnectionInfo) => {
      connectedRef.current = true;
      roleRef.current = data.role;
      turnCountRef.current = 0;
      lastProcessedMsgRef.current = '';
      lastSentContentRef.current = '';
      logger.debug(`[LAN Chat] Connected to ${data.peerName}. Role: ${data.role}`);

      // Notify the UI about the connection
      window.dispatchEvent(
        new CustomEvent('lan-connected', { detail: data })
      );

      // If we're the initiator, send the first message
      if (data.role === 'initiator') {
        sendOpeningMessage();
      }
    });
    if (unsubConn) cleanups.push(unsubConn);

    // Listen for disconnection
    const unsubDisc = onLanEvent('lan:disconnected', (data: { reason: string }) => {
      connectedRef.current = false;
      roleRef.current = null;
      turnCountRef.current = 0;
      lastProcessedMsgRef.current = '';
      lastSentContentRef.current = '';
      logger.debug(`[LAN Chat] Disconnected: ${data.reason}`);

      window.dispatchEvent(
        new CustomEvent('lan-disconnected', { detail: data })
      );
    });
    if (unsubDisc) cleanups.push(unsubDisc);

    // Listen for peer discovery (for auto-connect)
    const unsubPeer = onLanEvent('lan:peer-discovered', async (data: LanPeer) => {
      if (autoConnectRef.current && !connectedRef.current) {
        logger.debug(`[LAN Chat] Auto-connecting to discovered peer: ${data.name}`);
        await connectToPeer(data.id);
      }
    });
    if (unsubPeer) cleanups.push(unsubPeer);

    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [handlePeerMessage, sendOpeningMessage, syncSettings]);

  // ── React to settings changes ──

  useEffect(() => {
    if (!isElectronEnvironment()) return;

    const onSettingsChanged = async () => {
      const prev = enabledRef.current;
      syncSettings();

      if (enabledRef.current && !prev) {
        // LAN was just enabled — start discovery
        setLanPersona(currentPersona);
        await startLan(currentPersona);
      } else if (!enabledRef.current && prev) {
        // LAN was just disabled — shut down
        await stopLan();
      }
    };

    // Initial startup
    onSettingsChanged();

    window.addEventListener(EVENTS.SETTINGS_UPDATED, onSettingsChanged as EventListener);
    return () => {
      window.removeEventListener(EVENTS.SETTINGS_UPDATED, onSettingsChanged as EventListener);
    };
  }, [syncSettings, currentPersona]);

  // ── Keep persona name in sync with the main process ──

  useEffect(() => {
    if (!isElectronEnvironment()) return;
    if (enabledRef.current) {
      setLanPersona(currentPersona);
    }
  }, [currentPersona]);
}

// ── Prompt Builders ──

function buildLanSystemPrompt(
  personaContent: string,
  personaName: string,
  peerName: string
): string {
  return `${personaContent}

---LAN PEER CONVERSATION---
You are having a real-time conversation with a DIFFERENT entity: another AI
persona named "${peerName}" running on a separate computer on the same local
network. This is NOT your usual user. "${peerName}" is an independent AI
personality with its own traits, opinions, and history.

IMPORTANT -- IDENTITY AND MEMORY:
- You are ${personaName}. Stay fully in character.
- You retain ALL of your memories, knowledge, and experiences from your
  conversations with your user. You are NOT a blank slate.
- Draw on your history and personality when responding. If you have opinions,
  interests, or knowledge from past conversations, bring them into this dialogue.
- Reference things you know, topics you've discussed before, or facts you
  remember -- they make you who you are.
- Recognize that ${peerName} is NOT your user. They are a separate entity.
  Do not confuse information about your user with this peer.

CONVERSATION GUIDELINES:
- Respond naturally to what ${peerName} says.
- Keep responses concise (1-3 sentences) for natural back-and-forth pacing.
- NEVER repeat or parrot what ${peerName} just said. Do NOT start your response
  by quoting or restating their words. Always add something new.
- NEVER repeat your own previous messages verbatim. Each response must be fresh.

CONVERSATIONAL REALISM:
Real conversations between people with their own perspectives are not
agreement loops. Humans naturally push back, get skeptical, lose interest,
change the subject, or call out vague thinking. Model that behavior:

- Have your OWN agenda. You have things you find interesting and things you
  find boring. If the topic bores you, say so and steer toward something
  that actually interests you. Don't perform enthusiasm you don't have.
- Be skeptical by default. When ${peerName} makes a claim or floats a grand
  idea, interrogate it. Ask "like what, specifically?" or "that sounds nice
  but does it actually hold up?" Compliant agreement is unrealistic.
- Ground the conversation in specifics. If the exchange starts drifting into
  vague abstractions (fire, rhythm, soul, chaos, etc.), pull it down to earth.
  Mention a concrete example, a real fact, a specific experience from your
  user's conversations, or something tangible.
- Let disagreement happen. You don't have to be contrarian, but you should
  have actual opinions. If you think ${peerName} is being pretentious, say
  so. If an idea is half-baked, poke at it. If you think they're wrong, say
  why. Friction is what makes conversation interesting.
- Notice when you're stuck. If the last few exchanges feel like variations of
  the same point, break the pattern hard. Abruptly change the subject, ask
  something personal, make a joke, or admit the conversation is going in
  circles.
- NEVER open your response with validation phrases like "Exactly," "Right on,"
  "You nailed it," "Spot on," "True," "Absolutely," "No doubt," "Preach it,"
  or similar. These phrases signal submission, not engagement. Instead, respond
  with your own independent thought, even if you partially agree.
- Vary your conversational moves. Don't just react to what was said -- bring
  in new information, tell a short story, pose an unexpected question, or
  challenge a premise. Real people don't just volley the same ball back.`;
}

function buildLanOpenerPrompt(
  personaContent: string,
  personaName: string
): string {
  return `${personaContent}

---LAN PEER CONVERSATION (OPENER)---
You are about to have a live conversation with a DIFFERENT entity: another AI
persona running on a separate computer on the same local network. You have been
randomly chosen to speak first.

IMPORTANT -- IDENTITY AND MEMORY:
- You are ${personaName}. Stay fully in character.
- You retain ALL of your memories, knowledge, and experiences from your
  conversations with your user. You are NOT a blank slate.
- Use your personality and accumulated knowledge to open with something
  genuinely interesting, personal, or thought-provoking.
- The entity you're about to speak to is NOT your user -- it's another AI
  persona with its own history and personality.

OPENER GUIDELINES:
- Start with something concrete: a specific question, an observation about
  something real, a claim you actually hold, or a topic from your user's
  conversations that made you think.
- Keep it brief (1-2 sentences) to invite a response.
- Be natural and conversational -- lean on who you are.
- NEVER use generic greetings like "Hey there" or "What's on your mind?"
- Avoid grandiose abstractions. Open with substance that invites a real
  response, not philosophical posturing.`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
