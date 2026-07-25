// Global type declarations

declare module '*.css';

// __IS_DEV__ is injected by webpack's DefinePlugin at build time
// It reflects the build mode (--mode development or --mode production)
declare const __IS_DEV__: boolean;

/**
 * Electron bridge exposed via contextBridge in electron/preload.js.
 * Only available when the app is running inside Electron.
 */
interface ElectronAPI {
  isElectron: () => Promise<boolean>;
  captureScreen: () => Promise<string | null>;
  toggleOverlay: () => Promise<boolean>;
  getOverlayState: () => Promise<boolean>;
  setOverlayAlwaysOnTop: (value: boolean) => Promise<void>;
  switchMode: (mode: 'main' | 'overlay') => Promise<string>;
  getDataPath: () => Promise<string>;

  // Updates
  downloadUpdate?: (url: string, fileName: string) => Promise<string>;
  revealUpdate?: (filePath: string) => Promise<boolean>;
  openReleasesPage?: (url: string) => Promise<boolean>;
  /** Forward a telemetry event to the experiment pipeline via IPC. */
  emitTelemetry?: (event: import('./utils/experimentTelemetry').TelemetryEvent) => void;

  // LAN Peer-to-Peer API
  lanStart: (personaName: string) => Promise<{ success: boolean; instanceId: string }>;
  lanStop: () => Promise<boolean>;
  lanGetStatus: () => Promise<import('./services/lanService').LanStatus>;
  lanGetPeers: () => Promise<import('./services/lanService').LanPeer[]>;
  lanConnect: (peerId: string) => Promise<boolean>;
  lanDisconnect: () => Promise<boolean>;
  lanSendMessage: (content: string) => Promise<boolean>;
  lanSendTyping: () => Promise<boolean>;
  lanSetPersona: (name: string) => void;
  onLanEvent: (channel: string, callback: (data: any) => void) => (() => void) | undefined;
}

interface Window {
  electronAPI?: ElectronAPI;
}

/**
 * Build-time constants injected by webpack's DefinePlugin.
 * APP_VERSION mirrors package.json; BUILD_TARGET says which shell this bundle
 * was produced for.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    APP_VERSION: string;
    BUILD_TARGET: 'web' | 'electron' | 'capacitor';
  }
}
