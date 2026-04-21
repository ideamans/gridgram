/**
 * Pure layout for note bodies: tokenization, kinsoku-aware wrapping,
 * truncation, and final rect/font metrics. The Note component consumes
 * a NoteLayout and only renders SVG.
 */
import type { NoteDef } from '../types.js'
import type { GridLayout } from '../geometry/grid.js'
import type { LabelRect } from '../geometry/collision.js'
import { fontSize as kindFontSize } from '../geometry/metrics.js'

export interface LineSegment {
  text: string
  bold: boolean
}
export type NoteLine = LineSegment[]

export interface NoteLayout {
  /** Pixel rect of the note body */
  rect: LabelRect
  /** Wrapped (and possibly truncated) lines; each line is a list of styled segments */
  lines: NoteLine[]
  fontSize: number
  lineHeight: number
  innerPad: number
  cornerRadius: number
}

// ---------------------------------------------------------------------------
// Character metrics & kinsoku tables
// ---------------------------------------------------------------------------

function charApproxWidth(ch: string, fontSize: number): number {
  const code = ch.charCodeAt(0)
  if (code < 128) return fontSize * 0.55
  if (code >= 0xff61 && code <= 0xff9f) return fontSize * 0.55 // halfwidth katakana
  return fontSize * 1.05
}

function charDrawWidth(ch: string, fontSize: number, bold: boolean): number {
  // Bold glyphs render slightly wider in most sans-serif faces
  return charApproxWidth(ch, fontSize) * (bold ? 1.05 : 1)
}

/** Chars forbidden at the start of a line (行頭禁則) */
const NO_LINE_START = new Set(
  '。、，．：；！？）〕〉》】」』ー・…‥%％'.split('').concat([')', ']', '}', ',', '.', '!', '?', ':', ';'])
)

/** Chars forbidden at the end of a line (行末禁則) */
const NO_LINE_END = new Set(
  '（〔〈《【「『'.split('').concat(['(', '[', '{'])
)

// ---------------------------------------------------------------------------
// Tokenizing **bold** and \n
// ---------------------------------------------------------------------------

interface TypedChar {
  ch: string
  bold: boolean
  isBreak?: boolean
}

/** Tokenize raw text: `**…**` toggles bold, `\n` is an explicit break. */
function tokenize(text: string): TypedChar[] {
  const tokens: TypedChar[] = []
  let bold = false
  let i = 0
  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      bold = !bold
      i += 2
      continue
    }
    if (text[i] === '\n') {
      tokens.push({ ch: '\n', bold, isBreak: true })
      i++
      continue
    }
    tokens.push({ ch: text[i], bold })
    i++
  }
  return tokens
}

function groupSegments(chars: TypedChar[]): NoteLine {
  const line: NoteLine = []
  for (const t of chars) {
    const last = line[line.length - 1]
    if (last && last.bold === t.bold) last.text += t.ch
    else line.push({ text: t.ch, bold: t.bold })
  }
  return line
}

function measureLine(line: NoteLine, fontSize: number): number {
  let w = 0
  for (const seg of line) {
    for (const ch of seg.text) w += charDrawWidth(ch, fontSize, seg.bold)
  }
  return w
}

// ---------------------------------------------------------------------------
// Wrapping with 禁則処理
// ---------------------------------------------------------------------------

/**
 * Character-wise wrap with 禁則処理 (kinsoku) and **bold** support:
 *   - NO_LINE_START chars never begin a line; we extend the current line (ぶら下げ).
 *   - NO_LINE_END chars never end a line; the break is deferred.
 */
export function wrapText(text: string, fontSize: number, maxWidth: number): NoteLine[] {
  const tokens = tokenize(text)
  const lines: NoteLine[] = []
  let current: TypedChar[] = []
  let currentW = 0

  const flush = () => {
    lines.push(groupSegments(current))
    current = []
    currentW = 0
  }

  for (const t of tokens) {
    if (t.isBreak) {
      flush()
      continue
    }
    const w = charDrawWidth(t.ch, fontSize, t.bold)
    const overflows = currentW + w > maxWidth && current.length > 0
    if (overflows) {
      const lastCh = current[current.length - 1].ch
      const kinsoku = NO_LINE_START.has(t.ch) || NO_LINE_END.has(lastCh)
      if (kinsoku) {
        current.push(t)
        currentW += w
        continue
      }
      flush()
      current.push(t)
      currentW = w
    } else {
      current.push(t)
      currentW += w
    }
  }
  if (current.length > 0 || lines.length === 0) flush()
  return lines
}

/** Keep at most `maxLines`, appending a `…` to the last retained line. */
export function truncateLines(lines: NoteLine[], maxLines: number, fontSize: number, maxWidth: number): NoteLine[] {
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  const lastLine = kept[maxLines - 1]

  // Flatten to TypedChar[] so we can trim char-by-char
  const chars: TypedChar[] = []
  for (const seg of lastLine) {
    for (const ch of seg.text) chars.push({ ch, bold: seg.bold })
  }
  const ellipsisW = charApproxWidth('…', fontSize)

  let acc: TypedChar[] = []
  let accW = 0
  for (const t of chars) {
    const w = charDrawWidth(t.ch, fontSize, t.bold)
    if (accW + w + ellipsisW > maxWidth) break
    acc.push(t)
    accW += w
  }
  // Trim trailing whitespace before ellipsis
  while (acc.length > 0 && /\s/.test(acc[acc.length - 1].ch)) acc.pop()
  acc.push({ ch: '…', bold: false })
  kept[maxLines - 1] = groupSegments(acc)
  return kept
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Compute the note body layout (rect, wrapped lines, font metrics).
 * Width stretches with text up to the cell interior width; height stretches
 * with line count up to the cell interior height (excess is ellipsized).
 */
export function computeNoteLayout(note: NoteDef, layout: GridLayout): NoteLayout {
  const cellGap = layout.cellSize * 0.08
  const innerPad = layout.cellSize * 0.06

  const fontSize = kindFontSize(layout, 'note', note.labelScale)
  const lineHeight = fontSize * 1.35
  const cornerRadius = Math.max(fontSize * 0.6, 6)

  // note.pos is already a canonical 0-based GridPos after normalizeNotes.
  const pos = note.pos as { col: number; row: number }
  const cellX = layout.offsetX + pos.col * layout.cellSize
  const cellY = layout.offsetY + pos.row * layout.cellSize
  const cellInnerW = layout.cellSize - 2 * cellGap
  const cellInnerH = layout.cellSize - 2 * cellGap

  const maxTextW = cellInnerW - 2 * innerPad
  const maxTextH = cellInnerH - 2 * innerPad
  const maxLines = Math.max(1, Math.floor(maxTextH / lineHeight))

  let lines = wrapText(note.text, fontSize, maxTextW)
  if (lines.length > maxLines) lines = truncateLines(lines, maxLines, fontSize, maxTextW)

  let actualMaxW = 0
  for (const line of lines) {
    const w = measureLine(line, fontSize)
    if (w > actualMaxW) actualMaxW = w
  }

  const rectW = Math.min(actualMaxW + 2 * innerPad, cellInnerW)
  const rectH = Math.min(lines.length * lineHeight + 2 * innerPad, cellInnerH)

  const rectX = cellX + (layout.cellSize - rectW) / 2
  const rectY = cellY + (layout.cellSize - rectH) / 2

  return {
    rect: { x: rectX, y: rectY, w: rectW, h: rectH },
    lines,
    fontSize,
    lineHeight,
    innerPad,
    cornerRadius,
  }
}

// ---------------------------------------------------------------------------
// Leader lines — shared between the Note renderer and the pipeline's
// label-collision pass (so labels can avoid the note's leaders too).
// ---------------------------------------------------------------------------

/**
 * A single endpoint a note's leader line wants to reach.
 *
 * Shared by the Note renderer (draws the leader) and the pipeline's
 * label-collision pass (so labels on nodes/connectors avoid sitting
 * on top of leaders). Kept next to `computeNoteLeaders` since that's
 * the function that consumes and produces these.
 */
export interface LeaderTarget {
  /** The pixel point the leader aims at (usually a node centre or a connector midpoint). */
  aim: { x: number; y: number }
  /** Distance before reaching `aim` where the leader terminates (e.g. node radius). */
  stopRadius: number
}

export interface NoteLeader {
  start: { x: number; y: number }
  end:   { x: number; y: number }
}

/** Closest point on the rectangle's edge to a target point (in pixel space). */
export function rectEdgeTowards(
  rect: LabelRect,
  target: { x: number; y: number },
): { x: number; y: number } {
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const dx = target.x - cx
  const dy = target.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const halfW = rect.w / 2
  const halfH = rect.h / 2
  const tX = dx !== 0 ? halfW / Math.abs(dx) : Infinity
  const tY = dy !== 0 ? halfH / Math.abs(dy) : Infinity
  const t = Math.min(tX, tY, 1)
  return { x: cx + dx * t, y: cy + dy * t }
}

/**
 * Compute the leader-line segments from a note body to each of its
 * targets, stopping `target.stopRadius` short of the aim point so
 * lines visually "arrive at" the target instead of driving into it.
 */
export function computeNoteLeaders(
  noteRect: LabelRect,
  targets: LeaderTarget[],
): NoteLeader[] {
  return targets.map((t) => {
    const start = rectEdgeTowards(noteRect, t.aim)
    const dx = t.aim.x - start.x
    const dy = t.aim.y - start.y
    const len = Math.hypot(dx, dy)
    if (len === 0) return { start, end: start }
    const endLen = Math.max(0, len - t.stopRadius)
    const ratio = endLen / len
    return {
      start,
      end: { x: start.x + dx * ratio, y: start.y + dy * ratio },
    }
  })
}
