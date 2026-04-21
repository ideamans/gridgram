/**
 * Normalize all coordinate inputs to canonical 0-based `{col, row}`
 * form, AND fill in missing node positions for nodes that omitted them.
 *
 * Coordinates reach us in one of four public shapes (all 1-based):
 *
 *   - A1 string:  "A1", "B3", "aa100" (via `normPos`)
 *   - tuple:      [1, 1]
 *   - named:      { col: 1, row: 1 }
 *   - (waypoint): fractional tuple / named — 1-based too
 *
 * Internally gridgram stores `GridPos` as 0-based (so `A1` is
 * `{col: 0, row: 0}`) because every piece of layout math reads `.col` /
 * `.row` as a plain cell index.
 *
 * Two normalizations happen here:
 *
 *   1. Input-form → canonical object + 1-based → 0-based shift.
 *   2. Auto-positioning — nodes without `pos` get successive
 *      coordinates starting at (0, 0). col increments along row 0;
 *      when `columns` is set explicitly, wraps into the next row.
 *      Explicit positions are kept as-is and don't move the auto
 *      counter.
 *
 * All helpers are pure.
 */
import type {
  ConnectorDef, GridPos, GridPosInput, NodeDef, NoteDef, RegionDef,
  NormalizedConnectorDef, NormalizedNodeDef, NormalizedNoteDef, NormalizedRegionDef,
  WayPoint, WayPointInput,
} from './types'
import { parseA1 } from './a1'

/**
 * Coerce any `GridPosInput` to its canonical 0-based `{col, row}`
 * object. Throws with a readable message if the input is malformed
 * (bad A1 address, non-integer for tuple/object, col or row < 1).
 */
export function normPos(p: GridPosInput): GridPos {
  if (typeof p === 'string') {
    const one = parseA1(p)
    return { col: one.col - 1, row: one.row - 1 }
  }
  // Use `'col' in p` rather than Array.isArray — the latter doesn't narrow
  // `readonly [col, row]` tuples cleanly, leaving TS to complain about `.col`
  // access in the else branch.
  const col = 'col' in p ? p.col : p[0]
  const row = 'col' in p ? p.row : p[1]
  if (!Number.isInteger(col) || !Number.isInteger(row)) {
    throw new Error(`Grid coordinate must be integers (got col=${col}, row=${row})`)
  }
  if (col < 1 || row < 1) {
    throw new Error(`Grid coordinate is 1-based (A1 = {col:1, row:1}); got {col:${col}, row:${row}}`)
  }
  return { col: col - 1, row: row - 1 }
}

/**
 * Coerce any `WayPointInput` to its canonical 0-based `{col, row}`
 * object. Waypoints may be fractional (e.g. 1.5) but must still be
 * ≥ 1 in user-facing 1-based coordinates — a waypoint "before A1"
 * is not meaningful on the grid.
 */
export function normWayPoint(p: WayPointInput): WayPoint {
  const col = 'col' in p ? p.col : p[0]
  const row = 'col' in p ? p.row : p[1]
  if (!Number.isFinite(col) || !Number.isFinite(row)) {
    throw new Error(`Waypoint coordinates must be numbers (got col=${col}, row=${row})`)
  }
  if (col < 1 || row < 1) {
    throw new Error(`Waypoint is 1-based (A1 = {col:1, row:1}); got {col:${col}, row:${row}}`)
  }
  return { col: col - 1, row: row - 1 }
}

/** Normalise + auto-fill positions for every node. */
export function assignAutoPositions(nodes: NodeDef[], columns?: number): NormalizedNodeDef[] {
  const wrap = columns && columns > 0 ? columns : Infinity
  let nextCol = 0
  let nextRow = 0
  return nodes.map((n) => {
    if (n.pos !== undefined) {
      return { ...n, pos: normPos(n.pos) }
    }
    const pos: GridPos = { col: nextCol, row: nextRow }
    nextCol++
    if (nextCol >= wrap) {
      nextCol = 0
      nextRow++
    }
    return { ...n, pos }
  })
}

/** Normalise input-form waypoints inside connectors. */
export function normalizeConnectorWaypoints(connectors: ConnectorDef[]): NormalizedConnectorDef[] {
  return connectors.map((c) => {
    if (!c.waypoints || c.waypoints.length === 0) return c as NormalizedConnectorDef
    return { ...c, waypoints: c.waypoints.map(normWayPoint) }
  })
}

/** Normalise input-form positions inside notes. */
export function normalizeNotes(notes: NoteDef[]): NormalizedNoteDef[] {
  return notes.map((n) => ({ ...n, pos: normPos(n.pos) }))
}

/** Normalise input-form span endpoints inside regions. */
export function normalizeRegions(regions: RegionDef[]): NormalizedRegionDef[] {
  return regions.map((r) => ({
    ...r,
    spans: r.spans.map((s) => ({ ...s, from: normPos(s.from), to: normPos(s.to) })),
  }))
}
