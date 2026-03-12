// Global type declarations

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
}

interface Window {
  electronAPI?: ElectronAPI;
}
