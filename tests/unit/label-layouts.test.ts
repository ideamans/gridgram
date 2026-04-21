/**
 * Integration-ish tests for the per-element label placers in src/layout/.
 * Each kind goes through placeLabel under the hood; here we verify the
 * end-to-end shape: returns null for no-label, picks first non-colliding
 * candidate, and falls back with `error: true` when boxed in.
 */
import { describe, expect, test } from 'bun:test'
import { computeNodeLabelRect, CORNER_ORDER } from '../../src/layout/node-label'
import { computeRegionLabelRect, POSITION_ORDER } from '../../src/layout/region-label'
import { computeConnectorLabelRect } from '../../src/layout/connector-label'
import { computeLayout } from '../../src/geometry/grid'
import type { NormalizedConnectorDef, NormalizedNodeDef, NormalizedRegionDef } from '../../src/types'

const layout = computeLayout({
  nodes: [
    { id: 'a', pos: { col: 2, row: 2 } },
    { id: 'b', pos: { col: 5, row: 5 } },
  ],
})

describe('computeNodeLabelRect', () => {
  test('returns null when the node has no label', () => {
    const node: NormalizedNodeDef = { id: 'x', pos: { col: 2, row: 2 } }
    expect(computeNodeLabelRect(node, layout, [], [])).toBe(null)
  })

  test('picks the first corner (top-right) on an empty canvas', () => {
    const node: NormalizedNodeDef = { id: 'x', pos: { col: 3, row: 3 }, label: 'hi' }
    const result = computeNodeLabelRect(node, layout, [], [])!
    expect(result.error).toBe(false)
    expect(result.corner).toBe(CORNER_ORDER[0])
  })

  test('skips corners blocked by placed labels', () => {
    const node: NormalizedNodeDef = { id: 'x', pos: { col: 3, row: 3 }, label: 'hi' }
    const blocking = computeNodeLabelRect(node, layout, [], [])!
    const result = computeNodeLabelRect(node, layout, [blocking.rect], [])!
    expect(result.corner).not.toBe(blocking.corner)
  })
})

describe('computeRegionLabelRect', () => {
  test('returns null when the region has no label', () => {
    const region: NormalizedRegionDef = {
      spans: [{ from: { col: 2, row: 2 }, to: { col: 2, row: 2 } }],
      color: '#ff000020',
    }
    expect(computeRegionLabelRect(region, layout, [], [])).toBe(null)
  })

  test('returns first POSITION_ORDER candidate on an empty canvas', () => {
    const region: NormalizedRegionDef = {
      spans: [{ from: { col: 2, row: 2 }, to: { col: 3, row: 3 } }],
      color: '#ff000020',
      label: 'X',
    }
    const result = computeRegionLabelRect(region, layout, [], [])!
    expect(result.error).toBe(false)
    expect(result.position).toBe(POSITION_ORDER[0])
  })
})

describe('computeConnectorLabelRect', () => {
  const nodes: NormalizedNodeDef[] = [
    { id: 'a', pos: { col: 2, row: 2 } },
    { id: 'b', pos: { col: 5, row: 2 } },
  ]
  const map = new Map(nodes.map((n) => [n.id, n]))

  test('returns null when the connector has no label', () => {
    expect(computeConnectorLabelRect({ from: 'a', to: 'b' }, map, layout, [], [])).toBe(null)
  })

  test('returns null when an endpoint is missing', () => {
    expect(
      computeConnectorLabelRect({ from: 'a', to: 'missing', label: 'X' }, map, layout, [], [])
    ).toBe(null)
  })

  test('places a label rect on an empty canvas', () => {
    const conn: NormalizedConnectorDef = { from: 'a', to: 'b', label: 'HTTPS' }
    const result = computeConnectorLabelRect(conn, map, layout, [], [])!
    expect(result.error).toBe(false)
    expect(result.rect.w).toBeGreaterThan(0)
    expect(result.rect.h).toBeGreaterThan(0)
  })

  test('falls back with error when crowded out by placed labels', () => {
    const conn: NormalizedConnectorDef = { from: 'a', to: 'b', label: 'HTTPS' }
    const giantBlocker = { x: 0, y: 0, w: layout.width, h: layout.height }
    const bounds = { width: layout.width, height: layout.height }
    const result = computeConnectorLabelRect(conn, map, layout, [giantBlocker], [], undefined, bounds)!
    expect(result.error).toBe(true)
  })
})
