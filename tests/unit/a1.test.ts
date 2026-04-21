/**
 * A1 cell address helpers — parse + format + validation.
 */
import { describe, expect, test } from 'bun:test'
import { isA1, parseA1, formatA1 } from '../../src/a1'

describe('isA1', () => {
  test('accepts single-letter addresses', () => {
    expect(isA1('A1')).toBe(true)
    expect(isA1('Z9')).toBe(true)
  })
  test('accepts multi-letter (carry-over) addresses', () => {
    expect(isA1('AA1')).toBe(true)
    expect(isA1('AZ100')).toBe(true)
    expect(isA1('AAA9999')).toBe(true)
  })
  test('accepts lower-case', () => {
    expect(isA1('a1')).toBe(true)
    expect(isA1('aa100')).toBe(true)
  })
  test('rejects malformed', () => {
    expect(isA1('1A')).toBe(false)
    expect(isA1('A')).toBe(false)
    expect(isA1('1')).toBe(false)
    expect(isA1('')).toBe(false)
    expect(isA1('A1B')).toBe(false)
    expect(isA1('A0')).toBe(false)    // row < 1
    expect(isA1('@A1')).toBe(false)   // no `@` in A1 itself
  })
})

describe('parseA1', () => {
  test('A..Z → 1..26', () => {
    expect(parseA1('A1')).toEqual({ col: 1, row: 1 })
    expect(parseA1('B1')).toEqual({ col: 2, row: 1 })
    expect(parseA1('Z5')).toEqual({ col: 26, row: 5 })
  })
  test('AA..AZ → 27..52', () => {
    expect(parseA1('AA1')).toEqual({ col: 27, row: 1 })
    expect(parseA1('AB1')).toEqual({ col: 28, row: 1 })
    expect(parseA1('AZ1')).toEqual({ col: 52, row: 1 })
  })
  test('BA..BZ → 53..78', () => {
    expect(parseA1('BA1')).toEqual({ col: 53, row: 1 })
  })
  test('ZZ = 702', () => {
    expect(parseA1('ZZ1')).toEqual({ col: 702, row: 1 })
  })
  test('AAA = 703', () => {
    expect(parseA1('AAA1')).toEqual({ col: 703, row: 1 })
  })
  test('lower-case is accepted', () => {
    expect(parseA1('aa100')).toEqual({ col: 27, row: 100 })
  })
  test('mixed-case is accepted', () => {
    expect(parseA1('Ab3')).toEqual({ col: 28, row: 3 })
  })
  test('malformed throws', () => {
    expect(() => parseA1('1A')).toThrow(/Invalid cell address/)
    expect(() => parseA1('')).toThrow(/Invalid cell address/)
    expect(() => parseA1('A')).toThrow(/Invalid cell address/)
    expect(() => parseA1('A0')).toThrow(/row must be/)
  })
})

describe('formatA1', () => {
  test('1..26 → A..Z', () => {
    expect(formatA1(1, 1)).toBe('A1')
    expect(formatA1(2, 5)).toBe('B5')
    expect(formatA1(26, 1)).toBe('Z1')
  })
  test('27+ uses multi-letter', () => {
    expect(formatA1(27, 1)).toBe('AA1')
    expect(formatA1(52, 3)).toBe('AZ3')
    expect(formatA1(53, 1)).toBe('BA1')
    expect(formatA1(702, 1)).toBe('ZZ1')
    expect(formatA1(703, 1)).toBe('AAA1')
  })
  test('round-trips parseA1', () => {
    for (const addr of ['A1', 'B3', 'Z26', 'AA1', 'AZ100', 'BA99', 'AAA1000']) {
      const p = parseA1(addr)
      expect(formatA1(p.col, p.row)).toBe(addr)
    }
  })
  test('zero / negative / non-integer throws', () => {
    expect(() => formatA1(0, 1)).toThrow(/col must be a positive integer/)
    expect(() => formatA1(1, 0)).toThrow(/row must be a positive integer/)
    expect(() => formatA1(1.5, 1)).toThrow(/col must be a positive integer/)
  })
})
