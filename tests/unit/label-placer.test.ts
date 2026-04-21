import { describe, expect, test } from 'bun:test'
import { placeLabel, type SlotCandidate } from '../../src/geometry/label-placer'
import type { LabelRect } from '../../src/geometry/collision'

const emptyContext = { placedLabels: [] as LabelRect[], connLines: [] }

/** Helper — build a candidate from slot name + rect. */
function cand(slot: string, rect: LabelRect): SlotCandidate<string> {
  return { slot, rect, description: slot }
}

describe('placeLabel', () => {
  test('returns first non-colliding candidate', () => {
    const result = placeLabel(
      [
        cand('a', { x: 0, y: 0, w: 10, h: 10 }),
        cand('b', { x: 100, y: 0, w: 10, h: 10 }),
        cand('c', { x: 200, y: 0, w: 10, h: 10 }),
      ],
      emptyContext,
    )
    expect(result).not.toBe(null)
    expect(result!.slot).toBe('a')
    expect(result!.error).toBe(false)
    // Exactly one attempt was needed and it was accepted.
    expect(result!.attempts).toHaveLength(1)
    expect(result!.attempts[0].accepted).toBe(true)
    expect(result!.attempts[0].hits).toEqual([])
  })

  test('skips candidates that overlap a placed label, records the blocker', () => {
    const ctx = { ...emptyContext, placedLabels: [{ x: 0, y: 0, w: 10, h: 10 }] }
    const result = placeLabel(
      [
        cand('a', { x: 0, y: 0, w: 10, h: 10 }),
        cand('b', { x: 100, y: 0, w: 10, h: 10 }),
      ],
      ctx,
    )
    expect(result!.slot).toBe('b')
    expect(result!.error).toBe(false)
    expect(result!.attempts).toHaveLength(2)
    // a was attempted first and blocked by the placed label
    expect(result!.attempts[0].description).toBe('a')
    expect(result!.attempts[0].accepted).toBe(false)
    expect(result!.attempts[0].hits[0]).toMatchObject({ kind: 'label', index: 0 })
    expect(result!.attempts[1].description).toBe('b')
    expect(result!.attempts[1].accepted).toBe(true)
  })

  test('returns last candidate flagged with error when all collide', () => {
    const blocker: LabelRect = { x: 0, y: 0, w: 30, h: 30 }
    const ctx = { ...emptyContext, placedLabels: [blocker] }
    const result = placeLabel(
      [
        cand('a', { x: 0, y: 0, w: 10, h: 10 }),
        cand('b', { x: 5, y: 0, w: 10, h: 10 }),
      ],
      ctx,
    )
    expect(result!.error).toBe(true)
    expect(result!.slot).toBe('b')
    // Every candidate attempted, plus the fallback attempt at the end
    // (a, b, fallback=b) — the fallback is recorded as accepted even
    // though it still collides.
    expect(result!.attempts.length).toBe(3)
    expect(result!.attempts.at(-1)!.accepted).toBe(true)
    expect(result!.attempts.at(-1)!.hits.length).toBeGreaterThan(0)
  })

  test('uses explicit fallback over the last candidate when supplied', () => {
    const blocker: LabelRect = { x: 0, y: 0, w: 30, h: 30 }
    const ctx = { ...emptyContext, placedLabels: [blocker] }
    const result = placeLabel(
      [
        cand('a', { x: 0, y: 0, w: 10, h: 10 }),
        cand('b', { x: 5, y: 0, w: 10, h: 10 }),
      ],
      ctx,
      cand('forced', { x: 999, y: 999, w: 10, h: 10 }),
    )
    expect(result!.slot).toBe('forced')
    expect(result!.error).toBe(true)
    expect(result!.rect).toEqual({ x: 999, y: 999, w: 10, h: 10 })
    expect(result!.attempts.at(-1)!.description).toBe('forced')
  })

  test('returns null when candidates are empty and no fallback is supplied', () => {
    expect(placeLabel<string>([], emptyContext)).toBe(null)
  })

  test('flags canvas-bounds overrun as a distinct hit kind', () => {
    const ctx = { ...emptyContext, bounds: { width: 100, height: 100 } }
    const result = placeLabel(
      [
        cand('out', { x: -5, y: 0, w: 10, h: 10 }),
        cand('in', { x: 0, y: 0, w: 10, h: 10 }),
      ],
      ctx,
    )
    expect(result!.slot).toBe('in')
    expect(result!.attempts[0].hits[0]).toMatchObject({ kind: 'canvas-bounds' })
  })
})
