---
<div align="center">
<img src="./public/assets/readmeicon.png" alt="ALTER EGO Logo" title="ALTER EGO Logo" />
</div>
---

# ALTER EGO

ALTER EGO is an AI conversational interface that lets you textually and verbally converse with custom digital personas. It ships as a **Progressive Web App** you can run in any modern browser and as a **native Electron desktop application** with additional features like an always-on-top overlay companion, LAN peer-to-peer chat, and autonomous messaging.

**_VERSION Alpha 1.0.0_**

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation & Running](#installation--running)
- [Configuration](#configuration)
- [Architecture Overview](#architecture-overview)
- [Known Issues](#known-issues)
- [Roadmap](#roadmap)
- [Legal](#legal)
- [Credits](#credits)
- [Contact](#contact)

---

## About

ALTER EGO combines modern hosted and local language models with voice synthesis, a cognitive-science-inspired memory system, and emotion detection to produce engaging, context-aware conversations with fully customizable AI characters. It began as a desktop experiment and has grown into a dual-platform application (web PWA + Electron desktop) with features like image vision analysis, autonomous messaging, and local network peer-to-peer AI dialogues.

All user data (API keys, conversation history, personas, settings) is stored **locally** -- either in the browser's IndexedDB or in the Electron app's portable data directory. Nothing is sent to external servers beyond the provider calls you configure.

---

## Features

### Core Conversation

- **Real-time AI chat** powered by OpenAI, OpenRouter, or local Ollama models with full Markdown rendering (GFM tables, code blocks, blockquotes, etc.).
- **Custom persona management** -- create, edit, import, and delete personas with unique system prompts and personalities. Two example personas (Marcus Kane, Luna Chen) are included.
- **Humanization engine** -- adaptive temperature scaling based on emotion/context, response-length mirroring, backchannel detection ("ok", "yeah", "thanks" produce short acknowledgments), and post-processing for natural conversational flow.

### Memory System (Three-Tier)

- **Episodic memory** -- full conversation history stored in IndexedDB via Dexie.js with temporal context and importance scoring.
- **Semantic / Associative memory** -- per-persona fact associations with Ebbinghaus forgetting-curve decay (14-day half-life), salience scoring, and background sync.
- **Working memory** -- active session context builder that selects recent messages within a character budget for each API call.

### Vision & Image Analysis

- **Image upload** (PNG, JPEG, GIF, WebP up to 10 MB) with AI-powered descriptions via OpenAI Vision API.
- **Smart image cache** with AI-generated descriptions so repeat queries avoid redundant API calls.
- **Image token analytics** dashboard to track vision API usage.
- **Image gallery** to browse and manage cached/analyzed images.

### Voice Synthesis

- **ElevenLabs text-to-speech** with multiple models (Multilingual v2, Monolingual v1, Turbo v2, English v2) and configurable stability, similarity boost, style, and speaker boost.
- **Browser-native Web Speech API** fallback for free, offline-capable voice output.

### Emotion Detection

- **28-label keyword heuristic classifier** (admiration, amusement, anger, curiosity, joy, sadness, surprise, and more) applied to both user and AI messages.
- Emotion category grouping (positive, negative, neutral, mixed) displayed in-chat when enabled.

### Electron Desktop Exclusive Features

- **Overlay companion** -- a compact, always-on-top, draggable mini-window with chat I/O and a "See my screen" button that captures the desktop via Electron's `desktopCapturer` and sends the screenshot to the AI for vision analysis.
- **Autonomy system** -- AI proactively initiates messages when the user is idle. Configurable interval (1-60 min), random jitter, max 3 consecutive unanswered messages before a cooloff sign-off, and OS-level push notifications.
- **LAN peer-to-peer** -- two ALTER EGO instances on the same local network discover each other via UDP multicast and converse autonomously over WebSocket transport. Configurable turn limit (default 20, or unlimited), response delay with jitter, and parrot-guard deduplication.
- **System tray** integration with Show Main / Show Overlay / Quit controls.
- **Portable builds** -- auto-detects portable executable directory (Windows `.exe`) or AppImage (Linux) for fully self-contained data storage.

### Security

- **AES-GCM encrypted API key storage** via the Web Crypto API.
- **Content Security Policy** injected in production builds.
- **Electron sandboxing** with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- **DevTools blocking** in production mode to prevent casual inspection.

### Data Management

- Full **export, import, and backup** of all app data (conversations, personas, settings, memories).
- **Factory reset** option to wipe everything and start fresh.

### Experiment Telemetry

- Built-in telemetry event pipeline (`query_start`, `query_complete`, `emotion_analysis`, `memory_retrieval`, `association_update`, etc.) for research use.
- In Electron, events are forwarded via IPC to a local WebSocket relay (port 45677). In PWA mode, events are buffered in-memory and manually exportable.
- Companion `experiments/` project with collection, analysis, and export scripts.

### Settings & Customization

| Setting                  | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| AI Models                | Choose the active provider and model: OpenAI, OpenRouter, or Ollama |
| Temperature / max tokens | Fine-tune response creativity and length                            |
| Text speed               | Characters-per-second typing animation                              |
| UI scaling               | Global font scale + response text scale + chat bubble width         |
| Timestamps               | Toggle message timestamps                                           |
| Compact mode             | Dense UI layout                                                     |
| Animations               | Toggle UI animations                                                |
| Immersive mode           | DevTools-blocking warnings                                          |
| Developer mode           | Debug info overlay                                                  |
| Memory buffer            | Number of recent message pairs included in context                  |
| Notification controls    | Duration and sound toggles                                          |
| Autonomy interval        | 1-60 min with 30% random jitter (Electron)                          |
| LAN toggle               | Enable/disable multicast discovery (Electron)                       |
| LAN auto-connect         | Auto-connect to first discovered peer (Electron)                    |
| LAN unlimited turns      | Remove the 20-turn conversation cap (Electron)                      |

---

## Tech Stack

| Layer    | Technology                                                               |
| -------- | ------------------------------------------------------------------------ |
| Frontend | React 19, TypeScript 6, Styled Components 6                              |
| Markdown | react-markdown 10 + remark-gfm + remark-breaks                           |
| Database | Dexie.js 4 (IndexedDB wrapper)                                           |
| IDs      | uuid 14                                                                  |
| Build    | Webpack 5, ts-loader, fork-ts-checker-webpack-plugin                     |
| Desktop  | Electron 41, electron-builder 26                                         |
| APIs     | OpenAI (Chat + Vision), OpenRouter, Ollama, ElevenLabs TTS               |
| Security | Web Crypto API (AES-GCM), CSP, Electron sandboxing                       |
| PWA      | Service Worker (cache-first static, network-first API), Web App Manifest |

---

## Installation & Running

### Prerequisites

- **Node.js** 20.9+ and **npm** 11+ (or equivalent package manager)
- API keys for **OpenAI** or **OpenRouter** when using hosted models
- **Ollama** when using local models
- Optional **ElevenLabs** API key for premium voice synthesis

### Clone the Repository

```bash
git clone https://github.com/L4w1i3t/Alter-Ego-PWA.git
cd Alter-Ego-PWA
npm install
```

### Run as a Web App (Development Server)

```bash
npm run dev
```

Opens a Webpack dev server at `http://localhost:3000` (or the next available port) with live reload.

### Build for Production (Web / GitHub Pages)

```bash
npm run build-prod
```

Output lands in `dist/`. To target GitHub Pages specifically:

```bash
cross-env GITHUB_PAGES=true npm run build-prod
```

### Run as an Electron Desktop App

```bash
# Build and launch in development mode
npm run electron:dev

# Or start Electron with an existing build
npm run electron:start

# Launch the overlay companion directly
npm run electron:overlay
```

### Build Distributable Desktop Packages

```bash
# Windows portable .exe
npm run electron:build:win

# Linux tar.gz
npm run electron:build:linux:tar

# Linux Arch (pacman .pkg.tar.zst)
npm run electron:build:linux:arch
```

Built packages are output to `electron-dist/`.

Desktop builds run a signing configuration check before `electron-builder` packages the app. electron-builder signs Windows and macOS builds automatically when signing credentials are available:

| Variable                      | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `CSC_LINK`                    | Path, URL, or base64 certificate data for macOS or Windows signing |
| `CSC_KEY_PASSWORD`            | Password for `CSC_LINK`                                            |
| `WIN_CSC_LINK`                | Optional Windows-specific certificate override                     |
| `WIN_CSC_KEY_PASSWORD`        | Optional Windows-specific certificate password                     |
| `CSC_NAME`                    | macOS keychain identity name when not using `CSC_LINK`             |
| `ELECTRON_SIGN_REQUIRED=true` | Fail the build if signing is not configured                        |
| `ELECTRON_SKIP_SIGNING=true`  | Intentionally build unsigned packages                              |

Use `npm run electron:build:unsigned` for an explicit unsigned build.

### Other Useful Commands

| Command                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run typecheck`     | Run TypeScript type checking without emitting |
| `npm run format`        | Format source files with Prettier             |
| `npm run format:check`  | Check formatting without writing              |
| `npm run build:analyze` | Production build with Webpack Bundle Analyzer |
| `npm run deps:check`    | Run depcheck for unused dependencies          |
| `npm run ci`            | Typecheck + production build (CI pipeline)    |
| `npm run ci:full`       | Typecheck + format check + production build   |
| `npm run clean`         | Remove `dist/` and `.webpack_cache/`          |

### Install as a PWA (from the Live URL)

1. Navigate to [https://l4w1i3t.github.io/Alter-Ego-PWA/](https://l4w1i3t.github.io/Alter-Ego-PWA/) in a modern browser.
2. **Desktop**: click the install icon in the address bar.
3. **Mobile**: tap Share (iOS) or the browser menu (Android) and select "Add to Home Screen".

---

## Configuration

On first launch the app shows a splash screen. Configure providers and keys at any time from **Settings**.

| Key                | Required                         | Purpose                                                             |
| ------------------ | -------------------------------- | ------------------------------------------------------------------- |
| OpenAI API Key     | Required for OpenAI provider     | Powers OpenAI chat and vision analysis                              |
| OpenRouter API Key | Required for OpenRouter provider | Powers OpenRouter chat models, including account-level BYOK routing |
| ElevenLabs API Key | Optional                         | Enables premium voice synthesis; browser TTS works without it       |

Provider, model, temperature, max output tokens, personas, voice models, memory, and UI settings are all managed through the in-app **Settings** panel -- no files to edit.

The **AI Models** panel searches built-in OpenAI presets, live OpenRouter models from `/api/v1/models`, and installed Ollama models from `/api/tags`. Custom model IDs can still be typed directly.

OpenRouter BYOK keys are configured in the OpenRouter account dashboard. ALTER EGO sends provider routing preferences that preserve BYOK priority, with controls for fallback models, provider order, provider allow-list, parameter support, data policy, and ZDR enforcement.

For local models, install Ollama, pull a model such as `llama3.1`, and choose **Settings > AI Models > Ollama**. The default Ollama URL is `http://127.0.0.1:11434`.

---

## Architecture Overview

```
src/
  index.tsx             # App entry point
  components/
    App.tsx             # Root: state orchestration, voice, layout
    Chat/               # ChatArea, ChatBubble, ChatInput
    Common/             # Shared UI (icons, modals, markdown, toasts, etc.)
    DevTools/           # Dev performance metrics overlay
    Footer/             # App footer
    Header/             # App header / title bar
    Overlay/            # Electron overlay companion
    Sections/           # Main content, splash screen, query area, character selector
    Settings/           # Full settings panel (API keys, AI models, personas, memory, voice, data, etc.)
  config/               # App constants and default values
  context/              # React context providers
  hooks/                # Custom hooks (useAppState, useAutonomy, useLanChat, etc.)
  memory/               # Three-tier memory system (episodic, semantic, working)
  services/             # Emotion service, image analysis queue, autonomy, LAN
  types/                # TypeScript type definitions
  utils/                # API clients, encryption, humanization, telemetry, etc.
electron/
  main.js               # Electron main process (windows, tray, IPC, telemetry relay)
  preload.js            # Secure contextBridge API
  lanServer.js          # UDP multicast discovery + WebSocket transport for LAN chat
api/                    # Serverless API endpoint stubs (ElevenLabs, OpenAI)
experiments/            # Separate npm project for telemetry collection and analysis
```

---

## Known Issues

- **Voice recognition (speech-to-text)** is not yet implemented -- text input only for now.
- **Ollama browser access** requires the local Ollama service to allow requests from the app origin.
- **Emotion detection** uses keyword heuristics and may produce false positives; ML-based classifiers are planned.
- **Voice synthesis latency** depends on internet speed (ElevenLabs) or browser engine quality (Web Speech API).
- **LAN mode** is limited to exactly two peers on the same network; multi-peer is not yet supported.
- **Screen capture overlay** requires Electron and is not available in the browser PWA.

---

## Roadmap

- Web Speech API voice input (speech-to-text)
- Broader local model provider support beyond Ollama
- ML-based emotion detection classifiers
- OCR and document processing for image analysis
- Plugin system for custom AI providers
- Multi-image batch analysis
- Conversation search and advanced filtering
- macOS desktop builds

---

## Legal

By using ALTER EGO, you agree to the following:

- **API Terms of Service**:
  - OpenAI: [Terms](https://openai.com/policies/terms-of-use)
  - OpenRouter: [Terms](https://openrouter.ai/terms)
  - ElevenLabs: [Terms](https://elevenlabs.io/terms)

- **Content Responsibility**:
  - Users are responsible for ensuring that generated content complies with applicable laws.
  - Do not use the software for harmful, unethical, or illegal activities.

- **Privacy**:
  - All data is stored locally (browser IndexedDB or Electron portable directory).
  - API calls are made directly to the respective providers; no intermediary server is involved.
  - API interactions are subject to the respective providers' privacy policies.

- **License**: [MIT](./LICENSE)

---

## Credits

- **OpenAI** -- GPT chat and vision models: [openai.com](https://openai.com)
- **OpenRouter** -- provider routing for hosted chat models: [openrouter.ai](https://openrouter.ai)
- **Ollama** -- local model runtime: [ollama.com](https://ollama.com)
- **ElevenLabs** -- Text-to-speech: [elevenlabs.io](https://www.elevenlabs.io)
- **React** -- UI framework: [react.dev](https://react.dev)
- **TypeScript** -- Type-safe JavaScript: [typescriptlang.org](https://www.typescriptlang.org)
- **Styled Components** -- CSS-in-JS: [styled-components.com](https://styled-components.com)
- **Dexie.js** -- IndexedDB wrapper: [dexie.org](https://dexie.org)
- **Electron** -- Desktop runtime: [electronjs.org](https://www.electronjs.org)
- **react-markdown** -- Markdown rendering: [github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown)
- **Web Speech API** -- Browser TTS: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

## Contact

For questions, suggestions, or contributions, please open an issue on the repository at [https://github.com/L4w1i3t/Alter-Ego-PWA](https://github.com/L4w1i3t/Alter-Ego-PWA).

If you enjoy ALTER EGO and want to support development, consider [buying a coffee on Ko-fi](https://ko-fi.com/l4w1i3t).

---
