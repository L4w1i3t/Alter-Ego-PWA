/**
 * Update detection against GitHub Releases.
 *
 * One shared check for every shell; how an update is *applied* differs per
 * platform and lives in `applyUpdate` at the bottom of this file:
 *
 *   web        A service worker already caches the app, so a new deploy is
 *              picked up by reloading. There is nothing to download from
 *              GitHub, and the release check is skipped entirely -- see
 *              `updatesSupported`.
 *   electron   The Windows artifact is a single portable .exe. A running
 *              executable cannot replace itself on Windows, so the app
 *              downloads the new one next to the current install and points
 *              the user at it. (Switching the target to NSIS would allow real
 *              background updates via electron-updater.)
 *   android    Downloads the APK and hands it to the system package installer.
 *              Because the new APK carries the same package name and signing
 *              key and a higher versionCode, Android installs it *over* the
 *              existing app and every conversation, persona and key is kept.
 *              Installing a differently signed APK is refused outright rather
 *              than silently wiping anything.
 */

import { logger } from '../utils/logger';
import { isElectronEnvironment } from '../utils/electronUtils';

const GITHUB_OWNER = 'L4w1i3t';
const GITHUB_REPO = 'Alter-Ego-PWA';
const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export const RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

/** Don't re-hit the API more than this often; unauthenticated GitHub allows 60/hr per IP. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const LAST_CHECK_KEY = 'alterEgo.update.lastCheck';
const SKIPPED_VERSION_KEY = 'alterEgo.update.skippedVersion';

export type UpdatePlatform = 'web' | 'electron' | 'android';

export interface UpdateInfo {
  /** Version of the newest release, without a leading "v". */
  version: string;
  /** Version currently running. */
  currentVersion: string;
  releaseUrl: string;
  releaseNotes: string;
  publishedAt: string;
  /** Download URL for this platform's artifact, when the release has one. */
  assetUrl: string | null;
  assetName: string | null;
  assetSize: number | null;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubAsset[];
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                 */
/* -------------------------------------------------------------------------- */

export const getCurrentVersion = (): string =>
  process.env.APP_VERSION || '0.0.0';

const isCapacitorNative = (): boolean => {
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
};

export const getUpdatePlatform = (): UpdatePlatform => {
  if (isCapacitorNative()) return 'android';
  if (isElectronEnvironment()) return 'electron';
  return 'web';
};

/**
 * Web installs update through the service worker on reload, so there is no
 * release to check and no artifact to fetch.
 */
export const updatesSupported = (): boolean => getUpdatePlatform() !== 'web';

/* -------------------------------------------------------------------------- */
/* Version comparison                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Compares two semver-ish strings. Returns >0 when `a` is newer than `b`.
 *
 * Numeric parts are compared numerically so 0.10.0 correctly beats 0.9.0. A
 * prerelease suffix (0.2.0-beta.1) sorts *below* the same version without one,
 * per semver, so a beta never looks newer than the release it precedes.
 */
export const compareVersions = (a: string, b: string): number => {
  const parse = (v: string) => {
    const [core, pre] = v.replace(/^v/i, '').split('-');
    return {
      parts: core.split('.').map(n => parseInt(n, 10) || 0),
      pre: pre || null,
    };
  };

  const va = parse(a);
  const vb = parse(b);

  const length = Math.max(va.parts.length, vb.parts.length);
  for (let i = 0; i < length; i++) {
    const diff = (va.parts[i] || 0) - (vb.parts[i] || 0);
    if (diff !== 0) return diff;
  }

  if (va.pre && !vb.pre) return -1;
  if (!va.pre && vb.pre) return 1;
  if (va.pre && vb.pre) return va.pre.localeCompare(vb.pre);
  return 0;
};

/* -------------------------------------------------------------------------- */
/* Asset selection                                                             */
/* -------------------------------------------------------------------------- */

const pickAsset = (
  assets: GitHubAsset[],
  platform: UpdatePlatform
): GitHubAsset | null => {
  const byExtension = (...suffixes: string[]) =>
    assets.find(asset =>
      suffixes.some(suffix => asset.name.toLowerCase().endsWith(suffix))
    ) || null;

  if (platform === 'android') return byExtension('.apk');

  if (platform === 'electron') {
    // navigator.platform is deprecated but still the most reliable signal
    // available inside a renderer without extra IPC.
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return byExtension('.exe');
    if (ua.includes('mac')) return byExtension('.dmg', '.zip');
    return byExtension('.pkg.tar.zst', '.tar.gz', '.appimage');
  }

  return null;
};

/* -------------------------------------------------------------------------- */
/* Checking                                                                    */
/* -------------------------------------------------------------------------- */

const readTimestamp = (key: string): number => {
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
  } catch {
    return 0;
  }
};

const writeTimestamp = (key: string, value: number): void => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable; we simply check again next launch */
  }
};

/** Suppress notifications for a version the user explicitly dismissed. */
export const skipVersion = (version: string): void => {
  try {
    localStorage.setItem(SKIPPED_VERSION_KEY, version);
  } catch {}
};

export const isVersionSkipped = (version: string): boolean => {
  try {
    return localStorage.getItem(SKIPPED_VERSION_KEY) === version;
  } catch {
    return false;
  }
};

export const clearSkippedVersion = (): void => {
  try {
    localStorage.removeItem(SKIPPED_VERSION_KEY);
  } catch {}
};

/**
 * Fetches the latest release and returns it when it is newer than what is
 * running. Returns null when up to date, unsupported, or the check failed --
 * an update check must never be able to break app startup.
 *
 * @param force ignore the rate limit (used by the manual "Check now" button)
 */
export const checkForUpdate = async (
  force = false
): Promise<UpdateInfo | null> => {
  if (!updatesSupported()) return null;

  const now = Date.now();
  if (!force && now - readTimestamp(LAST_CHECK_KEY) < CHECK_INTERVAL_MS) {
    return null;
  }

  try {
    const response = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      // Releases are cached aggressively by the browser otherwise.
      cache: 'no-cache',
    });

    // Record the attempt regardless of outcome so a persistent failure (rate
    // limiting, no network) does not turn into a request every time a
    // component mounts.
    writeTimestamp(LAST_CHECK_KEY, now);

    if (!response.ok) {
      logger.warn(`Update check failed: HTTP ${response.status}`);
      return null;
    }

    const release: GitHubRelease = await response.json();
    if (release.draft || release.prerelease) return null;

    const latest = release.tag_name.replace(/^v/i, '');
    const current = getCurrentVersion();
    if (compareVersions(latest, current) <= 0) return null;

    const asset = pickAsset(release.assets || [], getUpdatePlatform());

    return {
      version: latest,
      currentVersion: current,
      releaseUrl: release.html_url,
      releaseNotes: release.body || '',
      publishedAt: release.published_at,
      assetUrl: asset?.browser_download_url ?? null,
      assetName: asset?.name ?? null,
      assetSize: asset?.size ?? null,
    };
  } catch (error) {
    logger.warn('Update check failed:', error);
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* Applying                                                                    */
/* -------------------------------------------------------------------------- */

export interface UpdateProgress {
  percent: number;
  bytes: number;
  total: number;
}

export type ApplyResult =
  | { outcome: 'installing' }
  | { outcome: 'downloaded'; path: string }
  | { outcome: 'opened-page' }
  | { outcome: 'needs-permission' }
  | { outcome: 'failed'; message: string };

interface AndroidUpdaterPlugin {
  canInstall(): Promise<{ value: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadAndInstall(options: {
    url: string;
    fileName: string;
  }): Promise<{ path: string }>;
  addListener(
    event: 'downloadProgress',
    handler: (progress: UpdateProgress) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const getAndroidUpdater = (): AndroidUpdaterPlugin | null => {
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: Record<string, unknown> };
  }).Capacitor;
  return (cap?.Plugins?.AppUpdater as AndroidUpdaterPlugin) ?? null;
};

/** Opens the release page using whatever mechanism the shell provides. */
export const openReleasePage = async (url: string): Promise<void> => {
  if (window.electronAPI?.openReleasesPage) {
    await window.electronAPI.openReleasesPage(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Applies an update as far as the platform allows.
 *
 * Note that on no platform does this replace data. Android upgrades in place
 * (same package + signature), and the desktop flow only ever writes a new
 * executable beside the old one -- the "ALTER EGO Data" folder is untouched.
 */
export const applyUpdate = async (
  info: UpdateInfo,
  onProgress?: (progress: UpdateProgress) => void
): Promise<ApplyResult> => {
  const platform = getUpdatePlatform();

  if (!info.assetUrl || !info.assetName) {
    // Release published without an artifact for this platform.
    await openReleasePage(info.releaseUrl);
    return { outcome: 'opened-page' };
  }

  try {
    if (platform === 'android') {
      const updater = getAndroidUpdater();
      if (!updater) {
        await openReleasePage(info.releaseUrl);
        return { outcome: 'opened-page' };
      }

      const { value: allowed } = await updater.canInstall();
      if (!allowed) {
        await updater.openInstallSettings();
        return { outcome: 'needs-permission' };
      }

      let subscription: { remove: () => Promise<void> } | null = null;
      if (onProgress) {
        subscription = await updater.addListener('downloadProgress', onProgress);
      }
      try {
        await updater.downloadAndInstall({
          url: info.assetUrl,
          fileName: info.assetName,
        });
      } finally {
        await subscription?.remove();
      }
      // The system installer has taken over from here.
      return { outcome: 'installing' };
    }

    if (platform === 'electron' && window.electronAPI?.downloadUpdate) {
      const path = await window.electronAPI.downloadUpdate(
        info.assetUrl,
        info.assetName
      );
      await window.electronAPI.revealUpdate?.(path);
      return { outcome: 'downloaded', path };
    }

    await openReleasePage(info.releaseUrl);
    return { outcome: 'opened-page' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to apply update:', error);
    return { outcome: 'failed', message };
  }
};
