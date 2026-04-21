import { describe, expect, test } from 'bun:test'
import { parseGg } from '../../src/gg/parser'

describe('parseGg: end-to-end', () => {
  test('full example parses without errors', () => {
    const src = `
doc {
  cols: 4, rows: 3,
  theme: { primary: "#1e3a5f", secondary: "#3b5a80", accent: "#e8792f", text: "#000", bg: "#fff" },
}

icon :u    @1,2 src=user   "User"
icon :gate @2,2 src=lock   "Auth"
icon :web  @3,1 src=server "Web"
icon :api  @3,3 src=server "API" color=#e8792f
icon :db   @4,2 src=db     "Postgres"

region @3,1-4,3 "Application" color=#eef8ff

u    --> gate "login"
gate --> web  "session"
gate --> api  "token"
web  <-> api  "RPC" width=2
web  --> db   "read"
`
    const { def, errors } = parseGg(src)
    expect(errors).toEqual([])
    expect(def.nodes.length).toBe(5)
    expect(def.connectors?.length).toBe(5)
    expect(def.regions?.length).toBe(1)
    expect(def.columns).toBe(4)
    expect(def.rows).toBe(3)
  })

  test('multiple doc blocks deep-merge (later wins)', () => {
    const src = `
doc { cols: 4, theme: { primary: "#aaa" } }
doc { theme: { secondary: "#bbb" } }
icon :n @1,1 src=user
`
    const { def, errors } = parseGg(src)
    expect(errors).toEqual([])
    expect((def.theme as any).primary).toBe('#aaa')
    expect((def.theme as any).secondary).toBe('#bbb')
  })

  test('icons map from doc { } is returned as a separate field', () => {
    const src = `
doc { icons: { foo: "./foo.svg" } }
icon :n @1,1 src=foo
`
    const { icons } = parseGg(src)
    expect(icons).toEqual({ foo: './foo.svg' })
  })

  test('mixed DSL + doc.nodes arrays concat', () => {
    const src = `
icon :n1 @1,1 src=user
doc {
  nodes: [
    { id: "n2", pos: { col: 2, row: 1 }, src: "server" }
  ]
}
`
    const { def, errors } = parseGg(src)
    expect(errors).toEqual([])
    expect(def.nodes.map((n) => n.id).sort()).toEqual(['n1', 'n2'])
  })

  test('cols alias maps to columns', () => {
    const { def } = parseGg('doc { cols: 2 }\nicon :n @1,1 src=user')
    expect(def.columns).toBe(2)
  })

  test('cellSize in doc is honored', () => {
    const { def } = parseGg('doc { cellSize: 128 }\nicon :n @1,1 src=user')
    expect(def.cellSize).toBe(128)
  })

  test('columns / rows not specified → inferred from positions', () => {
    const { def } = parseGg('icon :a @1,1\nicon :b @6,3')
    expect(def.columns).toBeUndefined() // parser doesn't force; layout infers
  })
})

describe('parseGg: error reporting', () => {
  test('duplicate node id is reported', () => {
    const src = `icon :n1 @1,1 src=user\nicon :n1 @2,1 src=user`
    const { errors } = parseGg(src)
    const dup = errors.find((e) => e.message.includes('Duplicate node id'))
    expect(dup).toBeDefined()
  })

  test('connector references unknown node', () => {
    const src = `icon :n1 @1,1 src=user\nn1 --> ghost`
    const { errors } = parseGg(src)
    const refErr = errors.find((e) => e.message.includes('unknown target node'))
    expect(refErr).toBeDefined()
    expect(refErr?.source).toBe('check')
  })

  test('region span out of bounds — message uses 1-based A1 coords', () => {
    const src = `doc { cols: 2, rows: 2 }\nicon :n @1,1 src=user\nregion @1,1-10,10 "huge"`
    const { errors } = parseGg(src)
    const oob = errors.find((e) => e.message.includes('out of bounds'))
    expect(oob).toBeDefined()
    // Span written as A1-J10; canvas max A1-B2 (cols=2, rows=2)
    expect(oob!.message).toContain('A1-J10')
    expect(oob!.message).toContain('A1-B2')
  })

  test('disjoint region spans (4-connectivity violation) — message uses A1 coords', () => {
    const src = `icon :n @1,1 src=user\nicon :n2 @4,4 src=user\nregion @1,1 @3,3 "Bad"`
    const { errors } = parseGg(src)
    const dis = errors.find((e) => e.message.includes('disjoint'))
    expect(dis).toBeDefined()
    // Both single-cell spans rendered as A1-A1 and C3-C3
    expect(dis!.message).toContain('A1-A1')
    expect(dis!.message).toContain('C3-C3')
  })

  test('invalid JSON5 in doc body surfaces an error', () => {
    const src = `doc { cols: 4, : }\nicon :n @1,1 src=user`
    const { errors } = parseGg(src)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].message).toMatch(/Invalid JSON5/)
  })

  test('unknown statement keyword is an error', () => {
    const src = `widget :n @1,1`
    const { errors } = parseGg(src)
    const w = errors.find((e) => e.message.includes('widget'))
    expect(w).toBeDefined()
  })
})
