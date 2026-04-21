import { describe, test, expect } from 'bun:test'
import { parseGg } from '../../src/gg/parser.ts'
import { tokenize } from '../../src/gg/dsl.ts'
import { resolveFrame } from '../../src/frame.ts'
import { renderDiagram } from '../../src/components/Diagram.ts'

describe('gg tokenizer: [frame-spec]', () => {
  test('single-number frame spec', () => {
    const { tokens, errors } = tokenize('icon [2] :u @A1 tabler/user "U"')
    expect(errors).toEqual([])
    const fs = tokens.find((t) => t.type === 'frame-spec') as any
    expect(fs.spec).toBe(2)
  })

  test('comma-separated list', () => {
    const fs = tokenize('icon [2,3,5] :u @A1 src=x').tokens.find((t) => t.type === 'frame-spec') as any
    expect(fs.spec).toEqual([2, 3, 5])
  })

  test('closed range', () => {
    const fs = tokenize('icon [3-5] :u @A1 src=x').tokens.find((t) => t.type === 'frame-spec') as any
    expect(fs.spec).toEqual([[3, 5]])
  })

  test('open-ended range [5-]', () => {
    const fs = tokenize('icon [5-] :u @A1 src=x').tokens.find((t) => t.type === 'frame-spec') as any
    expect(fs.spec).toEqual([[5, Infinity]])
  })

  test('mix of singles and ranges', () => {
    const fs = tokenize('icon [1, 3-5, 7-] :u @A1 src=x').tokens.find((t) => t.type === 'frame-spec') as any
    expect(fs.spec).toEqual([1, [3, 5], [7, Infinity]])
  })

  test('empty [] surfaces an error', () => {
    const { errors } = tokenize('icon [] :u @A1 src=x')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].message).toMatch(/Empty frame spec/)
  })
})

describe('parseGg: frame-tagged statements', () => {
  test('icon [2] attaches frames to NodeDef', () => {
    const { def, errors } = parseGg(`icon :u @A1 tabler/user "U"
icon [2] :u tabler/filled/user "Session"`)
    expect(errors.filter((e) => e.source !== 'check')).toEqual([])
    expect(def.nodes.length).toBe(2)
    expect(def.nodes[0].frames).toBeUndefined()
    expect(def.nodes[1].frames).toBe(2)
  })

  test('doc [N] { … } lands in frameOverrides, not base settings', () => {
    const { def } = parseGg(`doc { cols: 4, theme: { primary: '#111' } }
doc [2] { theme: { primary: '#fff' } }
icon :u @A1 src=x`)
    expect(def.theme?.primary).toBe('#111')  // base preserved
    expect(def.frameOverrides?.length).toBe(1)
    expect(def.frameOverrides![0].frames).toBe(2)
    expect((def.frameOverrides![0].settings as any).theme).toEqual({ primary: '#fff' })
  })

  test('connector [range] attaches frames to ConnectorDef', () => {
    const { def, errors } = parseGg(`icon :a @A1 src=x
icon :b @B1 src=x
a --> b [2-4] "appears only at 2..4"`)
    expect(errors.filter((e) => e.source !== 'check')).toEqual([])
    expect(def.connectors?.[0].frames).toEqual([[2, 4]])
    expect(def.connectors?.[0].label).toBe('appears only at 2..4')
  })

  test('note [2] captures frames and targets', () => {
    const { def, errors } = parseGg(`icon :a @A1 src=x
note [2] @B1 (a) "visible at frame 2"`)
    expect(errors.filter((e) => e.source !== 'check')).toEqual([])
    expect(def.notes?.[0].frames).toBe(2)
    expect(def.notes?.[0].targets).toEqual(['a'])
  })

  test('region [2-] attaches frames to RegionDef', () => {
    const { def, errors } = parseGg(`icon :a @A1 src=x
region [2-] @A1-B2 "emphasis"`)
    expect(errors.filter((e) => e.source !== 'check')).toEqual([])
    expect(def.regions?.[0].frames).toEqual([[2, Infinity]])
  })

  test('duplicate id WITHOUT frames is still a hard error', () => {
    const { errors } = parseGg(`icon :u @A1 src=x
icon :u @B1 src=x`)
    const dup = errors.find((e) => e.message.includes('Duplicate node id'))
    expect(dup).toBeDefined()
  })

  test('duplicate id is allowed when at least one declaration has a frame spec', () => {
    const src = `icon :u @A1 src=x
icon [2] :u src=y`
    const { errors } = parseGg(src)
    const dup = errors.find((e) => e.message.includes('Duplicate node id'))
    expect(dup).toBeUndefined()
  })

  test('same cell across different frames is NOT a duplicate-cell error', () => {
    // Each frame only has one icon at A1 — no clash in any given frame.
    const { errors } = parseGg(`icon [2] :a @A1 src=x
icon [3] :b @A1 src=x`)
    const dup = errors.find((e) => e.message.includes('Duplicate cell'))
    expect(dup).toBeUndefined()
  })

  test('same cell in the same frame IS a duplicate-cell error', () => {
    const { errors } = parseGg(`icon [2] :a @A1 src=x
icon [2] :b @A1 src=x`)
    const dup = errors.find((e) => e.message.includes('Duplicate cell'))
    expect(dup).toBeDefined()
    expect(dup!.message).toContain('A1')
  })
})

describe('render pipeline: frame opt selects which frame renders', () => {
  test('renderDiagram without opts.frame renders the base (frame 1)', () => {
    const { def } = parseGg(`icon :u @A1 tabler/user "Base"
icon [2] :u tabler/user "Frame-2 label"`)
    const { svg } = renderDiagram(def)
    expect(svg).toContain('Base')
    expect(svg).not.toContain('Frame-2 label')
  })

  test('renderDiagram with opts.frame=2 applies frame-2 merge', () => {
    const { def } = parseGg(`icon :u @A1 tabler/user "Base"
icon [2] :u tabler/user "Frame-2 label"`)
    const { svg } = renderDiagram(def, { frame: 2 })
    expect(svg).toContain('Frame-2 label')
    expect(svg).not.toContain('Base')
  })

  test('frame-only nodes appear only at their frame', () => {
    const { def } = parseGg(`doc { cols: 2 }
icon :base @A1 tabler/user "Base"
icon [2] :extra @B1 tabler/bell "Extra"`)
    const f1 = renderDiagram(def, { frame: 1 }).svg
    const f2 = renderDiagram(def, { frame: 2 }).svg
    expect(f1).toContain('Base')
    expect(f1).not.toContain('Extra')
    expect(f2).toContain('Base')
    expect(f2).toContain('Extra')
  })

  test('doc [N] theme override reaches the rendered SVG', () => {
    const { def } = parseGg(`doc { theme: { primary: '#111111' } }
doc [2] { theme: { primary: '#ffffff' } }
icon :u @A1 tabler/user "U"`)
    const f1 = renderDiagram(def, { frame: 1 }).svg
    const f2 = renderDiagram(def, { frame: 2 }).svg
    // Primary theme color drives the node ring stroke; check it changed.
    expect(f1).toContain('#111111')
    expect(f2).toContain('#ffffff')
  })
})

describe('resolveFrame + parseGg integration', () => {
  test('[[5, Infinity]] equivalent gg `[5-]` keeps node from frame 5 onward', () => {
    const { def } = parseGg(`icon :base @A1 tabler/user "Base"
icon [5-] :late @B1 tabler/bell "Late"`)
    expect(resolveFrame(def, 4).nodes.map((n) => n.id)).toEqual(['base'])
    expect(resolveFrame(def, 5).nodes.map((n) => n.id).sort()).toEqual(['base', 'late'])
    expect(resolveFrame(def, 100).nodes.map((n) => n.id).sort()).toEqual(['base', 'late'])
  })

  test('auto-position is recomputed per frame', () => {
    // Base declaration has two icons auto-positioned at A1, B1.
    // At frame 2 a new icon appears in the middle — it should slot
    // into position (col=2, row=0) in that frame's declaration order.
    const { def } = parseGg(`doc { cols: 3 }
icon :a tabler/user
icon :b tabler/user
icon [2] :c tabler/user`)
    const f1 = resolveFrame(def, 1)
    const f2 = resolveFrame(def, 2)
    expect(f1.nodes.length).toBe(2)
    expect(f2.nodes.length).toBe(3)
  })
})
