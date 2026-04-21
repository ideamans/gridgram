/**
 * Layered configuration: system → project → document → override.
 *
 * Every surface (CLI, TS API, HTTP, MCP, …) builds an array of
 * DiagramSettings layers and calls `resolveSettings()`. The resolved
 * settings plus the DiagramContent feed into render() — there is no
 * surface-specific branching past that point.
 */
import type {
  DiagramTheme, NodeDef, ConnectorDef, RegionDef, NoteDef,
} from './types.js'
import { DEFAULT_CELL_SIZE } from './geometry/grid.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Merge-eligible per-diagram settings. Every field is optional at input. */
export interface DiagramSettings {
  /** Pixel size of one grid cell (default: 256). */
  cellSize?: number
  /** Padding inside the SVG in px. Default: scaled from cellSize. */
  padding?: number
  /** Column count. If absent, inferred from node positions. */
  columns?: number
  /** Row count. If absent, inferred from node positions. */
  rows?: number
  /** Partial theme override — deep-merged against the defaulted theme. */
  theme?: Partial<DiagramTheme>

  /** Final output width in pixels at render time. Height scales with aspect. */
  renderWidth?: number
  /** Suppress the red-tint highlighting for layout errors. */
  suppressErrors?: boolean
  /**
   * Frame number to render (default: 1). Only meaningful when the
   * diagram uses frame-tagged declarations (`icon [2] …`, `doc [3-5] …`,
   * etc.); otherwise ignored.
   */
  frame?: number

  /**
   * Asset path aliases. '@brand/aws.svg' resolves under assetAliases.brand.
   * (Named `iconAliases` in earlier drafts — renamed since the mechanism
   * generalises to any SVG asset.)
   */
  assetAliases?: Record<string, string>
  /** Directory whose *.svg files are auto-registered by basename. */
  iconsDir?: string
}

/** Fields that are guaranteed present after resolve(). */
export interface ResolvedSettings extends Required<Pick<DiagramSettings,
  'cellSize' | 'suppressErrors' | 'assetAliases'
>> {
  padding?: number
  columns?: number
  rows?: number
  theme: DiagramTheme
  renderWidth?: number
  iconsDir?: string
}

/** Diagram content is document-specific and never merged across layers. */
export interface DiagramContent {
  nodes: NodeDef[]
  connectors?: ConnectorDef[]
  regions?: RegionDef[]
  notes?: NoteDef[]
}

/** Render-call-time-only — never persisted in DiagramSettings. */
export interface OutputTarget {
  format?: 'svg' | 'png' | 'json'
  output?: string
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const SYSTEM_DEFAULTS: ResolvedSettings = {
  cellSize: DEFAULT_CELL_SIZE,
  suppressErrors: false,
  assetAliases: {},
  theme: {
    primary: '#1e3a5f',
    secondary: '#3b5a80',
    accent: '#e8792f',
    text: '#2d3748',
    bg: '#ffffff',
  },
}

// ---------------------------------------------------------------------------
// defineConfig — TS inference helper for project config files
// ---------------------------------------------------------------------------

/**
 * Identity function that types its argument as `DiagramSettings`, so TS
 * project config files get completion and red squiggles without
 * import-time runtime cost. Mirrors Tailwind's `defineConfig` pattern.
 *
 *   // gridgram.config.ts
 *   import { defineConfig } from 'gridgram'
 *   export default defineConfig({ cellSize: 128, theme: { … } })
 */
export function defineConfig(settings: DiagramSettings): DiagramSettings {
  return settings
}

// ---------------------------------------------------------------------------
// resolveSettings — pure layer merge
// ---------------------------------------------------------------------------

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Deep-merge two plain-object layers. Scalars, arrays, and
 * non-plain-objects are replaced whole; only plain objects recurse.
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const out: any = { ...target }
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v)
    } else {
      out[k] = v
    }
  }
  return out
}

/**
 * Merge a stack of layers into a ResolvedSettings.
 *
 * Order: earliest = lowest-priority. SYSTEM_DEFAULTS is prepended
 * automatically, so callers typically pass:
 *   [projectConfig, documentSettings, renderOverrides]
 */
export function resolveSettings(layers: DiagramSettings[]): ResolvedSettings {
  let out: any = { ...SYSTEM_DEFAULTS, theme: { ...SYSTEM_DEFAULTS.theme } }
  for (const layer of layers) {
    if (!layer) continue
    out = deepMerge(out, layer)
  }
  return out as ResolvedSettings
}
