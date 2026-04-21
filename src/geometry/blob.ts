/**
 * Blob region geometry.
 *
 * A "blob" is the union of one or more axis-aligned grid spans, rendered as
 * a single closed SVG path with rounded convex AND concave corners.
 *
 * Workflow:
 *   buildBlob(spans, cols, rows, layout)
 *     1. paint spans into a boolean cell grid
 *     2. validate 4-connectivity (throws on disjoint)
 *     3. trace boundary edges and chain into CW polygons (pixel coords)
 *     4. simplify collinear vertices
 *
 *   blobPathD(blob, radius)
 *     emits an SVG path `d` attribute with rounded corners.
 */

import type { GridSpan } from '../types'
import type { GridLayout } from './grid'

export interface BlobBBox {
  minCol: number
  maxCol: number
  minRow: number
  maxRow: number
}

export interface Blob {
  cols: number
  rows: number
  /** cellGrid[row][col] = true if covered by at least one span */
  cellGrid: boolean[][]
  /** Grid-coord bbox of the union */
  bbox: BlobBBox
  /** Closed polygons in pixel coordinates, traced clockwise */
  contours: { x: number; y: number }[][]
}

export class DisjointRegionError extends Error {
  constructor(message = 'Region spans are disjoint (must form a single connected shape)') {
    super(message)
    this.name = 'DisjointRegionError'
  }
}

/**
 * Build a blob from spans. Throws DisjointRegionError if the union is not
 * 4-connected (diagonal-only contact counts as disjoint).
 *
 * `inset` (px) pulls every boundary vertex inward along the axis-aligned
 * inward normals of its adjacent edges, creating a visible gap between
 * neighboring regions. Radius clamping still applies on the offset polygon.
 */
export function buildBlob(spans: GridSpan[], layout: GridLayout, inset: number = 0): Blob {
  const cols = layout.columns
  const rows = layout.rows

  const cellGrid: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  )

  for (const span of spans) {
    // `spans[].from/to` are already canonical GridPos after
    // normalizeRegions runs in foldLayers.
    const from = span.from as { col: number; row: number }
    const to   = span.to   as { col: number; row: number }
    const r0 = Math.min(from.row, to.row)
    const r1 = Math.max(from.row, to.row)
    const c0 = Math.min(from.col, to.col)
    const c1 = Math.max(from.col, to.col)
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) cellGrid[r][c] = true
      }
    }
  }

  // 4-connectivity check
  let totalFilled = 0
  let seed: [number, number] | null = null
  let minCol = cols, maxCol = -1, minRow = rows, maxRow = -1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!cellGrid[r][c]) continue
      totalFilled++
      if (!seed) seed = [r, c]
      if (c < minCol) minCol = c
      if (c > maxCol) maxCol = c
      if (r < minRow) minRow = r
      if (r > maxRow) maxRow = r
    }
  }

  if (totalFilled > 0 && seed) {
    const visited: boolean[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    )
    const queue: [number, number][] = [seed]
    visited[seed[0]][seed[1]] = true
    let visitCount = 0
    while (queue.length > 0) {
      const [r, c] = queue.shift()!
      visitCount++
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (!cellGrid[nr][nc]) continue
        if (visited[nr][nc]) continue
        visited[nr][nc] = true
        queue.push([nr, nc])
      }
    }
    if (visitCount !== totalFilled) throw new DisjointRegionError()
  }

  const bbox: BlobBBox = { minCol, maxCol, minRow, maxRow }
  const contours = traceContours(cellGrid, layout, inset)

  return { cols, rows, cellGrid, bbox, contours }
}

/** Is the cell at (col, row) part of the blob? */
export function isCellFilled(blob: Blob, col: number, row: number): boolean {
  if (row < 0 || row >= blob.rows || col < 0 || col >= blob.cols) return false
  return blob.cellGrid[row][col]
}

// ---------------------------------------------------------------------------
// Contour tracing
// ---------------------------------------------------------------------------

interface GridPt {
  col: number
  row: number
}

/**
 * Collect boundary edges (each cell's side where the neighbor is empty/OOB)
 * in CW order around filled cells, then chain them into closed polygons.
 * Returns pixel-coord polygons.
 */
function traceContours(
  cellGrid: boolean[][],
  layout: GridLayout,
  inset: number
): { x: number; y: number }[][] {
  const cols = layout.columns
  const rows = layout.rows
  const filled = (r: number, c: number) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false
    return cellGrid[r][c]
  }

  type Edge = { p1: GridPt; p2: GridPt }
  const edges: Edge[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!filled(r, c)) continue
      // Top: L→R, boundary if cell above empty
      if (!filled(r - 1, c)) edges.push({ p1: { col: c, row: r }, p2: { col: c + 1, row: r } })
      // Right: T→B, boundary if cell right empty
      if (!filled(r, c + 1)) edges.push({ p1: { col: c + 1, row: r }, p2: { col: c + 1, row: r + 1 } })
      // Bottom: R→L, boundary if cell below empty
      if (!filled(r + 1, c)) edges.push({ p1: { col: c + 1, row: r + 1 }, p2: { col: c, row: r + 1 } })
      // Left: B→T, boundary if cell left empty
      if (!filled(r, c - 1)) edges.push({ p1: { col: c, row: r + 1 }, p2: { col: c, row: r } })
    }
  }

  const key = (p: GridPt) => `${p.col},${p.row}`
  const byStart = new Map<string, number[]>()
  edges.forEach((e, i) => {
    const k = key(e.p1)
    const arr = byStart.get(k) ?? []
    arr.push(i)
    byStart.set(k, arr)
  })

  const used = new Array(edges.length).fill(false)
  const contours: GridPt[][] = []

  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue
    const contour: GridPt[] = []
    let cur = i
    while (!used[cur]) {
      used[cur] = true
      contour.push(edges[cur].p1)
      const nextKey = key(edges[cur].p2)
      const candidates = byStart.get(nextKey) ?? []
      let next = -1
      for (const ci of candidates) {
        if (!used[ci]) { next = ci; break }
      }
      if (next === -1) break
      cur = next
    }
    if (contour.length >= 3) contours.push(contour)
  }

  return contours.map(simplifyCollinear).map((poly) => insetToPixels(poly, layout, inset))
}

/**
 * Convert a grid-coord polygon to pixel coords, pulling each vertex inward
 * by `inset` pixels along the sum of its adjacent edges' inward normals.
 * For CW polygons in SVG (y-down), inward normal of an edge is the edge
 * direction rotated 90° CW: (dx, dy) → (-dy, dx).
 */
function insetToPixels(
  poly: GridPt[],
  layout: GridLayout,
  inset: number
): { x: number; y: number }[] {
  const n = poly.length
  const result: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n]
    const curr = poly[i]
    const next = poly[(i + 1) % n]

    // All edges are axis-aligned; direction components are -1, 0, or +1
    const dInC = Math.sign(curr.col - prev.col)
    const dInR = Math.sign(curr.row - prev.row)
    const dOutC = Math.sign(next.col - curr.col)
    const dOutR = Math.sign(next.row - curr.row)

    // Inward normals (rotate 90° CW)
    const nInC = -dInR,  nInR = dInC
    const nOutC = -dOutR, nOutR = dOutC

    const shiftX = (nInC + nOutC) * inset
    const shiftY = (nInR + nOutR) * inset

    result.push({
      x: layout.offsetX + curr.col * layout.cellSize + shiftX,
      y: layout.offsetY + curr.row * layout.cellSize + shiftY,
    })
  }
  return result
}

function simplifyCollinear(poly: GridPt[]): GridPt[] {
  if (poly.length < 3) return poly
  const n = poly.length
  const out: GridPt[] = []
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n]
    const curr = poly[i]
    const next = poly[(i + 1) % n]
    const d1c = curr.col - prev.col, d1r = curr.row - prev.row
    const d2c = next.col - curr.col, d2r = next.row - curr.row
    const cross = d1c * d2r - d1r * d2c
    if (cross !== 0) out.push(curr)
  }
  return out
}

// ---------------------------------------------------------------------------
// Rounded-corner path generation
// ---------------------------------------------------------------------------

/**
 * Emit the `d` attribute for an SVG path that draws the blob with rounded
 * convex and concave corners. Radius is clamped per-corner to half the
 * adjacent edge length so arcs never overlap.
 *
 * When `inset > 0`, concave corners use radius + 2*inset so that the arc
 * is concentric with the convex arc of an adjacent region — producing a
 * uniform 2*inset gap along the entire shared boundary (including corners).
 */
export function blobPathD(blob: Blob, radius: number, inset: number = 0): string {
  return blob.contours.map((poly) => contourToPath(poly, radius, inset)).join(' ')
}

function contourToPath(poly: { x: number; y: number }[], r: number, inset: number): string {
  const n = poly.length
  if (n < 3) return ''

  type ArcSpec = {
    pStart: { x: number; y: number }
    pEnd: { x: number; y: number }
    sweep: 0 | 1
    radius: number
  }
  const arcs: ArcSpec[] = []

  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n]
    const curr = poly[i]
    const next = poly[(i + 1) % n]

    const dpx = prev.x - curr.x, dpy = prev.y - curr.y
    const lenPrev = Math.hypot(dpx, dpy)
    const upx = dpx / lenPrev, upy = dpy / lenPrev

    const dnx = next.x - curr.x, dny = next.y - curr.y
    const lenNext = Math.hypot(dnx, dny)
    const unx = dnx / lenNext, uny = dny / lenNext

    // inDir × outDir (SVG y-down, CW polygon):
    //   cross > 0 → convex (right turn)  → sweep=1 (CW short arc)
    //   cross < 0 → concave (left turn)  → sweep=0 (CCW short arc)
    const inX = -upx, inY = -upy
    const cross = inX * uny - inY * unx
    const isConvex = cross > 0
    const sweep: 0 | 1 = isConvex ? 1 : 0

    // Concave arcs use a larger radius so they stay concentric with the
    // convex arc of an adjacent region → uniform visual gap.
    const targetR = isConvex ? r : r + 2 * inset
    const rad = Math.min(targetR, lenPrev / 2, lenNext / 2)

    const pStart = { x: curr.x + upx * rad, y: curr.y + upy * rad }
    const pEnd = { x: curr.x + unx * rad, y: curr.y + uny * rad }

    arcs.push({ pStart, pEnd, sweep, radius: rad })
  }

  let d = `M ${arcs[0].pStart.x.toFixed(3)} ${arcs[0].pStart.y.toFixed(3)}`
  for (let i = 0; i < n; i++) {
    const arc = arcs[i]
    if (arc.radius > 0) {
      d += ` A ${arc.radius.toFixed(3)} ${arc.radius.toFixed(3)} 0 0 ${arc.sweep} ${arc.pEnd.x.toFixed(3)} ${arc.pEnd.y.toFixed(3)}`
    } else {
      d += ` L ${arc.pEnd.x.toFixed(3)} ${arc.pEnd.y.toFixed(3)}`
    }
    if (i < n - 1) {
      const nextStart = arcs[i + 1].pStart
      d += ` L ${nextStart.x.toFixed(3)} ${nextStart.y.toFixed(3)}`
    }
  }
  d += ' Z'
  return d
}
