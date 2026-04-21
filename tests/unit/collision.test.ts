import { describe, expect, test } from 'bun:test'
import {
  rectsOverlap,
  overlapsAny,
  rectHitsAnyLine,
  rectOutOfBounds,
  labelCollides,
  pointToSegDist,
  lineIntersectsCircle,
  lineIntersectsRect,
  type LabelRect,
} from '../../src/geometry/collision'

describe('rectsOverlap', () => {
  test('disjoint rects do not overlap', () => {
    const a: LabelRect = { x: 0, y: 0, w: 10, h: 10 }
    const b: LabelRect = { x: 100, y: 100, w: 10, h: 10 }
    expect(rectsOverlap(a, b, 0)).toBe(false)
  })

  test('touching rects do not overlap with pad=0', () => {
    const a: LabelRect = { x: 0, y: 0, w: 10, h: 10 }
    const b: LabelRect = { x: 10, y: 0, w: 10, h: 10 }
    expect(rectsOverlap(a, b, 0)).toBe(false)
  })

  test('overlapping rects detected', () => {
    const a: LabelRect = { x: 0, y: 0, w: 10, h: 10 }
    const b: LabelRect = { x: 5, y: 5, w: 10, h: 10 }
    expect(rectsOverlap(a, b, 0)).toBe(true)
  })

  test('pad expands the collision zone', () => {
    const a: LabelRect = { x: 0, y: 0, w: 10, h: 10 }
    const b: LabelRect = { x: 12, y: 0, w: 10, h: 10 }
    expect(rectsOverlap(a, b, 0)).toBe(false)
    expect(rectsOverlap(a, b, 5)).toBe(true)
  })
})

describe('overlapsAny', () => {
  test('returns false for empty list', () => {
    expect(overlapsAny({ x: 0, y: 0, w: 10, h: 10 }, [])).toBe(false)
  })

  test('returns true when any sibling collides', () => {
    const target: LabelRect = { x: 0, y: 0, w: 10, h: 10 }
    const others: LabelRect[] = [
      { x: 100, y: 100, w: 5, h: 5 },
      { x: 5, y: 5, w: 10, h: 10 },
    ]
    expect(overlapsAny(target, others, 0)).toBe(true)
  })
})

describe('pointToSegDist', () => {
  test('zero-length segment falls back to point distance', () => {
    expect(pointToSegDist(3, 4, 0, 0, 0, 0)).toBe(5)
  })

  test('perpendicular distance to a horizontal segment', () => {
    expect(pointToSegDist(5, 3, 0, 0, 10, 0)).toBeCloseTo(3, 6)
  })

  test('clamps to nearest endpoint when projection falls outside', () => {
    expect(pointToSegDist(-3, 0, 0, 0, 10, 0)).toBeCloseTo(3, 6)
    expect(pointToSegDist(13, 0, 0, 0, 10, 0)).toBeCloseTo(3, 6)
  })
})

describe('lineIntersectsCircle', () => {
  test('segment passing through center hits the circle', () => {
    expect(lineIntersectsCircle(0, 0, 10, 0, 5, 0, 1)).toBe(true)
  })

  test('segment entirely outside the radius does not hit', () => {
    expect(lineIntersectsCircle(0, 5, 10, 5, 5, 0, 1)).toBe(false)
  })

  test('segment endpoint just inside the circle hits', () => {
    expect(lineIntersectsCircle(4.5, 0, 100, 0, 5, 0, 1)).toBe(true)
  })
})

describe('lineIntersectsRect', () => {
  test('segment crossing through the rect intersects', () => {
    expect(lineIntersectsRect(-5, 5, 15, 5, 0, 0, 10, 10)).toBe(true)
  })

  test('segment outside the rect does not intersect', () => {
    expect(lineIntersectsRect(-5, -5, -1, -5, 0, 0, 10, 10)).toBe(false)
  })

  test('segment fully inside the rect counts as intersecting', () => {
    expect(lineIntersectsRect(2, 2, 8, 8, 0, 0, 10, 10)).toBe(true)
  })
})

describe('rectHitsAnyLine', () => {
  test('detects a line crossing the padded rect', () => {
    const rect: LabelRect = { x: 0, y: 0, w: 10, h: 10 }
    expect(rectHitsAnyLine(rect, [{ x1: -5, y1: 5, x2: 15, y2: 5 }], 0)).toBe(true)
  })

  test('returns false when no lines come close', () => {
    const rect: LabelRect = { x: 0, y: 0, w: 10, h: 10 }
    expect(rectHitsAnyLine(rect, [{ x1: 100, y1: 100, x2: 200, y2: 200 }], 0)).toBe(false)
  })
})

describe('rectOutOfBounds', () => {
  const bounds = { width: 10, height: 10 }

  test('flags rects extending past the canvas', () => {
    expect(rectOutOfBounds({ x: -1, y: 0, w: 5, h: 5 }, bounds)).toBe(true)
    expect(rectOutOfBounds({ x: 0, y: 0, w: 11, h: 5 }, bounds)).toBe(true)
  })

  test('uses height independently from width (rectangular canvases)', () => {
    const wide = { width: 100, height: 10 }
    expect(rectOutOfBounds({ x: 0, y: 5, w: 50, h: 10 }, wide)).toBe(true) // y+h past height
    expect(rectOutOfBounds({ x: 0, y: 0, w: 50, h: 10 }, wide)).toBe(false)
  })

  test('contained rect is in-bounds', () => {
    expect(rectOutOfBounds({ x: 1, y: 1, w: 5, h: 5 }, bounds)).toBe(false)
  })
})

describe('labelCollides', () => {
  test('out-of-bounds counts as collision when bounds are given', () => {
    expect(labelCollides({ x: -1, y: 0, w: 5, h: 5 }, [], [], { width: 100, height: 100 })).toBe(true)
  })

  test('out-of-bounds is ignored when bounds is omitted', () => {
    expect(labelCollides({ x: -1, y: 0, w: 5, h: 5 }, [], [])).toBe(false)
  })
})
