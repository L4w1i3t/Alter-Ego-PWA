/**
 * Electron Runtime Utilities
 *
 * Helpers for detecting and interacting with the Electron host.
 * All functions gracefully degrade when running as a plain PWA.
 */

/** Returns true when the app is running inside an Electron shell */
export const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

/** Capture a screenshot of the primary display (Electron only).
 *  Returns a data-URL string, or null if unavailable / failed. */
export const captureScreen = async (): Promise<string | null> => {
  if (!isElectronEnvironment()) return null;
  try {
    return await window.electronAPI!.captureScreen();
  } catch {
    return null;
  }
};

/** Toggle the desktop overlay companion window. Returns new overlay state. */
export const toggleOverlay = async (): Promise<boolean> => {
  if (!isElectronEnvironment()) return false;
  try {
    return await window.electronAPI!.toggleOverlay();
  } catch {
    return false;
  }
};

/** Check if the overlay window is currently visible */
export const getOverlayState = async (): Promise<boolean> => {
  if (!isElectronEnvironment()) return false;
  try {
    return await window.electronAPI!.getOverlayState();
  } catch {
    return false;
  }
};

/**
 * Detect if the current window was opened as the overlay widget.
 * The Electron main process appends ?overlay=true to the URL.
 */
export const isOverlayMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('overlay') === 'true';
};

/**
 * Switch between main window and overlay mode.
 * Closes the current window and opens the target mode.
 */
export const switchMode = async (mode: 'main' | 'overlay'): Promise<void> => {
  if (!isElectronEnvironment()) return;
  try {
    await window.electronAPI!.switchMode(mode);
  } catch {
    // Silently fail in non-Electron contexts
  }
};

/** Returns the absolute path where Electron stores user data (portable or default). */
export const getDataPath = async (): Promise<string | null> => {
  if (!isElectronEnvironment()) return null;
  try {
    return await window.electronAPI!.getDataPath();
  } catch {
    return null;
  }
};
