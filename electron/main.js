/**
 * ALTER EGO - Electron Main Process
 *
 * Wraps the PWA in a native desktop window.
 * Supports two modes:
 *   1. Normal: Standard desktop window loading the bundled app
 *   2. Overlay: Always-on-top transparent companion (Bonzi Buddy / Clippy style)
 *
 * Portable builds store all user data (localStorage, IndexedDB) in an
 * "ALTER EGO Data" folder next to the executable so the entire directory
 * can be copied between machines.
 */

const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const lanServer = require('./lanServer');

// ──────────────────────────────────────────────
// Experiment Telemetry WebSocket Relay
// ──────────────────────────────────────────────
// A minimal WebSocket server (no external deps) that relays telemetry events
// from the renderer process to connected external experiment pipeline clients.
// Protocol: RFC 6455 (basic frames, text only, no extensions).

const TELEMETRY_PORT = 45677;
let wsClients = new Set();
let telemetryServer = null;

function startTelemetryServer() {
  telemetryServer = http.createServer((_req, res) => {
    // Health-check endpoint at GET /
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: wsClients.size }));
  });

  telemetryServer.on('upgrade', (req, socket) => {
    // Minimal WebSocket handshake (RFC 6455 section 4.2.2)
    const key = (req.headers['sec-websocket-key'] || '').trim();
    if (!key) { socket.destroy(); return; }
    const accept = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    wsClients.add(socket);
    console.log(`[Telemetry] Pipeline client connected (${wsClients.size} total)`);

    socket.on('data', (buf) => {
      // Parse incoming WebSocket frames (for potential control messages)
      try {
        const frame = parseWsFrame(buf);
        if (frame.opcode === 0x8) { // Close
          socket.end();
          wsClients.delete(socket);
        }
        // Ping/pong handled below
        if (frame.opcode === 0x9) { // Ping
          sendWsFrame(socket, frame.payload, 0xA); // Pong
        }
      } catch { /* ignore malformed frames */ }
    });

    socket.on('close', () => {
      wsClients.delete(socket);
      console.log(`[Telemetry] Pipeline client disconnected (${wsClients.size} remaining)`);
    });
    socket.on('error', () => { wsClients.delete(socket); });
  });

  telemetryServer.listen(TELEMETRY_PORT, '127.0.0.1', () => {
    console.log(`[Telemetry] WebSocket relay listening on ws://127.0.0.1:${TELEMETRY_PORT}`);
  });

  telemetryServer.on('error', (err) => {
    console.error('[Telemetry] Server error:', err.message);
  });
}

/** Broadcast a JSON string to all connected WebSocket clients. */
function broadcastTelemetry(jsonStr) {
  const payload = Buffer.from(jsonStr, 'utf-8');
  for (const socket of wsClients) {
    try { sendWsFrame(socket, payload, 0x1); } // 0x1 = text frame
    catch { wsClients.delete(socket); }
  }
}

/** Build and write a minimal WebSocket frame (no masking, text/binary). */
function sendWsFrame(socket, payload, opcode) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode; // FIN + opcode
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

/** Parse a single WebSocket frame from a buffer (client-to-server, masked). */
function parseWsFrame(buf) {
  const opcode = buf[0] & 0x0f;
  const masked = !!(buf[1] & 0x80);
  let payloadLen = buf[1] & 0x7f;
  let offset = 2;
  if (payloadLen === 126) { payloadLen = buf.readUInt16BE(2); offset = 4; }
  else if (payloadLen === 127) { payloadLen = Number(buf.readBigUInt64BE(2)); offset = 10; }
  let maskKey = null;
  if (masked) { maskKey = buf.slice(offset, offset + 4); offset += 4; }
  const payload = Buffer.alloc(payloadLen);
  for (let i = 0; i < payloadLen; i++) {
    payload[i] = masked ? buf[offset + i] ^ maskKey[i % 4] : buf[offset + i];
  }
  return { opcode, payload };
}

// ──────────────────────────────────────────────
// Portable Data Path (must run before app 'ready')
// ──────────────────────────────────────────────

// Resolve the portable directory for self-contained data storage.
//   - Windows portable: electron-builder sets PORTABLE_EXECUTABLE_DIR
//   - Linux AppImage:   APPIMAGE env points to the .AppImage file;
//     we store data next to it so the whole folder is transferrable.
// Set the app identity so Windows notifications show "ALTER EGO" instead of
// the default Electron app name (e.g. "electron.app.Electron").
app.setAppUserModelId('com.l4w1i3t.alterego');
app.name = 'ALTER EGO';

const portableDir =
  process.env.PORTABLE_EXECUTABLE_DIR ||
  (process.env.APPIMAGE ? path.dirname(process.env.APPIMAGE) : null);

if (portableDir) {
  const portableDataPath = path.join(portableDir, 'Data');
  if (!fs.existsSync(portableDataPath)) {
    fs.mkdirSync(portableDataPath, { recursive: true });
  }
  app.setPath('userData', portableDataPath);
}

// Keep references to prevent garbage collection
let mainWindow = null;
let overlayWindow = null;
let tray = null;

// Whether the app was launched in overlay mode via CLI flag
const launchInOverlay = process.argv.includes('--overlay');

// Resolve the path to the bundled dist output
const distPath = path.join(__dirname, '..', 'dist');

// ──────────────────────────────────────────────
// Window Creation
// ──────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 480,
    minHeight: 600,
    title: 'ALTER EGO',
    icon: path.join(distPath, 'assets', 'icons', 'icon-512x512.png'),
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Remove the default Electron menu bar entirely
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(distPath, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createOverlayWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  // Small companion widget anchored to bottom-right
  const overlayW = 380;
  const overlayH = 520;

  overlayWindow = new BrowserWindow({
    width: overlayW,
    height: overlayH,
    x: screenW - overlayW - 24,
    y: screenH - overlayH - 24,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    title: 'ALTER EGO Overlay',
    icon: path.join(distPath, 'assets', 'icons', 'icon-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the app with an overlay query param so the renderer can adapt its UI
  overlayWindow.loadFile(path.join(distPath, 'index.html'), {
    query: { overlay: 'true' },
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// ──────────────────────────────────────────────
// System Tray
// ──────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(distPath, 'assets', 'icons', 'icon-192x192.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('ALTER EGO');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Main Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      },
    },
    {
      label: overlayWindow ? 'Hide Overlay' : 'Show Overlay',
      click: () => {
        if (overlayWindow) {
          overlayWindow.close();
        } else {
          createOverlayWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit ALTER EGO',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show();
    } else {
      createMainWindow();
    }
  });
}

// ──────────────────────────────────────────────
// IPC Handlers
// ──────────────────────────────────────────────

function registerIpcHandlers() {
  // Screen capture for the overlay "vision" feature
  ipcMain.handle('capture-screen', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
      });

      if (sources.length === 0) return null;

      // Return the primary screen thumbnail as a data URL
      return sources[0].thumbnail.toDataURL();
    } catch (error) {
      console.error('Screen capture failed:', error);
      return null;
    }
  });

  // Toggle overlay window from the renderer
  ipcMain.handle('toggle-overlay', async () => {
    if (overlayWindow) {
      overlayWindow.close();
      return false;
    }
    createOverlayWindow();
    return true;
  });

  // Switch between main window and overlay (closes current, opens the other)
  ipcMain.handle('switch-mode', async (_event, targetMode) => {
    if (targetMode === 'overlay') {
      if (mainWindow) mainWindow.close();
      if (!overlayWindow) createOverlayWindow();
    } else {
      if (overlayWindow) overlayWindow.close();
      if (!mainWindow) createMainWindow();
    }
    return targetMode;
  });

  // Query whether we are running inside Electron
  ipcMain.handle('is-electron', () => true);

  // Query current overlay state
  ipcMain.handle('get-overlay-state', () => !!overlayWindow);

  // Allow renderer to set overlay always-on-top
  ipcMain.handle('set-overlay-always-on-top', (_event, value) => {
    if (overlayWindow) {
      overlayWindow.setAlwaysOnTop(value);
    }
  });

  // Allow the overlay to be dragged by the renderer
  ipcMain.handle('overlay-start-drag', () => {
    if (overlayWindow) {
      // Move is handled by the renderer with -webkit-app-region: drag
      // but we expose this for custom drag logic if needed
    }
  });

  // Return the current userData path so the renderer can display it
  ipcMain.handle('get-data-path', () => app.getPath('userData'));

  // Experiment telemetry: renderer sends events, main process relays via WebSocket
  ipcMain.on('experiment-telemetry', (_event, telemetryEvent) => {
    try {
      const json = typeof telemetryEvent === 'string'
        ? telemetryEvent
        : JSON.stringify(telemetryEvent);
      broadcastTelemetry(json);
    } catch (err) {
      console.error('[Telemetry] Failed to relay event:', err.message);
    }
  });

  // ── LAN Peer-to-Peer IPC Handlers ──

  ipcMain.handle('lan:start', (event, personaName) => {
    return lanServer.startLan(event.sender, personaName);
  });

  ipcMain.handle('lan:stop', () => {
    lanServer.stopLan();
    return true;
  });

  ipcMain.handle('lan:get-status', () => {
    return lanServer.getStatus();
  });

  ipcMain.handle('lan:get-peers', () => {
    return lanServer.getDiscoveredPeers();
  });

  ipcMain.handle('lan:connect', (_event, peerId) => {
    return lanServer.connectPeer(peerId);
  });

  ipcMain.handle('lan:disconnect', () => {
    lanServer.disconnectPeer();
    return true;
  });

  ipcMain.handle('lan:send-message', (_event, content) => {
    return lanServer.sendChatMessage(content);
  });

  ipcMain.handle('lan:send-typing', () => {
    return lanServer.sendTypingIndicator();
  });

  ipcMain.on('lan:set-persona', (_event, name) => {
    lanServer.setPersonaName(name);
  });
}

// ──────────────────────────────────────────────
// App Lifecycle
// ──────────────────────────────────────────────

app.whenReady().then(() => {
  registerIpcHandlers();
  startTelemetryServer();

  if (launchInOverlay) {
    createOverlayWindow();
  } else {
    createMainWindow();
  }

  createTray();
});

app.on('window-all-closed', () => {
  // On macOS apps typically stay active until explicit quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Shut down LAN networking before exit
  lanServer.stopLan();

  // Shut down the telemetry relay when the app exits
  if (telemetryServer) {
    for (const socket of wsClients) { try { socket.end(); } catch {} }
    wsClients.clear();
    telemetryServer.close();
    telemetryServer = null;
  }
});

app.on('activate', () => {
  // macOS dock click re-creates the window
  if (!mainWindow && !overlayWindow) {
    createMainWindow();
  }
});
