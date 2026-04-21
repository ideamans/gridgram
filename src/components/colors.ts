/**
 * Color-resolution helpers.
 *
 * Any user-supplied color field on Node / Region / Connector / Note /
 * NodeBadge is routed through these helpers. The contract:
 *
 *   Input                       Output
 *   -----                       ------
 *   undefined                   undefined
 *   'primary' etc.              theme[key]           (resolved theme color)
 *   'primary/20'                '#rrggbb20'          (hex + alpha byte)
 *   '#e8792f', 'red', etc.      passed through untouched
 *
 * `resolveColor()` returns a single string (or undefined) — suitable for
 * direct use in `fill` / `stroke`.
 *
 * `resolveRegionFill()` returns {fill, opacity?}. When the user writes a
 * BARE theme keyword on a region, the keyword resolves to the theme color
 * AND fill-opacity is set to DEFAULT_REGION_ALPHA so the region reads as a
 * subtle tint (matching the existing `#rrggbb12` hand-rolled convention).
 * Literals and keyword-with-alpha forms pass through unchanged — the user
 * is presumed to have chosen the opacity explicitly.
 */
import type { DiagramTheme, ThemeColorKey } from '../types'

export const KEYS: ThemeColorKey[] = ['primary', 'secondary', 'accent', 'text', 'muted', 'bg']

const KW_ALPHA_RE = /^([a-zA-Z]+)\/([0-9a-fA-F]{1,2})$/

/** Hex alpha byte used for node ring backgrounds (≈8%). */
export const NODE_RING_FILL_ALPHA = 21 / 255

/** Default fill-opacity for regions whose color is a bare theme keyword. */
export const DEFAULT_REGION_ALPHA = 18 / 255 // ≈ 0x12 → 7%

/** Normalize a 1-digit alpha to its 2-digit canonical form (0x8 → 0x88). */
function normalizeAlphaByte(aa: string): string {
  return aa.length === 1 ? aa + aa : aa.toLowerCase()
}

/**
 * Resolve a color value. Supports theme keywords, keyword/AA alpha
 * syntax, and CSS literals. Returns a single string (or undefined).
 */
export function resolveColor(color: string | undefined, theme: DiagramTheme): string | undefined {
  if (color === undefined) return undefined

  const alpha = KW_ALPHA_RE.exec(color)
  if (alpha) {
    const [, kw, aa] = alpha
    if ((KEYS as readonly string[]).includes(kw)) {
      const base = theme[kw as ThemeColorKey]
      if (typeof base === 'string' && /^#[0-9a-fA-F]{6}$/.test(base)) {
        return base + normalizeAlphaByte(aa)
      }
    }
    // Unknown keyword or non-6-digit theme color — pass through as-is
    return color
  }

  if ((KEYS as readonly string[]).includes(color)) {
    const v = theme[color as ThemeColorKey]
    return typeof v === 'string' ? v : undefined
  }
  return color
}

/** Returned fill pair — `opacity` is undefined when no auto-tint applies. */
export interface ResolvedFill {
  fill: string
  opacity?: number
}

/**
 * Resolve a region's color field into a (fill, fill-opacity) pair. Bare
 * theme keywords auto-tint with DEFAULT_REGION_ALPHA; everything else
 * passes through untouched (the user chose the exact color themselves).
 *
 * Returns { fill: 'none' } when color is undefined / empty.
 */
export function resolveRegionFill(
  color: string | undefined,
  theme: DiagramTheme
): ResolvedFill {
  if (color === undefined || color === '') return { fill: 'none' }

  // Bare theme keyword → auto-tint
  if ((KEYS as readonly string[]).includes(color)) {
    const v = theme[color as ThemeColorKey]
    if (typeof v === 'string') return { fill: v, opacity: DEFAULT_REGION_ALPHA }
  }

  // Everything else: keyword/AA (hex with alpha), literal hex, CSS name, rgb(...)
  return { fill: resolveColor(color, theme) ?? color }
}

/** True when a color value (literal or keyword) counts as transparent. */
export function isTransparent(color: string | undefined): boolean {
  return color === undefined || color === '' || color === 'transparent' || color === 'none'
}
