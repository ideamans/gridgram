/**
 * Structured placement / layout feedback for AI agents (and humans).
 *
 * The pipeline's boolean error flags (`labelError`, `lineError`,
 * `iconError`) tell a renderer "paint this red," but an agent reading
 * the output can't act on a red pixel. This module defines the richer
 * shape that the layout pipeline emits alongside the rendered diagram:
 * every forced fallback (label with no clear slot, connector that
 * couldn't be routed, icon that wouldn't resolve) produces one record
 * with enough context to choose a remediation — which element failed,
 * which candidates were tried, what blocked each one, and where the
 * final placement ended up.
 *
 * Co-exists with `GgError` (parser / integrity / icon-loader) — those
 * are fatal-or-aborting "you wrote something wrong." Diagnostics are
 * "we rendered, but the geometry is unhappy."
 *
 * Coordinate convention: **1-based** throughout. Matches the DSL and
 * anything a user/agent wrote. Internal 0-based `GridPos` is converted
 * at the diagnostic-producer boundary.
 */

// ---------------------------------------------------------------------------
// References to elements and geometry
// ---------------------------------------------------------------------------

/**
 * Which element a diagnostic is about. For nodes/notes we include the
 * grid cell; for regions, the span range; for connectors, the endpoint
 * ids so the agent can rewrite the edge.
 */
export type ElementRef =
  /** `pos` is optional because icon-unresolved diagnostics are emitted
   *  before the coord normalization pass — the pipeline always includes
   *  `pos` for placement-level diagnostics. */
  | { kind: 'node';      id: string; pos?: GridCellRef;  line?: number }
  | { kind: 'note';      id: string; pos?: GridCellRef;  line?: number }
  | { kind: 'region';    id?: string; span: GridSpanRef; line?: number }
  | {
      kind: 'connector'
      id?: string
      from: string
      to: string
      line?: number
    }

/** 1-based grid cell. `address` is the A1 form ('B3') for quick human reading. */
export interface GridCellRef {
  col: number
  row: number
  address: string
}

/** 1-based span — both endpoints inclusive. */
export interface GridSpanRef {
  from: GridCellRef
  to: GridCellRef
}

/**
 * The shape of an obstacle that blocked a placement attempt. The
 * geometry is in pixel coords so an agent can reason quantitatively
 * (how deep was the overlap); `owner` points back to whatever element
 * the obstacle belongs to — a label, an icon disc, a connector line,
 * a note leader.
 */
export type Obstacle =
  | {
      kind: 'label'
      owner: ElementRef
      rect: PixelRect
    }
  | {
      kind: 'icon'
      owner: ElementRef   // the node whose icon-disc blocked us
      circle: PixelCircle
    }
  | {
      kind: 'line'
      owner: ElementRef   // usually a connector
      line: PixelLine
    }
  | {
      kind: 'leader'
      owner: ElementRef   // a note's leader line
      line: PixelLine
    }
  | {
      kind: 'canvas-bounds'
      bounds: { width: number; height: number }
    }

export interface PixelRect { x: number; y: number; w: number; h: number }
export interface PixelLine { x1: number; y1: number; x2: number; y2: number }
export interface PixelCircle { cx: number; cy: number; r: number }

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** One position the placer tried, and what blocked it (empty = it was accepted). */
export interface PlacementAttempt {
  /** Human-readable slot name, e.g. "top-right", "mid-segment", "segment 2 / above". */
  slot: string
  /** Pixel rect that would have been drawn at this slot. */
  rect: PixelRect
  /** Everything that collided with this rect. Empty array ⇒ this slot
   *  was the one picked (the last attempt recorded when `accepted: true`). */
  obstacles: Obstacle[]
  /** True for the slot the placer ultimately chose — either the first
   *  collision-free candidate, or the fallback when every slot collided. */
  accepted: boolean
}

export type DiagnosticKind =
  /** A label (node/connector/region) couldn't find a collision-free slot
   *  and was forced to its fallback. */
  | 'label-collision'
  /** A connector couldn't be routed around obstacles (every candidate
   *  path collided), so a direct line was drawn through. */
  | 'route-failed'
  /** A node's `src=` couldn't be resolved to an icon (typo, network
   *  failure, missing file, …). Node renders with the iconError ring. */
  | 'icon-unresolved'
  /** A region's spans don't form a single connected shape. Renders as
   *  best-effort but geometry is broken. (Emitted in addition to the
   *  existing GgError.) */
  | 'region-disjoint'
  /** The declared `cols` / `rows` don't match how the cells are used —
   *  a node sits outside the declared grid, or the declared grid
   *  reserves empty columns / rows beyond (or before) the content.
   *  Agents use these to tighten the grid or to expand it when a
   *  node was placed off-canvas. */
  | 'grid-mismatch'

export interface PlacementDiagnostic {
  kind: DiagnosticKind
  /** `warning`: rendered but with a visible fallback / error color.
   *  `error`: rendered but the result is structurally broken and
   *  probably unusable. */
  severity: 'warning' | 'error'
  element: ElementRef
  /** One-line summary intended for direct display to the agent. */
  message: string
  /** Optional hint pointing at a concrete remediation the agent can try.
   *  Should reference element ids / grid cells from the same diagnostic. */
  suggestion?: string
  /** The rect ultimately rendered (useful to cross-reference with the
   *  SVG). Absent for non-placement diagnostics like icon-unresolved. */
  finalRect?: PixelRect
  /** Full candidate history — empty for diagnostics that don't involve
   *  multi-slot placement. */
  attempts?: PlacementAttempt[]
  /** Icon-unresolved specific: the original source string the DSL had. */
  iconSrc?: string
  /** Icon-unresolved specific: coarse reason category so an agent can
   *  decide whether to retry, rename, or give up. */
  iconReason?: 'not-found' | 'load-failed' | 'malformed'
  /** Grid-mismatch specific: which axis + which side of the declared
   *  grid the mismatch sits on. */
  grid?: {
    axis: 'col' | 'row'
    /** Declared value (from `doc { cols / rows }`). `undefined` means
     *  the user didn't declare it, and the mismatch is between two
     *  *inferred* bounds — unusual, but possible if a region span
     *  extends past the largest node. */
    declared?: number
    /** Actual cells used (1-based — max cell index + 1). */
    used: number
    /** `overflow`: a cell beyond the declared grid.
     *  `slack-leading`: empty cells before the first used cell.
     *  `slack-trailing`: empty cells after the last used cell. */
    kind: 'overflow' | 'slack-leading' | 'slack-trailing'
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a 0-based {col,row} into a user-facing 1-based cell ref. */
export function toCellRef(pos: { col: number; row: number }): GridCellRef {
  const col = pos.col + 1
  const row = pos.row + 1
  return { col, row, address: cellAddress(col, row) }
}

/** Convert a 0-based span to a 1-based inclusive span ref. */
export function toSpanRef(span: {
  from: { col: number; row: number }
  to: { col: number; row: number }
}): GridSpanRef {
  return { from: toCellRef(span.from), to: toCellRef(span.to) }
}

/** Turn a 1-based (col, row) into its A1 string ('A1', 'AA100'). */
export function cellAddress(col: number, row: number): string {
  let c = col
  let letters = ''
  while (c > 0) {
    const rem = (c - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    c = Math.floor((c - 1) / 26)
  }
  return `${letters}${row}`
}
