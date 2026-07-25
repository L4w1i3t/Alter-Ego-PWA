import { createGlobalStyle } from 'styled-components';
import { loadSettings } from '../utils/storageUtils';

export const GlobalStyles = createGlobalStyle`  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
  
  /* Allow text selection on input elements */
  input, textarea, [contenteditable] {
    user-select: text !important;
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
  }
  :root {
    /* Defaults; will be updated at runtime from settings */
    --ae-overall-text-scale: 1;
    --ae-response-text-scale: 1;
    --ae-bubble-max-width: 70%;
    --ae-spacing-scale: 1;
    --ae-reduce-motion: 0; /* 1 to reduce */
    --ae-color-bg: #000;
    --ae-color-panel: #020a07;
    --ae-color-panel-strong: #001610;
    --ae-color-text: #0f0;
    --ae-color-text-muted: #0f08;
    --ae-color-cyan: #0ff;
    --ae-color-blue: #0af;
    --ae-color-warning: #fa0;
    --ae-color-danger: #f33;
    --ae-radius-sm: 4px;
    --ae-radius-md: 8px;
    --ae-focus-ring: 0 0 0 2px #000, 0 0 0 4px var(--ae-color-cyan);

    /*
     * Device safe areas (notch, status bar, gesture nav bar).
     *
     * These MUST stay outside any @supports(-webkit-touch-callout) block:
     * that condition is true only on iOS Safari, so gating on it left Android
     * -- including the Capacitor APK, which runs edge-to-edge under the status
     * and navigation bars on Android 15+ -- with no inset at all. That is what
     * put the header behind the system clock and the footer behind the gesture
     * bar. env() resolves to the 0px fallback anywhere insets do not apply, so
     * applying it unconditionally is safe on desktop and in the browser.
     */
    --ae-safe-top: env(safe-area-inset-top, 0px);
    --ae-safe-right: env(safe-area-inset-right, 0px);
    --ae-safe-bottom: env(safe-area-inset-bottom, 0px);
    --ae-safe-left: env(safe-area-inset-left, 0px);

    /*
     * Stacking order for every top-level layer, lowest to highest.
     *
     * These had drifted into hand-picked magic numbers (1000, 9000, 9999,
     * 10000, 12000, 99999, 999999) chosen per component with no shared scale,
     * which is how toasts at 10000 ended up rendering underneath the settings
     * overlay at 12000. Anything that escapes normal flow should pick a token
     * here rather than inventing a number.
     *
     * Only layers that are siblings in the app shell need to agree. A modal
     * creates its own stacking context, so z-index inside one is scoped to it
     * and is free to start over at 1.
     */
    --ae-z-banner: 900;      /* install / donation prompts */
    --ae-z-overlay: 1000;    /* splash, warm-up, character picker */
    --ae-z-modal: 1200;      /* settings and other full-screen panels */
    --ae-z-dialog: 1400;     /* confirmations raised above a modal */
    --ae-z-toast: 1600;      /* transient notifications -- must clear modals */
    --ae-z-devtools: 1800;   /* development-only instrumentation */
    --ae-z-critical: 2000;   /* blocking, app-level interrupts */
  }

  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    background: #000;
    color: #0f0;
    font-family: monospace, "Courier New", Courier;
    font-size: calc(16px * var(--ae-overall-text-scale));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    -webkit-tap-highlight-color: rgba(0, 255, 0, 0.1);
    -webkit-text-size-adjust: 100%;
  }
  @supports (height: 100dvh) {
    html {
      height: 100dvh;
    }
  }
  @media (max-width: 768px) {
    html, body {
      overflow-x: hidden;
      width: 100%;
    }
  }

  #root {
    height: 100%;
    width: 100%;
  }

  img {
    pointer-events: none;
  }

  button,
  input,
  select,
  textarea {
    font-family: inherit;
  }

  button,
  input:not([type="checkbox"]):not([type="range"]),
  select,
  textarea {
    color: var(--ae-color-text);
    background: var(--ae-color-bg);
    border: 1px solid var(--ae-color-text);
    padding: 0.55em 1em;
    border-radius: var(--ae-radius-sm);
    min-height: 40px;
    touch-action: manipulation;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45em;
    cursor: pointer;
    line-height: 1.2;
    transition:
      background 0.16s ease,
      border-color 0.16s ease,
      color 0.16s ease,
      opacity 0.16s ease,
      transform 0.16s ease;
  }

  button:hover:not(:disabled) {
    background: var(--ae-color-text);
    color: #000;
  }

  button:active:not(:disabled) {
    transform: translateY(1px);
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: none;
    box-shadow: var(--ae-focus-ring);
  }

  button:disabled,
  input:disabled,
  select:disabled,
  textarea:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  input[type="checkbox"] {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    min-width: 22px;
    min-height: 22px;
    padding: 0;
    border: 1px solid var(--ae-color-text);
    border-radius: var(--ae-radius-sm);
    background: #000;
    color: var(--ae-color-text);
    display: inline-grid;
    place-content: center;
    vertical-align: middle;
    cursor: pointer;
    transition:
      background 0.16s ease,
      border-color 0.16s ease,
      color 0.16s ease;
  }

  input[type="checkbox"]::before {
    content: '';
    width: 11px;
    height: 6px;
    border-left: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    opacity: 0;
    transform: rotate(-45deg) scale(0.75);
    transition:
      opacity 0.14s ease,
      transform 0.14s ease;
  }

  input[type="checkbox"]:checked {
    background: var(--ae-color-text);
    border-color: var(--ae-color-cyan);
    color: #000;
  }

  input[type="checkbox"]:checked::before {
    opacity: 1;
    transform: rotate(-45deg) scale(1);
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    min-width: 0;
    min-height: 28px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    border: 1px solid #0f06;
    border-radius: 999px;
    background: linear-gradient(90deg, #063 0%, #00140c 100%);
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    margin-top: -7px;
    border: 2px solid #000;
    border-radius: 50%;
    background: var(--ae-color-cyan);
    box-shadow: 0 0 0 1px var(--ae-color-cyan);
  }

  input[type="range"]::-moz-range-track {
    height: 6px;
    border: 1px solid #0f06;
    border-radius: 999px;
    background: linear-gradient(90deg, #063 0%, #00140c 100%);
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border: 2px solid #000;
    border-radius: 50%;
    background: var(--ae-color-cyan);
    box-shadow: 0 0 0 1px var(--ae-color-cyan);
  }

  input[type="range"]:disabled {
    cursor: not-allowed;
  }
  
  /* Ensure inputs work properly on mobile */
  input, textarea {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    /* Enable virtual keyboard */
    -webkit-user-select: text;
    user-select: text;
    /* Fix iOS zoom issues */
    font-size: 16px;
  }  /* Mobile-specific improvements */
  @media (max-width: 768px) {
    button,
    input:not([type="checkbox"]):not([type="range"]) {
      padding: 0.6em 0.8em;
      font-size: 16px; /* Prevent zoom on iOS */
    }

    input[type="checkbox"] {
      width: 24px;
      height: 24px;
      min-width: 24px;
      min-height: 24px;
    }

    input[type="range"] {
      min-height: 32px;
    }
    
    /* Specific input styling for mobile */
    input[type="text"], input[type="email"], input[type="password"], textarea {
      font-size: 16px !important; /* Prevent zoom on iOS */
      -webkit-appearance: none;
      -webkit-border-radius: 0;
      border-radius: 0.2em;
      -webkit-user-select: text !important;
      user-select: text !important;
    }

    select {
      font-size: 16px; /* Prevent zoom on iOS */
    }

    * {
      -webkit-tap-highlight-color: rgba(0, 255, 0, 0.2);
    }
  }

  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #000;
    border: 1px solid #0f0;
  }

  ::-webkit-scrollbar-thumb {
    background: #0f0;
    border-radius: 4px;
    border: 1px solid #000;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #8f8;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: #0f0 #000;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.001ms !important;
    }
  }
`;

// One-time sync of CSS variables from settings at app start.
// Components can also listen to the EVENTS.SETTINGS_UPDATED event to re-apply.
export const applySettingsToCssVariables = () => {
  try {
    const s = loadSettings();
    const root = document.documentElement;
    const overall = Math.min(1.6, Math.max(0.8, s.overallTextScale ?? 1));
    const response = Math.min(2, Math.max(0.8, s.responseTextScale ?? 1));
    const bubble = Math.min(90, Math.max(50, s.bubbleMaxWidthPercent ?? 70));
    root.style.setProperty('--ae-overall-text-scale', String(overall));
    root.style.setProperty('--ae-response-text-scale', String(response));
    root.style.setProperty('--ae-bubble-max-width', `${bubble}%`);
    // Spacing scale ties to compact mode: 0.9 when compact, else 1
    const spacingScale = s.compactMode ? 0.9 : 1;
    root.style.setProperty('--ae-spacing-scale', String(spacingScale));
    root.style.setProperty(
      '--ae-reduce-motion',
      s.animationsEnabled === false ? '1' : '0'
    );
  } catch {}
};
