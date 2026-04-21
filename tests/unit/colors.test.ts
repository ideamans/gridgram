import { describe, expect, test } from 'bun:test'
import {
  resolveColor,
  resolveRegionFill,
  isTransparent,
  KEYS,
  NODE_RING_FILL_ALPHA,
  DEFAULT_REGION_ALPHA,
} from '../../src/components/colors'
import type { DiagramTheme } from '../../src/types'

const theme: DiagramTheme = {
  primary: '#1e3a5f',
  secondary: '#3b5a80',
  accent: '#e8792f',
  text: '#2d3748',
  bg: '#ffffff',
  muted: '#888888',
}

// --------------------------------------------------------------------------
// Pass-through cases
// --------------------------------------------------------------------------
describe('resolveColor: pass-through', () => {
  test('undefined → undefined', () => {
    expect(resolveColor(undefined, theme)).toBeUndefined()
  })

  test('6-digit hex literal passes through', () => {
    expect(resolveColor('#ff8800', theme)).toBe('#ff8800')
  })

  test('8-digit hex (with alpha) passes through', () => {
    expect(resolveColor('#ff880040', theme)).toBe('#ff880040')
  })

  test('3-digit hex passes through', () => {
    expect(resolveColor('#f80', theme)).toBe('#f80')
  })

  test('CSS named colors pass through (not reserved keywords)', () => {
    expect(resolveColor('red', theme)).toBe('red')
    expect(resolveColor('black', theme)).toBe('black')
    expect(resolveColor('rebeccapurple', theme)).toBe('rebeccapurple')
  })

  test('rgb() / rgba() pass through', () => {
    expect(resolveColor('rgb(200, 0, 0)', theme)).toBe('rgb(200, 0, 0)')
    expect(resolveColor('rgba(200, 0, 0, 0.5)', theme)).toBe('rgba(200, 0, 0, 0.5)')
  })
})

// --------------------------------------------------------------------------
// Theme keyword
// --------------------------------------------------------------------------
describe('resolveColor: theme keyword', () => {
  test('each key resolves to the theme field', () => {
    for (const k of KEYS) {
      const v = theme[k]
      if (typeof v === 'string') expect(resolveColor(k, theme)).toBe(v)
    }
  })

  test('keyword for undefined theme field → undefined', () => {
    const t2: DiagramTheme = { ...theme, muted: undefined }
    expect(resolveColor('muted', t2)).toBeUndefined()
  })
})

// --------------------------------------------------------------------------
// keyword/AA alpha suffix
// --------------------------------------------------------------------------
describe('resolveColor: keyword/AA', () => {
  test('two-digit alpha is appended', () => {
    expect(resolveColor('primary/12', theme)).toBe('#1e3a5f12')
    expect(resolveColor('accent/ff', theme)).toBe('#e8792fff')
    expect(resolveColor('accent/00', theme)).toBe('#e8792f00')
  })

  test('single-digit alpha is doubled (primary/8 → /88)', () => {
    expect(resolveColor('primary/8', theme)).toBe('#1e3a5f88')
    expect(resolveColor('accent/0', theme)).toBe('#e8792f00')
    expect(resolveColor('accent/f', theme)).toBe('#e8792fff')
  })

  test('uppercase alpha is normalized to lowercase', () => {
    expect(resolveColor('accent/AB', theme)).toBe('#e8792fab')
  })

  test('unknown keyword with alpha passes through unchanged', () => {
    expect(resolveColor('notakey/12', theme)).toBe('notakey/12')
  })

  test('keyword against non-6-digit theme color passes through', () => {
    const t2: DiagramTheme = { ...theme, primary: 'red' }
    expect(resolveColor('primary/12', t2)).toBe('primary/12')
  })
})

// --------------------------------------------------------------------------
// resolveRegionFill
// --------------------------------------------------------------------------
describe('resolveRegionFill', () => {
  test('undefined → fill="none" (invisible)', () => {
    expect(resolveRegionFill(undefined, theme)).toEqual({ fill: 'none' })
  })

  test('empty string → fill="none"', () => {
    expect(resolveRegionFill('', theme)).toEqual({ fill: 'none' })
  })

  test('bare theme keyword auto-tints with DEFAULT_REGION_ALPHA', () => {
    expect(resolveRegionFill('primary', theme)).toEqual({
      fill: '#1e3a5f',
      opacity: DEFAULT_REGION_ALPHA,
    })
    expect(resolveRegionFill('accent', theme)).toEqual({
      fill: '#e8792f',
      opacity: DEFAULT_REGION_ALPHA,
    })
  })

  test('keyword/AA passes through as hex+alpha (no additional opacity)', () => {
    expect(resolveRegionFill('accent/20', theme)).toEqual({ fill: '#e8792f20' })
    // No `opacity` field — the alpha is embedded in the fill string
  })

  test('literal solid hex passes through as-is (no auto-tint)', () => {
    expect(resolveRegionFill('#e8792f', theme)).toEqual({ fill: '#e8792f' })
  })

  test('literal hex with alpha passes through untouched', () => {
    expect(resolveRegionFill('#e8792f12', theme)).toEqual({ fill: '#e8792f12' })
  })

  test('CSS named color passes through (no auto-tint)', () => {
    expect(resolveRegionFill('red', theme)).toEqual({ fill: 'red' })
  })

  test('transparent / none short-circuits via resolveColor pass-through', () => {
    expect(resolveRegionFill('transparent', theme)).toEqual({ fill: 'transparent' })
    expect(resolveRegionFill('none', theme)).toEqual({ fill: 'none' })
  })
})

// --------------------------------------------------------------------------
// isTransparent
// --------------------------------------------------------------------------
describe('isTransparent', () => {
  test('undefined / empty / transparent / none → true', () => {
    expect(isTransparent(undefined)).toBe(true)
    expect(isTransparent('')).toBe(true)
    expect(isTransparent('transparent')).toBe(true)
    expect(isTransparent('none')).toBe(true)
  })

  test('any real color → false', () => {
    expect(isTransparent('#ffffff')).toBe(false)
    expect(isTransparent('red')).toBe(false)
    expect(isTransparent('rgb(0,0,0)')).toBe(false)
    expect(isTransparent('#00000000')).toBe(false)
  })
})

// --------------------------------------------------------------------------
// Alpha defaults are sensible
// --------------------------------------------------------------------------
describe('alpha defaults', () => {
  test('NODE_RING_FILL_ALPHA ≈ 0x15 / 0xff', () => {
    expect(NODE_RING_FILL_ALPHA).toBeCloseTo(21 / 255, 5)
  })

  test('DEFAULT_REGION_ALPHA ≈ 0x12 / 0xff (matches legacy hand-rolled #rrggbb12)', () => {
    expect(DEFAULT_REGION_ALPHA).toBeCloseTo(18 / 255, 5)
  })
})
