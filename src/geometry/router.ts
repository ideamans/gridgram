/**
 * Grid-intersection-based connector routing.
 *
 * Routes connectors through grid intersection points (cell corners)
 * using Dijkstra with 8-connected neighbors to avoid node circles.
 * Tracks used intersections to prefer fresh paths.
 */

import type { NormalizedNodeDef, NormalizedConnectorDef } from '../types.js'
import type { GridLayout } from './grid.js'
import { gridToPixel, gridFracToPixel, resolveNodeSizeFrac } from './grid.js'
import { lineIntersectsCircle } from './collision.js'
import { MinHeap } from './heap.js'

export interface IntPt {
  i: number
  j: number
}

export interface RouteResult {
  waypoints: { x: number; y: number }[]
  intersections: IntPt[]
}

/** Convert grid intersection (i,j) to pixel coordinates */
function intToPixel(layout: GridLayout, i: number, j: number): { x: number; y: number } {
  return {
    x: layout.offsetX + i * layout.cellSize,
    y: layout.offsetY + j * layout.cellSize,
  }
}

function pixelDist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function segmentCrossesAnyNode(
  x1: number, y1: number, x2: number, y2: number,
  nodes: NormalizedNodeDef[], layout: GridLayout,
  excludeIds: Set<string>
): boolean {
  for (const node of nodes) {
    if (excludeIds.has(node.id)) continue
    const c = gridToPixel(layout, node.pos)
    const r = (layout.cellSize * resolveNodeSizeFrac(node)) / 2
    if (lineIntersectsCircle(x1, y1, x2, y2, c.x, c.y, r)) return true
  }
  return false
}

export function intPtKey(i: number, j: number): string {
  return `${i},${j}`
}

interface DijkstraResult {
  path: IntPt[]
  cost: number
}

/**
 * Dijkstra on 8-connected grid intersections.
 * usedIntersections adds a penalty to prefer fresh paths.
 */
function dijkstraRoute(
  start: IntPt,
  end: IntPt,
  layout: GridLayout,
  nodes: NormalizedNodeDef[],
  excludeIds: Set<string>,
  usedIntersections: Set<string>
): DijkstraResult | null {
  const cols = layout.columns
  const rows = layout.rows
  const key = (i: number, j: number) => `${i},${j}`

  const dirs: [number, number, number][] = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ]

  interface PQEntry { i: number; j: number; d: number; seq: number }

  const dist = new Map<string, number>()
  const parent = new Map<string, string | null>()
  // Stable tie-break by insertion order — matches the prior Array.sort
  // behavior so equal-cost paths resolve identically across runs.
  let seq = 0
  const pq = new MinHeap<PQEntry>((a, b) => (a.d - b.d) || (a.seq - b.seq))

  const startKey = key(start.i, start.j)
  dist.set(startKey, 0)
  parent.set(startKey, null)
  pq.push({ i: start.i, j: start.j, d: 0, seq: seq++ })

  while (pq.size > 0) {
    const cur = pq.pop()!
    const curKey = key(cur.i, cur.j)
    const curDist = dist.get(curKey) ?? Infinity
    // Stale entry — a shorter path to (i,j) was found after this one was queued
    if (cur.d > curDist) continue

    if (cur.i === end.i && cur.j === end.j) {
      const path: IntPt[] = []
      let k: string | null = curKey
      while (k !== null) {
        const [pi, pj] = k.split(',').map(Number)
        path.unshift({ i: pi, j: pj })
        k = parent.get(k) ?? null
      }
      return { path, cost: curDist }
    }

    for (const [di, dj, cost] of dirs) {
      const ni = cur.i + di
      const nj = cur.j + dj
      if (ni < 0 || ni > cols || nj < 0 || nj > rows) continue

      const p1 = intToPixel(layout, cur.i, cur.j)
      const p2 = intToPixel(layout, ni, nj)
      if (segmentCrossesAnyNode(p1.x, p1.y, p2.x, p2.y, nodes, layout, excludeIds)) continue

      const nKey = key(ni, nj)
      const usedPenalty = usedIntersections.has(nKey) ? 2.0 : 0
      const newDist = curDist + cost + usedPenalty
      const oldDist = dist.get(nKey) ?? Infinity

      if (newDist < oldDist) {
        dist.set(nKey, newDist)
        parent.set(nKey, curKey)
        pq.push({ i: ni, j: nj, d: newDist, seq: seq++ })
      }
    }
  }
  return null
}

function cellCorners(node: NormalizedNodeDef): IntPt[] {
  const p = node.pos
  return [
    { i: p.col,     j: p.row     },
    { i: p.col + 1, j: p.row     },
    { i: p.col,     j: p.row + 1 },
    { i: p.col + 1, j: p.row + 1 },
  ]
}

/**
 * Count how many intersections in a path are already used.
 */
function countUsedIntersections(path: IntPt[], usedIntersections: Set<string>): number {
  let count = 0
  for (const pt of path) {
    if (usedIntersections.has(intPtKey(pt.i, pt.j))) count++
  }
  return count
}

interface CandidateRoute {
  path: IntPt[]
  totalCost: number
  usedCount: number // how many intersections are already used
}

/**
 * Route a connector around nodes through grid intersections.
 *
 * Tries all 4×4 combinations of start/end cell corners.
 * Selection priority:
 *   1. Routes with fewer collisions with used intersections
 *   2. Among equal collision count, shortest total distance
 */
export function routeAroundNodes(
  conn: NormalizedConnectorDef,
  nodeMap: Map<string, NormalizedNodeDef>,
  allNodes: NormalizedNodeDef[],
  layout: GridLayout,
  usedIntersections: Set<string> = new Set()
): RouteResult | null {
  const fromNode = nodeMap.get(conn.from)
  const toNode = nodeMap.get(conn.to)
  if (!fromNode || !toNode) return null

  const excludeIds = new Set([conn.from, conn.to])
  const fromPx = gridToPixel(layout, fromNode.pos)
  const toPx = gridToPixel(layout, toNode.pos)

  const startCorners = cellCorners(fromNode)
  const endCorners = cellCorners(toNode)

  const candidates: CandidateRoute[] = []

  for (const sc of startCorners) {
    const sp = intToPixel(layout, sc.i, sc.j)
    if (segmentCrossesAnyNode(fromPx.x, fromPx.y, sp.x, sp.y, allNodes, layout, excludeIds)) continue
    const costToStart = pixelDist(fromPx, sp)

    for (const ec of endCorners) {
      const ep = intToPixel(layout, ec.i, ec.j)
      if (segmentCrossesAnyNode(ep.x, ep.y, toPx.x, toPx.y, allNodes, layout, excludeIds)) continue
      const costFromEnd = pixelDist(ep, toPx)

      const result = dijkstraRoute(sc, ec, layout, allNodes, excludeIds, usedIntersections)
      if (!result) continue

      const gridCost = result.cost * layout.cellSize
      const totalCost = costToStart + gridCost + costFromEnd
      const usedCount = countUsedIntersections(result.path, usedIntersections)

      candidates.push({ path: result.path, totalCost, usedCount })
    }
  }

  if (candidates.length === 0) return null

  // Sort: fewer used intersections first, then shorter distance
  candidates.sort((a, b) => {
    if (a.usedCount !== b.usedCount) return a.usedCount - b.usedCount
    return a.totalCost - b.totalCost
  })

  const best = candidates[0]

  return {
    waypoints: best.path.map((pt) => intToPixel(layout, pt.i, pt.j)),
    intersections: best.path,
  }
}

/**
 * Every non-endpoint node whose disc the connector's (possibly
 * way-pointed) polyline crosses. Returned in the order `allNodes`
 * supplies — first match wins per node, so the result has no
 * duplicates. Empty array ⇒ the direct line is clear.
 *
 * Used by the pipeline to (a) decide whether routing is needed and
 * (b) emit a `route-failed` diagnostic with the offending node ids
 * when no alternate path exists.
 */
export function findCrossingNodes(
  conn: NormalizedConnectorDef,
  nodeMap: Map<string, NormalizedNodeDef>,
  allNodes: NormalizedNodeDef[],
  layout: GridLayout,
): NormalizedNodeDef[] {
  const fn = nodeMap.get(conn.from)
  const tn = nodeMap.get(conn.to)
  if (!fn || !tn) return []

  const pts: { x: number; y: number }[] = [gridToPixel(layout, fn.pos)]
  if (conn.waypoints) {
    for (const wp of conn.waypoints) {
      pts.push(gridFracToPixel(layout, wp.col, wp.row))
    }
  }
  pts.push(gridToPixel(layout, tn.pos))

  const crossing: NormalizedNodeDef[] = []
  for (const node of allNodes) {
    if (node.id === conn.from || node.id === conn.to) continue
    const center = gridToPixel(layout, node.pos)
    const radius = (layout.cellSize * resolveNodeSizeFrac(node)) / 2
    for (let i = 1; i < pts.length; i++) {
      if (lineIntersectsCircle(
        pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y,
        center.x, center.y, radius,
      )) {
        crossing.push(node)
        break
      }
    }
  }
  return crossing
}

/**
 * Back-compat boolean wrapper. Prefer `findCrossingNodes` when the
 * caller also wants the obstacle ids (diagnostic emission).
 */
export function connectorCrossesNode(
  conn: NormalizedConnectorDef,
  nodeMap: Map<string, NormalizedNodeDef>,
  allNodes: NormalizedNodeDef[],
  layout: GridLayout,
): boolean {
  return findCrossingNodes(conn, nodeMap, allNodes, layout).length > 0
}
