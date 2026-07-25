import { useEffect } from 'react';

/**
 * Publishes the *visible* viewport height as `--ae-viewport-height`.
 *
 * The app shell is a full-height flex column with the message composer pinned
 * near the bottom on phones. `100dvh` accounts for collapsing browser chrome
 * but not for the on-screen keyboard, so on iOS Safari and in a PWA the
 * composer ends up underneath the keyboard the moment it is focused.
 * `visualViewport.height` does shrink for the keyboard, which makes it the
 * right source for the shell's height.
 *
 * Falls back to `100dvh` (then `100vh`) wherever visualViewport is missing --
 * see the AppContainer rule, which only overrides the height once this
 * variable is set.
 *
 * The Capacitor APK does not rely on this: there the window itself is resized
 * by adjustResize, so the CSS viewport already excludes the keyboard.
 */
export const useViewportHeight = (): void => {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;

    const apply = () => {
      root.style.setProperty('--ae-viewport-height', `${vv.height}px`);
      /*
       * Pinch-zooming also shrinks visualViewport, and offsetTop tells us the
       * shell would be scrolled partly out of view. Exposing it lets the shell
       * stay put rather than drifting under the keyboard.
       */
      root.style.setProperty('--ae-viewport-offset-top', `${vv.offsetTop}px`);
    };

    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);

    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      root.style.removeProperty('--ae-viewport-height');
      root.style.removeProperty('--ae-viewport-offset-top');
    };
  }, []);
};
