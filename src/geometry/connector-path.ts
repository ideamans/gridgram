/**
 * Single source of truth for a connector's polyline geometry.
 *
 * Every consumer (line rendering, label placement, midpoint lookup,
 * collision detection) must derive coordinates from `resolveConnectorPath`
 * so that the rendered line and its computed metadata stay in lockstep.
 */

import type { NormalizedConnectorDef, NormalizedNodeDef } from '../types'
import type { GridLayout } from './grid'
import { gridToPixel, gridFracToPixel, resolveNodeSizeFrac } from './grid'
import type { LineSeg } from './collision'

export interface Pixel {
  x: number
  y: number
}

export interface ResolvedPath {
  /** Raw polyline (node centers + waypoints) before pull-back */
  raw: Pixel[]
  /** Polyline with first/last point pulled back to the node edges */
  points: Pixel[]
}

const DEFAULT_NODE_MARGIN = 1.0

/**
 * Clamp `nodeMargin` to ≥ 1.0 before it feeds pullBack.
 *
 * With a straight line the pulled-back endpoint sits on the circle's
 * perimeter at exactly `radius × margin` from the centre. A value of
 * 1.0 kisses the edge. Anything below 1.0 places the endpoint INSIDE
 * the node circle, and for routed / arched paths (connectors that
 * skip two or more cells and get an L-shape or arc from the router)
 * that intrusion becomes very visible — the arrow tip and the
 * incoming stub overlap the icon disc. "margin < 0" was never a
 * useful authoring intent; authors who wrote 0.9 were really asking
 * for "as close to the edge as possible", which is exactly 1.0.
 *
 * Clamping here means no placement of arrow tips inside the node can
 * slip through, regardless of user input or router geometry. Values
 * greater than 1.0 remain usable for deliberate stand-off space.
 */
function resolveNodeMargin(m: number | undefined): number {
  const raw = m ?? DEFAULT_NODE_MARGIN
  return raw < 1.0 ? 1.0 : raw
}

function pullBack(from: Pixel, towards: Pixel, dist: number): Pixel {
  const dx = towards.x - from.x
  const dy = towards.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { x: from.x, y: from.y }
  const ratio = dist / len
  return { x: from.x + dx * ratio, y: from.y + dy * ratio }
}

function nodeRadius(node: NormalizedNodeDef, layout: GridLayout): number {
  return (layout.cellSize * resolveNodeSizeFrac(node)) / 2
}

function rawPolyline(
  fromNode: NormalizedNodeDef,
  toNode: NormalizedNodeDef,
  conn: NormalizedConnectorDef,
  layout: GridLayout,
  pixelWaypoints?: Pixel[]
): Pixel[] {
  const points: Pixel[] = [gridToPixel(layout, fromNode.pos)]
  if (pixelWaypoints) {
    points.push(...pixelWaypoints)
  } else if (conn.waypoints) {
    for (const wp of conn.waypoints) {
      points.push(gridFracToPixel(layout, wp.col, wp.row))
    }
  }
  points.push(gridToPixel(layout, toNode.pos))
  return points
}

/**
 * Resolve the rendered polyline of a connector. Returns null when
 * either endpoint is missing from the node map (callers treat this as
 * "skip / nothing to render").
 *
 * `pixelWaypoints` (when given) overrides the connector's own waypoints
 * — used by routed connectors to plug in router output.
 */
export function resolveConnectorPath(
  conn: NormalizedConnectorDef,
  nodeMap: Map<string, NormalizedNodeDef>,
  layout: GridLayout,
  pixelWaypoints?: Pixel[]
): ResolvedPath | null {
  const fromNode = nodeMap.get(conn.from)
  const toNode = nodeMap.get(conn.to)
  if (!fromNode || !toNode) return null

  const raw = rawPolyline(fromNode, toNode, conn, layout, pixelWaypoints)
  const points = raw.slice()

  if (points.length >= 2) {
    const margin = resolveNodeMargin(conn.nodeMargin)
    points[0] = pullBack(raw[0], points[1], nodeRadius(fromNode, layout) * margin)
    const last = points.length - 1
    points[last] = pullBack(raw[last], points[last - 1], nodeRadius(toNode, layout) * margin)
  }

  return { raw, points }
}

/** Convert a polyline to pairwise line segments. */
export function polylineToSegments(points: Pixel[]): LineSeg[] {
  const segs: LineSeg[] = []
  for (let i = 1; i < points.length; i++) {
    segs.push({ x1: points[i - 1].x, y1: points[i - 1].y, x2: points[i].x, y2: points[i].y })
  }
  return segs
}

/**
 * Midpoint of the connector's central segment.
 *
 * Operates on the raw polyline (node centers, not pulled back) — used
 * for "where does this connector live" queries like Note leader-line
 * targets.
 */
export function rawMidpoint(path: ResolvedPath): Pixel {
  const pts = path.raw
  const midIdx = Math.floor((pts.length - 1) / 2)
  return {
    x: (pts[midIdx].x + pts[midIdx + 1].x) / 2,
    y: (pts[midIdx].y + pts[midIdx + 1].y) / 2,
  }
}
