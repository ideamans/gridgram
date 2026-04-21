import { h } from 'preact'
import type { VNode } from 'preact'
import type { NormalizedConnectorDef, NormalizedNodeDef, DiagramTheme } from '../types'
import type { GridLayout } from '../geometry/grid'
import type { LabelRect } from '../geometry/collision'
import { resolveConnectorPath, type Pixel } from '../geometry/connector-path'
import { ERROR_COLOR, fontSize } from '../geometry/metrics'
import { resolveColor, isTransparent } from './colors'

export interface ConnectorProps {
  connector: NormalizedConnectorDef
  nodes: Map<string, NormalizedNodeDef>
  layout: GridLayout
  theme: DiagramTheme
  markerId: string
  pixelWaypoints?: Pixel[]
  lineError?: boolean
  labelRect?: LabelRect
  labelError?: boolean
}

export function Connector({
  connector, nodes, layout, theme, markerId,
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
  // doesn't warrant a 5× larger arrow. Default (strokeWidth=2) stays
  // at 10; strokeWidth=4 → 12; strokeWidth=8 → 24.
  const arrowSize = Math.max(10, strokeWidth * 3)
  const startMarkerId = `${markerId}-s`
  const endMarkerId = `${markerId}-e`

  const needsEnd = arrow === 'end' || arrow === 'both'
  const needsStart = arrow === 'start' || arrow === 'both'

  const defChildren: any[] = []
  if (needsEnd) {
    defChildren.push(
      h('marker', {
        id: endMarkerId,
        markerWidth: arrowSize, markerHeight: arrowSize * 0.7,
        refX: arrowSize - 1, refY: arrowSize * 0.35,
        orient: 'auto',
      }, h('polygon', {
        points: `0 0, ${arrowSize} ${arrowSize * 0.35}, 0 ${arrowSize * 0.7}`,
        fill: color,
      }))
    )
  }
  if (needsStart) {
    defChildren.push(
      h('marker', {
        id: startMarkerId,
        markerWidth: arrowSize, markerHeight: arrowSize * 0.7,
        refX: 1, refY: arrowSize * 0.35,
        orient: 'auto',
      }, h('polygon', {
        points: `${arrowSize} 0, 0 ${arrowSize * 0.35}, ${arrowSize} ${arrowSize * 0.7}`,
        fill: color,
      }))
    )
  }

  const pathEl = h('path', {
    d, fill: 'none', stroke: color,
    'stroke-width': strokeWidth,
    'stroke-dasharray': connector.dash,
    'marker-end': needsEnd ? `url(#${endMarkerId})` : undefined,
    'marker-start': needsStart ? `url(#${startMarkerId})` : undefined,
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

  return h('g', null, [h('defs', null, defChildren), pathEl, labelEl])
}
