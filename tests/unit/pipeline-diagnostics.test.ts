/**
 * Resolve-pipeline integration tests for the new PlacementDiagnostic
 * output. We construct tight grids where a label is guaranteed to fail
 * placement and assert the diagnostic shape agents will consume.
 */
import { describe, expect, test } from 'bun:test'
import { resolveDiagram } from '../../src/layout/pipeline'
import type { NormalizedDiagramDef } from '../../src/types'

/** Tiny single-cell grid so a node label has very little room anywhere.
 *  Putting two adjacent labelled nodes forces one of them to fall back
 *  with collisions. */
function buildCrowdedGrid(): NormalizedDiagramDef {
  return {
    cellSize: 80, // deliberately small — every corner collides
    columns: 2,
    rows: 1,
    nodes: [
      { id: 'a', pos: { col: 0, row: 0 }, label: 'LONG_LABEL_A_AAAA' },
      { id: 'b', pos: { col: 1, row: 0 }, label: 'LONG_LABEL_B_BBBB' },
    ],
  }
}

describe('resolveDiagram diagnostics', () => {
  test('returns an empty diagnostics array when every label fits', () => {
    // Grid declared to hug the single node exactly (1×1, starting at
    // col/row 0 → cell A1) so no grid-mismatch fires either.
    const def: NormalizedDiagramDef = {
      columns: 1,
      rows: 1,
      nodes: [{ id: 'a', pos: { col: 0, row: 0 }, label: 'a' }],
    }
    const out = resolveDiagram(def)
    expect(out.diagnostics).toEqual([])
  })

  test('emits a label-collision diagnostic with element ref + attempts', () => {
    const out = resolveDiagram(buildCrowdedGrid())
    expect(out.diagnostics.length).toBeGreaterThan(0)

    const d = out.diagnostics[0]
    expect(d.kind).toBe('label-collision')
    expect(d.severity).toBe('warning')
    expect(d.element.kind).toBe('node')
    if (d.element.kind === 'node') {
      expect(['a', 'b']).toContain(d.element.id)
      // Placement diagnostics from the pipeline always include pos
      // (the placer runs on normalized, pos-guaranteed elements).
      expect(d.element.pos).toBeDefined()
      expect(d.element.pos!.col).toBeGreaterThanOrEqual(1)
      expect(d.element.pos!.address).toMatch(/^[A-Z]+\d+$/)
    }

    // The placer should have tried multiple corners and recorded hits on each.
    expect(d.attempts).toBeDefined()
    expect(d.attempts!.length).toBeGreaterThan(1)
    const failedAttempt = d.attempts!.find((a) => !a.accepted)
    expect(failedAttempt).toBeDefined()
    expect(failedAttempt!.obstacles.length).toBeGreaterThan(0)

    // Final attempt is marked accepted even though it hit obstacles
    // (the fallback path).
    expect(d.attempts!.at(-1)!.accepted).toBe(true)
  })

  test('obstacle owners carry the right element kind + id', () => {
    const out = resolveDiagram(buildCrowdedGrid())
    const d = out.diagnostics[0]
    const hitObstacles = d.attempts!.flatMap((a) => a.obstacles)

    // At least one obstacle should be an icon of the OTHER node
    const iconHits = hitObstacles.filter((o) => o.kind === 'icon')
    expect(iconHits.length).toBeGreaterThan(0)
    for (const h of iconHits) {
      if (h.kind === 'icon') {
        expect(h.owner.kind).toBe('node')
        if (h.owner.kind === 'node') {
          expect(['a', 'b']).toContain(h.owner.id)
        }
      }
    }
  })

  test('message string mentions the element and at least one blocker kind', () => {
    const out = resolveDiagram(buildCrowdedGrid())
    const d = out.diagnostics[0]
    expect(d.message).toMatch(/node "[ab]"/)
    // Whichever blockers won on the fallback — icon, label, line, or
    // canvas-bounds — at least one is named in the summary.
    expect(d.message).toMatch(/(icon|label|line|leader|canvas-bounds)/)
  })
})

describe('route-failed diagnostics', () => {
  /** Three nodes on one row: a → c with c sitting right on the line
   *  between a and b, and b elsewhere. Direct a→c clears; but a→b with
   *  c in between does not. Router will try to route around; if the
   *  surrounding grid is tight, it falls back to straight-through. */
  function buildBlockedConnector(): NormalizedDiagramDef {
    return {
      cellSize: 100,
      columns: 3,
      rows: 1,
      nodes: [
        { id: 'a',   pos: { col: 0, row: 0 } },
        // Extreme sizeScale swallows every grid intersection around
        // column 1, which is the only corridor routeAroundNodes has on
        // a 3×1 grid — forcing a route-failed fallback.
        { id: 'mid', pos: { col: 1, row: 0 }, sizeScale: 4 },
        { id: 'b',   pos: { col: 2, row: 0 } },
      ],
      connectors: [{ from: 'a', to: 'b' }],
    }
  }

  test('emits when a connector cannot be routed around an obstacle', () => {
    const out = resolveDiagram(buildBlockedConnector())
    const routeDiag = out.diagnostics.find((d) => d.kind === 'route-failed')
    expect(routeDiag).toBeDefined()

    if (!routeDiag) return
    expect(routeDiag.severity).toBe('warning')
    expect(routeDiag.element.kind).toBe('connector')
    if (routeDiag.element.kind === 'connector') {
      expect(routeDiag.element.from).toBe('a')
      expect(routeDiag.element.to).toBe('b')
    }
    expect(routeDiag.message).toMatch(/a→b/)
    expect(routeDiag.message).toMatch(/"mid"/)
    expect(routeDiag.attempts?.[0].obstacles.length).toBeGreaterThan(0)
    // Obstacles should be icon-kinded with node-ref owners.
    for (const o of routeDiag.attempts![0].obstacles) {
      expect(o.kind).toBe('icon')
      if (o.kind === 'icon') expect(o.owner.kind).toBe('node')
    }
  })

  test('clean connectors emit no route-failed diagnostic', () => {
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 0, row: 0 } },
        { id: 'b', pos: { col: 2, row: 0 } },
      ],
      connectors: [{ from: 'a', to: 'b' }],
    }
    const out = resolveDiagram(def)
    expect(out.diagnostics.find((d) => d.kind === 'route-failed')).toBeUndefined()
  })
})

describe('grid-mismatch diagnostics', () => {
  /** Declared grid overshoots actual usage on both axes. */
  test('slack-trailing: declared cols/rows exceed content', () => {
    const def: NormalizedDiagramDef = {
      columns: 5, rows: 4,
      nodes: [{ id: 'a', pos: { col: 0, row: 0 } }],
    }
    const diags = resolveDiagram(def).diagnostics.filter((d) => d.kind === 'grid-mismatch')
    expect(diags).toHaveLength(2)
    const colD = diags.find((d) => d.grid?.axis === 'col')!
    expect(colD.grid?.kind).toBe('slack-trailing')
    expect(colD.grid?.declared).toBe(5)
    expect(colD.grid?.used).toBe(1)
    expect(colD.message).toMatch(/columns 2…5 are empty/)
    const rowD = diags.find((d) => d.grid?.axis === 'row')!
    expect(rowD.grid?.kind).toBe('slack-trailing')
  })

  test('slack-leading: content starts past column 1', () => {
    const def: NormalizedDiagramDef = {
      columns: 4,
      nodes: [
        { id: 'a', pos: { col: 1, row: 0 } },
        { id: 'b', pos: { col: 2, row: 0 } },
        { id: 'c', pos: { col: 3, row: 0 } },
      ],
    }
    const diags = resolveDiagram(def).diagnostics.filter((d) => d.kind === 'grid-mismatch')
    const leading = diags.find((d) => d.grid?.kind === 'slack-leading')
    expect(leading).toBeDefined()
    expect(leading!.grid?.axis).toBe('col')
    expect(leading!.message).toMatch(/starts at column 2/)
  })

  test('overflow: a node sits outside declared cols', () => {
    const def: NormalizedDiagramDef = {
      columns: 2,
      nodes: [
        { id: 'a', pos: { col: 0, row: 0 } },
        { id: 'b', pos: { col: 4, row: 0 } },  // col 5 is way past cols=2
      ],
    }
    const diags = resolveDiagram(def).diagnostics.filter((d) => d.kind === 'grid-mismatch')
    const overflow = diags.find((d) => d.grid?.kind === 'overflow')
    expect(overflow).toBeDefined()
    expect(overflow!.grid?.axis).toBe('col')
    expect(overflow!.grid?.declared).toBe(2)
    expect(overflow!.grid?.used).toBe(5)
    expect(overflow!.suggestion).toMatch(/doc { cols: 5 }/)
  })

  test('no grid-mismatch when cols/rows are undeclared', () => {
    // Nothing declared → nothing to complain about; the grid is
    // auto-inferred.
    const def: NormalizedDiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 3, row: 2 } },
        { id: 'b', pos: { col: 5, row: 4 } },
      ],
    }
    const diags = resolveDiagram(def).diagnostics.filter((d) => d.kind === 'grid-mismatch')
    expect(diags).toEqual([])
  })
})
