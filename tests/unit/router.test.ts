import { describe, expect, test } from 'bun:test'
import { connectorCrossesNode, routeAroundNodes, intPtKey } from '../../src/geometry/router'
import { computeLayout } from '../../src/geometry/grid'
import type { NormalizedConnectorDef, NormalizedNodeDef } from '../../src/types'

function makeNodes(...nodes: NormalizedNodeDef[]): { nodes: NormalizedNodeDef[]; map: Map<string, NormalizedNodeDef> } {
  return { nodes, map: new Map(nodes.map((n) => [n.id, n])) }
}

const layout = computeLayout({
  nodes: [
    { id: 'a', pos: { col: 2, row: 2 } },
    { id: 'b', pos: { col: 5, row: 5 } },
  ],
})

describe('connectorCrossesNode', () => {
  test('returns false when no obstacle node sits on the line', () => {
    const { nodes, map } = makeNodes(
      { id: 'a', pos: { col: 2, row: 2 } },
      { id: 'b', pos: { col: 5, row: 2 } }
    )
    const conn: NormalizedConnectorDef = { from: 'a', to: 'b' }
    expect(connectorCrossesNode(conn, map, nodes, layout)).toBe(false)
  })

  test('returns true when an obstacle node sits between the endpoints', () => {
    const { nodes, map } = makeNodes(
      { id: 'a', pos: { col: 2, row: 2 } },
      { id: 'mid', pos: { col: 3, row: 2 } },
      { id: 'b', pos: { col: 5, row: 2 } }
    )
    const conn: NormalizedConnectorDef = { from: 'a', to: 'b' }
    expect(connectorCrossesNode(conn, map, nodes, layout)).toBe(true)
  })

  test('endpoints themselves are excluded from the obstacle list', () => {
    const { nodes, map } = makeNodes(
      { id: 'a', pos: { col: 2, row: 2 } },
      { id: 'b', pos: { col: 3, row: 2 } }
    )
    const conn: NormalizedConnectorDef = { from: 'a', to: 'b' }
    expect(connectorCrossesNode(conn, map, nodes, layout)).toBe(false)
  })
})

describe('routeAroundNodes', () => {
  test('returns null for unknown endpoint ids', () => {
    const { nodes, map } = makeNodes({ id: 'a', pos: { col: 2, row: 2 } })
    const conn: NormalizedConnectorDef = { from: 'a', to: 'missing' }
    expect(routeAroundNodes(conn, map, nodes, layout)).toBe(null)
  })

  test('produces a non-empty waypoint path that avoids the obstacle', () => {
    const { nodes, map } = makeNodes(
      { id: 'a', pos: { col: 2, row: 2 } },
      { id: 'mid', pos: { col: 3, row: 2 } },
      { id: 'b', pos: { col: 5, row: 2 } }
    )
    const result = routeAroundNodes({ from: 'a', to: 'b' }, map, nodes, layout)
    expect(result).not.toBe(null)
    expect(result!.waypoints.length).toBeGreaterThanOrEqual(2)
    expect(result!.intersections.length).toBeGreaterThanOrEqual(2)
  })
})

describe('intPtKey', () => {
  test('produces a stable string key', () => {
    expect(intPtKey(2, 3)).toBe('2,3')
    expect(intPtKey(0, 0)).toBe('0,0')
  })
})
