import type { VNode } from 'preact'

/**
 * Something that can be embedded as the inner content of an SVG element:
 *   - string: raw SVG markup (used by the .gg resolver)
 *   - VNode: a Preact virtual DOM node built via h()
 *   - number: coerced to string
 *   - null / undefined / false: nothing rendered
 *
 * Arrays of the above are accepted too (flattened by the renderer).
 */
export type SvgFragment = string | number | VNode | null | undefined | false | SvgFragment[]

// ---------------------------------------------------------------------------
// Grid coordinate system
// ---------------------------------------------------------------------------

/**
 * Canonical, *internal* grid coordinate — 0-based after normalization.
 * `{col: 0, row: 0}` corresponds to the user-facing "A1" cell.
 *
 * Do not construct GridPos directly in user code; write one of the
 * user-facing input forms (`GridPosInput`) and let the normalizer
 * convert it. `col` / `row` are kept as plain numbers so layout math
 * stays index-friendly.
 */
export interface GridPos {
  /** 0-based column index (0 .. columns-1) */
  col: number
  /** 0-based row index (0 .. rows-1) */
  row: number
}

/**
 * User-facing input for a coordinate. Accepts:
 *   - A1 string       `"A1"` / `"aa100"` — case-insensitive; preferred
 *   - tuple           `[1, 1]`           — 1-based (col, row)
 *   - named object    `{ col: 1, row: 1 }` — 1-based
 *
 * A1 = column 1, row 1 = top-left. All forms are normalized to the
 * internal 0-based `GridPos` before any rendering runs.
 */
export type GridPosInput =
  | { col: number; row: number }
  | readonly [col: number, row: number]
  | string

/**
 * A rectangular region spanning multiple grid cells.
 * Uses top-left (inclusive) and bottom-right (inclusive) corners.
 */
export interface GridSpan {
  from: GridPosInput
  to: GridPosInput
}

// ---------------------------------------------------------------------------
// Theme / colors
// ---------------------------------------------------------------------------

export interface DiagramTheme {
  /** Default color for node rings and their icons via currentColor. */
  primary: string
  /** Default color for connectors. */
  secondary: string
  /** Accent color for highlights; referenced by name from element color fields. */
  accent: string
  /** Default color for note text. */
  text: string
  /**
   * SVG canvas background. Undefined or 'transparent' → no background
   * rect is drawn (the SVG renders with a transparent backdrop).
   */
  bg?: string
  /** Reserved for muted/secondary text (no default). */
  muted?: string
}

/**
 * A color value. Either a CSS color literal ('#e8792f', 'red', 'rgb(...)')
 * or one of the theme keyword names below — in which case it resolves to
 * the corresponding DiagramTheme field at render time.
 */
export type ThemeColorKey = 'primary' | 'secondary' | 'accent' | 'text' | 'muted' | 'bg'

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export interface NodeBadge {
  /** React element drawn inside a 24×24 viewBox */
  icon: SvgFragment
  /** Corner where the badge sits (default: 'top-right') */
  position?: BadgePosition
  /** Badge diameter as fraction of node diameter (default: 0.3) */
  size?: number
  /** Override color (cascades via `currentColor`; takes effect when iconTheme = 'theme') */
  color?: string
  /**
   * Color treatment (default: 'native'):
   *   - 'native' — the badge's own fill/stroke colors are preserved
   *   - 'theme'  — the badge adopts `color` (or the node color) via currentColor
   */
  iconTheme?: 'theme' | 'native'
}

export interface NodeDef {
  id: string
  /**
   * Grid position (column, row) — 0-based.
   *
   * When omitted, the position is auto-assigned by walking nodes in
   * declaration order: col increments along row 0. If `columns` is
   * specified at the diagram level, auto-positions wrap into the next
   * row when col reaches `columns`.
   *
   * Explicit positions are taken as-is and don't disturb the auto
   * counter — explicit and auto-positioned nodes can coexist.
   */
  pos?: GridPosInput
  /**
   * The icon asset rendered inside the node's clipping circle/rect.
   * Accepts a Preact VNode (`h('svg', …)`), a raw SVG string, or — in
   * the .gg pipeline's pre-resolution stage — the string identifier
   * (`'tabler/user'`, `'./foo.svg'`, a bare name) that the resolver
   * later inlines into an SVG fragment.
   */
  src?: SvgFragment
  /** Label shown as a semi-transparent badge overlapping the top of the icon */
  label?: SvgFragment
  /** Node diameter as absolute fraction of cell size (0–1). Overrides sizeScale when set. */
  size?: number
  /** Node size multiplier on the default fraction (default: 1). Ignored when `size` is set. */
  sizeScale?: number
  /** Override color for this node */
  color?: string
  /** Label font-size multiplier relative to the theme base (default: 1) */
  labelScale?: number
  /**
   * How the icon picks its colors:
   *   - 'theme' (default): propagates the node color to the icon via
   *     `currentColor`, so monochrome icons adopt the node's color.
   *   - 'native': leaves the icon's own fill/stroke attributes intact.
   *     Use this for multicolor logos / branded assets.
   */
  iconTheme?: 'theme' | 'native'
  /**
   * How the icon's bounds are clipped:
   *   - 'square' (default): the icon's 24×24 viewport (same as the
   *     node's bounding square) — anything outside is cropped.
   *   - 'circle': clipped to a circle inscribed in the square; useful
   *     for avatar-style raster images so they become round.
   *   - 'none': no clipping; the icon can extend beyond its bounds.
   *     Rarely needed for vector icons; useful for decorative raster
   *     overlays.
   */
  clip?: 'square' | 'circle' | 'none'
  /**
   * Optional badges placed at the node's corners. Accepts:
   *   - a preset name ('check' / 'star' / 'alert' / 'info' / …)
   *   - a preset reference `{ preset, position?, size? }`
   *   - a full NodeBadge for explicit control
   *
   * Multiple badges at the same `position` render in declaration order
   * (earlier = bottom). Presets that need this (e.g. a white disc under
   * a tabler filled icon) use that stacking internally.
   */
  badges?: import('./badges').BadgeSpec[]
  /**
   * Marks the icon as failed to resolve (e.g. a string identifier that
   * couldn't be looked up in the icon registry). When true and errors
   * are not suppressed, the icon is hidden and the node ring renders
   * in the error color so the missing reference is visually obvious.
   */
  iconError?: boolean
}

// ---------------------------------------------------------------------------
// Connectors (lines / arrows between nodes)
// ---------------------------------------------------------------------------

export type ArrowEnd = 'none' | 'start' | 'end' | 'both'

/**
 * Connector waypoint (canonical, *internal* form — 0-based after
 * normalization). Unlike GridPos, waypoints allow fractional
 * coordinates — `{col: 0.5, row: 1}` threads between cell centres.
 */
export interface WayPoint {
  col: number
  row: number
}

/**
 * User-facing input form for a waypoint. Matches GridPosInput shape but
 * allows fractional numbers. A1 strings are not accepted here (they
 * denote whole cells); use a tuple or object for mid-cell routing.
 *
 *   { col: 1.5, row: 1 }   // between columns A and B on row 1
 *   [1.5, 1]               // same, tuple form
 */
export type WayPointInput =
  | { col: number; row: number }
  | readonly [col: number, row: number]

export interface ConnectorDef {
  /** Optional id used to reference this connector (e.g. from a Note) */
  id?: string
  /** Source node id */
  from: string
  /** Target node id */
  to: string
  /** Arrow style (default: 'end') */
  arrow?: ArrowEnd
  /** Line thickness in px (default: 2) */
  strokeWidth?: number
  /** Override color */
  color?: string
  /** Dash pattern (e.g. '6 3') — omit for solid line */
  dash?: string
  /** Label placed at the midpoint of the connector */
  label?: SvgFragment
  /** Intermediate waypoints the line passes through */
  waypoints?: WayPointInput[]
  /** How far from node center to pull back arrow tips (0–1, default: 0.6) */
  nodeMargin?: number
  /** Label font-size multiplier relative to the theme base (default: 1) */
  labelScale?: number
}

// ---------------------------------------------------------------------------
// Regions (background zones)
// ---------------------------------------------------------------------------

export interface RegionDef {
  /** Grid cells to fill — can be multiple spans for L-shapes etc. */
  spans: GridSpan[]
  /** Background color (with alpha for semi-transparency) */
  color: string
  /** Optional label for the region */
  label?: SvgFragment
  /** Border radius in px (default: auto) */
  borderRadius?: number
  /** Label font-size multiplier relative to the theme base (default: 1) */
  labelScale?: number
}

// ---------------------------------------------------------------------------
// Notes (annotations with leader lines)
// ---------------------------------------------------------------------------

export interface NoteDef {
  /** Grid position — the note consumes this single cell */
  pos: GridPosInput
  /** Text content. `\n` makes an explicit line break; long lines wrap within the cell width. */
  text: string
  /** Ids of nodes or connectors to draw unconditional leader lines to */
  targets?: string[]
  /** Background color (default: #ffffff) */
  bg?: string
  /** Border and text color (default: theme.text) */
  color?: string
  /** Font-size multiplier relative to the theme base (default: 1) */
  labelScale?: number
}

// ---------------------------------------------------------------------------
// Diagram (top-level)
// ---------------------------------------------------------------------------

export interface DiagramDef {
  /** Pixel size of one grid cell in the internal SVG coordinate space (default: 256) */
  cellSize?: number
  /** Padding inside the SVG in px (default: scaled from cellSize) */
  padding?: number
  /** Number of columns. Default: inferred from the largest node `pos.col` (+1). */
  columns?: number
  /** Number of rows.    Default: inferred from the largest node `pos.row` (+1). */
  rows?: number
  /** Color theme */
  theme?: DiagramTheme
  /** Background regions (rendered first, behind everything) */
  regions?: RegionDef[]
  /** Nodes */
  nodes: NodeDef[]
  /** Connectors between nodes */
  connectors?: ConnectorDef[]
  /** Annotation notes with leader lines */
  notes?: NoteDef[]
}

// ---------------------------------------------------------------------------
// Normalized (post-pipeline) variants
//
// `normalizeDiagramDef` (src/normalize.ts) returns one of these: every
// coordinate is canonical 0-based `{col, row}`, every node has a `pos`
// filled in, and every span endpoint has been shifted too. The geometry,
// layout, and component layers all take the normalized forms — they
// never see a raw GridPosInput at runtime, so the types shouldn't keep
// pretending they might.
// ---------------------------------------------------------------------------

/** NodeDef after coordinate normalization + auto-position fill. */
export interface NormalizedNodeDef extends Omit<NodeDef, 'pos'> {
  pos: GridPos
}

/** ConnectorDef after waypoint normalization. */
export interface NormalizedConnectorDef extends Omit<ConnectorDef, 'waypoints'> {
  waypoints?: WayPoint[]
}

/** NoteDef after position normalization. */
export interface NormalizedNoteDef extends Omit<NoteDef, 'pos'> {
  pos: GridPos
}

/** A canonical grid span — both endpoints in 0-based object form. */
export interface NormalizedGridSpan {
  from: GridPos
  to: GridPos
}

/** RegionDef with every span endpoint normalized. */
export interface NormalizedRegionDef extends Omit<RegionDef, 'spans'> {
  spans: NormalizedGridSpan[]
}

/** DiagramDef with every element normalized. */
export interface NormalizedDiagramDef extends Omit<
  DiagramDef, 'nodes' | 'connectors' | 'notes' | 'regions'
> {
  nodes: NormalizedNodeDef[]
  connectors?: NormalizedConnectorDef[]
  notes?: NormalizedNoteDef[]
  regions?: NormalizedRegionDef[]
}
