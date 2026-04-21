import { describe, expect, test } from 'bun:test'
import { wrapText, truncateLines, computeNoteLayout } from '../../src/layout/note-layout'
import { computeLayout } from '../../src/geometry/grid'
import type { NoteDef } from '../../src/types'

const layout = computeLayout({
  nodes: [
    { id: 'a', pos: { col: 0, row: 0 } },
    { id: 'b', pos: { col: 3, row: 3 } },
  ],
})

describe('wrapText', () => {
  test('single short line stays as one line', () => {
    const lines = wrapText('hello', 16, 1000)
    expect(lines.length).toBe(1)
    expect(lines[0][0].text).toBe('hello')
    expect(lines[0][0].bold).toBe(false)
  })

  test('explicit \\n forces a break', () => {
    const lines = wrapText('a\nb', 16, 1000)
    expect(lines.length).toBe(2)
    expect(lines[0][0].text).toBe('a')
    expect(lines[1][0].text).toBe('b')
  })

  test('**markers** toggle bold', () => {
    const lines = wrapText('hi **bold** end', 16, 1000)
    expect(lines.length).toBe(1)
    const segs = lines[0]
    // segments grouped by run: 'hi ', 'bold', ' end'
    expect(segs.find((s) => s.text === 'bold' && s.bold)).toBeDefined()
    expect(segs.find((s) => s.text === 'hi ' && !s.bold)).toBeDefined()
  })

  test('wraps when line exceeds maxWidth', () => {
    // Each ascii char is 0.55 * fontSize wide → 12 * 0.55 = 6.6px each
    // maxWidth 30 fits ~4 chars per line
    const lines = wrapText('aaaaaaaa', 12, 30)
    expect(lines.length).toBeGreaterThan(1)
  })

  test('NO_LINE_START char (e.g. 。) hangs onto previous line (ぶら下げ)', () => {
    // Each fullwidth char = 1.05 * 12 = 12.6px. Width 28 fits 2 chars (25.2)
    // and 「。」 would push to 37.8 > 28 → would normally break, but kinsoku
    // forces it to hang on the same line.
    const lines = wrapText('あい。う', 12, 28)
    const first = lines[0].map((s) => s.text).join('')
    expect(first).toBe('あい。')
    expect(lines[1].map((s) => s.text).join('')).toBe('う')
  })
})

describe('truncateLines', () => {
  test('returns input unchanged when within limit', () => {
    const lines = wrapText('a', 12, 1000)
    expect(truncateLines(lines, 5, 12, 1000)).toBe(lines)
  })

  test('appends … to the last kept line when exceeding maxLines', () => {
    const lines = wrapText('a\nb\nc\nd', 12, 1000)
    const truncated = truncateLines(lines, 2, 12, 1000)
    expect(truncated.length).toBe(2)
    const last = truncated[1].map((s) => s.text).join('')
    expect(last.endsWith('…')).toBe(true)
  })
})

describe('computeNoteLayout', () => {
  test('produces a centered rect within the cell', () => {
    const note: NoteDef = { pos: { col: 1, row: 1 }, text: 'hi' }
    const result = computeNoteLayout(note, layout)
    expect(result.rect.w).toBeGreaterThan(0)
    expect(result.rect.h).toBeGreaterThan(0)
    expect(result.lines.length).toBe(1)
    // rect sits inside the cell horizontally
    const cellLeft = layout.offsetX + 1 * layout.cellSize
    const cellRight = cellLeft + layout.cellSize
    expect(result.rect.x).toBeGreaterThanOrEqual(cellLeft)
    expect(result.rect.x + result.rect.w).toBeLessThanOrEqual(cellRight)
  })

  test('respects labelScale by enlarging the font', () => {
    const small: NoteDef = { pos: { col: 0, row: 0 }, text: 'hi', labelScale: 1 }
    const big: NoteDef = { pos: { col: 0, row: 0 }, text: 'hi', labelScale: 2 }
    expect(computeNoteLayout(big, layout).fontSize).toBeCloseTo(
      computeNoteLayout(small, layout).fontSize * 2, 6
    )
  })
})
