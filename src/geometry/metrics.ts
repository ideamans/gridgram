/**
 * Centralized layout/typography constants.
 *
 * Each visual element used to inline its own `Math.max(cellSize * X, Y) * scale`
 * formula. The factors were close but not identical, and a tweak in one
 * place silently shifted relative balance vs. the others. Routing every
 * font-size and inset through this module keeps the relationships explicit.
 */
import type { GridLayout } from './grid.js'

/** Highlight color for layout errors (label collision, failed routing). */
export const ERROR_COLOR = '#e02020'

/**
 * Per-element font-size factors. The `min` value is the absolute pixel
 * floor used at very small canvas sizes.
 */
export const FONT = {
  node: { factor: 0.065, min: 12 },
  connector: { factor: 0.058, min: 10 },
  region: { factor: 0.06, min: 11 },
  note: { factor: 0.055, min: 10 },
} as const

export type FontKind = keyof typeof FONT

/** Resolve a font size for an element, applying its `labelScale` override. */
export function fontSize(layout: GridLayout, kind: FontKind, scale = 1): number {
  const { factor, min } = FONT[kind]
  return Math.max(layout.cellSize * factor, min) * scale
}

/** Visible gap between adjacent regions, scaled to cell size. */
export function regionInset(layout: GridLayout): number {
  return Math.max(layout.cellSize * 0.025, 4)
}

/** Default region corner radius when not overridden by `RegionDef.borderRadius`. */
export function regionDefaultRadius(layout: GridLayout): number {
  return Math.max(layout.cellSize * 0.12, 12)
}
