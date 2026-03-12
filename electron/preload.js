/**
 * ALTER EGO - Electron Preload Script
 *
 * Exposes a safe, narrow bridge between the renderer (React app)
 * and the Electron main process via contextBridge.
 *
 * The renderer accesses these through `window.electronAPI`.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Returns true when the app is running inside Electron */
  isElectron: () => ipcRenderer.invoke('is-electron'),

  /**
   * Captures a screenshot of the primary display.
   * Returns a base64 data-URL string (image/png), or null on failure.
   * No data is sent anywhere -- processing stays entirely local.
   */
  captureScreen: () => ipcRenderer.invoke('capture-screen'),

  /** Toggles the overlay companion window on/off. Returns new state. */
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),

  /** Returns true if the overlay window is currently open */
  getOverlayState: () => ipcRenderer.invoke('get-overlay-state'),

  /** Set whether the overlay stays on top of all windows */
  setOverlayAlwaysOnTop: (value) => ipcRenderer.invoke('set-overlay-always-on-top', value),

  /** Switch between 'main' and 'overlay' mode (closes current window, opens the other) */
  switchMode: (mode) => ipcRenderer.invoke('switch-mode', mode),

  /** Returns the absolute path to the Electron userData directory (where DB and settings live) */
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
});
