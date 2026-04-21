import { describe, expect, test } from 'bun:test'
import { tokenize, parseStatements, parseLine } from '../../src/gg/dsl'

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

describe('tokenize', () => {
  test('icon statement', () => {
    const { tokens, errors } = tokenize('icon :u @1,1 src=tabler/user "User"')
    expect(errors).toEqual([])
    expect(tokens.map((t) => t.type)).toEqual(['word', 'id-sigil', 'pos', 'attr', 'label', 'stmt-end'])
  })

  test('connector with label', () => {
    const { tokens } = tokenize('a --> b "label"')
    expect(tokens.map((t) => t.type)).toEqual(['word', 'arrow', 'word', 'label', 'stmt-end'])
  })

  test('region with single @pos and range', () => {
    const { tokens } = tokenize('region @1,1 @2,1-3,1 "X"')
    expect(tokens.map((t) => t.type)).toEqual(['word', 'pos', 'span', 'label', 'stmt-end'])
  })

  test('range accepts `:` (Excel) and `-` (legacy) separators', () => {
    const colon = tokenize('region @A1:B2 "X"').tokens.find((t) => t.type === 'span') as any
    const dash  = tokenize('region @A1-B2 "X"').tokens.find((t) => t.type === 'span') as any
    expect(colon.from).toEqual({ col: 1, row: 1 })
    expect(colon.to).toEqual({ col: 2, row: 2 })
    expect(dash.from).toEqual(colon.from)
    expect(dash.to).toEqual(colon.to)
  })

  test('numeric range accepts both separators', () => {
    const colon = tokenize('region @1,1:2,2 "X"').tokens.find((t) => t.type === 'span') as any
    const dash  = tokenize('region @1,1-2,2 "X"').tokens.find((t) => t.type === 'span') as any
    expect(colon.from).toEqual(dash.from)
    expect(colon.to).toEqual(dash.to)
  })

  test('target-list', () => {
    const { tokens } = tokenize('note @2,1 (api, db) "text"')
    const tl = tokens.find((t) => t.type === 'target-list') as any
    expect(tl.ids).toEqual(['api', 'db'])
  })

  test('arrow longest-match: <..> beats <..', () => {
    const { tokens } = tokenize('a <..> b')
    const arrow = tokens.find((t) => t.type === 'arrow') as any
    expect(arrow.spec.ends).toBe('both')
    expect(arrow.spec.dashed).toBe(true)
  })

  test('quoted attribute value', () => {
    const { tokens } = tokenize('a --> b dash="6 3"')
    const dashAttr = tokens.find((t) => t.type === 'attr' && (t as any).key === 'dash') as any
    expect(dashAttr.value).toBe('6 3')
  })

  test('escape sequences in strings', () => {
    const { tokens } = tokenize('a --> b "line1\\nline2 \\"q\\""')
    const s = tokens.find((t) => t.type === 'label') as any
    expect(s.value).toBe('line1\nline2 "q"')
  })

  test('unterminated string surfaces an error', () => {
    const { errors } = tokenize('a --> b "unclosed')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].message).toMatch(/Unterminated string/)
  })

  test('multi-line body { … } is allowed', () => {
    const src = 'icon :n @1,1 src=tabler/user "N" {\n  badges: ["check"],\n  color: "accent/60",\n}'
    const { tokens, errors } = tokenize(src)
    expect(errors).toEqual([])
    const body = tokens.find((t) => t.type === 'body') as any
    expect(body.value).toEqual({ badges: ['check'], color: 'accent/60' })
  })

  test('multi-line target-list is allowed', () => {
    const { tokens } = tokenize('note @1,1 (\n  a,\n  b,\n) "text"')
    const tl = tokens.find((t) => t.type === 'target-list') as any
    expect(tl.ids).toEqual(['a', 'b'])
  })

  test('`#` comment is stripped (outside string)', () => {
    const { tokens } = tokenize('icon :a @1,1 # a comment\nicon :b @2,1')
    // two statements → two stmt-ends (trailing) + two 'word' 'id-sigil' 'pos' triples
    const types = tokens.map((t) => t.type)
    expect(types.filter((t) => t === 'stmt-end').length).toBe(2)
    expect(types.filter((t) => t === 'word').length).toBe(2)
  })

  test('`;` separates statements on one line', () => {
    const { tokens } = tokenize('icon :a @1,1; icon :b @2,1')
    const types = tokens.map((t) => t.type)
    expect(types.filter((t) => t === 'stmt-end').length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Parser: per-statement
// ---------------------------------------------------------------------------

describe('parseLine: icon', () => {
  test('minimal icon', () => {
    const { node, error } = parseLine('icon :a @2,3', 'icon :a @2,3', 1)
    expect(error).toBeUndefined()
    expect(node).toMatchObject({ id: 'a', pos: { col: 2, row: 3 } })
  })

  test('bare word after keyword is the src shorthand', () => {
    // `icon :server tabler/user "Server"` == `src=tabler/user`
    const { node } = parseLine('icon :server @A1 tabler/user "Server"', '', 1)
    expect(node).toMatchObject({ id: 'server', src: 'tabler/user', label: 'Server' })
  })

  test('bare word is equivalent to src= attribute', () => {
    const a = parseLine('icon :x tabler/user', '', 1).node
    const b = parseLine('icon :x src=tabler/user', '', 1).node
    expect(a).toMatchObject({ id: 'x', src: 'tabler/user' })
    expect(b).toMatchObject({ id: 'x', src: 'tabler/user' })
  })

  test('explicit src= beats earlier bare word (later wins)', () => {
    const { node } = parseLine('icon :x tabler/user src=tabler/server', '', 1)
    expect((node as any).src).toBe('tabler/server')
  })

  test('body { src: … } beats bare + attr (body applied last)', () => {
    const { node } = parseLine('icon :x tabler/user src=tabler/server { src: "tabler/bolt" }', '', 1)
    expect((node as any).src).toBe('tabler/bolt')
  })

  test('icon with src, label, and attrs', () => {
    const { node } = parseLine(
      'icon :web @2,1 src=server "Web" color=#aabbcc size=0.6',
      '', 1,
    )
    expect(node).toMatchObject({
      id: 'web', pos: { col: 2, row: 1 }, src: 'server', label: 'Web',
      color: '#aabbcc', size: 0.6,
    })
  })

  test('icon without @pos parses successfully — pos is auto-assigned later', () => {
    const { node, error } = parseLine('icon :a src=user "A"', '', 1)
    expect(error).toBeUndefined()
    expect(node).toMatchObject({ id: 'a', src: 'user', label: 'A' })
    expect(node?.pos).toBeUndefined()
  })

  test('icon with only :id parses', () => {
    const { node, error } = parseLine('icon :justid', '', 1)
    expect(error).toBeUndefined()
    expect(node).toMatchObject({ id: 'justid' })
  })

  test('icon without :id parses (id is auto-assigned at parseGg level)', () => {
    const { node, error } = parseLine('icon @1,1 src=user', '', 1)
    expect(error).toBeUndefined()
    expect(node?.id).toBe('')   // parseLine leaves id blank; parseGg fills it
    expect(node?.src).toBe('user')
  })

  test('unknown attr key is an error', () => {
    const { error } = parseLine('icon :a @1,1 src=server "S" foo=bar', '', 5)
    expect(error?.message).toMatch(/Unknown icon attribute "foo"/)
  })

  test('iconTheme accepts theme/native, rejects others', () => {
    expect(parseLine('icon :a @1,1 src=user "U" iconTheme=theme', '', 1).error).toBeUndefined()
    expect(parseLine('icon :a @1,1 src=user "U" iconTheme=native', '', 1).error).toBeUndefined()
    expect(parseLine('icon :a @1,1 src=user "U" iconTheme=other', '', 1).error?.message)
      .toMatch(/Invalid iconTheme/)
  })

  test('argument order is free', () => {
    const { node } = parseLine('icon "Web" @2,1 src=tabler/server :web', '', 1)
    expect(node).toMatchObject({ id: 'web', pos: { col: 2, row: 1 }, src: 'tabler/server', label: 'Web' })
  })

  test('inline { … } body merges fields', () => {
    const { node } = parseLine(
      'icon :n @1,1 src=tabler/user "N" { badges: ["check"], color: "accent/60" }',
      '', 1,
    )
    expect(node).toMatchObject({
      id: 'n',
      pos: { col: 1, row: 1 },
      src: 'tabler/user',
      label: 'N',
      badges: ['check'],
      color: 'accent/60',
    })
  })

  test('attr + body can coexist (body wins on collision)', () => {
    const { node } = parseLine('icon :n @1,1 color=primary { color: "accent/40" }', '', 1)
    expect((node as any).color).toBe('accent/40')
  })
})

describe('parseLine: region', () => {
  test('single range', () => {
    const { region } = parseLine('region @1,1-2,2 "Z" color=#fff', '', 1)
    expect(region).toMatchObject({
      spans: [{ from: { col: 1, row: 1 }, to: { col: 2, row: 2 } }],
      label: 'Z', color: '#fff',
    })
  })

  test('single @pos = 1x1 region', () => {
    const { region } = parseLine('region @3,2 "one-cell"', '', 1)
    expect(region?.spans).toEqual([{ from: { col: 3, row: 2 }, to: { col: 3, row: 2 } }])
  })

  test('multiple @ entries (mixed pos + range)', () => {
    const { region } = parseLine('region @1,1-1,3 @1,3-4,3 "L"', '', 1)
    expect(region?.spans.length).toBe(2)
  })

  test('region without any @ is an error', () => {
    const { error } = parseLine('region "X"', 'region "X"', 7)
    expect(error?.message).toMatch(/at least one `@col,row`/)
  })

  test('inline { … } body merges fields', () => {
    const { region } = parseLine('region @1,1-3,1 "Top" { color: "accent/12", borderRadius: 8 }', '', 1)
    expect(region).toMatchObject({ color: 'accent/12', borderRadius: 8 })
  })
})

describe('parseLine: note', () => {
  test('note with pos, targets, and text', () => {
    const { note } = parseLine('note @2,1 (api) "Stateless"', '', 1)
    expect(note).toMatchObject({ pos: { col: 2, row: 1 }, targets: ['api'], text: 'Stateless' })
  })

  test('note without targets is allowed', () => {
    const { note, error } = parseLine('note @1,1 "standalone"', '', 1)
    expect(error).toBeUndefined()
    expect(note?.targets).toBeUndefined()
  })

  test('note without pos is an error', () => {
    const { error } = parseLine('note "missing pos"', '', 1)
    expect(error?.message).toMatch(/`@col,row`/)
  })

  test('note without text is an error', () => {
    const { error } = parseLine('note @1,1 (a)', '', 1)
    expect(error?.message).toMatch(/text/)
  })

  test('color attribute on note', () => {
    const { note } = parseLine('note @1,1 (a) "txt" color=#b45309', '', 1)
    expect(note?.color).toBe('#b45309')
  })
})

describe('parseLine: connector', () => {
  test('basic --> with label', () => {
    const { connector } = parseLine('a --> b "Hi"', '', 1)
    expect(connector).toMatchObject({ from: 'a', to: 'b', arrow: 'end', label: 'Hi' })
  })

  test('<-> picks both arrows', () => {
    const { connector } = parseLine('a <-> b', '', 1)
    expect(connector?.arrow).toBe('both')
  })

  test('..> sets dash', () => {
    const { connector } = parseLine('a ..> b', '', 1)
    expect(connector?.arrow).toBe('end')
    expect(connector?.dash).toBe('6 3')
  })

  test('attrs on connector', () => {
    const { connector } = parseLine('a --> b "X" width=2 color=#999 dash="6 3"', '', 1)
    expect(connector).toMatchObject({ strokeWidth: 2, color: '#999', dash: '6 3' })
  })

  test('unknown connector attr is an error', () => {
    const { error } = parseLine('a --> b nope=1', '', 1)
    expect(error?.message).toMatch(/Unknown connector attribute "nope"/)
  })

  test('inline { … } body sets waypoints', () => {
    const { connector } = parseLine(
      'a --> b "x" { waypoints: [{ col: 2.5, row: 1 }], strokeWidth: 3 }',
      '', 1,
    )
    expect(connector).toMatchObject({
      from: 'a', to: 'b',
      waypoints: [{ col: 2.5, row: 1 }],
      strokeWidth: 3,
    })
  })
})

describe('parseLine: doc', () => {
  test('doc body merges scalars', () => {
    const { doc, error } = parseLine('doc { cols: 3, rows: 2 }', '', 1)
    expect(error).toBeUndefined()
    expect(doc).toEqual({ cols: 3, rows: 2 })
  })

  test('doc without body is an error', () => {
    const { error } = parseLine('doc', '', 1)
    expect(error?.message).toMatch(/requires a `\{ … \}` body/)
  })
})

describe('parseStatements: whole file', () => {
  test('multi-statement source', () => {
    const { tokens } = tokenize(
      'doc { cols: 2 }\n' +
      'icon :a @1,1 src=tabler/user "A"\n' +
      'icon :b @2,1 src=tabler/user "B"\n' +
      'a --> b "x"',
    )
    const { statements, errors } = parseStatements(tokens)
    expect(errors).toEqual([])
    expect(statements.length).toBe(4)
    expect(statements[0].doc).toBeDefined()
    expect(statements[1].node).toBeDefined()
    expect(statements[3].connector).toBeDefined()
  })

  test('unknown command is an error', () => {
    const { tokens } = tokenize('widget :x @1,1')
    const { statements } = parseStatements(tokens)
    expect(statements[0].error?.message).toMatch(/Unknown statement: `widget`/)
  })
})
