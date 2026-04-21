import { describe, expect, test } from 'bun:test'
import {
  buildBlob,
  blobPathD,
  isCellFilled,
  DisjointRegionError,
} from '../../src/geometry/blob'
import { computeLayout } from '../../src/geometry/grid'
import type { GridSpan, NodeDef } from '../../src/types'

// Use a 4×4 layout so spans up to (3,3) fit without being clipped.
const layout = computeLayout({
  nodes: [
    { id: 'a', pos: { col: 0, row: 0 } } as NodeDef,
    { id: 'b', pos: { col: 3, row: 3 } } as NodeDef,
  ],
})

describe('buildBlob', () => {
  test('single span produces a 4-vertex contour', () => {
    const spans: GridSpan[] = [{ from: { col: 0, row: 0 }, to: { col: 0, row: 0 } }]
    const blob = buildBlob(spans, layout)
    expect(blob.contours.length).toBe(1)
    expect(blob.contours[0].length).toBe(4)
    expect(blob.bbox).toEqual({ minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 })
  })

  test('isCellFilled reflects the painted cells', () => {
    const blob = buildBlob([{ from: { col: 1, row: 1 }, to: { col: 2, row: 2 } }], layout)
    expect(isCellFilled(blob, 1, 1)).toBe(true)
    expect(isCellFilled(blob, 2, 2)).toBe(true)
    expect(isCellFilled(blob, 0, 0)).toBe(false)
    expect(isCellFilled(blob, -1, 0)).toBe(false)
  })

  test('two adjacent spans merge into a single contour with simplified collinear vertices', () => {
    const spans: GridSpan[] = [
      { from: { col: 0, row: 0 }, to: { col: 0, row: 0 } },
      { from: { col: 1, row: 0 }, to: { col: 1, row: 0 } },
    ]
    const blob = buildBlob(spans, layout)
    expect(blob.contours.length).toBe(1)
    expect(blob.contours[0].length).toBe(4) // collinear vertices removed
  })

  test('diagonally-touching spans throw DisjointRegionError', () => {
    const spans: GridSpan[] = [
      { from: { col: 0, row: 0 }, to: { col: 0, row: 0 } },
      { from: { col: 1, row: 1 }, to: { col: 1, row: 1 } },
    ]
    expect(() => buildBlob(spans, layout)).toThrow(DisjointRegionError)
  })

  test('L-shape produces a 6-vertex outer contour', () => {
    const spans: GridSpan[] = [
      { from: { col: 0, row: 0 }, to: { col: 1, row: 0 } },
      { from: { col: 0, row: 1 }, to: { col: 0, row: 1 } },
    ]
    const blob = buildBlob(spans, layout)
    expect(blob.contours[0].length).toBe(6)
  })
})

describe('blobPathD', () => {
  test('emits SVG path string starting with M and ending with Z', () => {
    const blob = buildBlob([{ from: { col: 0, row: 0 }, to: { col: 0, row: 0 } }], layout)
    const d = blobPathD(blob, 8)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith(' Z')).toBe(true)
  })

  test('zero-radius yields straight L commands instead of arcs', () => {
    const blob = buildBlob([{ from: { col: 0, row: 0 }, to: { col: 0, row: 0 } }], layout)
    const d = blobPathD(blob, 0)
    expect(d).not.toContain(' A ')
  })
})
