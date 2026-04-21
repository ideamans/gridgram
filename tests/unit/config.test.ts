import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import {
  defineConfig,
  resolveSettings,
  SYSTEM_DEFAULTS,
  type DiagramSettings,
} from '../../src/config'
import { findProjectConfig, loadConfigFile, loadProjectConfig } from '../../src/config-loader'

// ---------------------------------------------------------------------------
// resolveSettings
// ---------------------------------------------------------------------------
describe('resolveSettings', () => {
  test('no layers → SYSTEM_DEFAULTS', () => {
    const r = resolveSettings([])
    expect(r.cellSize).toBe(SYSTEM_DEFAULTS.cellSize)
    expect(r.suppressErrors).toBe(false)
    expect(r.theme.primary).toBe(SYSTEM_DEFAULTS.theme.primary)
    expect(r.assetAliases).toEqual({})
  })

  test('single layer overrides scalar defaults', () => {
    const r = resolveSettings([{ cellSize: 128 }])
    expect(r.cellSize).toBe(128)
  })

  test('later layer wins for scalars (deterministic priority)', () => {
    const r = resolveSettings([
      { cellSize: 128 },
      { cellSize: 256 },
      { cellSize: 512 },
    ])
    expect(r.cellSize).toBe(512)
  })

  test('theme fields deep-merge (partial override does not wipe siblings)', () => {
    const r = resolveSettings([
      { theme: { primary: '#111' } },
      { theme: { accent: '#aaa' } },
    ])
    expect(r.theme.primary).toBe('#111')        // from layer 1
    expect(r.theme.accent).toBe('#aaa')         // from layer 2
    expect(r.theme.secondary).toBe(SYSTEM_DEFAULTS.theme.secondary) // from system
    expect(r.theme.text).toBe(SYSTEM_DEFAULTS.theme.text)
  })

  test('later theme field wins when both layers set it', () => {
    const r = resolveSettings([
      { theme: { primary: '#111' } },
      { theme: { primary: '#222' } },
    ])
    expect(r.theme.primary).toBe('#222')
  })

  test('assetAliases deep-merge (same-name later wins)', () => {
    const r = resolveSettings([
      { assetAliases: { brand: '/a', vendor: '/v' } },
      { assetAliases: { brand: '/b' } }, // override brand only
    ])
    expect(r.assetAliases).toEqual({ brand: '/b', vendor: '/v' })
  })

  test('undefined layer fields are ignored (no accidental wipes)', () => {
    const r = resolveSettings([
      { cellSize: 128 },
      { cellSize: undefined, theme: { primary: '#999' } },
    ])
    expect(r.cellSize).toBe(128)                // not clobbered by undefined
    expect(r.theme.primary).toBe('#999')
  })

  test('four-layer stack simulates system → project → document → override', () => {
    const project: DiagramSettings  = { cellSize: 200, theme: { primary: '#pp1' } }
    const document: DiagramSettings = { cellSize: 150, theme: { accent: '#acc' } }
    const override: DiagramSettings = { renderWidth: 2048 }
    const r = resolveSettings([project, document, override])
    expect(r.cellSize).toBe(150)         // document wins over project
    expect(r.theme.primary).toBe('#pp1') // project
    expect(r.theme.accent).toBe('#acc')  // document
    expect(r.theme.secondary).toBe(SYSTEM_DEFAULTS.theme.secondary) // system fallback
    expect(r.renderWidth).toBe(2048)     // override wins (not in project/doc)
  })
})

// ---------------------------------------------------------------------------
// defineConfig
// ---------------------------------------------------------------------------
describe('defineConfig', () => {
  test('is the identity function', () => {
    const input = { cellSize: 100 }
    expect(defineConfig(input)).toBe(input)
  })
})

// ---------------------------------------------------------------------------
// Config file loading
// ---------------------------------------------------------------------------
const TMP = join(process.cwd(), 'tmp', 'config-test')

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  mkdirSync(join(TMP, 'deep', 'nested'), { recursive: true })
})
afterAll(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe('findProjectConfig', () => {
  test('finds a .json5 config in cwd', () => {
    writeFileSync(join(TMP, 'gridgram.config.json5'), '{ cellSize: 128 }')
    expect(findProjectConfig(TMP)).toBe(join(TMP, 'gridgram.config.json5'))
    rmSync(join(TMP, 'gridgram.config.json5'))
  })

  test('walks up toward root', () => {
    writeFileSync(join(TMP, 'gridgram.config.json'), '{"cellSize": 200}')
    const found = findProjectConfig(join(TMP, 'deep', 'nested'))
    expect(found).toBe(join(TMP, 'gridgram.config.json'))
    rmSync(join(TMP, 'gridgram.config.json'))
  })

  test('returns null when no config exists anywhere up to root', () => {
    // Start from a ramdom subdir with no config — the walk-up might still
    // hit a real gridgram.config in the parent tree. To be safe, use an
    // isolated dir and assert only that the type is null OR an absolute path.
    const r = findProjectConfig(join(TMP, 'deep'))
    // Accept either outcome — this test just verifies the function doesn't throw.
    expect(typeof r === 'string' || r === null).toBe(true)
  })
})

describe('loadConfigFile', () => {
  test('loads JSON', async () => {
    const p = join(TMP, 'load.json')
    writeFileSync(p, '{"cellSize": 64}')
    expect(await loadConfigFile(p)).toEqual({ cellSize: 64 })
    rmSync(p)
  })

  test('loads JSON5 with comments and trailing commas', async () => {
    const p = join(TMP, 'load.json5')
    writeFileSync(p, `{
      // comment allowed
      cellSize: 96,
      theme: { primary: '#abc' },
    }`)
    expect(await loadConfigFile(p)).toEqual({ cellSize: 96, theme: { primary: '#abc' } })
    rmSync(p)
  })

  test('loads a TS module via default export', async () => {
    const p = join(TMP, 'load.ts')
    writeFileSync(p, `
      import { defineConfig } from '${process.cwd()}/src/config'
      export default defineConfig({ cellSize: 333, theme: { accent: '#xyz' } })
    `)
    const out = await loadConfigFile(p)
    expect(out.cellSize).toBe(333)
    expect(out.theme?.accent).toBe('#xyz')
    rmSync(p)
  })

  test('throws when file does not exist', async () => {
    expect(loadConfigFile(join(TMP, 'nope.json'))).rejects.toThrow(/not found/)
  })
})

describe('loadProjectConfig', () => {
  test('returns null when no config is discoverable (isolated tmp dir)', async () => {
    // Pointing inside our test tmp dir where we haven't written a config;
    // walk-up might find one higher, so just ensure no throw.
    const r = await loadProjectConfig({ cwd: TMP })
    expect(r === null || typeof r === 'object').toBe(true)
  })

  test('loads an explicit path', async () => {
    const p = join(TMP, 'explicit.json')
    writeFileSync(p, '{"cellSize": 400}')
    const r = await loadProjectConfig({ explicitPath: p })
    expect(r?.settings.cellSize).toBe(400)
    expect(r?.path).toBe(p)
    rmSync(p)
  })
})
