/**
 * Overlap-split tests for connectors that share an unordered endpoint
 * pair. The pipeline now rotates each connector's connection point on
 * the participating node circles by a small angle so paired connectors
 * stay straight but enter/exit at offset positions. 3-or-more is still
 * treated as user error (3rd+ render straight in the error color, plus
 * a `connector-overlap` diagnostic).
 */
import { describe, expect, test } from 'bun:test'
import { resolveDiagram } from '../../src/layout/pipeline'
import { resolveConnectorPath } from '../../src/geometry/connector-path'
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
  test('exactly 2 connectors with the same unordered pair get mirrored endpoint angles', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
      ],
    }))
    expect(out.diagnostics).toEqual([])
    expect(out.connectors).toHaveLength(2)
    for (const c of out.connectors) {
      expect(c.lineError).toBe(false)
      expect(c.fromAngleOffset).toBeDefined()
      expect(c.toAngleOffset).toBeDefined()
      // Pair members never need waypoints — the line stays straight.
      expect(c.pixelWaypoints).toBeUndefined()
    }
    const [c1, c2] = out.connectors
    // Mirrored signs at each end.
    expect(Math.sign(c1.fromAngleOffset!)).not.toBe(Math.sign(c2.fromAngleOffset!))
    expect(Math.sign(c1.toAngleOffset!)).not.toBe(Math.sign(c2.toAngleOffset!))
    // Both endpoints of a single connector rotate in OPPOSITE local
    // senses so the result is a parallel shift in the canonical frame.
    expect(Math.sign(c1.fromAngleOffset!)).not.toBe(Math.sign(c1.toAngleOffset!))
  })

  test('rendered paths sit on opposite sides of the canonical centerline', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
      ],
    }))
    const ya = out.nodeMap.get('a')!.pos.row
    void ya // unused; we use the actual pixel y instead
    const yCenter =
      out.layout.offsetY + (out.nodeMap.get('a')!.pos.row + 0.5) * out.layout.cellSize
    const paths = out.connectors.map((c) =>
      resolveConnectorPath(c.conn, out.nodeMap, out.layout, {
        fromAngleOffset: c.fromAngleOffset,
        toAngleOffset: c.toAngleOffset,
      })!
    )
    // Each connector's midpoint y should land off the centerline; signs differ.
    const midYs = paths.map((p) => (p.points[0].y + p.points[p.points.length - 1].y) / 2)
    expect(Math.sign(midYs[0] - yCenter)).not.toBe(0)
    expect(Math.sign(midYs[1] - yCenter)).not.toBe(0)
    expect(Math.sign(midYs[0] - yCenter)).not.toBe(Math.sign(midYs[1] - yCenter))
  })

  test('A→B paired with B→A still mirrors around the shared axis', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
    }))
    expect(out.diagnostics).toEqual([])
    // Resolve each line in the canonical (A→B) frame: for the reversed
    // connector the "from-end" is B and the "to-end" is A, so we look
    // at the y of the point that sits on A's circle (it's points[0] for
    // the A→B connector and points[last] for the B→A one).
    const yCenter =
      out.layout.offsetY + (out.nodeMap.get('a')!.pos.row + 0.5) * out.layout.cellSize
    const aSideYs = out.connectors.map((c) => {
      const path = resolveConnectorPath(c.conn, out.nodeMap, out.layout, {
        fromAngleOffset: c.fromAngleOffset,
        toAngleOffset: c.toAngleOffset,
      })!
      return c.conn.from === 'a' ? path.points[0].y : path.points[path.points.length - 1].y
    })
    expect(Math.sign(aSideYs[0] - yCenter)).not.toBe(Math.sign(aSideYs[1] - yCenter))
  })

  test('a 3rd parallel connector stays straight and is flagged as overlap error', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
      ],
    }))
    // None get the auto-split angles — overlap-error means all 3 stack.
    for (const c of out.connectors) {
      expect(c.fromAngleOffset).toBeUndefined()
      expect(c.toAngleOffset).toBeUndefined()
    }
    expect(out.connectors[2].lineError).toBe(true)
    expect(out.connectors[0].lineError).toBe(false)
    expect(out.connectors[1].lineError).toBe(false)

    const overlapDiag = out.diagnostics.find((d) => d.kind === 'connector-overlap')
    expect(overlapDiag).toBeDefined()
    expect(overlapDiag!.severity).toBe('warning')
    expect(overlapDiag!.element.kind).toBe('connector')
  })

  test('a single connector is left as a plain straight line', () => {
    const out = resolveDiagram(pair({
      connectors: [{ from: 'a', to: 'b' }],
    }))
    expect(out.diagnostics).toEqual([])
    expect(out.connectors[0].fromAngleOffset).toBeUndefined()
    expect(out.connectors[0].toAngleOffset).toBeUndefined()
  })

  test('user-supplied waypoints opt the connector out of overlap-split', () => {
    const out = resolveDiagram(pair({
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b', waypoints: [{ col: 1, row: 0.4 }] },
      ],
    }))
    for (const c of out.connectors) {
      expect(c.fromAngleOffset).toBeUndefined()
      expect(c.toAngleOffset).toBeUndefined()
    }
    expect(out.diagnostics.find((d) => d.kind === 'connector-overlap')).toBeUndefined()
  })
})
