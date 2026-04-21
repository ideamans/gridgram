/**
 * .gg DSL — tokenizer + recursive-descent parser (v2, command-first grammar).
 *
 * Grammar (informal BNF):
 *
 *   file        := statement*
 *
 *   statement   := frame-spec? (doc-stmt | icon-stmt | region-stmt |
 *                                note-stmt | connector-stmt)
 *   doc-stmt    := 'doc'    body
 *   icon-stmt   := 'icon'   arg* body?
 *   region-stmt := 'region' arg* body?
 *   note-stmt   := 'note'   arg* body?
 *   connector-stmt := IDENT arrow IDENT arg* body?
 *
 *   # A leading `[frame-spec]` is equivalent to the inline arg form — it
 *   # just lets the frame selector line up in column 1 across a block of
 *   # related statements. Specifying both leading and inline on the same
 *   # statement is a parse error.
 *
 *   arg         := id-sigil | pos | span | label | target-list | frame-spec | attr
 *
 *   id-sigil    := ':' IDENT
 *   pos         := '@' INT ',' INT
 *   span        := '@' INT ',' INT '-' INT ',' INT
 *   label       := '"' ... '"' | "'" ... "'"
 *   target-list := '(' IDENT (',' IDENT)* ')'
 *   frame-spec  := '[' frame-item (',' frame-item)* ']'
 *   frame-item  := INT | INT '-' INT | INT '-'
 *   attr        := IDENT '=' (BARE-WORD | quoted-string)
 *   body        := '{' ... balanced JSON5 ... '}'
 *   arrow       := '-->' | '->' | '<--' | '<->' | '---' | '..>' | '<..' | '<..>' | '...'
 *
 * Statement separator: newline OR ';' at depth 0 (outside body / target-list /
 * frame-spec / strings). Inside a `body` / `target-list` / `frame-spec` /
 * quoted string, newlines are ordinary whitespace, so those forms can span
 * multiple lines.
 *
 * Comments: `#` or `//` to end-of-line, at a whitespace boundary, not inside
 * a string. Inside `body` the JSON5 parser handles its own comments.
 */
import JSON5 from 'json5'
import type { ConnectorDef, DiagramDef, NodeDef, NoteDef, RegionDef, ArrowEnd, FrameSpec } from '../types.js'
import { parseA1 } from '../a1.js'
import { parseGgFrameSpec } from '../frame.js'
import type { GgError } from './errors.js'

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export interface ArrowSpec {
  ends: ArrowEnd
  dashed: boolean
}

export type Token =
  | { type: 'word';         value: string;            line: number }
  | { type: 'id-sigil';     value: string;            line: number }
  | { type: 'pos';          col: number; row: number; line: number }
  | { type: 'span';
      from: { col: number; row: number };
      to:   { col: number; row: number };             line: number }
  | { type: 'label';        value: string;            line: number }
  | { type: 'target-list';  ids: string[];            line: number }
  | { type: 'frame-spec';   spec: FrameSpec;          line: number }
  | { type: 'attr';         key: string; value: string; line: number }
  | { type: 'arrow';        spec: ArrowSpec;          line: number }
  | { type: 'body';         value: Record<string, unknown>; line: number }
  | { type: 'stmt-end';                               line: number }

// Arrow operators (longest-match table).
const ARROW_TABLE: Record<string, ArrowSpec> = {
  '-->':  { ends: 'end',   dashed: false },
  '->':   { ends: 'end',   dashed: false },
  '<--':  { ends: 'start', dashed: false },
  '<->':  { ends: 'both',  dashed: false },
  '---':  { ends: 'none',  dashed: false },
  '..>':  { ends: 'end',   dashed: true  },
  '<..':  { ends: 'start', dashed: true  },
  '<..>': { ends: 'both',  dashed: true  },
  '...':  { ends: 'none',  dashed: true  },
}
const ARROW_KEYS = Object.keys(ARROW_TABLE).sort((a, b) => b.length - a.length)

const IDENT_RE = /^[A-Za-z_][\w-]*/

// ---------------------------------------------------------------------------
// Tokenizer — single pass over the full source, character stream.
// ---------------------------------------------------------------------------

interface Ctx {
  src: string
  pos: number
  line: number   // 1-based
  tokens: Token[]
  errors: GgError[]
}

export function tokenize(src: string): { tokens: Token[]; errors: GgError[] } {
  const ctx: Ctx = { src, pos: 0, line: 1, tokens: [], errors: [] }
  while (ctx.pos < src.length) {
    if (!skipInterTokenSpace(ctx)) break
    if (ctx.pos >= src.length) break
    if (!readOneToken(ctx)) break
  }
  // Emit a trailing stmt-end if the last meaningful token isn't one — makes
  // the parser's loop simpler.
  const last = ctx.tokens[ctx.tokens.length - 1]
  if (last && last.type !== 'stmt-end') {
    ctx.tokens.push({ type: 'stmt-end', line: ctx.line })
  }
  return { tokens: ctx.tokens, errors: ctx.errors }
}

/** Skip spaces, tabs, comments; emit stmt-end for newlines and ';'. */
function skipInterTokenSpace(ctx: Ctx): boolean {
  while (ctx.pos < ctx.src.length) {
    const ch = ctx.src[ctx.pos]
    if (ch === ' ' || ch === '\t' || ch === '\r') { ctx.pos++; continue }
    if (ch === '\n') { emitStmtEnd(ctx); ctx.pos++; ctx.line++; continue }
    if (ch === ';')  { emitStmtEnd(ctx); ctx.pos++; continue }
    // `#` or `//` comment — only when preceded by whitespace or at line start.
    // Our skipInterTokenSpace has already consumed spaces, so any `#`/`//` we
    // see here is at a boundary.
    if (ch === '#' || (ch === '/' && ctx.src[ctx.pos + 1] === '/')) {
      while (ctx.pos < ctx.src.length && ctx.src[ctx.pos] !== '\n') ctx.pos++
      continue
    }
    return true
  }
  return true
}

function emitStmtEnd(ctx: Ctx): void {
  const last = ctx.tokens[ctx.tokens.length - 1]
  if (!last || last.type === 'stmt-end') return  // collapse consecutive ends
  ctx.tokens.push({ type: 'stmt-end', line: ctx.line })
}

function readOneToken(ctx: Ctx): boolean {
  const startLine = ctx.line
  const rest = ctx.src.slice(ctx.pos)
  const ch = rest[0]

  // Quoted label — "..." or '...'
  if (ch === '"' || ch === "'") {
    const r = readString(ctx, ch)
    if (r === null) return false
    ctx.tokens.push({ type: 'label', value: r, line: startLine })
    return true
  }

  // Inline body — { ... } (balanced, JSON5)
  if (ch === '{') {
    const m = readBalanced(ctx, '{', '}')
    if (m === null) return false
    let parsed: unknown
    try { parsed = JSON5.parse(m) }
    catch (e: any) {
      ctx.errors.push({
        message: `Invalid JSON5 in \`{ … }\`: ${e?.message ?? String(e)}`,
        line: startLine, source: 'dsl',
      })
      return false
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ctx.errors.push({ message: 'Inline `{ … }` must be a JSON5 object', line: startLine, source: 'dsl' })
      return false
    }
    ctx.tokens.push({ type: 'body', value: parsed as Record<string, unknown>, line: startLine })
    return true
  }

  // Target list — ( id, id, ... )
  if (ch === '(') {
    const m = readBalanced(ctx, '(', ')')
    if (m === null) return false
    const inner = m.slice(1, -1).trim()
    const ids = inner === ''
      ? []
      : inner.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
    for (const id of ids) {
      if (!IDENT_RE.test(id) || IDENT_RE.exec(id)![0] !== id) {
        ctx.errors.push({ message: `Invalid identifier in target list: "${id}"`, line: startLine, source: 'dsl' })
        return false
      }
    }
    ctx.tokens.push({ type: 'target-list', ids, line: startLine })
    return true
  }

  // Frame selector — [ 2 ], [ 2,3 ], [ 2-5 ], [ 5- ], [ 2, 4-6, 10- ]
  if (ch === '[') {
    const m = readBalanced(ctx, '[', ']')
    if (m === null) return false
    const { spec, error } = parseGgFrameSpec(m.slice(1, -1))
    if (error !== undefined || spec === undefined) {
      ctx.errors.push({ message: error ?? 'Invalid frame spec', line: startLine, source: 'dsl' })
      return false
    }
    ctx.tokens.push({ type: 'frame-spec', spec, line: startLine })
    return true
  }

  // `@` — a cell address. Two forms, both 1-based, with either `:`
  // (Excel-style) or `-` as the range separator:
  //   A1 notation:  @A1               single cell
  //                 @A1:B2 / @A1-B2   rectangular range
  //   numeric:      @1,1              single cell (col, row)
  //                 @1,1:2,2 / @1,1-2,2  range
  // A1 + `:` is the preferred form; all yield the same token. Letters
  // are case-insensitive.
  if (ch === '@') {
    // Try A1 first (letters + digits, optional range separator + letters + digits).
    const a1 = /^@([A-Za-z]+\d+)(?:[:\-]([A-Za-z]+\d+))?/.exec(rest)
    if (a1) {
      ctx.pos += a1[0].length
      let from: { col: number; row: number }
      let to:   { col: number; row: number } | null = null
      try {
        from = parseA1(a1[1])
        if (a1[2] !== undefined) to = parseA1(a1[2])
      } catch (e: any) {
        ctx.errors.push({ message: e?.message ?? String(e), line: startLine, source: 'dsl' })
        return false
      }
      if (to) {
        ctx.tokens.push({ type: 'span', from, to, line: startLine })
      } else {
        ctx.tokens.push({ type: 'pos', col: from.col, row: from.row, line: startLine })
      }
      return true
    }
    // Fallback: numeric `@c,r` / `@c,r:c,r` / `@c,r-c,r` — 1-based.
    const num = /^@(\d+),(\d+)(?:[:\-](\d+),(\d+))?/.exec(rest)
    if (num) {
      const fromCol = +num[1], fromRow = +num[2]
      if (fromCol < 1 || fromRow < 1) {
        ctx.errors.push({
          message: `Cell coordinates are 1-based (A1 = @1,1); got @${fromCol},${fromRow}`,
          line: startLine, source: 'dsl',
        })
        return false
      }
      ctx.pos += num[0].length
      if (num[3] !== undefined) {
        const toCol = +num[3], toRow = +num[4]
        if (toCol < 1 || toRow < 1) {
          ctx.errors.push({
            message: `Cell coordinates are 1-based; got @${fromCol},${fromRow}-${toCol},${toRow}`,
            line: startLine, source: 'dsl',
          })
          return false
        }
        ctx.tokens.push({
          type: 'span',
          from: { col: fromCol, row: fromRow },
          to:   { col: toCol,   row: toRow   },
          line: startLine,
        })
      } else {
        ctx.tokens.push({ type: 'pos', col: fromCol, row: fromRow, line: startLine })
      }
      return true
    }
    ctx.errors.push({
      message: 'Expected `@A1` or `@col,row` after `@`',
      line: startLine, source: 'dsl',
    })
    return false
  }

  // `:` — id sigil `:ident`
  if (ch === ':') {
    const idm = IDENT_RE.exec(rest.slice(1))
    if (!idm) {
      ctx.errors.push({ message: 'Expected identifier after `:`', line: startLine, source: 'dsl' })
      return false
    }
    ctx.pos += 1 + idm[0].length
    ctx.tokens.push({ type: 'id-sigil', value: idm[0], line: startLine })
    return true
  }

  // Arrow (longest match; must be followed by whitespace or EOL to avoid
  // gobbling into an adjacent word).
  for (const k of ARROW_KEYS) {
    if (rest.startsWith(k)) {
      const next = rest[k.length]
      if (next === undefined || /\s/.test(next) || next === ';') {
        ctx.pos += k.length
        ctx.tokens.push({ type: 'arrow', spec: ARROW_TABLE[k], line: startLine })
        return true
      }
    }
  }

  // Attribute — `key=value`. Value may be a quoted string or a bare run of
  // non-whitespace chars (stopping before `{`, `[`, `;`).
  const attrHead = /^([A-Za-z_][\w-]*)=/.exec(rest)
  if (attrHead) {
    const key = attrHead[1]
    ctx.pos += attrHead[0].length
    const afterEq = ctx.src[ctx.pos]
    let value: string
    if (afterEq === '"' || afterEq === "'") {
      const s = readString(ctx, afterEq)
      if (s === null) return false
      value = s
    } else {
      let end = ctx.pos
      while (end < ctx.src.length) {
        const c = ctx.src[end]
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') break
        if (c === ';' || c === '{' || c === '(' || c === '[') break
        end++
      }
      value = ctx.src.slice(ctx.pos, end)
      if (value === '') {
        ctx.errors.push({ message: `Missing value for attr \`${key}=\``, line: startLine, source: 'dsl' })
        return false
      }
      ctx.pos = end
    }
    ctx.tokens.push({ type: 'attr', key, value, line: startLine })
    return true
  }

  // Bare word / identifier (or icon-ref like `tabler/server`, `./foo.svg`).
  // Read until whitespace, `;`, `{`, `(`, `[`, `"`, `'`.
  let end = ctx.pos
  while (end < ctx.src.length) {
    const c = ctx.src[end]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') break
    if (c === ';' || c === '{' || c === '(' || c === '[' || c === '"' || c === "'") break
    end++
  }
  if (end === ctx.pos) {
    ctx.errors.push({ message: `Unexpected character "${ch}"`, line: startLine, source: 'dsl' })
    ctx.pos++  // advance to avoid infinite loop
    return true
  }
  const word = ctx.src.slice(ctx.pos, end)
  ctx.pos = end
  ctx.tokens.push({ type: 'word', value: word, line: startLine })
  return true
}

/** Read a quoted string starting at ctx.src[ctx.pos] (the opening quote). */
function readString(ctx: Ctx, quote: '"' | "'"): string | null {
  ctx.pos++  // consume opening quote
  let out = ''
  while (ctx.pos < ctx.src.length) {
    const ch = ctx.src[ctx.pos]
    if (ch === '\\') {
      const next = ctx.src[ctx.pos + 1]
      if (next === 'n') out += '\n'
      else if (next === 't') out += '\t'
      else if (next === '"') out += '"'
      else if (next === "'") out += "'"
      else if (next === '\\') out += '\\'
      else out += next ?? ''
      ctx.pos += 2
      continue
    }
    if (ch === quote) { ctx.pos++; return out }
    if (ch === '\n') {
      ctx.errors.push({ message: 'Unterminated string literal (newlines must be escaped as \\n)', line: ctx.line, source: 'dsl' })
      return null
    }
    out += ch
    ctx.pos++
  }
  ctx.errors.push({ message: 'Unterminated string literal', line: ctx.line, source: 'dsl' })
  return null
}

/**
 * Read a balanced bracketed region (e.g. `{ … }`, `( … )`, `[ … ]`).
 * Respects strings and nested brackets. Returns the matched text
 * (including outer brackets) and advances ctx.pos past it; or null on
 * unclosed.
 */
function readBalanced(ctx: Ctx, open: '{' | '(' | '[', close: '}' | ')' | ']'): string | null {
  const startLine = ctx.line
  const startPos = ctx.pos
  let depth = 0
  let inStr: '"' | "'" | null = null
  while (ctx.pos < ctx.src.length) {
    const ch = ctx.src[ctx.pos]
    if (inStr) {
      if (ch === '\\') { ctx.pos += 2; continue }
      if (ch === inStr) { inStr = null; ctx.pos++; continue }
      if (ch === '\n') ctx.line++
      ctx.pos++
      continue
    }
    if (ch === '"' || ch === "'") { inStr = ch; ctx.pos++; continue }
    if (ch === '\n') { ctx.line++; ctx.pos++; continue }
    if (ch === open)  { depth++; ctx.pos++; continue }
    if (ch === close) {
      depth--
      ctx.pos++
      if (depth === 0) return ctx.src.slice(startPos, ctx.pos)
      continue
    }
    ctx.pos++
  }
  ctx.errors.push({ message: `Unclosed \`${open} … ${close}\` block`, line: startLine, source: 'dsl' })
  return null
}

// ---------------------------------------------------------------------------
// Parser — consumes the token stream, emits DiagramDef pieces.
// ---------------------------------------------------------------------------

export interface ParseLineResult {
  node?: NodeDef
  region?: RegionDef
  connector?: ConnectorDef
  note?: NoteDef
  /** doc-stmt body merges into the diagram-level settings. */
  doc?: Record<string, unknown>
  /** When the doc statement carried a `[frame-spec]`, this is the
   *  parsed spec — the parser collects such blocks into
   *  `DiagramDef.frameOverrides` instead of folding them into the
   *  base settings. */
  docFrames?: FrameSpec
  error?: GgError
}

export interface ParsedStatements {
  statements: ParseLineResult[]
  errors: GgError[]
}

export function parseStatements(tokens: Token[]): ParsedStatements {
  const statements: ParseLineResult[] = []
  const errors: GgError[] = []
  let i = 0
  while (i < tokens.length) {
    // Skip stray stmt-ends
    if (tokens[i].type === 'stmt-end') { i++; continue }
    // Collect all tokens up to the next stmt-end
    const start = i
    while (i < tokens.length && tokens[i].type !== 'stmt-end') i++
    const stmt = tokens.slice(start, i)
    if (stmt.length === 0) continue
    const result = parseStatement(stmt)
    if (result.error) errors.push(result.error)
    statements.push(result)
  }
  return { statements, errors }
}

function parseStatement(toks: Token[]): ParseLineResult {
  const line = toks[0].line

  // Optional leading `[frame-spec]` — peel it off, dispatch as if it
  // weren't there, then stamp the spec onto whatever def the body
  // produced. This lets authors write
  //
  //     [2] icon :api tabler/server "API" color=accent
  //     [2] user --> api "login"
  //     [2] doc { theme: { primary: '#fff' } }
  //
  // so the frame spec can line up in column 1 across a block of
  // related statements. The inline form (`icon [2] :api …`) still
  // works; supplying both the leading form AND an inline one on the
  // same statement is flagged as an error.
  let leadingFrames: FrameSpec | undefined
  let body: Token[] = toks
  if (body.length > 0 && body[0].type === 'frame-spec') {
    leadingFrames = (body[0] as Extract<Token, { type: 'frame-spec' }>).spec
    body = body.slice(1)
    if (body.length === 0) {
      return { error: { message: 'Leading `[frame-spec]` must be followed by a statement', line, source: 'dsl' } }
    }
  }

  let result: ParseLineResult

  // Connector dispatch: word arrow word ...
  if (body.length >= 3 && body[0].type === 'word' && body[1].type === 'arrow' && body[2].type === 'word') {
    result = parseConnector(body)
  } else if (body[0].type === 'word') {
    // Command dispatch
    const cmd = (body[0] as { value: string }).value
    const rest = body.slice(1)
    switch (cmd) {
      case 'doc':    result = parseDoc(rest, line); break
      case 'icon':   result = parseIcon(rest, line); break
      case 'region': result = parseRegion(rest, line); break
      case 'note':   result = parseNote(rest, line); break
      default:
        return { error: { message: `Unknown statement: \`${cmd}\`. Expected one of: icon, region, note, doc, or \`<id> <arrow> <id>\` connector.`, line, source: 'dsl' } }
    }
  } else {
    return { error: { message: 'Unexpected statement-leading token', line, source: 'dsl' } }
  }

  // Attach the leading frame spec, if any, to whichever carrier the
  // body parser produced. A body that also set its own `frames` via
  // an inline `[N]` is a clash — flag it rather than silently pick
  // one, since the two could specify different frames.
  if (leadingFrames !== undefined && !result.error) {
    const carrier = result.node ?? result.connector ?? result.region ?? result.note
    if (carrier) {
      if (carrier.frames !== undefined) {
        return { error: { message: '`[frame-spec]` specified twice (leading and inline); pick one form', line, source: 'dsl' } }
      }
      carrier.frames = leadingFrames
    } else if (result.doc) {
      if (result.docFrames !== undefined) {
        return { error: { message: '`[frame-spec]` specified twice (leading and inline); pick one form', line, source: 'dsl' } }
      }
      result.docFrames = leadingFrames
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Per-statement parsers.
// ---------------------------------------------------------------------------

function parseDoc(toks: Token[], line: number): ParseLineResult {
  // `doc` takes an optional [frame-spec] and exactly one body.
  const body = toks.find((t) => t.type === 'body')
  if (!body || body.type !== 'body') {
    return { error: { message: '`doc` requires a `{ … }` body', line, source: 'dsl' } }
  }
  let frames: FrameSpec | undefined
  for (const t of toks) {
    if (t === body) continue
    if (t.type === 'frame-spec') {
      if (frames !== undefined) {
        return { error: { message: '`doc` accepts at most one `[frame-spec]`', line, source: 'dsl' } }
      }
      frames = t.spec
      continue
    }
    return { error: { message: `Unexpected argument in \`doc\`: ${describeToken(t)}`, line, source: 'dsl' } }
  }
  return { doc: body.value, docFrames: frames }
}

function parseIcon(toks: Token[], line: number): ParseLineResult {
  const node: NodeDef = { id: '' }
  let body: Record<string, unknown> | undefined
  for (const t of toks) {
    switch (t.type) {
      case 'id-sigil': node.id = t.value; break
      case 'pos': node.pos = { col: t.col, row: t.row }; break
      case 'label': node.label = t.value; break
      case 'frame-spec': node.frames = t.spec; break
      case 'attr': {
        const err = applyNodeAttr(node, t.key, t.value, line); if (err) return { error: err }; break
      }
      case 'body': body = t.value; break
      // Bare word = shorthand for the `src=` asset reference
      // (e.g. `icon :server tabler/server "Server"` == `src=tabler/server`).
      // Later occurrences win, mirroring how attrs behave.
      case 'word': (node as { src?: string }).src = t.value; break
      case 'span':
      case 'target-list':
      case 'arrow':
        return { error: { message: `Unexpected ${describeToken(t)} in \`icon\` statement`, line, source: 'dsl' } }
    }
  }
  if (body) Object.assign(node, body)
  // `:id` is optional. When omitted, parseGg assigns a document-wide
  // auto-id so two anonymous icons can't collide. Icons that need to be
  // referenced (by connectors / notes) must still supply `:id`.
  return { node }
}

function parseRegion(toks: Token[], line: number): ParseLineResult {
  const region: RegionDef = { spans: [], color: '#00000010' }
  let body: Record<string, unknown> | undefined
  for (const t of toks) {
    switch (t.type) {
      case 'pos':  region.spans.push({ from: { col: t.col, row: t.row }, to: { col: t.col, row: t.row } }); break
      case 'span': region.spans.push({ from: t.from, to: t.to }); break
      case 'label': region.label = t.value; break
      case 'frame-spec': region.frames = t.spec; break
      case 'attr': {
        const err = applyRegionAttr(region, t.key, t.value, line); if (err) return { error: err }; break
      }
      case 'body': body = t.value; break
      case 'id-sigil':
      case 'target-list':
      case 'word':
      case 'arrow':
        return { error: { message: `Unexpected ${describeToken(t)} in \`region\` statement`, line, source: 'dsl' } }
    }
  }
  if (body) Object.assign(region, body)
  if (region.spans.length === 0) {
    return { error: { message: '`region` requires at least one `@col,row` or `@col,row-col,row`', line, source: 'dsl' } }
  }
  return { region }
}

function parseNote(toks: Token[], line: number): ParseLineResult {
  const note: Partial<NoteDef> = {}
  let body: Record<string, unknown> | undefined
  for (const t of toks) {
    switch (t.type) {
      case 'pos': note.pos = { col: t.col, row: t.row }; break
      case 'label': note.text = t.value; break
      case 'target-list': note.targets = t.ids; break
      case 'frame-spec': note.frames = t.spec; break
      case 'attr': {
        const err = applyNoteAttr(note, t.key, t.value, line); if (err) return { error: err }; break
      }
      case 'body': body = t.value; break
      case 'span':
      case 'id-sigil':
      case 'word':
      case 'arrow':
        return { error: { message: `Unexpected ${describeToken(t)} in \`note\` statement`, line, source: 'dsl' } }
    }
  }
  if (body) Object.assign(note, body)
  if (!note.pos) return { error: { message: '`note` requires `@col,row`', line, source: 'dsl' } }
  if (note.text === undefined) return { error: { message: '`note` requires a `"text"` string (or `text: "…"` in the body)', line, source: 'dsl' } }
  return { note: note as NoteDef }
}

function parseConnector(toks: Token[]): ParseLineResult {
  const w0 = toks[0] as Extract<Token, { type: 'word' }>
  const ar = toks[1] as Extract<Token, { type: 'arrow' }>
  const w2 = toks[2] as Extract<Token, { type: 'word' }>
  const line = w0.line
  const conn: ConnectorDef = {
    from: w0.value,
    to:   w2.value,
    arrow: ar.spec.ends,
  }
  if (ar.spec.dashed) conn.dash = '6 3'
  let body: Record<string, unknown> | undefined
  for (let i = 3; i < toks.length; i++) {
    const t = toks[i]
    switch (t.type) {
      case 'label': conn.label = t.value; break
      case 'frame-spec': conn.frames = t.spec; break
      case 'attr': {
        const err = applyConnectorAttr(conn, t.key, t.value, line); if (err) return { error: err }; break
      }
      case 'body': body = t.value; break
      default:
        return { error: { message: `Unexpected ${describeToken(t)} in connector statement`, line, source: 'dsl' } }
    }
  }
  if (body) Object.assign(conn, body)
  return { connector: conn }
}

// ---------------------------------------------------------------------------
// Attribute appliers (shared with the old DSL; kept local to this module).
// ---------------------------------------------------------------------------

function applyNodeAttr(node: NodeDef, key: string, value: string, line: number): GgError | null {
  switch (key) {
    case 'src':        node.src = value as any; break
    case 'size':       node.size = Number(value); break
    case 'sizeScale':  node.sizeScale = Number(value); break
    case 'color':      node.color = value; break
    case 'labelScale': node.labelScale = Number(value); break
    case 'iconTheme':
      if (value !== 'theme' && value !== 'native') {
        return { message: `Invalid iconTheme "${value}" (expected "theme" or "native")`, line, source: 'dsl' }
      }
      node.iconTheme = value
      break
    case 'clip':
      if (value !== 'square' && value !== 'circle' && value !== 'none') {
        return { message: `Invalid clip "${value}" (expected "square", "circle", or "none")`, line, source: 'dsl' }
      }
      node.clip = value
      break
    default:
      return { message: `Unknown icon attribute "${key}"`, line, source: 'dsl' }
  }
  return null
}

function applyConnectorAttr(conn: ConnectorDef, key: string, value: string, line: number): GgError | null {
  switch (key) {
    case 'width':      conn.strokeWidth = Number(value); break
    case 'color':      conn.color = value; break
    case 'dash':       conn.dash = value; break
    case 'nodeMargin': conn.nodeMargin = Number(value); break
    case 'labelScale': conn.labelScale = Number(value); break
    case 'id':         conn.id = value; break
    default:
      return { message: `Unknown connector attribute "${key}"`, line, source: 'dsl' }
  }
  return null
}

function applyRegionAttr(region: RegionDef, key: string, value: string, line: number): GgError | null {
  switch (key) {
    case 'color':        region.color = value; break
    case 'radius':       region.borderRadius = Number(value); break
    case 'borderRadius': region.borderRadius = Number(value); break
    case 'labelScale':   region.labelScale = Number(value); break
    default:
      return { message: `Unknown region attribute "${key}"`, line, source: 'dsl' }
  }
  return null
}

function applyNoteAttr(note: Partial<NoteDef>, key: string, value: string, line: number): GgError | null {
  switch (key) {
    case 'color':      note.color = value; break
    case 'bg':         note.bg = value; break
    case 'labelScale': note.labelScale = Number(value); break
    default:
      return { message: `Unknown note attribute "${key}"`, line, source: 'dsl' }
  }
  return null
}

// ---------------------------------------------------------------------------
// Legacy per-line API — kept for existing tests that call parseLine directly.
// Internally re-uses the new tokenizer/parser.
// ---------------------------------------------------------------------------

export function parseLine(text: string, _raw: string, line: number): ParseLineResult {
  const { tokens, errors } = tokenize(text)
  if (errors.length > 0) return { error: { ...errors[0], line } }
  const stripped = tokens.filter((t) => t.type !== 'stmt-end')
  if (stripped.length === 0) return {}
  return parseStatement(stripped)
}

function describeToken(t: Token): string {
  switch (t.type) {
    case 'word':        return `word "${t.value}"`
    case 'id-sigil':    return `id-sigil ":${t.value}"`
    case 'pos':         return `position @${t.col},${t.row}`
    case 'span':        return `span @${t.from.col},${t.from.row}-${t.to.col},${t.to.row}`
    case 'label':       return `label "${t.value}"`
    case 'target-list': return `target-list (${t.ids.join(', ')})`
    case 'frame-spec':  return `frame-spec ${JSON.stringify(t.spec)}`
    case 'attr':        return `attribute ${t.key}=${t.value}`
    case 'arrow':       return `arrow ${t.spec.ends}/${t.spec.dashed ? 'dashed' : 'solid'}`
    case 'body':        return `{ … } body`
    case 'stmt-end':    return `statement terminator`
  }
}

// Legacy re-exports used by the old parser.ts — will go away once parser.ts
// is simplified to the new pipeline below.
export { applyNodeAttr as _applyNodeAttr }
