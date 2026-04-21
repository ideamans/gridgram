import { h } from 'preact'
import type { NoteDef, DiagramTheme } from '../types.js'
import type { GridLayout } from '../geometry/grid.js'
import { computeNoteLayout, computeNoteLeaders, type LeaderTarget } from '../layout/note-layout.js'
import { resolveColor } from './colors.js'

export interface NoteProps {
  note: NoteDef
  layout: GridLayout
  theme: DiagramTheme
  targets: LeaderTarget[]
}

export function Note({ note, layout, theme, targets }: NoteProps): any {
  const noteLayout = computeNoteLayout(note, layout)
  const { rect, lines, fontSize, lineHeight, innerPad, cornerRadius } = noteLayout
  const color = resolveColor(note.color, theme) ?? theme.text
  const bg = resolveColor(note.bg, theme) ?? '#ffffff'

  const leaders = computeNoteLeaders(rect, targets)

  const firstBaselineY = rect.y + innerPad + fontSize * 0.9
  const textCenterX = rect.x + rect.w / 2

  const leaderEls = leaders.map((l, i) =>
    h('line', {
      key: `leader-${i}`,
      x1: l.start.x, y1: l.start.y,
      x2: l.end.x, y2: l.end.y,
      stroke: color, 'stroke-width': 1.2, opacity: 0.55,
      'stroke-dasharray': '1 3',
      'stroke-linecap': 'round',
    })
  )

  const bodyEl = h('rect', {
    x: rect.x, y: rect.y,
    width: rect.w, height: rect.h,
    rx: cornerRadius, ry: cornerRadius,
    fill: bg, stroke: color, 'stroke-width': 1.2,
  })

  const lineEls = lines.map((line, i) =>
    h(
      'text',
      {
        key: `ln-${i}`,
        x: textCenterX,
        y: firstBaselineY + i * lineHeight,
        'text-anchor': 'middle',
        'font-size': fontSize,
        'font-family': 'sans-serif',
        fill: color,
      },
      line.map((seg, j) => h('tspan', { key: j, 'font-weight': seg.bold ? 700 : 400 }, seg.text))
    )
  )

  return h('g', null, [...leaderEls, bodyEl, ...lineEls])
}
