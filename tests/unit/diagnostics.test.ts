/**
 * Diagnostic helper tests — coordinate-conversion primitives used when
 * emitting 1-based / A1-labelled positions from the pipeline's internal
 * 0-based form. The larger diagnostic plumbing (placement attempts,
 * obstacles, pipeline integration) is exercised indirectly via the
 * snapshot tests and future placement-diagnostic tests.
 */
import { describe, expect, test } from 'bun:test'
import { cellAddress, toCellRef, toSpanRef } from '../../src/gg/diagnostics'

describe('cellAddress (1-based col → A1 letters)', () => {
  test('single-letter columns', () => {
    expect(cellAddress(1, 1)).toBe('A1')
    expect(cellAddress(2, 3)).toBe('B3')
    expect(cellAddress(26, 10)).toBe('Z10')
  })

  test('two-letter columns', () => {
    expect(cellAddress(27, 1)).toBe('AA1')
    expect(cellAddress(52, 5)).toBe('AZ5')
    expect(cellAddress(53, 5)).toBe('BA5')
  })

  test('three-letter columns cross boundary correctly', () => {
    // 26 + 26*26 = 702 → ZZ
    expect(cellAddress(702, 1)).toBe('ZZ1')
    // 703 → AAA
    expect(cellAddress(703, 1)).toBe('AAA1')
  })
})

describe('toCellRef (0-based → 1-based + A1)', () => {
  test('origin: {col:0, row:0} → A1', () => {
    expect(toCellRef({ col: 0, row: 0 })).toEqual({ col: 1, row: 1, address: 'A1' })
  })

  test('arbitrary cell', () => {
    expect(toCellRef({ col: 4, row: 9 })).toEqual({ col: 5, row: 10, address: 'E10' })
  })
})

describe('toSpanRef', () => {
  test('converts both endpoints', () => {
    const span = { from: { col: 0, row: 0 }, to: { col: 2, row: 1 } }
    expect(toSpanRef(span)).toEqual({
      from: { col: 1, row: 1, address: 'A1' },
      to:   { col: 3, row: 2, address: 'C2' },
    })
  })
})
