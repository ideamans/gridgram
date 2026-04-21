import { describe, expect, test } from 'bun:test'
import {
  computeLayout,
  gridToPixel,
  gridFracToPixel,
  gridSpanToRect,
  resolveNodeSizeFrac,
  DEFAULT_NODE_SIZE,
  DEFAULT_CELL_SIZE,
} from '../../src/geometry/grid'
import type { DiagramDef, NodeDef } from '../../src/types'

const baseNode = (id: string, col: number, row: number): NodeDef => ({ id, pos: { col, row } })

describe('computeLayout', () => {
  test('cellSize defaults to DEFAULT_CELL_SIZE; width/height scale with cols×rows', () => {
    const def: DiagramDef = { columns: 4, rows: 4, nodes: [baseNode('a', 0, 0), baseNode('b', 3, 3)] }
    const l = computeLayout(def)
    expect(l.cellSize).toBe(DEFAULT_CELL_SIZE)
    expect(l.width).toBe(DEFAULT_CELL_SIZE * 4 + 2 * l.padding)
    expect(l.height).toBe(DEFAULT_CELL_SIZE * 4 + 2 * l.padding)
  })

  test('rectangular grid yields rectangular canvas (not forced square)', () => {
    const def: DiagramDef = { columns: 4, rows: 2, nodes: [baseNode('a', 0, 0), baseNode('b', 3, 1)] }
    const l = computeLayout(def)
    expect(l.width).toBe(DEFAULT_CELL_SIZE * 4 + 2 * l.padding)
    expect(l.height).toBe(DEFAULT_CELL_SIZE * 2 + 2 * l.padding)
    expect(l.width).toBeGreaterThan(l.height)
  })

  test('columns are inferred from max node col when not given (no 4-cap)', () => {
    const def: DiagramDef = { nodes: [baseNode('a', 0, 0), baseNode('b', 6, 0)] }
    const l = computeLayout(def)
    expect(l.columns).toBe(7)
    expect(l.rows).toBe(1)
  })

  test('rows are inferred from max node row when not given', () => {
    const def: DiagramDef = { nodes: [baseNode('a', 0, 0), baseNode('b', 0, 2)] }
    expect(computeLayout(def).rows).toBe(3)
  })

  test('notes extend the inferred grid (so their leaders stay on-canvas)', () => {
    const def: DiagramDef = {
      nodes: [baseNode('a', 0, 0)],
      // Note sits at row 2 — nothing else does. Canvas must reach row 2.
      notes: [{ pos: { col: 0, row: 2 }, text: 'bottom' }],
    }
    const l = computeLayout(def)
    expect(l.rows).toBe(3)
    expect(l.columns).toBe(1)
  })

  test('connector waypoints extend the inferred grid', () => {
    const def: DiagramDef = {
      nodes: [baseNode('a', 0, 0), baseNode('b', 1, 0)],
      connectors: [{ from: 'a', to: 'b', waypoints: [{ col: 0, row: 3 }] }],
    }
    expect(computeLayout(def).rows).toBe(4)
  })

  test('region spans extend the inferred grid', () => {
    const def: DiagramDef = {
      nodes: [baseNode('a', 0, 0)],
      regions: [{
        spans: [{ from: { col: 0, row: 0 }, to: { col: 2, row: 1 } }],
        color: 'primary',
      }],
    }
    const l = computeLayout(def)
    expect(l.columns).toBe(3)
    expect(l.rows).toBe(2)
  })

  test('custom cellSize is honored', () => {
    const def: DiagramDef = { cellSize: 100, columns: 3, rows: 2, nodes: [baseNode('a', 0, 0)] }
    const l = computeLayout(def)
    expect(l.cellSize).toBe(100)
    expect(l.width).toBe(100 * 3 + 2 * l.padding)
    expect(l.height).toBe(100 * 2 + 2 * l.padding)
  })

  test('explicit padding overrides default', () => {
    const def: DiagramDef = { padding: 50, nodes: [baseNode('a', 0, 0)] }
    expect(computeLayout(def).padding).toBe(50)
  })
})

describe('gridToPixel / gridFracToPixel', () => {
  const layout = computeLayout({
    columns: 4, rows: 4,
    nodes: [baseNode('a', 0, 0), baseNode('b', 3, 3)],
  })

  test('cell center for col=0,row=0 sits half a cell from offset', () => {
    const p = gridToPixel(layout, { col: 0, row: 0 })
    expect(p.x).toBeCloseTo(layout.offsetX + layout.cellSize / 2, 6)
    expect(p.y).toBeCloseTo(layout.offsetY + layout.cellSize / 2, 6)
  })

  test('fractional coords interpolate continuously with integer coords', () => {
    const integerCenter = gridToPixel(layout, { col: 1, row: 2 })
    const fracSame = gridFracToPixel(layout, 1, 2)
    expect(fracSame.x).toBeCloseTo(integerCenter.x, 6)
    expect(fracSame.y).toBeCloseTo(integerCenter.y, 6)

    const halfStep = gridFracToPixel(layout, 1.5, 2)
    expect(halfStep.x - integerCenter.x).toBeCloseTo(layout.cellSize / 2, 6)
  })
})

describe('gridSpanToRect', () => {
  const layout = computeLayout({
    columns: 4, rows: 4,
    nodes: [baseNode('a', 0, 0), baseNode('b', 3, 3)],
  })

  test('spans the requested cells, less the inset on each side', () => {
    const r = gridSpanToRect(layout, { col: 1, row: 1 }, { col: 2, row: 1 }, 4)
    expect(r.width).toBeCloseTo(2 * layout.cellSize - 8, 6)
    expect(r.height).toBeCloseTo(layout.cellSize - 8, 6)
  })
})

describe('resolveNodeSizeFrac', () => {
  test('explicit size wins over scale', () => {
    expect(resolveNodeSizeFrac({ id: 'a', pos: { col: 0, row: 0 }, size: 0.7, sizeScale: 5 })).toBe(0.7)
  })

  test('sizeScale multiplies the default', () => {
    expect(resolveNodeSizeFrac({ id: 'a', pos: { col: 0, row: 0 }, sizeScale: 2 })).toBeCloseTo(
      DEFAULT_NODE_SIZE * 2
    )
  })

  test('no overrides → DEFAULT_NODE_SIZE', () => {
    expect(resolveNodeSizeFrac({ id: 'a', pos: { col: 0, row: 0 } })).toBe(DEFAULT_NODE_SIZE)
  })
})
