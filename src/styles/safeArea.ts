import { css } from 'styled-components';

/**
 * Device safe-area helpers.
 *
 * `position: fixed` escapes ancestor padding, so every full-screen overlay has
 * to subtract the notch / status bar / gesture bar itself. These helpers keep
 * that math in one place; the underlying --ae-safe-* variables are declared in
 * GlobalStyles and fall back to 0px wherever insets do not apply.
 */

/** Pads an overlay in on all four sides, keeping `base` as the minimum gap. */
export const safeAreaInset = (base: string) => css`
  padding: calc(${base} + var(--ae-safe-top, 0px))
    calc(${base} + var(--ae-safe-right, 0px))
    calc(${base} + var(--ae-safe-bottom, 0px))
    calc(${base} + var(--ae-safe-left, 0px));
`;

/** For elements anchored to the top edge (toasts, banners). */
export const safeAreaTop = (base: string) => css`
  top: calc(${base} + var(--ae-safe-top, 0px));
`;

/** For elements anchored to the bottom edge (toasts, banners). */
export const safeAreaBottom = (base: string) => css`
  bottom: calc(${base} + var(--ae-safe-bottom, 0px));
`;

/** For elements anchored to the horizontal edges. */
export const safeAreaSides = (base: string) => css`
  left: calc(${base} + var(--ae-safe-left, 0px));
  right: calc(${base} + var(--ae-safe-right, 0px));
`;
