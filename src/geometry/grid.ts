import type { DiagramDef, GridPos, NodeDef, NoteDef, ConnectorDef, RegionDef } from '../types'

/** Default node diameter as fraction of cell size */
export const DEFAULT_NODE_SIZE = 0.45

/** Default cell size when DiagramDef.cellSize is omitted */
export const DEFAULT_CELL_SIZE = 256

/**
 * Resolve a node's diameter fraction: explicit `size` wins, otherwise
 * `DEFAULT_NODE_SIZE * (sizeScale ?? 1)`.
 */
export function resolveNodeSizeFrac(node: NodeDef): number {
  return node.size ?? DEFAULT_NODE_SIZE * (node.sizeScale ?? 1)
}

/**
 * Resolved grid metrics in pixel units.
 *
 * - `cellSize` is the per-cell pixel size in the SVG coordinate space.
 * - `width` / `height` are the full canvas dimensions (cellSize × columns
 *   plus 2× padding, similarly for rows). The canvas is rectangular when
 *   cols ≠ rows; the old square-canvas constraint is gone.
 * - `offsetX` / `offsetY` are where column 0 / row 0 start (= padding).
 */
export interface GridLayout {
  /** Canvas width in px (= cellSize * columns + 2 * padding) */
  width: number
  /** Canvas height in px */
  height: number
  /** Padding in px on each side */
  padding: number
  /** Cell size in px */
  cellSize: number
  /** Pixel offset of column 0's left edge */
  offsetX: number
  /** Pixel offset of row 0's top edge */
  offsetY: number
  /** Number of columns */
  columns: number
  /** Number of rows */
  rows: number
}

function inferDimension(def: DiagramDef, axis: 'col' | 'row'): number {
  // By the time we reach computeLayout, foldLayers has already run
  // assignAutoPositions so every coordinate-bearing element carries a
  // canonical 0-based {col, row} form. Nodes, notes, connector
  // waypoints, and region-span endpoints all contribute — otherwise
  // a note sitting at @B2 on an otherwise single-row diagram would
  // fall off the auto-sized canvas, and its leader would look like a
  // line cut in half.
  let max = 0
  for (const n of def.nodes) {
    if (!n.pos) continue
    const v = (n.pos as { col: number; row: number })[axis]
    if (v > max) max = v
  }
  for (const note of (def.notes as NoteDef[] | undefined) ?? []) {
    const p = note.pos as unknown as { col: number; row: number }
    if (p && p[axis] > max) max = p[axis]
  }
  for (const c of (def.connectors as ConnectorDef[] | undefined) ?? []) {
    for (const wp of c.waypoints ?? []) {
      const v = (wp as unknown as { col: number; row: number })[axis]
      if (v > max) max = v
    }
  }
  for (const r of (def.regions as RegionDef[] | undefined) ?? []) {
    for (const s of r.spans) {
      const f = s.from as unknown as { col: number; row: number }
      const t = s.to as unknown as { col: number; row: number }
      if (f[axis] > max) max = f[axis]
      if (t[axis] > max) max = t[axis]
    }
  }
  return Math.max(1, Math.floor(max) + 1)
}

export function computeLayout(def: DiagramDef): GridLayout {
  const cellSize = def.cellSize ?? DEFAULT_CELL_SIZE
  const columns = def.columns ?? inferDimension(def, 'col')
  const rows = def.rows ?? inferDimension(def, 'row')

  // Default padding scales with cellSize. Routed connectors traverse cell
  // corners, so without margin a cell at row/col 0 hugs the canvas edge.
  const defaultPadding = 2 * Math.max(cellSize * 0.025, 4)
  const padding = def.padding ?? defaultPadding

  const width = cellSize * columns + 2 * padding
  const height = cellSize * rows + 2 * padding
  const offsetX = padding
  const offsetY = padding

  return { width, height, padding, cellSize, offsetX, offsetY, columns, rows }
}

/**
 * Convert a (canonical, 0-based) grid position to pixel center
 * coordinates. Callers pass the already-normalized `GridPos`, not a
 * raw `GridPosInput`.
 */
export function gridToPixel(layout: GridLayout, pos: GridPos): { x: number; y: number } {
  return {
    x: layout.offsetX + (pos.col + 0.5) * layout.cellSize,
    y: layout.offsetY + (pos.row + 0.5) * layout.cellSize,
  }
}

/** Convert a fractional grid coordinate to pixel */
export function gridFracToPixel(layout: GridLayout, col: number, row: number): { x: number; y: number } {
  return {
    x: layout.offsetX + (col + 0.5) * layout.cellSize,
    y: layout.offsetY + (row + 0.5) * layout.cellSize,
  }
}

/** Get pixel rect for a grid span (top-left corner + width/height) */
export function gridSpanToRect(
  layout: GridLayout,
  from: GridPos,
  to: GridPos,
  inset = 6
): { x: number; y: number; width: number; height: number } {
  const x = layout.offsetX + from.col * layout.cellSize + inset
  const y = layout.offsetY + from.row * layout.cellSize + inset
  const width = (to.col - from.col + 1) * layout.cellSize - 2 * inset
  const height = (to.row - from.row + 1) * layout.cellSize - 2 * inset
  return { x, y, width, height }
}
