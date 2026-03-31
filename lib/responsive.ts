/**
 * lib/responsive.ts — Responsive layout helpers
 *
 * Complements hooks/useResponsive.ts (rs/fs/wp/hp) with layout-aware
 * utilities that depend on live window dimensions or safe area insets.
 *
 * Design base: iPhone 14 (390px wide).
 */

import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Standard horizontal padding used throughout the app (px). */
export const PADDING_H = 16;

// ── Screen dimensions ──────────────────────────────────────────────────────

/** Live screen width — updates on orientation change. */
export function useScreenWidth(): number {
  const { width } = useWindowDimensions();
  return width;
}

/** Live screen height — updates on orientation change. */
export function useScreenHeight(): number {
  const { height } = useWindowDimensions();
  return height;
}

// ── Content width ──────────────────────────────────────────────────────────

/**
 * Usable content width after subtracting the standard horizontal padding
 * on both sides (PADDING_H × 2 = 32px).
 */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return width - PADDING_H * 2;
}

// ── Calendar (7 columns) ───────────────────────────────────────────────────

/**
 * Width of a single calendar day cell so 7 cells fill the content area
 * without fixed pixel values.
 *
 * Formula: (screenWidth - horizontalPadding * 2) / 7
 */
export function useCalendarCellWidth(): number {
  const { width } = useWindowDimensions();
  return (width - PADDING_H * 2) / 7;
}

// ── Generic grid columns ───────────────────────────────────────────────────

/**
 * Width of a single column in an N-column grid, accounting for gaps
 * between columns.
 *
 * @param cols   Number of columns (e.g. 2 or 3)
 * @param gap    Gap between columns in points (default 8)
 */
export function useGridColumnWidth(cols: number, gap = 8): number {
  const { width } = useWindowDimensions();
  const totalGap = gap * (cols - 1);
  return (width - PADDING_H * 2 - totalGap) / cols;
}

// ── Safe area ─────────────────────────────────────────────────────────────

/**
 * Bottom safe area inset, with a minimum of 8pt so tabs always have
 * at least a little breathing room even on devices without a home indicator.
 */
export function useSafeBottom(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 8);
}

// ── Font scale ────────────────────────────────────────────────────────────

/**
 * Scales a base font size proportionally to the screen width, capped at
 * 120 % of the original to avoid giant text on large devices.
 *
 * Useful for hero/display text that should grow with the screen but not
 * indefinitely (regular body text should use fs() from useResponsive.ts).
 *
 * @param base  Font size at 390px (iPhone 14)
 */
export function useFontScale(base: number): number {
  const { width } = useWindowDimensions();
  const scale = width / 390;
  return Math.round(base * Math.min(scale, 1.2));
}
