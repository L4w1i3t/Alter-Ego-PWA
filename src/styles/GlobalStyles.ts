import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    /* CSS custom properties for dynamic viewport handling */
    --vh: 1vh;
    --safe-area-inset-top: env(safe-area-inset-top);
    --safe-area-inset-right: env(safe-area-inset-right);
    --safe-area-inset-bottom: env(safe-area-inset-bottom);
    --safe-area-inset-left: env(safe-area-inset-left);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    background: #000;
    color: #0f0;
    font-family: monospace, "Courier New", Courier;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Prevent overscrolling/bounce effect on mobile */
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
    /* Support for notched devices */
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    /* Improve mobile touch targets */
    -webkit-tap-highlight-color: rgba(0, 255, 0, 0.1);
    -webkit-text-size-adjust: 100%;
    /* Prevent pull-to-refresh */
    overscroll-behavior-y: contain;
  }  @media (max-width: 768px) {
    html, body {
      height: 100vh;
      height: 100dvh; /* Dynamic viewport height for better mobile support */
      height: -webkit-fill-available; /* iOS Safari fix */
      overflow-x: hidden;
      overflow-y: auto;
      width: 100%;
      max-width: 100vw;
      /* Enhanced overscroll prevention */
      overscroll-behavior: none;
      overscroll-behavior-y: contain;
      /* Prevent rubber band scrolling on iOS */
      -webkit-overflow-scrolling: touch;
      /* Full screen support */
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }
  }
  #root {
    height: 100%;
    width: 100%;
    /* Prevent overscrolling on the root element */
    overscroll-behavior: none;
  }

  img {
    pointer-events: none;
  }
  button, input {
    font-family: inherit;
    color: #0f0;
    background: #000;
    border: 1px solid #0f0;
    padding: 0.5em 1em;
    border-radius: 0.2em;
    /* Improve mobile touch targets */
    min-height: 40px;
    touch-action: manipulation;
  }
  /* Mobile-specific improvements */
  @media (max-width: 768px) {
    button, input {
      padding: 0.6em 0.8em;
      font-size: 16px; /* Prevent zoom on iOS */
    }
    
    select {
      font-size: 16px; /* Prevent zoom on iOS */
    }
    
    /* Better touch targets and spacing */
    * {
      -webkit-tap-highlight-color: rgba(0, 255, 0, 0.2);
    }
      /* Prevent horizontal scrolling */
    body {
      overflow-x: hidden;
      /* Additional overscroll prevention for mobile */
      overscroll-behavior: none;
      overscroll-behavior-y: contain;
      /* Prevent pull-to-refresh */
      touch-action: pan-x pan-y;
    }
    
    /* Prevent overscrolling on all scrollable elements */
    * {
      overscroll-behavior: none;
    }
      /* Improve touch scrolling */
    * {
      -webkit-overflow-scrolling: touch;
    }
    
    /* Additional mobile-specific optimizations */
    html, body, #root {
      /* Use dynamic viewport units for better support */
      height: calc(var(--vh, 1vh) * 100);
      max-height: calc(var(--vh, 1vh) * 100);
    }
    
    /* Prevent zoom on input focus */
    input, textarea, select {
      font-size: 16px !important;
      transform-origin: left top;
    }
  }

  button:hover {
    background: #0f0;
    color: #000;
    cursor: pointer;
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

  /* Mobile fullscreen and immersive mode styles */
  .fullscreen-mode {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    z-index: 9999;
    background: #000;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    overscroll-behavior: none;
    overflow: hidden;
  }

  .immersive-mode {
    -webkit-app-region: no-drag;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* PWA fullscreen mode detection */
  @media (display-mode: fullscreen) {
    .pwa-fullscreen {
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }

  /* Standalone PWA mode */
  @media (display-mode: standalone) {
    .pwa-standalone {
      -webkit-user-select: none;
      user-select: none;
    }
  }

  /* iOS specific optimizations */
  @supports (-webkit-touch-callout: none) {
    .ios-optimized {
      -webkit-overflow-scrolling: touch;
      -webkit-appearance: none;
      touch-action: manipulation;
    }
    
    .ios-optimized input,
    .ios-optimized textarea,
    .ios-optimized select {
      font-size: 16px !important;
    }
  }
  /* Landscape orientation handling */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    .mobile-optimized {
      padding: 0.5rem;
      font-size: 0.9em;
    }
  }
`;