import { createGlobalStyle } from 'styled-components';

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
  html, body {
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
  }
  @media (max-width: 768px) {
    html, body {
      height: 100vh;
      height: -webkit-fill-available; /* iOS Safari fix */
      overflow-x: hidden;
      overflow-y: auto;
      width: 100%;
      max-width: 100vw;
    }
  }

  #root {
    height: 100%;
    width: 100%;
  }

  img {
    pointer-events: none;
  }  button, input {
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
    button, input {
      padding: 0.6em 0.8em;
      font-size: 16px; /* Prevent zoom on iOS */
    }
    
    /* Specific input styling for mobile */
    input[type="text"], input[type="email"], input[type="password"], textarea {
      font-size: 16px !important; /* Prevent zoom on iOS */
      -webkit-appearance: none;
      -webkit-border-radius: 0;
      border-radius: 0.2em;
      /* Ensure virtual keyboard works */
      -webkit-user-select: text !important;
      user-select: text !important;
      /* Prevent auto-capitalization issues */
      autocapitalize: sentences;
      autocomplete: on;
      autocorrect: on;
      spellcheck: true;
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