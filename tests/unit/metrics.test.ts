import { describe, expect, test } from 'bun:test'
import {
  ERROR_COLOR,
  FONT,
  fontSize,
  regionInset,
  regionDefaultRadius,
} from '../../src/geometry/metrics'
import { computeLayout } from '../../src/geometry/grid'
import type { NodeDef } from '../../src/types'

const layout = computeLayout({
  nodes: [
    { id: 'a', pos: { col: 2, row: 2 } } as NodeDef,
    { id: 'b', pos: { col: 5, row: 5 } } as NodeDef,
  ],
})
// Use a small cellSize to exercise the minimum-pixel floors on metrics helpers.
const tinyLayout = computeLayout({
  cellSize: 20,
  nodes: [{ id: 'a', pos: { col: 2, row: 2 } } as NodeDef],
})

describe('ERROR_COLOR', () => {
  test('non-empty hex string', () => {
    expect(ERROR_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
})

describe('fontSize', () => {
  test('scales with cellSize at the configured factor for each kind', () => {
    expect(fontSize(layout, 'node')).toBeCloseTo(layout.cellSize * FONT.node.factor, 6)
    expect(fontSize(layout, 'connector')).toBeCloseTo(layout.cellSize * FONT.connector.factor, 6)
    expect(fontSize(layout, 'region')).toBeCloseTo(layout.cellSize * FONT.region.factor, 6)
    expect(fontSize(layout, 'note')).toBeCloseTo(layout.cellSize * FONT.note.factor, 6)
  })

  test('respects the absolute pixel floor on tiny layouts', () => {
    expect(fontSize(tinyLayout, 'node')).toBe(FONT.node.min)
    expect(fontSize(tinyLayout, 'connector')).toBe(FONT.connector.min)
    expect(fontSize(tinyLayout, 'region')).toBe(FONT.region.min)
    expect(fontSize(tinyLayout, 'note')).toBe(FONT.note.min)
  })

  test('scale multiplies the resolved size', () => {
    const base = fontSize(layout, 'node')
    expect(fontSize(layout, 'node', 2)).toBeCloseTo(base * 2, 6)
    expect(fontSize(layout, 'node', 0.5)).toBeCloseTo(base / 2, 6)
  })

  test('undefined scale defaults to 1', () => {
    expect(fontSize(layout, 'node', undefined)).toBe(fontSize(layout, 'node'))
  })
})

describe('regionInset / regionDefaultRadius', () => {
  test('regionInset scales but never drops below 4px', () => {
    expect(regionInset(layout)).toBeGreaterThan(4)
    expect(regionInset(tinyLayout)).toBe(4)
  })

  test('regionDefaultRadius scales but never drops below 12px', () => {
    expect(regionDefaultRadius(layout)).toBeGreaterThan(12)
    expect(regionDefaultRadius(tinyLayout)).toBe(12)
  })
})
