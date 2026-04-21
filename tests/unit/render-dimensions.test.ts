import { describe, expect, test } from 'bun:test'
import { computeRenderDimensions, renderDiagramSvg } from '../../src/components/Diagram'
import { DEFAULT_CELL_SIZE } from '../../src/geometry/grid'
import type { DiagramDef } from '../../src/types'

function wideDef(): DiagramDef {
  // 4 cols × 2 rows
  return {
    columns: 4, rows: 2,
    nodes: [
      { id: 'a', pos: { col: 1, row: 1 } },
      { id: 'b', pos: { col: 4, row: 2 } },
    ],
  }
}

describe('computeRenderDimensions', () => {
  test('native size follows cellSize × cols/rows (+ padding)', () => {
    const { width, height } = computeRenderDimensions(wideDef())
    // width > height because cols (4) > rows (2) — no forced-square
    expect(width).toBeGreaterThan(height)
    expect(width).toBeGreaterThanOrEqual(DEFAULT_CELL_SIZE * 4)
    expect(height).toBeGreaterThanOrEqual(DEFAULT_CELL_SIZE * 2)
  })

  test('--width preserves aspect ratio', () => {
    const native = computeRenderDimensions(wideDef())
    const scaled = computeRenderDimensions(wideDef(), { renderWidth: 800 })
    expect(scaled.width).toBe(800)
    expect(scaled.height).toBeCloseTo(800 * (native.height / native.width), 0)
  })

  test('cellSize override scales both dimensions', () => {
    const base = computeRenderDimensions({ columns: 2, rows: 2, nodes: [{ id: 'a', pos: { col: 1, row: 1 } }] })
    const big = computeRenderDimensions({ cellSize: 512, columns: 2, rows: 2, nodes: [{ id: 'a', pos: { col: 1, row: 1 } }] })
    expect(big.width).toBeGreaterThan(base.width)
    expect(big.height / big.width).toBeCloseTo(base.height / base.width, 6)
  })
})

describe('renderDiagramSvg sizing', () => {
  test('no width option → outer svg width = canvas width', () => {
    const def: DiagramDef = { columns: 4, rows: 1, nodes: [{ id: 'a', pos: { col: 1, row: 1 } }] }
    const svg = renderDiagramSvg(def)
    const native = computeRenderDimensions(def)
    expect(svg).toContain(`width="${native.width}"`)
    expect(svg).toContain(`height="${native.height}"`)
  })

  test('width option overrides outer svg width; viewBox stays native', () => {
    const def: DiagramDef = { columns: 4, rows: 1, nodes: [{ id: 'a', pos: { col: 1, row: 1 } }] }
    const svg = renderDiagramSvg(def, { renderWidth: 400 })
    const native = computeRenderDimensions(def)
    expect(svg).toContain(`width="400"`)
    expect(svg).toContain(`viewBox="0 0 ${native.width} ${native.height}"`)
  })

  test('rectangular grid renders with matching aspect ratio', () => {
    const def: DiagramDef = {
      columns: 4, rows: 2,
      nodes: [{ id: 'a', pos: { col: 1, row: 1 } }, { id: 'b', pos: { col: 4, row: 2 } }],
    }
    const svg = renderDiagramSvg(def)
    const native = computeRenderDimensions(def)
    // aspect: canvas is ~4:2 (= 2:1), so width ≈ 2 × height modulo padding
    expect(native.width).toBeGreaterThan(native.height)
    expect(svg).toContain(`width="${native.width}"`)
    expect(svg).toContain(`height="${native.height}"`)
  })

  test('beyond 4-column grid works (limit is gone)', () => {
    const nodes = Array.from({ length: 7 }, (_, i) => ({
      id: `n${i}`,
      pos: { col: i + 1, row: 1 },
    }))
    const def: DiagramDef = { columns: 7, rows: 1, nodes }
    const { width, height } = computeRenderDimensions(def)
    expect(width).toBeGreaterThanOrEqual(DEFAULT_CELL_SIZE * 7)
    expect(width / height).toBeGreaterThan(5) // very wide, no square override
  })
})
