import { describe, expect, test } from 'bun:test'
import { MinHeap } from '../../src/geometry/heap'

describe('MinHeap', () => {
  test('empty heap has size 0 and pop returns undefined', () => {
    const h = new MinHeap<number>((a, b) => a - b)
    expect(h.size).toBe(0)
    expect(h.pop()).toBe(undefined)
  })

  test('pops items in ascending order regardless of insertion order', () => {
    const h = new MinHeap<number>((a, b) => a - b)
    for (const v of [5, 3, 8, 1, 9, 2, 7, 4, 6]) h.push(v)
    const out: number[] = []
    while (h.size > 0) out.push(h.pop()!)
    expect(out).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  test('handles duplicates by inserting and removing each', () => {
    const h = new MinHeap<number>((a, b) => a - b)
    for (const v of [3, 1, 3, 2, 1, 2]) h.push(v)
    const out: number[] = []
    while (h.size > 0) out.push(h.pop()!)
    expect(out).toEqual([1, 1, 2, 2, 3, 3])
  })

  test('custom comparator (max-heap)', () => {
    const h = new MinHeap<number>((a, b) => b - a)
    for (const v of [1, 4, 2, 5, 3]) h.push(v)
    expect(h.pop()).toBe(5)
    expect(h.pop()).toBe(4)
  })

  test('size decreases monotonically with each pop', () => {
    const h = new MinHeap<number>((a, b) => a - b)
    for (const v of [1, 2, 3]) h.push(v)
    expect(h.size).toBe(3)
    h.pop(); expect(h.size).toBe(2)
    h.pop(); expect(h.size).toBe(1)
    h.pop(); expect(h.size).toBe(0)
  })

  test('object comparator (composite key with tie-break)', () => {
    interface E { d: number; seq: number }
    const h = new MinHeap<E>((a, b) => (a.d - b.d) || (a.seq - b.seq))
    h.push({ d: 1, seq: 2 })
    h.push({ d: 1, seq: 1 })
    h.push({ d: 0, seq: 99 })
    expect(h.pop()).toEqual({ d: 0, seq: 99 })
    expect(h.pop()).toEqual({ d: 1, seq: 1 })
    expect(h.pop()).toEqual({ d: 1, seq: 2 })
  })
})
