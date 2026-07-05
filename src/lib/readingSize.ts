/**
 * Reading text size (accessibility). Pinch-to-zoom is disabled sitewide for an
 * app-like feel, so this gives users an in-app way to enlarge reading text.
 *
 * Mechanism: Mantine converts every `rem` value (fonts + spacing) through
 * `var(--mantine-scale)`. We override that variable on <html> to scale the
 * whole content UI, and reset it to `1` on the nav subtrees so navigation
 * stays compact. The base is 16px (the floor); users can go larger.
 *
 * The preference is a per-device accessibility choice, so it lives in
 * localStorage (no Firestore round-trip / rule needed).
 */

import type { CSSProperties } from "react";

const STORAGE_KEY = "snagem-reading-size";
const BASE_PX = 16;

/** Selectable sizes in px. 16 is the minimum/default. */
export const READING_SIZES = [16, 18, 20, 22] as const;
export type ReadingSize = (typeof READING_SIZES)[number];

/** Inline style that opts a subtree out of reading-size scaling (nav uses it). */
export const RESET_READING_SCALE = { "--mantine-scale": "1" } as CSSProperties;

export function getReadingSize(): ReadingSize {
  if (typeof window === "undefined") return BASE_PX;
  const raw = Number(window.localStorage.getItem(STORAGE_KEY));
  return (READING_SIZES as readonly number[]).includes(raw) ? (raw as ReadingSize) : BASE_PX;
}

/** Push the chosen size onto <html> as the Mantine rem scale. */
export function applyReadingSize(size: number = getReadingSize()): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--mantine-scale", String(size / BASE_PX));
}

export function setReadingSize(size: ReadingSize): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(size));
  applyReadingSize(size);
}
