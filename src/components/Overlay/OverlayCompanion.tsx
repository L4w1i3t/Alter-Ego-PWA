/**
 * OverlayCompanion
 *
 * A compact, draggable companion widget rendered when the app
 * is running in Electron's overlay window (?overlay=true).
 *
 * Features:
 *  - Draggable title bar
 *  - Compact chat input/output powered by the user's configured AI backend
 *  - "See my screen" button that captures the desktop and
 *    feeds the screenshot to the AI as context (no data leaves the device)
 *  - Minimize / close controls
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { captureScreen, isElectronEnvironment, switchMode } from '../../utils/electronUtils';
import { sendMessageToAI } from '../../services/aiService';
import {
  loadSettings,
  getPersona,
  loadApiKeys,
  loadChatHistory,
  saveChatHistory,
  getPersonaChatHistory,
} from '../../utils/storageUtils';
import type { MessageHistory } from '../../types';
import { UI } from '../../config/constants';

// ── Styled components ──

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.92);
  border: 1px solid #0f0;
  border-radius: 8px;
  overflow: hidden;
  font-family: monospace, 'Courier New', Courier;
  color: #0f0;
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4em 0.7em;
  background: rgba(0, 40, 0, 0.95);
  border-bottom: 1px solid #0f0;
  -webkit-app-region: drag;
  user-select: none;
  flex-shrink: 0;
`;

const TitleText = styled.span`
  font-size: 0.85em;
  font-weight: bold;
  letter-spacing: 0.08em;
`;

const TitleButtons = styled.div`
  display: flex;
  gap: 0.4em;
  -webkit-app-region: no-drag;
`;

const TitleBtn = styled.button`
  background: transparent;
  color: #0f0;
  border: 1px solid #0f04;
  border-radius: 3px;
  padding: 0.15em 0.45em;
  font-size: 0.75em;
  cursor: pointer;
  &:hover { background: #0f0; color: #000; }
`;

const ChatArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.6em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  font-size: 0.82em;
  line-height: 1.45;

  /* Scoped scrollbar styling matching the app theme */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: #000; }
  &::-webkit-scrollbar-thumb {
    background: #0f0;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover { background: #8f8; }
  scrollbar-width: thin;
  scrollbar-color: #0f0 #000;
`;

const Bubble = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'role',
})<{ role: 'user' | 'assistant' | 'system' }>`
  padding: 0.45em 0.65em;
  border-radius: 6px;
  max-width: 92%;
  word-break: break-word;
  align-self: ${p => (p.role === 'user' ? 'flex-end' : 'flex-start')};
  background: ${p =>
    p.role === 'user'
      ? 'rgba(0, 255, 0, 0.12)'
      : p.role === 'system'
        ? 'rgba(0, 128, 255, 0.12)'
        : 'rgba(0, 200, 0, 0.06)'};
  border: 1px solid ${p =>
    p.role === 'user' ? '#0f03' : p.role === 'system' ? '#0af3' : '#0f02'};
  color: ${p => (p.role === 'system' ? '#0af' : '#0f0')};
`;

const InputRow = styled.div`
  display: flex;
  gap: 0.4em;
  padding: 0.5em;
  border-top: 1px solid #0f03;
  flex-shrink: 0;
`;

const Input = styled.input`
  flex: 1;
  background: #000;
  border: 1px solid #0f0;
  border-radius: 4px;
  color: #0f0;
  padding: 0.35em 0.5em;
  font-family: inherit;
  font-size: 0.85em;
  outline: none;
  &:focus { border-color: #0f0; box-shadow: 0 0 4px #0f04; }
`;

const ActionBtn = styled.button`
  background: transparent;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 4px;
  padding: 0.3em 0.55em;
  font-size: 0.8em;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: #0f0; color: #000; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ScreenPreview = styled.img`
  max-width: 100%;
  max-height: 140px;
  border-radius: 4px;
  border: 1px solid #0f03;
  margin-top: 0.3em;
`;

const PrivacyNotice = styled.div`
  font-size: 0.7em;
  color: #0f06;
  text-align: center;
  padding: 0.3em 0.5em;
  border-top: 1px solid #0f02;
  flex-shrink: 0;
`;

// ── Types ──

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  screenshot?: string; // data-URL, kept local only
}

// ── Component ──

const OverlayCompanion: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Caps the display messages array to the configured limit
  const capMessages = (msgs: ChatMessage[]): ChatMessage[] => {
    if (msgs.length <= UI.DISPLAY_MESSAGE_CAP) return msgs;
    return msgs.slice(msgs.length - UI.DISPLAY_MESSAGE_CAP);
  };

  // Resolve the active persona name once; shared across helpers
  const getActivePersona = useCallback((): string => {
    const settings = loadSettings();
    return settings.activeCharacter || 'ALTER EGO';
  }, []);

  // Build the system prompt from the active persona, same as the main app
  const getSystemPrompt = useCallback((): string => {
    const persona = getPersona(getActivePersona());
    if (persona?.content) return persona.content;
    return 'You are ALTER EGO, an intelligent AI personality.';
  }, [getActivePersona]);

  /**
   * Persist current user/assistant messages back to the shared chat history
   * in localStorage so the main window sees the same conversation.
   */
  const persistMessages = useCallback(
    (msgs: ChatMessage[]) => {
      const personaName = getActivePersona();
      const allHistory = loadChatHistory();
      const entryIdx = allHistory.findIndex(e => e.persona === personaName);

      // Only persist actual conversation turns (skip system/status messages)
      const toStore = msgs
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date().toISOString(),
        }));

      if (entryIdx !== -1) {
        allHistory[entryIdx].messages = toStore;
        allHistory[entryIdx].timestamp = new Date().toISOString();
      } else {
        // Create a new session entry for this persona
        allHistory.push({
          id: crypto.randomUUID?.() ?? `${Date.now()}`,
          persona: personaName,
          timestamp: new Date().toISOString(),
          messages: toStore,
        });
      }
      saveChatHistory(allHistory);
    },
    [getActivePersona],
  );

  // Load persisted conversation + show a status message on mount
  useEffect(() => {
    const keys = loadApiKeys();
    const hasKey = !!keys.OPENAI_API_KEY;
    const personaName = getActivePersona();
    const existing = getPersonaChatHistory(personaName);

    const restored: ChatMessage[] = [];

    // Restore prior user/assistant turns from shared history
    if (existing?.messages?.length) {
      for (const m of existing.messages) {
        if (m.role === 'user' || m.role === 'assistant') {
          restored.push({ role: m.role, content: m.content });
        }
      }
    }

    // Append a status system message so the user knows the overlay is ready
    restored.push({
      role: 'system',
      content: hasKey
        ? `Overlay active as ${personaName}. Capture your screen or type a message.`
        : 'No OpenAI API key found. Set one in the main ALTER EGO window first.',
    });

    setMessages(capMessages(restored));
  }, [getActivePersona]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCapture = useCallback(async () => {
    if (!isElectronEnvironment()) return;
    setCapturing(true);
    try {
      const dataUrl = await captureScreen();
      if (dataUrl) {
        setLastScreenshot(dataUrl);
        setMessages(prev => [
          ...prev,
          {
            role: 'system',
            content: 'Screen captured. You can now ask me about what you see.',
            screenshot: dataUrl,
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'system', content: 'Screen capture failed or was denied.' },
        ]);
      }
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    // Append user message, capped for RAM safety
    const withUserMsg: ChatMessage[] = capMessages([
      ...messages,
      { role: 'user', content: trimmed },
    ]);
    setMessages(withUserMsg);
    setInput('');
    setSending(true);

    try {
      // Build conversation history for context (exclude system messages and screenshots)
      const history: MessageHistory[] = withUserMsg
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const systemPrompt = getSystemPrompt();

      // If we have a recent screenshot, send it as a vision image
      const images = lastScreenshot ? [lastScreenshot] : undefined;

      const response = await sendMessageToAI(
        trimmed,
        systemPrompt,
        history,
        undefined,
        images,
      );

      const withReply: ChatMessage[] = capMessages([
        ...withUserMsg,
        { role: 'assistant', content: response },
      ]);
      setMessages(withReply);

      // Persist to shared localStorage so main window stays in sync
      persistMessages(withReply);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [
        ...prev,
        { role: 'system', content: `Error: ${errMsg}` },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, lastScreenshot, getSystemPrompt, persistMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSwitchToMain = () => {
    switchMode('main');
  };

  const handleMinimize = () => {
    if (isElectronEnvironment()) {
      window.electronAPI?.setOverlayAlwaysOnTop(false);
    }
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <Wrapper>
      <TitleBar>
        <TitleText>ALTER EGO</TitleText>
        <TitleButtons>
          <TitleBtn onClick={handleSwitchToMain} title="Switch to full window">&#x26F6;</TitleBtn>
          <TitleBtn onClick={handleMinimize} title="Minimize">_</TitleBtn>
          <TitleBtn onClick={handleClose} title="Close">X</TitleBtn>
        </TitleButtons>
      </TitleBar>

      <ChatArea>
        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            <Bubble role={msg.role}>{msg.content}</Bubble>
            {msg.screenshot && (
              <ScreenPreview src={msg.screenshot} alt="Screen capture" />
            )}
          </React.Fragment>
        ))}
        <div ref={chatEndRef} />
      </ChatArea>

      <InputRow>
        <ActionBtn
          onClick={handleCapture}
          disabled={capturing}
          title="Capture your screen (stays local)"
        >
          {capturing ? '...' : 'Capture'}
        </ActionBtn>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your screen..."
        />
        <ActionBtn onClick={handleSend} disabled={!input.trim() || sending}>
          {sending ? '...' : 'Send'}
        </ActionBtn>
      </InputRow>

      <PrivacyNotice>
        All screen data stays on your device. Nothing is sent to external servers for training.
      </PrivacyNotice>
    </Wrapper>
  );
};

export default OverlayCompanion;
