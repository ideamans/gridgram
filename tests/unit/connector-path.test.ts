import { describe, expect, test } from 'bun:test'
import {
  resolveConnectorPath,
  polylineToSegments,
  rawMidpoint,
} from '../../src/geometry/connector-path'
import { computeLayout, gridToPixel } from '../../src/geometry/grid'
import type { NormalizedConnectorDef, NormalizedNodeDef } from '../../src/types'

const layout = computeLayout({
  nodes: [
    { id: 'a', pos: { col: 0, row: 0 } },
    { id: 'b', pos: { col: 3, row: 0 } },
  ],
})

const nodes: NormalizedNodeDef[] = [
  { id: 'a', pos: { col: 0, row: 0 } },
  { id: 'b', pos: { col: 3, row: 0 } },
  { id: 'c', pos: { col: 1, row: 1 }, sizeScale: 2 }, // bigger node → bigger pull-back
]
const map = new Map(nodes.map((n) => [n.id, n]))

describe('resolveConnectorPath', () => {
  test('returns null when an endpoint id is missing', () => {
    expect(resolveConnectorPath({ from: 'a', to: 'missing' }, map, layout)).toBe(null)
  })

  test('two-point straight connector pulls both ends inward', () => {
    const conn: NormalizedConnectorDef = { from: 'a', to: 'b' }
    const path = resolveConnectorPath(conn, map, layout)!
    const aPx = gridToPixel(layout, { col: 0, row: 0 })
    const bPx = gridToPixel(layout, { col: 3, row: 0 })

    expect(path.raw[0]).toEqual(aPx)
    expect(path.raw[path.raw.length - 1]).toEqual(bPx)

    // Pulled-back endpoints sit strictly between the raw endpoints
    expect(path.points[0].x).toBeGreaterThan(aPx.x)
    expect(path.points[1].x).toBeLessThan(bPx.x)
    // Same y because the line is horizontal
    expect(path.points[0].y).toBeCloseTo(aPx.y, 6)
    expect(path.points[1].y).toBeCloseTo(bPx.y, 6)
  })

  test('explicit pixelWaypoints win over conn.waypoints', () => {
    const conn: NormalizedConnectorDef = { from: 'a', to: 'b', waypoints: [{ col: 1, row: 1 }] }
    const override = { x: 999, y: 999 }
    const path = resolveConnectorPath(conn, map, layout, [override])!
    expect(path.raw.length).toBe(3)
    expect(path.raw[1]).toEqual(override)
  })

  test('larger node radius produces a larger pull-back distance', () => {
    const small: NormalizedConnectorDef = { from: 'a', to: 'b' }
    const big: NormalizedConnectorDef = { from: 'a', to: 'c' }

    const sp = resolveConnectorPath(small, map, layout)!
    const bp = resolveConnectorPath(big, map, layout)!

    const aPx = gridToPixel(layout, { col: 0, row: 0 })
    const distFromA = (p: { x: number; y: number }) => Math.hypot(p.x - aPx.x, p.y - aPx.y)

    // Both connectors start from 'a' but pull-back uses the *origin's* radius
    // for the first point. Since both share 'a' (default radius), the start
    // pull-back is equal — but the *end* pull-back differs because c has 2x scale.
    expect(distFromA(sp.points[0])).toBeCloseTo(distFromA(bp.points[0]), 6)

    const cPx = gridToPixel(layout, { col: 1, row: 1 })
    const bPx = gridToPixel(layout, { col: 3, row: 0 })
    const sBackDist = Math.hypot(sp.points[1].x - bPx.x, sp.points[1].y - bPx.y)
    const bBackDist = Math.hypot(bp.points[1].x - cPx.x, bp.points[1].y - cPx.y)
    expect(bBackDist).toBeGreaterThan(sBackDist)
  })

  test('nodeMargin scales the pull-back proportionally', () => {
    const baseline = resolveConnectorPath({ from: 'a', to: 'b' }, map, layout)!
    const doubled = resolveConnectorPath({ from: 'a', to: 'b', nodeMargin: 2.0 }, map, layout)!
    const aPx = gridToPixel(layout, { col: 0, row: 0 })
    const baseDist = baseline.points[0].x - aPx.x
    const doubleDist = doubled.points[0].x - aPx.x
    expect(doubleDist).toBeCloseTo(baseDist * 2, 6)
  })

  test('nodeMargin < 1.0 is clamped to 1.0 — the endpoint never goes inside the circle', () => {
    const baseline = resolveConnectorPath({ from: 'a', to: 'b' }, map, layout)!
    const halfMargin = resolveConnectorPath({ from: 'a', to: 'b', nodeMargin: 0.5 }, map, layout)!
    // Both should pull back by exactly one radius. Identical endpoints.
    expect(halfMargin.points[0]).toEqual(baseline.points[0])
    expect(halfMargin.points[halfMargin.points.length - 1])
      .toEqual(baseline.points[baseline.points.length - 1])
  })
})

describe('polylineToSegments', () => {
  test('N points → N-1 segments', () => {
    const segs = polylineToSegments([
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 },
    ])
    expect(segs).toEqual([
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 10, y1: 0, x2: 10, y2: 10 },
    ])
  })

  test('single point → no segments', () => {
    expect(polylineToSegments([{ x: 0, y: 0 }])).toEqual([])
  })
})

describe('rawMidpoint', () => {
  test('uses raw (un-pulled-back) polyline so callers always see node-center geometry', () => {
    const path = resolveConnectorPath({ from: 'a', to: 'b' }, map, layout)!
    const mid = rawMidpoint(path)
    const aPx = gridToPixel(layout, { col: 0, row: 0 })
    const bPx = gridToPixel(layout, { col: 3, row: 0 })
    expect(mid.x).toBeCloseTo((aPx.x + bPx.x) / 2, 6)
    expect(mid.y).toBeCloseTo(aPx.y, 6)
  })

  test('with waypoints, picks the central segment midpoint', () => {
    const conn: NormalizedConnectorDef = { from: 'a', to: 'b', waypoints: [{ col: 1, row: 0 }, { col: 2, row: 0 }] }
    const path = resolveConnectorPath(conn, map, layout)!
    const mid = rawMidpoint(path)
    // central segment is between waypoint 1 and 2 → y stays constant, x is between them
    expect(mid.y).toBeCloseTo(path.raw[1].y, 6)
    expect(mid.x).toBeCloseTo((path.raw[1].x + path.raw[2].x) / 2, 6)
  })
})
