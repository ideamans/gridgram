import { h } from 'preact'
import type { VNode } from 'preact'
import type { NormalizedConnectorDef, NormalizedNodeDef, DiagramTheme } from '../types.js'
import type { GridLayout } from '../geometry/grid.js'
import type { LabelRect } from '../geometry/collision.js'
import { resolveConnectorPath, type Pixel } from '../geometry/connector-path.js'
import { ERROR_COLOR, fontSize } from '../geometry/metrics.js'
import { resolveColor, isTransparent } from './colors.js'

export interface ConnectorProps {
  connector: NormalizedConnectorDef
  nodes: Map<string, NormalizedNodeDef>
  layout: GridLayout
  theme: DiagramTheme
  /** Retained for compatibility with existing callers; unused now that
   *  the arrow head is rendered inline as a polygon (no SVG marker). */
  markerId?: string
  pixelWaypoints?: Pixel[]
  lineError?: boolean
  labelRect?: LabelRect
  labelError?: boolean
}

/**
 * Build the three points of an arrow-head polygon at `tip`, oriented
 * along `dir` (unit vector pointing the same way the arrow points). The
 * head is `size` long along `dir` and `size * 0.7` wide across.
 */
function arrowHead(tip: Pixel, dir: { x: number; y: number }, size: number): string {
  // Perpendicular to `dir` (rotated 90°). SVG y-down so the sign of
  // perp doesn't matter for symmetry — we offset both ways equally.
  const perpX = -dir.y
  const perpY = dir.x
  const halfW = size * 0.35
  // Back corners sit `size` behind the tip along -dir, ±halfW across perp.
  const baseX = tip.x - dir.x * size
  const baseY = tip.y - dir.y * size
  const leftX  = baseX + perpX * halfW
  const leftY  = baseY + perpY * halfW
  const rightX = baseX - perpX * halfW
  const rightY = baseY - perpY * halfW
  return `${tip.x},${tip.y} ${leftX},${leftY} ${rightX},${rightY}`
}

function unitVector(from: Pixel, to: Pixel): { x: number; y: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return { x: 1, y: 0 }
  return { x: dx / len, y: dy / len }
}

export function Connector({
  connector, nodes, layout, theme,
  pixelWaypoints, lineError, labelRect, labelError,
}: ConnectorProps): any {
  const path = resolveConnectorPath(connector, nodes, layout, pixelWaypoints)
  if (!path) return null

  const baseColor = resolveColor(connector.color, theme) ?? theme.secondary
  const color = lineError ? ERROR_COLOR : baseColor
  const strokeWidth = connector.strokeWidth ?? 1.5
  const arrow = connector.arrow ?? 'end'

  const d = path.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  // Arrow head grows sub-linearly with stroke width — a thicker line
  // doesn't warrant a 5× larger arrow. Default (strokeWidth=1.5) stays
  // at 10; strokeWidth=4 → 12; strokeWidth=8 → 24.
  const arrowSize = Math.max(10, strokeWidth * 3)

  const needsEnd = arrow === 'end' || arrow === 'both'
  const needsStart = arrow === 'start' || arrow === 'both'

  const pts = path.points
  const arrowEls: any[] = []
  // End arrow — points along the last segment.
  if (needsEnd && pts.length >= 2) {
    const tip = pts[pts.length - 1]
    const prev = pts[pts.length - 2]
    const dir = unitVector(prev, tip)
    arrowEls.push(h('polygon', { points: arrowHead(tip, dir, arrowSize), fill: color }))
  }
  // Start arrow — points back along the first segment.
  if (needsStart && pts.length >= 2) {
    const tip = pts[0]
    const next = pts[1]
    const dir = unitVector(next, tip) // away from the path = toward the start cap
    arrowEls.push(h('polygon', { points: arrowHead(tip, dir, arrowSize), fill: color }))
  }

  const pathEl = h('path', {
    d, fill: 'none', stroke: color,
    'stroke-width': strokeWidth,
    'stroke-dasharray': connector.dash,
  })

  let labelEl: VNode | null = null
  if (connector.label && labelRect) {
    const labelColor = labelError ? ERROR_COLOR : baseColor
    const labelFontSize = fontSize(layout, 'connector', connector.labelScale)
    const textX = labelRect.x + labelRect.w / 2
    const textY = labelRect.y + labelRect.h * 0.72

    labelEl = h('g', null, [
      h('rect', {
        x: labelRect.x, y: labelRect.y,
        width: labelRect.w, height: labelRect.h,
        rx: labelRect.h / 2,
        // When the canvas is transparent, fall back to white for the
        // label's backdrop so text stays legible against any backing.
        fill: isTransparent(theme.bg) ? '#ffffff' : theme.bg, opacity: 0.85,
      }),
      h('text', {
        x: textX, y: textY,
        'text-anchor': 'middle',
        'font-size': labelFontSize,
        'font-family': 'sans-serif',
        'font-weight': 500,
        fill: labelColor,
      }, connector.label),
    ])
  }

  return h('g', null, [pathEl, ...arrowEls, labelEl])
}
