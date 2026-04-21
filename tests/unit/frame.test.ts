import { describe, test, expect } from 'bun:test'
import {
  normalizeFrameSpec,
  frameMatches,
  parseGgFrameSpec,
  resolveFrame,
  hasFrames,
} from '../../src/frame.ts'
import type { DiagramDef } from '../../src/types.ts'

describe('normalizeFrameSpec', () => {
  test('undefined → undefined (matches all)', () => {
    expect(normalizeFrameSpec(undefined)).toBeUndefined()
  })

  test('bare number → single-element range [n, n]', () => {
    expect(normalizeFrameSpec(5)).toEqual([[5, 5]])
  })

  test('list of bare numbers → list of unit ranges', () => {
    expect(normalizeFrameSpec([2, 3])).toEqual([[2, 2], [3, 3]])
  })

  test('nested tuple → range', () => {
    expect(normalizeFrameSpec([[2, 5]])).toEqual([[2, 5]])
  })

  test('mix of singles and ranges', () => {
    expect(normalizeFrameSpec([[2, 3], 5, [7, 9]])).toEqual([[2, 3], [5, 5], [7, 9]])
  })

  test('[n, Infinity] range', () => {
    expect(normalizeFrameSpec([[5, Infinity]])).toEqual([[5, Infinity]])
  })

  test('throws on inverted range', () => {
    expect(() => normalizeFrameSpec([[5, 2]])).toThrow(/must be ≤/)
  })
})

describe('frameMatches', () => {
  test('undefined spec matches every frame', () => {
    expect(frameMatches(undefined, 1)).toBe(true)
    expect(frameMatches(undefined, 9999)).toBe(true)
  })

  test('single-number spec matches only that frame', () => {
    expect(frameMatches(3, 3)).toBe(true)
    expect(frameMatches(3, 2)).toBe(false)
    expect(frameMatches(3, 4)).toBe(false)
  })

  test('list of singles', () => {
    expect(frameMatches([2, 5, 8], 5)).toBe(true)
    expect(frameMatches([2, 5, 8], 4)).toBe(false)
  })

  test('range (inclusive)', () => {
    expect(frameMatches([[3, 5]], 3)).toBe(true)
    expect(frameMatches([[3, 5]], 5)).toBe(true)
    expect(frameMatches([[3, 5]], 4)).toBe(true)
    expect(frameMatches([[3, 5]], 6)).toBe(false)
  })

  test('open-ended range [n, Infinity]', () => {
    expect(frameMatches([[5, Infinity]], 5)).toBe(true)
    expect(frameMatches([[5, Infinity]], 1_000_000)).toBe(true)
    expect(frameMatches([[5, Infinity]], 4)).toBe(false)
  })
})

describe('parseGgFrameSpec (string form)', () => {
  test('single number', () => {
    expect(parseGgFrameSpec('2')).toEqual({ spec: 2 })
  })

  test('comma list', () => {
    expect(parseGgFrameSpec('2, 3, 5')).toEqual({ spec: [2, 3, 5] })
  })

  test('closed range', () => {
    expect(parseGgFrameSpec('3-5')).toEqual({ spec: [[3, 5]] })
  })

  test('open-ended range collapses to [n, Infinity]', () => {
    expect(parseGgFrameSpec('5-')).toEqual({ spec: [[5, Infinity]] })
  })

  test('mix of singles, closed, and open ranges', () => {
    expect(parseGgFrameSpec('2, 3-5, 7-').spec).toEqual([2, [3, 5], [7, Infinity]])
  })

  test('empty body is an error', () => {
    expect(parseGgFrameSpec('').error).toMatch(/Empty frame spec/)
  })

  test('inverted range is an error', () => {
    expect(parseGgFrameSpec('5-2').error).toMatch(/must be ≤/)
  })

  test('rejects non-numeric tokens', () => {
    expect(parseGgFrameSpec('foo').error).toMatch(/Invalid frame spec/)
  })
})

describe('resolveFrame — node filtering and id-merge', () => {
  test('identity when no frames used', () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: 'A1', src: 'tabler/user' }],
    }
    expect(hasFrames(def)).toBe(false)
    const r = resolveFrame(def, 1)
    expect(r.nodes).toEqual(def.nodes)
  })

  test('drops frame-tagged nodes whose spec excludes the current frame', () => {
    const def: DiagramDef = {
      nodes: [
        { id: 'a', pos: 'A1', src: 'tabler/user' },            // base
        { id: 'b', pos: 'B1', src: 'tabler/bell', frames: 2 },  // only frame 2
      ],
    }
    expect(resolveFrame(def, 1).nodes.map((n) => n.id)).toEqual(['a'])
    expect(resolveFrame(def, 2).nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(resolveFrame(def, 3).nodes.map((n) => n.id)).toEqual(['a'])
  })

  test('open-ended gg spec [n-] applies from n onward', () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: 'A1', src: 'tabler/user', frames: [[5, Infinity]] }],
    }
    expect(resolveFrame(def, 4).nodes).toEqual([])
    expect(resolveFrame(def, 5).nodes.length).toBe(1)
    expect(resolveFrame(def, 100).nodes.length).toBe(1)
  })

  test('same id across frames is deep-merged (later wins per field)', () => {
    const def: DiagramDef = {
      nodes: [
        { id: 'user', pos: 'A1', src: 'tabler/user', label: 'User' },
        { id: 'user', label: 'User login', frames: 2 },
        { id: 'user', src: 'tabler/filled/user', label: 'Session', color: 'accent', frames: [[3, 5]] },
      ],
    }
    const f1 = resolveFrame(def, 1).nodes[0]
    expect(f1).toMatchObject({ id: 'user', label: 'User', src: 'tabler/user' })
    expect((f1 as any).frames).toBeUndefined()

    const f2 = resolveFrame(def, 2).nodes[0]
    expect(f2).toMatchObject({ id: 'user', label: 'User login', src: 'tabler/user' })

    const f4 = resolveFrame(def, 4).nodes[0]
    expect(f4).toMatchObject({
      id: 'user',
      label: 'Session',
      src: 'tabler/filled/user',
      color: 'accent',
    })
  })

  test('new ids only appear at their declared frames', () => {
    const def: DiagramDef = {
      nodes: [
        { id: 'u', pos: 'A1', src: 'tabler/user' },
        { id: 'newbie', pos: 'B1', src: 'tabler/user', frames: 2 },
      ],
    }
    expect(resolveFrame(def, 1).nodes.map((n) => n.id)).toEqual(['u'])
    expect(resolveFrame(def, 3).nodes.map((n) => n.id)).toEqual(['u'])
    expect(resolveFrame(def, 2).nodes.map((n) => n.id)).toEqual(['u', 'newbie'])
  })

  test('connector frame filtering (anonymous connectors are independent)', () => {
    const def: DiagramDef = {
      nodes: [
        { id: 'a', pos: 'A1' }, { id: 'b', pos: 'B1' }, { id: 'c', pos: 'C1' },
      ],
      connectors: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c', frames: 2 },
      ],
    }
    expect(resolveFrame(def, 1).connectors?.length).toBe(1)
    expect(resolveFrame(def, 2).connectors?.length).toBe(2)
  })

  test('doc [N] override deep-merges into base settings', () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: 'A1' }],
      theme: { primary: '#111', text: '#222' } as any,
      frameOverrides: [
        { frames: 2, settings: { theme: { primary: '#fff' } as any } },
      ],
    }
    expect(resolveFrame(def, 1).theme).toMatchObject({ primary: '#111', text: '#222' })
    // frame 2: primary overridden, text preserved from base
    expect(resolveFrame(def, 2).theme).toMatchObject({ primary: '#fff', text: '#222' })
  })

  test('doc [N-] continuation override', () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: 'A1' }],
      theme: { primary: '#111' } as any,
      frameOverrides: [
        { frames: [[2, Infinity]], settings: { theme: { primary: '#fff' } as any } },
      ],
    }
    expect(resolveFrame(def, 1).theme?.primary).toBe('#111')
    expect(resolveFrame(def, 2).theme?.primary).toBe('#fff')
    expect(resolveFrame(def, 99).theme?.primary).toBe('#fff')
  })

  test('notes / regions are independent per frame (no id-merge)', () => {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: 'A1' }],
      notes: [
        { pos: 'B1', text: 'base' },
        { pos: 'B2', text: 'frame-2-only', frames: 2 },
      ],
      regions: [
        { spans: [{ from: 'A1', to: 'A1' }], color: '#fff' },
        { spans: [{ from: 'B1', to: 'B1' }], color: '#eee', frames: 2 },
      ],
    }
    expect(resolveFrame(def, 1).notes?.length).toBe(1)
    expect(resolveFrame(def, 2).notes?.length).toBe(2)
    expect(resolveFrame(def, 1).regions?.length).toBe(1)
    expect(resolveFrame(def, 2).regions?.length).toBe(2)
  })

  test('resolved def has no lingering `frames` fields', () => {
    const def: DiagramDef = {
      nodes: [
        { id: 'a', pos: 'A1' },
        { id: 'b', pos: 'B1', frames: 2 },
      ],
      connectors: [{ from: 'a', to: 'b', frames: 2 }],
    }
    const out = resolveFrame(def, 2)
    for (const n of out.nodes) expect((n as any).frames).toBeUndefined()
    for (const c of out.connectors ?? []) expect((c as any).frames).toBeUndefined()
  })
})

describe('hasFrames', () => {
  test('false when no element uses frames', () => {
    expect(hasFrames({ nodes: [{ id: 'a', pos: 'A1' }] })).toBe(false)
  })

  test('true when any node carries frames', () => {
    expect(hasFrames({ nodes: [{ id: 'a', pos: 'A1', frames: 2 }] })).toBe(true)
  })

  test('true when frameOverrides present', () => {
    expect(hasFrames({
      nodes: [],
      frameOverrides: [{ frames: 2, settings: { theme: { primary: '#fff' } as any } }],
    })).toBe(true)
  })
})
