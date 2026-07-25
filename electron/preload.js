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

  // ── Updates ──

  /**
   * Downloads a release asset next to the running executable and resolves with
   * its path. The main process restricts this to HTTPS URLs on GitHub's own
   * release hosts.
   */
  downloadUpdate: (url, fileName) =>
    ipcRenderer.invoke('update:download', { url, fileName }),

  /** Shows a downloaded file in the OS file manager. */
  revealUpdate: (filePath) => ipcRenderer.invoke('update:reveal', filePath),

  /** Opens a release page in the user's real browser. */
  openReleasesPage: (url) => ipcRenderer.invoke('update:open-releases', url),

  /**
   * Forward a telemetry event to the experiment pipeline WebSocket relay.
   * Fire-and-forget (ipcRenderer.send), no response expected.
   */
  emitTelemetry: (event) => ipcRenderer.send('experiment-telemetry', event),

  // ── LAN Peer-to-Peer API ──

  /** Start LAN discovery and WebSocket server */
  lanStart: (personaName) => ipcRenderer.invoke('lan:start', personaName),

  /** Stop all LAN networking */
  lanStop: () => ipcRenderer.invoke('lan:stop'),

  /** Get current LAN status (running, connected, peers, role) */
  lanGetStatus: () => ipcRenderer.invoke('lan:get-status'),

  /** Get list of discovered peers */
  lanGetPeers: () => ipcRenderer.invoke('lan:get-peers'),

  /** Connect to a discovered peer by their instance ID */
  lanConnect: (peerId) => ipcRenderer.invoke('lan:connect', peerId),

  /** Disconnect from the currently connected peer */
  lanDisconnect: () => ipcRenderer.invoke('lan:disconnect'),

  /** Send a chat message to the connected peer */
  lanSendMessage: (content) => ipcRenderer.invoke('lan:send-message', content),

  /** Send a typing indicator to the peer */
  lanSendTyping: () => ipcRenderer.invoke('lan:send-typing'),

  /** Update the persona name for LAN display (fire-and-forget) */
  lanSetPersona: (name) => ipcRenderer.send('lan:set-persona', name),

  /** Register a callback for LAN events from the main process */
  onLanEvent: (channel, callback) => {
    const validChannels = [
      'lan:peer-discovered',
      'lan:peer-lost',
      'lan:connected',
      'lan:disconnected',
      'lan:peer-message',
      'lan:peer-typing',
    ];
    if (validChannels.includes(channel)) {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on(channel, listener);
      // Return a cleanup function
      return () => ipcRenderer.removeListener(channel, listener);
    }
  },
});
