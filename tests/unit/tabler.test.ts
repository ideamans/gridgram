import { describe, expect, test } from 'bun:test'
import { tabler, tablerHas } from '../../src/tabler'

describe('tabler() resolver', () => {
  test('valid kebab-case name returns an outline icon fragment', () => {
    const r = tabler('user')
    expect(r.iconError).toBeUndefined()
    expect(typeof r.icon).toBe('string')
    expect(r.icon as string).toMatch(/^<g [^>]*stroke="currentColor"/)
    expect(r.icon as string).toContain('<path')
  })

  test('filled variant returns a fill="currentColor" wrapper', () => {
    const r = tabler('user', { filled: true })
    expect(r.iconError).toBeUndefined()
    expect(r.icon as string).toMatch(/^<g fill="currentColor">/)
  })

  test('missing filled variant flags iconError without an icon', () => {
    // server has no filled variant in @tabler/icons
    const r = tabler('server', { filled: true })
    expect(r.iconError).toBe(true)
    expect(r.icon).toBeUndefined()
  })

  test('completely unknown name flags iconError', () => {
    const r = tabler('definitely-not-a-real-icon-name-xyz')
    expect(r.iconError).toBe(true)
    expect(r.icon).toBeUndefined()
  })

  test('multi-segment kebab-case names resolve', () => {
    const r = tabler('arrow-right')
    expect(r.iconError).toBeUndefined()
    expect(r.icon as string).toContain('<path')
  })
})

describe('tablerHas', () => {
  test('returns true for known outline icons', () => {
    expect(tablerHas('user')).toBe(true)
    expect(tablerHas('arrow-right')).toBe(true)
  })

  test('returns true for known filled icons', () => {
    expect(tablerHas('user', { filled: true })).toBe(true)
  })

  test('returns false for missing variants', () => {
    expect(tablerHas('server', { filled: true })).toBe(false)
    expect(tablerHas('definitely-not-real')).toBe(false)
  })
})
