/**
 * Overlap-split tests for connectors that share an unordered endpoint
 * pair. The pipeline turns a 2-connector pair into two mirrored bowed
 * paths; 3-or-more is treated as user error (3rd+ render straight in
 * the error color, plus a `connector-overlap` diagnostic).
 */
import { describe, expect, test } from 'bun:test'
import { resolveDiagram } from '../../src/layout/pipeline'
import type { NormalizedDiagramDef } from '../../src/types'

function pair(extra: Partial<NormalizedDiagramDef> = {}): NormalizedDiagramDef {
  return {
    cellSize: 200,
    columns: 3,
    rows: 1,
    nodes: [
      { id: 'a', pos: { col: 0, row: 0 } },
      { id: 'b', pos: { col: 2, row: 0 } },
    ],
    ...extra,
  }
}

describe('connector overlap-split', () => {
  test('exactly 2 connectors with the same unordered pair both get meandered', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
      ],
    }))
    expect(out.diagnostics).toEqual([])
    expect(out.connectors).toHaveLength(2)
    for (const c of out.connectors) {
      expect(c.pixelWaypoints).toBeDefined()
      expect(c.pixelWaypoints!.length).toBe(2)
      expect(c.lineError).toBe(false)
    }
    // Bows are mirrored: one above the centerline, one below.
    const [c1, c2] = out.connectors
    const midY1 = (c1.pixelWaypoints![0].y + c1.pixelWaypoints![1].y) / 2
    const midY2 = (c2.pixelWaypoints![0].y + c2.pixelWaypoints![1].y) / 2
    const centerline = out.nodeMap.get('a')!.pos.row // 0
    // Compare signs of offset relative to the straight-line y (which
    // for a horizontal pair is the node-center y).
    const yStraight =
      (200 * 0.5 + (out.layout.padding)) // approx; use any reference
    expect(Math.sign(midY1 - yStraight)).not.toBe(Math.sign(midY2 - yStraight))
  })

  test('A→B paired with B→A still mirrors around the shared axis', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
    }))
    expect(out.diagnostics).toEqual([])
    const ys = out.connectors.map(
      (c) => (c.pixelWaypoints![0].y + c.pixelWaypoints![1].y) / 2
    )
    expect(Math.sign(ys[0] - ys[1])).not.toBe(0)
  })

  test('a 3rd parallel connector stays straight and is flagged as overlap error', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
      ],
    }))
    // None of them split — overlap-error means the bow geometry is off.
    for (const c of out.connectors) {
      expect(c.pixelWaypoints).toBeUndefined()
    }
    // 3rd connector flagged as line error.
    expect(out.connectors[2].lineError).toBe(true)
    // First two are not error-coloured.
    expect(out.connectors[0].lineError).toBe(false)
    expect(out.connectors[1].lineError).toBe(false)

    const overlapDiag = out.diagnostics.find((d) => d.kind === 'connector-overlap')
    expect(overlapDiag).toBeDefined()
    expect(overlapDiag!.severity).toBe('warning')
    expect(overlapDiag!.element.kind).toBe('connector')
  })

  test('a single connector is left as a straight line (no waypoints injected)', () => {
    const out = resolveDiagram(pair({
      connectors: [{ from: 'a', to: 'b' }],
    }))
    expect(out.diagnostics).toEqual([])
    expect(out.connectors[0].pixelWaypoints).toBeUndefined()
  })

  test('user-supplied waypoints opt the connector out of overlap-split', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b', waypoints: [{ col: 1, row: 0.4 }] },
      ],
    }))
    // The user-routed conn keeps its own waypoint; the other one stays
    // straight (since the pair is no longer "2 straight-eligible").
    expect(out.connectors[0].pixelWaypoints).toBeUndefined()
    // Pipeline normalises user waypoints onto conn.waypoints, not
    // pixelWaypoints, so the resolved path still has none of the latter.
    expect(out.connectors[1].pixelWaypoints).toBeUndefined()
    // And no overlap diagnostic — the explicit routing resolves the
    // visual ambiguity, so the auto-split isn't needed.
    expect(out.diagnostics.find((d) => d.kind === 'connector-overlap')).toBeUndefined()
  })
})
