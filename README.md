---

<div align="center">
  <img src="./public/assets/readmeicon.png" alt="ALTER EGO Logo" title="ALTER EGO Logo" />
</div>

---

# ALTER EGO PWA

ALTER EGO PWA is a Progressive Web Application that brings the power of the ALTER EGO AI interface to any modern web browser. Converse, learn, or just have fun chatting with historical figures, fictional characters, or entirely new creations right from your browser - no installation required.

***CURRENT VERSION: Alpha 1.0***

---

## Table of Contents

- [About ALTER EGO PWA](#about-alter-ego-pwa)
- [Features](#features)
- [System Requirements](#system-requirements)
- [Accessing the Application](#accessing-the-application)
- [Usage](#usage)
- [Known Issues](#known-issues)
- [Optimizations & Future Improvements](#optimizations--future-improvements)
- [Legal](#legal)
- [Credits](#credits)
- [Contact](#contact)

---

## About ALTER EGO PWA

ALTER EGO PWA is the web-based version of the popular ALTER EGO desktop application. It transforms how you interact with digital personas through any modern browser. This PWA leverages modern NLP models and voice synthesis to create realistic, engaging conversations with customizable AI characters.

Unlike the desktop version, ALTER EGO PWA runs entirely in your browser, eliminating the need for downloads, installations, or dedicated hardware. The web architecture ensures compatibility across devices while maintaining the core conversational AI experience that makes ALTER EGO special.

---

## Features

- **Customizable Personalities**:  
  Create, load, and switch between various personas. In addition to your custom characters, you can always revert to the default "ALTER EGO" persona.

- **Backend Model Selection**:  
  Choose your preferred language model backend:
  - **OpenAI GPT**: Robust responses (requires valid API key)

- **Persistent Conversation Memory**:  
  Conversations are stored in your browser's local storage, enabling context-aware responses and retrieval of chat history.

- **Realistic Voice Generation**:  
  Enjoy lifelike responses via ElevenLabs text-to-speech synthesis or use built-in browser speech capabilities.

- **In-Browser Settings Management**:  
  Comprehensive in-app menus let you manage API keys, voice models, personas, and conversation history.

- **Fully Responsive Design**:  
  Works seamlessly on desktop browsers, tablets, and mobile phones.

- **Installable PWA**:  
  Can be installed as a standalone application on supported devices, including desktop and mobile.

- **Offline Capability**:  
  Basic interface functions work offline, though API-dependent features require an internet connection.

---

## System Requirements

### Minimum Requirements:

- **Browser**: Chrome 76+, Firefox 72+, Safari 14.1+, Edge 79+
- **Memory**: 2 GB RAM
- **Internet**: 1+ Mbps connection (required for API access)
- **Devices**: Desktop, laptop, tablet, or modern smartphone

### Recommended Requirements:

- **Browser**: Latest Chrome, Firefox, Safari, or Edge
- **Memory**: 4+ GB RAM
- **Internet**: 5+ Mbps stable connection
- **Devices**: Desktop or laptop for optimal experience

---

## Accessing the Application

ALTER EGO PWA can be accessed in two ways:

1. **Visit the Live URL**:  
   Navigate to [https://l4w1i3t.github.io/Alter-Ego-PWA/](https://l4w1i3t.github.io/Alter-Ego-PWA/) in any modern browser

2. **Install as a PWA** (optional):  
   - **On Desktop**: Look for the "Install" icon in your browser's address bar
   - **On Mobile**: Tap the "Share" icon (iOS) or menu options (Android) and select "Add to Home Screen"

**Prerequisites**:
- Valid API keys for OpenAI and ElevenLabs if you wish to access those services
- Basic understanding of API keys and integration

---

## Usage

1. **First-Time Setup**:
   - On first launch, the application will guide you through setting up your API keys
   - Enter your OpenAI and/or ElevenLabs keys in the Settings panel

2. **Select Language Model**:  
   - Navigate to Settings and choose your preferred AI backend

3. **Manage Personas**:  
   - Use the "Load Character" button to choose a custom persona or select the built-in "ALTER EGO" default
   - Create, edit, or delete personas via the "Manage Personas" option in the settings menu

4. **Configure Voice**:
   - Set up voice models in the Settings panel
   - Choose between ElevenLabs premium voices or free browser-based speech synthesis

5. **Initiate Conversation**:  
   - Type your message into the query box and press Enter or click "Send"
   - The assistant processes your query using the selected language model and responds with text and synthesized voice

6. **Additional Tools**:  
   The settings panel includes options to manage API keys, voice models, view chat history, and clear conversation memory

---

## Known Issues

- **Voice Synthesis Quality**:  
  Browser-based speech synthesis quality varies significantly across devices and browsers

- **Mobile Optimization**:  
  While functional on mobile devices, the interface may require further optimization for smaller screens

- **API Limitations**:  
  Functions requiring API access (OpenAI, ElevenLabs) will not work offline or if API limits are exceeded

---

## Optimizations & Future Improvements

- **Performance Enhancements**:  
  Ongoing work to optimize application performance, especially on lower-powered devices

- **Enhanced Voice Integration**:  
  Future updates will include improved voice model management and quality

- **Additional AI Backends**:  
  Plans to incorporate additional language model options beyond current offerings

- **Speech Recognition**:
  Voice input capabilities are planned for future releases

---

## Legal

By using ALTER EGO PWA, you agree to the following:

- **API Terms of Service**:
  - OpenAI: [Terms](https://openai.com/policies/terms-of-use)
  - ElevenLabs: [Terms](https://elevenlabs.io/terms)

- **Content Responsibility**:
  - Users are responsible for ensuring that generated content complies with applicable laws
  - Do not use the software for harmful, unethical, or illegal activities

- **Privacy**:
  - All data is stored locally in your browser's storage
  - API interactions are subject to the respective API providers' privacy policies

---

## Credits

- **OpenAI GPT**: [OpenAI](https://openai.com)
- **ElevenLabs**: [ElevenLabs](https://www.elevenlabs.io)
- **React**: [React](https://reactjs.org)
- **TypeScript**: [TypeScript](https://www.typescriptlang.org)
- **Styled Components**: [Styled Components](https://styled-components.com)
- **Web Speech API**: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

## Contact

For questions, suggestions, or contributions, please open an issue on the repository at [https://github.com/L4w1i3t/Alter-Ego-PWA](https://github.com/L4w1i3t/Alter-Ego-PWA).

---