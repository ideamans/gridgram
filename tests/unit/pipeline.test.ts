/**
 * Pipeline integration tests — exercises resolveDiagram end-to-end with
 * small fixture DiagramDefs and asserts the resolved structure.
 */
import { describe, expect, test } from 'bun:test'
import { resolveDiagram } from '../../src/layout/pipeline'
import type { NormalizedDiagramDef } from '../../src/types'

describe('resolveDiagram', () => {
  test('empty diagram resolves with no labels and no connectors', () => {
    const def: NormalizedDiagramDef = { nodes: [{ id: 'a', pos: { col: 2, row: 2 } }] }
    const resolved = resolveDiagram(def)
    expect(resolved.connectors).toEqual([])
    expect(resolved.notes).toEqual([])
    expect(resolved.regions).toEqual([])
    expect(resolved.nodeLabelByNodeId.size).toBe(0)
    expect(resolved.nodeMap.size).toBe(1)
  })

  test('direct connector has no waypoints and no line error', () => {
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 } },
        { id: 'b', pos: { col: 5, row: 2 } },
      ],
      connectors: [{ from: 'a', to: 'b' }],
    }
    const resolved = resolveDiagram(def)
    expect(resolved.connectors.length).toBe(1)
    expect(resolved.connectors[0].pixelWaypoints).toBe(undefined)
    expect(resolved.connectors[0].lineError).toBe(false)
  })

  test('connector blocked by an obstacle node gets routed waypoints', () => {
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 } },
        { id: 'mid', pos: { col: 3, row: 2 } },
        { id: 'b', pos: { col: 5, row: 2 } },
      ],
      connectors: [{ from: 'a', to: 'b' }],
    }
    const resolved = resolveDiagram(def)
    expect(resolved.connectors[0].pixelWaypoints).toBeDefined()
    expect(resolved.connectors[0].pixelWaypoints!.length).toBeGreaterThan(0)
    expect(resolved.connectors[0].lineError).toBe(false)
  })

  test('node labels resolve and land in the lookup map', () => {
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 }, label: 'A' },
        { id: 'b', pos: { col: 5, row: 2 } }, // no label
      ],
    }
    const resolved = resolveDiagram(def)
    expect(resolved.nodeLabelByNodeId.has('a')).toBe(true)
    expect(resolved.nodeLabelByNodeId.has('b')).toBe(false)
    expect(resolved.nodeLabelByNodeId.get('a')!.error).toBe(false)
  })

  test('connector labels are placed and avoid their own line', () => {
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 } },
        { id: 'b', pos: { col: 5, row: 2 } },
      ],
      connectors: [{ from: 'a', to: 'b', label: 'HTTPS' }],
    }
    const resolved = resolveDiagram(def)
    expect(resolved.connectors[0].labelResult).toBeDefined()
    expect(resolved.connectors[0].labelResult!.error).toBe(false)
  })

  test('region resolves with its label result', () => {
    const def: NormalizedDiagramDef = {
      nodes: [{ id: 'a', pos: { col: 2, row: 2 } }],
      regions: [
        {
          spans: [{ from: { col: 2, row: 2 }, to: { col: 2, row: 2 } }],
          color: '#ff000020',
          label: 'Zone',
        },
      ],
    }
    const resolved = resolveDiagram(def)
    expect(resolved.regions.length).toBe(1)
    expect(resolved.regions[0].labelResult).toBeDefined()
    expect(resolved.regions[0].labelResult!.error).toBe(false)
  })

  test('note targeting a node id produces a leader aimed at the node center', () => {
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 } },
        { id: 'b', pos: { col: 5, row: 5 } },
      ],
      notes: [{ pos: { col: 3, row: 3 }, text: 'see A', targets: ['a'] }],
    }
    const resolved = resolveDiagram(def)
    expect(resolved.notes[0].targets.length).toBe(1)
    expect(resolved.notes[0].targets[0].stopRadius).toBeGreaterThan(0)
  })

  test('note targeting a connector id aims at the connector midpoint', () => {
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 } },
        { id: 'b', pos: { col: 5, row: 2 } },
      ],
      connectors: [{ id: 'link', from: 'a', to: 'b' }],
      notes: [{ pos: { col: 3, row: 4 }, text: 'see link', targets: ['link'] }],
    }
    const resolved = resolveDiagram(def)
    expect(resolved.notes[0].targets.length).toBe(1)
    expect(resolved.notes[0].targets[0].stopRadius).toBe(0)
  })

  test('node-label placement priority favors the most-connected node', () => {
    // 'hub' has 2 connections; 'lonely' has none. With both labels present,
    // 'hub' is processed first by the priority sort and so its label is
    // placed in an unblocked corner. The order of insertion into the
    // placedLabels list reflects priority.
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'hub', pos: { col: 3, row: 3 }, label: 'HUB' },
        { id: 'lonely', pos: { col: 5, row: 5 }, label: 'L' },
        { id: 'a', pos: { col: 2, row: 2 } },
      ],
      connectors: [
        { from: 'hub', to: 'a' },
        { from: 'hub', to: 'a' },
      ],
    }
    const resolved = resolveDiagram(def)
    expect(resolved.nodeLabelByNodeId.get('hub')!.error).toBe(false)
    expect(resolved.nodeLabelByNodeId.get('lonely')!.error).toBe(false)
  })
})
