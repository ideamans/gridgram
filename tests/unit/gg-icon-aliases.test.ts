/**
 * Covers the alias + path-ref resolution machinery:
 *   - isPathRef / collectPathRefs pure detection
 *   - resolvePathRef absolute/relative/alias resolution
 *   - loadPathRefs + buildIconContext I/O (via a tmp dir)
 *   - resolveDiagramIcons end-to-end with pre-loaded paths
 */
import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { isPathRef, collectPathRefs, resolveDiagramIcons } from '../../src/gg/icons'
import { resolvePathRef, buildIconContext } from '../../src/gg/icon-loader'
import type { DiagramDef } from '../../src/types'

const TMP = join(process.cwd(), 'tmp', 'alias-test')
const ALIAS_DIR = join(TMP, 'brand-icons')
const DOC_DIR = join(TMP, 'docs')

const ICON_A = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="A" d="M0 0"/></svg>'
const ICON_B = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="B" d="M0 0"/></svg>'
const ICON_C = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="C" d="M0 0"/></svg>'

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(ALIAS_DIR, { recursive: true })
  mkdirSync(DOC_DIR, { recursive: true })
  writeFileSync(join(ALIAS_DIR, 'aws.svg'), ICON_A)
  writeFileSync(join(DOC_DIR, 'local.svg'), ICON_B)
  // A nested path inside the alias to exercise the rest-of-path segment
  mkdirSync(join(ALIAS_DIR, 'cloud'), { recursive: true })
  writeFileSync(join(ALIAS_DIR, 'cloud', 'azure.svg'), ICON_C)
})
afterAll(() => {
  rmSync(TMP, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
describe('isPathRef', () => {
  test('plain ids are not path refs', async () => {
    expect(isPathRef('user')).toBe(false)
    expect(isPathRef('circle-check')).toBe(false)
  })

  test('reserved Tabler prefixes are not path refs', async () => {
    expect(isPathRef('tabler/user')).toBe(false)
    expect(isPathRef('tabler/filled/star')).toBe(false)
  })

  test('@alias/x.svg IS a path ref', async () => {
    expect(isPathRef('@brand/aws.svg')).toBe(true)
  })

  test('bare filename with .svg IS a path ref', async () => {
    expect(isPathRef('foo.svg')).toBe(true)
    expect(isPathRef('dir/foo.svg')).toBe(true)
  })

  test('absolute / relative-prefixed paths are path refs', async () => {
    expect(isPathRef('/abs/path')).toBe(true)
    expect(isPathRef('./rel')).toBe(true)
    expect(isPathRef('../up')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
describe('collectPathRefs', () => {
  test('picks up every string-form path ref from nodes and badges', async () => {
    const def: DiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 1, row: 1 }, src: '@brand/aws.svg' },
        { id: 'b', pos: { col: 2, row: 1 }, src: 'user' },        // plain id
        { id: 'c', pos: { col: 3, row: 1 }, src: 'tabler/lock' }, // not a path ref
        {
          id: 'd', pos: { col: 4, row: 1 }, src: 'dir/foo.svg',
          badges: [{ icon: '@brand/cloud/azure.svg', position: 'top-right' }],
        },
      ],
    }
    const refs = collectPathRefs(def).sort()
    expect(refs).toEqual(['@brand/aws.svg', '@brand/cloud/azure.svg', 'dir/foo.svg'])
  })

  test('de-duplicates repeated refs', async () => {
    const def: DiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 1, row: 1 }, src: 'foo.svg' },
        { id: 'b', pos: { col: 2, row: 1 }, src: 'foo.svg' },
      ],
    }
    expect(collectPathRefs(def)).toEqual(['foo.svg'])
  })
})

// ---------------------------------------------------------------------------
describe('resolvePathRef', () => {
  const baseCtx = { docDir: '/doc', aliasDir: '/work', aliases: { brand: '/icons' } }

  test('@alias/rest with absolute alias target', async () => {
    expect(resolvePathRef('@brand/aws.svg', baseCtx)).toBe('/icons/aws.svg')
  })

  test('@alias/rest with relative alias target → joined with aliasDir (process.cwd)', async () => {
    const ctx = { ...baseCtx, aliases: { brand: './icons' } }
    expect(resolvePathRef('@brand/aws.svg', ctx)).toBe('/work/icons/aws.svg')
  })

  test('relative file path → joined with docDir (.gg file dir)', async () => {
    expect(resolvePathRef('local.svg', baseCtx)).toBe('/doc/local.svg')
  })

  test('absolute file path → kept as-is', async () => {
    expect(resolvePathRef('/abs/icon.svg', baseCtx)).toBe('/abs/icon.svg')
  })

  test('unregistered alias throws a cite-able error', async () => {
    expect(() => resolvePathRef('@unknown/x.svg', baseCtx)).toThrow(/"@unknown\/"/)
  })

  test('@alias without a path after the slash throws', async () => {
    expect(() => resolvePathRef('@brand', baseCtx)).toThrow(/missing a path/)
  })
})

// ---------------------------------------------------------------------------
describe('buildIconContext + resolveDiagramIcons (end-to-end, real fs)', () => {
  test('alias reference loads from aliasDir and resolves to inner SVG', async () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: { col: 1, row: 1 }, src: '@brand/aws.svg' }],
    }
    const ctx = await buildIconContext({
      aliases: { brand: ALIAS_DIR },
      def,
      docDir: DOC_DIR,
      aliasDir: TMP,
    })
    const resolved = resolveDiagramIcons(def, ctx).def
    expect(resolved.nodes[0].src).toContain('data-marker="A"')
    expect(resolved.nodes[0].iconError).toBeUndefined()
  })

  test('nested alias path (@brand/cloud/azure.svg) loads the nested file', async () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: { col: 1, row: 1 }, src: '@brand/cloud/azure.svg' }],
    }
    const ctx = await buildIconContext({
      aliases: { brand: ALIAS_DIR },
      def,
      docDir: DOC_DIR,
      aliasDir: TMP,
    })
    const resolved = resolveDiagramIcons(def, ctx).def
    expect(resolved.nodes[0].src).toContain('data-marker="C"')
  })

  test('bare filename (no @prefix) loads from docDir', async () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: { col: 1, row: 1 }, src: 'local.svg' }],
    }
    const ctx = await buildIconContext({ def, docDir: DOC_DIR })
    const resolved = resolveDiagramIcons(def, ctx).def
    expect(resolved.nodes[0].src).toContain('data-marker="B"')
  })

  test('unknown alias flags iconError on just that node', async () => {
    const def: DiagramDef = {
      nodes: [
        { id: 'a', pos: { col: 1, row: 1 }, src: '@unknown/x.svg' },
        { id: 'b', pos: { col: 2, row: 1 }, src: 'tabler/user' }, // still resolves
      ],
    }
    const ctx = await buildIconContext({ def, docDir: DOC_DIR })
    const resolved = resolveDiagramIcons(def, ctx).def
    expect(resolved.nodes[0].iconError).toBe(true)
    expect(resolved.nodes[1].src).toBeDefined()
  })

  test('missing file flags iconError', async () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: { col: 1, row: 1 }, src: 'does-not-exist.svg' }],
    }
    const ctx = await buildIconContext({ def, docDir: DOC_DIR })
    const resolved = resolveDiagramIcons(def, ctx).def
    expect(resolved.nodes[0].iconError).toBe(true)
  })

  test('tabler/... prefix is NOT captured as a path ref (still goes to Tabler)', async () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: { col: 1, row: 1 }, src: 'tabler/user' }],
    }
    const ctx = await buildIconContext({ def, docDir: DOC_DIR })
    const resolved = resolveDiagramIcons(def, ctx).def
    expect(resolved.nodes[0].iconError).toBeUndefined()
    expect(resolved.nodes[0].src).toMatch(/stroke="currentColor"/)
  })
})
