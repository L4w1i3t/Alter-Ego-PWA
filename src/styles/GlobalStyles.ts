import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    /* Prevent overscroll on all elements */
    overscroll-behavior: none;
    -webkit-overscroll-behavior: none;
  }html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    background: #000;
    color: #0f0;
    font-family: monospace, "Courier New", Courier;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Improve mobile touch targets */
    -webkit-tap-highlight-color: rgba(0, 255, 0, 0.1);
    -webkit-text-size-adjust: 100%;
    /* Prevent overscroll/bounce scrolling on all devices */
    overscroll-behavior: none;
    -webkit-overscroll-behavior: none;
    /* Prevent pull-to-refresh and other overscroll behaviors */
    overscroll-behavior-y: none;
    overscroll-behavior-x: none;
    /* Additional mobile-specific prevention */
    touch-action: pan-x pan-y;
    -webkit-overflow-scrolling: auto;
  }  @media (max-width: 768px) {
    html, body {
      height: 100vh;
      height: -webkit-fill-available; /* iOS Safari fix */
      overflow-x: hidden;
      overflow-y: auto;
      width: 100%;
      max-width: 100vw;
      /* Enhanced overscroll prevention for mobile */
      overscroll-behavior: none;
      -webkit-overscroll-behavior: none;
      overscroll-behavior-y: none;
      overscroll-behavior-x: none;
      /* Prevent pull-to-refresh and elastic scrolling */
      -webkit-overflow-scrolling: auto;
      touch-action: pan-x pan-y;
      /* Disable rubber band scrolling on iOS */
      -webkit-appearance: none;
    }
  }
  #root {
    height: 100%;
    width: 100%;
    /* Prevent overscroll on the root element */
    overscroll-behavior: none;
    -webkit-overscroll-behavior: none;
    touch-action: pan-x pan-y;
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
    }
      /* Improve touch scrolling */
    * {
      -webkit-overflow-scrolling: touch;
      /* Override with auto for better overscroll control */
      -webkit-overflow-scrolling: auto;
      /* Prevent overscroll on all elements */
      overscroll-behavior: none;
      -webkit-overscroll-behavior: none;
    }
    
    /* Specific targeting for common overscroll elements */
    body, html, #root {
      overscroll-behavior: none !important;
      -webkit-overscroll-behavior: none !important;
      touch-action: pan-x pan-y !important;
    }
    
    /* Prevent pull-to-refresh specifically */
    body {
      -webkit-overflow-scrolling: auto !important;
      overscroll-behavior-y: none !important;
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
`;