/**
 * loadIconValue handles four input shapes:
 *   - dataURL (base64 / urlencoded)
 *   - URL (https/http) — fetched
 *   - raw SVG markup
 *   - file path (relative or absolute)
 */
import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { loadIconValue, loadIconMap } from '../../src/gg/icon-loader'

const TMP = join(process.cwd(), 'tmp', 'icon-value-test')

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  writeFileSync(join(TMP, 'local.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="LOCAL"/></svg>')
})
afterAll(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe('loadIconValue', () => {
  test('dataURL (urlencoded SVG) decodes and inlines', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="DATA"/></svg>'
    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`
    const out = await loadIconValue(url, TMP)
    expect(out).toBe('<path data-marker="DATA"/>')
  })

  test('dataURL (base64 SVG) decodes and inlines', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="B64"/></svg>'
    const url = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    const out = await loadIconValue(url, TMP)
    expect(out).toBe('<path data-marker="B64"/>')
  })

  test('raw SVG markup passes through (wrapper stripped)', async () => {
    const svg = '<svg viewBox="0 0 24 24"><path data-marker="RAW"/></svg>'
    const out = await loadIconValue(svg, TMP)
    expect(out).toBe('<path data-marker="RAW"/>')
  })

  test('relative file path is read from cwd', async () => {
    const out = await loadIconValue('local.svg', TMP)
    expect(out).toBe('<path data-marker="LOCAL"/>')
  })

  test('absolute file path is read as-is', async () => {
    const out = await loadIconValue(join(TMP, 'local.svg'), TMP)
    expect(out).toBe('<path data-marker="LOCAL"/>')
  })

  test('invalid dataURL throws', async () => {
    await expect(loadIconValue('data:bogus', TMP)).rejects.toThrow(/Invalid data URL/)
  })
})

describe('loadIconMap', () => {
  test('mixed value types in one map all resolve', async () => {
    const svg = '<svg viewBox="0 0 24 24"><path data-marker="X"/></svg>'
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`
    const { map, errors } = await loadIconMap({
      a: dataUrl,
      b: 'local.svg',
      c: '<svg><path data-marker="C"/></svg>',
    }, TMP)
    expect(map.a).toBe('<path data-marker="X"/>')
    expect(map.b).toBe('<path data-marker="LOCAL"/>')
    expect(map.c).toBe('<path data-marker="C"/>')
    expect(errors).toEqual([])
  })

  test('a single broken entry does not abort the whole map', async () => {
    const { map, errors } = await loadIconMap({
      ok: '<svg><path data-marker="OK"/></svg>',
      bad: '/this/path/should/not/exist.svg',
    }, TMP)
    expect(map.ok).toBe('<path data-marker="OK"/>')
    expect(map.bad).toBeUndefined()
    expect(errors).toHaveLength(1)
    expect(errors[0].source).toBe('icon')
    expect(errors[0].message).toMatch(/"bad"/)
  })
})
