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

// ──────────────────────────────────────────────
// Portable Data Path (must run before app 'ready')
// ──────────────────────────────────────────────

// electron-builder portable sets PORTABLE_EXECUTABLE_DIR to the folder
// containing the exe. We redirect all Chromium user data there so the
// entire folder is self-contained and transferrable.
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
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
}

// ──────────────────────────────────────────────
// App Lifecycle
// ──────────────────────────────────────────────

app.whenReady().then(() => {
  registerIpcHandlers();

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

app.on('activate', () => {
  // macOS dock click re-creates the window
  if (!mainWindow && !overlayWindow) {
    createMainWindow();
  }
});
