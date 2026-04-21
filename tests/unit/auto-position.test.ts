import { describe, expect, test } from 'bun:test'
import {
  assignAutoPositions, normPos, normWayPoint,
  normalizeNotes, normalizeRegions, normalizeConnectorWaypoints,
} from '../../src/auto-position'
import type { NodeDef } from '../../src/types'

// Convention for this test file: user-facing inputs are 1-based
// (matching the public grammar); outputs are canonical 0-based
// `GridPos` / `WayPoint`.

describe('assignAutoPositions', () => {
  test('all-auto with no columns → linear row 0', () => {
    const out = assignAutoPositions([
      { id: 'a' }, { id: 'b' }, { id: 'c' },
    ])
    expect(out.map((n) => n.pos)).toEqual([
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    ])
  })

  test('all-auto with columns=3 → wraps to next row', () => {
    const out = assignAutoPositions(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
      3,
    )
    expect(out.map((n) => n.pos)).toEqual([
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
      { col: 0, row: 1 }, { col: 1, row: 1 },
    ])
  })

  test('explicit positions (1-based) are shifted to 0-based, no move on auto counter', () => {
    const out = assignAutoPositions([
      { id: 'a' },                            // auto → (0,0)
      { id: 'b', pos: { col: 6, row: 6 } },  // F6 user → (5, 5)
      { id: 'c' },                            // auto → (1,0)
    ])
    expect(out[0].pos).toEqual({ col: 0, row: 0 })
    expect(out[1].pos).toEqual({ col: 5, row: 5 })
    expect(out[2].pos).toEqual({ col: 1, row: 0 })
  })

  test('input array is not mutated', () => {
    const input: NodeDef[] = [{ id: 'a' }]
    const out = assignAutoPositions(input)
    expect(input[0].pos).toBeUndefined()
    expect(out[0].pos).toEqual({ col: 0, row: 0 })
  })

  test('empty input returns empty', () => {
    expect(assignAutoPositions([])).toEqual([])
  })

  test('columns=1 produces a vertical column', () => {
    const out = assignAutoPositions(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      1,
    )
    expect(out.map((n) => n.pos)).toEqual([
      { col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 },
    ])
  })

  test('tuple `pos: [col, row]` (1-based) shifts to 0-based {col, row}', () => {
    const out = assignAutoPositions([{ id: 'a', pos: [4, 6] }])
    expect(out[0].pos).toEqual({ col: 3, row: 5 })
  })

  test('A1 string `pos: "B3"` resolves to the right cell', () => {
    const out = assignAutoPositions([{ id: 'a', pos: 'B3' }])
    expect(out[0].pos).toEqual({ col: 1, row: 2 })
  })

  test('mixed input forms all come out as canonical 0-based', () => {
    const out = assignAutoPositions([
      { id: 'a', pos: [2, 3] },                  // B3
      { id: 'b', pos: { col: 5, row: 7 } },      // E7
      { id: 'c', pos: 'C2' },                    // C2
      { id: 'd' },                                // auto → (0, 0)
    ])
    expect(out[0].pos).toEqual({ col: 1, row: 2 })
    expect(out[1].pos).toEqual({ col: 4, row: 6 })
    expect(out[2].pos).toEqual({ col: 2, row: 1 })
    expect(out[3].pos).toEqual({ col: 0, row: 0 })
  })
})

describe('normPos / normWayPoint', () => {
  test('normPos: A1 string → 0-based object', () => {
    expect(normPos('A1')).toEqual({ col: 0, row: 0 })
    expect(normPos('B3')).toEqual({ col: 1, row: 2 })
    expect(normPos('AA100')).toEqual({ col: 26, row: 99 })
  })
  test('normPos: lower-case A1 is accepted', () => {
    expect(normPos('aa100')).toEqual({ col: 26, row: 99 })
  })
  test('normPos: tuple 1-based → 0-based object', () => {
    expect(normPos([3, 4])).toEqual({ col: 2, row: 3 })
  })
  test('normPos: object 1-based → 0-based object', () => {
    expect(normPos({ col: 5, row: 6 })).toEqual({ col: 4, row: 5 })
  })
  test('normPos: col=0 or row=0 throws (1-based enforced)', () => {
    expect(() => normPos({ col: 0, row: 1 })).toThrow(/1-based/)
    expect(() => normPos({ col: 1, row: 0 })).toThrow(/1-based/)
    expect(() => normPos([0, 0])).toThrow(/1-based/)
  })
  test('normPos: malformed A1 throws', () => {
    expect(() => normPos('1A')).toThrow(/Invalid cell address/)
    expect(() => normPos('')).toThrow(/Invalid cell address/)
  })
  test('normWayPoint: fractional 1-based tuple → 0-based', () => {
    expect(normWayPoint([2.5, 3.5])).toEqual({ col: 1.5, row: 2.5 })
  })
})

describe('normalizeNotes / normalizeRegions / normalizeConnectorWaypoints', () => {
  test('notes with tuple pos (1-based) are normalized', () => {
    const notes = [{ pos: [2, 3] as [number, number], text: 'x' }]
    const out = normalizeNotes(notes)
    expect(out[0].pos).toEqual({ col: 1, row: 2 })
  })

  test('regions with tuple span endpoints (1-based) are normalized', () => {
    const regions = [{
      spans: [{ from: [1, 1] as [number, number], to: [3, 2] as [number, number] }],
      color: 'red',
    }]
    const out = normalizeRegions(regions)
    expect(out[0].spans[0].from).toEqual({ col: 0, row: 0 })
    expect(out[0].spans[0].to).toEqual({ col: 2, row: 1 })
  })

  test('connector waypoints (tuple form, 1-based) are normalized', () => {
    const conns = [{
      from: 'a', to: 'b',
      waypoints: [[2.5, 2] as [number, number], [3, 3] as [number, number]],
    }]
    const out = normalizeConnectorWaypoints(conns)
    expect(out[0].waypoints).toEqual([{ col: 1.5, row: 1 }, { col: 2, row: 2 }])
  })
})
