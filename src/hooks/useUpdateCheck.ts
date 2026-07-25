import { useEffect } from 'react';
import {
  checkForUpdate,
  isVersionSkipped,
  openReleasePage,
  skipVersion,
  updatesSupported,
} from '../services/updateService';
import { showInfo } from '../components/Common/NotificationManager';

/** Let the app settle before spending network on a version check. */
const STARTUP_DELAY_MS = 8000;

/**
 * Checks for a newer release shortly after startup and, if there is one, says
 * so once via a toast.
 *
 * Deliberately quiet: the service itself only hits GitHub every six hours, a
 * version the user dismissed is never mentioned again, and any failure is
 * swallowed. Nothing here can block or slow down launching the app. The full
 * detail and the actual download live in Settings -> Updates.
 */
export const useUpdateCheck = (): void => {
  useEffect(() => {
    if (!updatesSupported()) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      checkForUpdate(false)
        .then(update => {
          if (cancelled || !update) return;
          if (isVersionSkipped(update.version)) return;

          showInfo(
            `Version ${update.version} is available. Your conversations and personas are kept.`,
            {
              title: 'Update available',
              duration: 12000,
              actions: [
                {
                  label: 'View',
                  action: () => openReleasePage(update.releaseUrl),
                },
                {
                  label: 'Skip',
                  variant: 'secondary',
                  action: () => skipVersion(update.version),
                },
              ],
            }
          );
        })
        .catch(() => {
          /* an update check must never surface as an error to the user */
        });
    }, STARTUP_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
};
