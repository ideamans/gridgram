/**
 * Built-in badge presets.
 *
 * A preset pairs a Tabler filled icon with a sensible semantic color
 * AND a layering strategy: a white backing disc + the icon on top. This
 * fixes the transparent-cutout problem where a Tabler filled icon like
 * `circle-check` paints the check shape by *omitting* fill — without a
 * backing, the check turns whatever is behind the icon (usually the
 * tinted node ring).
 *
 * Usage:
 *
 *   badges: ['check']                           // default top-right
 *   badges: [{ preset: 'check', position: 'bottom-left' }]
 *   badges: ['check', 'alert']                  // multiple presets stack
 *   badges: [{ preset: 'check' }, { icon: … }]  // mixed with explicit badges
 *
 * Preset layers are already-resolved raw SVG strings (they call
 * `tablerFilled` at module init), so they pass through the icon
 * resolver untouched.
 */
import type { NodeBadge, BadgePosition, SvgFragment } from './types.js'
import { tablerFilled } from './tabler.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Reference to a preset by name with optional positional overrides. */
export interface BadgePresetRef {
  preset: string
  position?: BadgePosition
  size?: number
}

/**
 * Badge input accepted on NodeDef.badges. May be:
 *   - A preset name: 'check'
 *   - A preset reference with overrides: { preset: 'check', position: 'bottom-left' }
 *   - An explicit NodeBadge (raw control)
 */
export type BadgeSpec = string | BadgePresetRef | NodeBadge

/** A single visual layer in a preset — no position/size (caller decides). */
interface PresetLayer {
  icon: SvgFragment
  color?: string
  iconTheme?: 'theme' | 'native'
}

interface BadgePreset {
  layers: PresetLayer[]
}

// ---------------------------------------------------------------------------
// Preset table
// ---------------------------------------------------------------------------

/** Solid 24×24 disc using currentColor — the backing layer for every preset. */
const DISC_BACKING = '<circle cx="12" cy="12" r="11" fill="currentColor"/>'

/** Helper: two-layer preset (white disc + colored icon). Use for
 *  Tabler filled icons whose check-mark / arrow / etc. is rendered as
 *  a transparent cutout — without a backing, the cutout reveals the
 *  node ring beneath, which muddles the glyph. */
function composed(iconName: string, color: string): BadgePreset {
  return {
    layers: [
      // Bottom: opaque white disc so the top icon's cutout reveals white,
      // not whatever is behind the node.
      { icon: DISC_BACKING, color: '#ffffff', iconTheme: 'theme' },
      // Top: Tabler filled icon, colored per preset.
      { icon: tablerFilled(iconName), color, iconTheme: 'theme' },
    ],
  }
}

/** Helper: single-layer preset. Use for solid silhouette icons (star,
 *  heart, …) where the shape is fully painted — a backing disc would
 *  just add an unwanted white halo around the silhouette. */
function solid(iconName: string, color: string): BadgePreset {
  return {
    layers: [
      { icon: tablerFilled(iconName), color, iconTheme: 'theme' },
    ],
  }
}

export const BADGE_PRESETS: Record<string, BadgePreset> = {
  check: composed('circle-check',  '#16a34a'),
  alert: composed('alert-circle',  '#dc2626'),
  info:  composed('info-circle',   '#0ea5e9'),
  help:  composed('help-circle',   '#0ea5e9'),
  lock:  composed('lock',          '#475569'),
  flag:  composed('flag',          '#dc2626'),
  // Solid silhouettes — no disc backing, no white halo.
  star:  solid('star',             '#f59e0b'),
  heart: solid('heart',            '#e11d48'),
}

// ---------------------------------------------------------------------------
// Expansion
// ---------------------------------------------------------------------------

export interface UnknownPresetError {
  preset: string
}

function expandPreset(
  name: string,
  overrides: { position?: BadgePosition; size?: number },
  errors?: UnknownPresetError[],
): NodeBadge[] {
  const preset = BADGE_PRESETS[name]
  if (!preset) {
    errors?.push({ preset: name })
    return []
  }
  return preset.layers.map((l) => ({
    icon: l.icon as SvgFragment,
    color: l.color,
    iconTheme: l.iconTheme,
    position: overrides.position,
    size: overrides.size,
  }))
}

/**
 * Expand every BadgeSpec into a flat NodeBadge[] ready for rendering.
 * Unknown preset names are collected in `errors` (when provided) and
 * produce no badge output. The caller can surface those as warnings.
 */
export function expandBadges(specs: BadgeSpec[], errors?: UnknownPresetError[]): NodeBadge[] {
  const out: NodeBadge[] = []
  for (const spec of specs) {
    if (typeof spec === 'string') {
      out.push(...expandPreset(spec, {}, errors))
      continue
    }
    if ('preset' in spec) {
      out.push(...expandPreset(spec.preset, { position: spec.position, size: spec.size }, errors))
      continue
    }
    // Already a NodeBadge
    out.push(spec)
  }
  return out
}

/** True when `x` is a preset spec (string or { preset: … }). */
export function isPresetSpec(x: BadgeSpec): x is string | BadgePresetRef {
  return typeof x === 'string' || (typeof x === 'object' && x !== null && 'preset' in x)
}
