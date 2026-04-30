import { h } from 'preact'
import type { VNode } from 'preact'
import type { NormalizedNodeDef, DiagramTheme } from '../types.js'
import type { GridLayout } from '../geometry/grid.js'
import { gridToPixel, resolveNodeSizeFrac } from '../geometry/grid.js'
import { ERROR_COLOR } from '../geometry/metrics.js'
import { SLOTS, computeCallout, nodeLabelMetrics, type Corner } from '../layout/node-label.js'
import { hFragment } from './svg-fragment.js'
import type { NodeBadge } from '../types.js'
import { resolveColor, NODE_RING_FILL_ALPHA } from './colors.js'
import { ICON_VIEWPORT } from '../constants.js'

const ICON_VIEWBOX = `0 0 ${ICON_VIEWPORT} ${ICON_VIEWPORT}`

export interface NodeProps {
  node: NormalizedNodeDef
  layout: GridLayout
  theme: DiagramTheme
  labelCorner?: Corner
  /** Leader-length tier the placer chose (1/2/3); defaults to 1. */
  labelTier?: number
  labelError?: boolean
  iconError?: boolean
}

export function DiagramNode({ node, layout, theme, labelCorner, labelTier, labelError, iconError }: NodeProps): any {
  const { x, y } = gridToPixel(layout, node.pos)
  const sizeFrac = resolveNodeSizeFrac(node)
  const px = layout.cellSize * sizeFrac
  const half = px / 2
  const color = resolveColor(node.color, theme) ?? theme.primary
  const ringColor = iconError ? ERROR_COLOR : color

  const iconSize = px * 0.62
  const iconHalf = iconSize / 2

  // fill + fill-opacity lets the subtle ring tint work for any color
  // form (named colors, rgb(...), short hex, 6-digit hex).
  const children: any[] = [
    h('circle', {
      cx: x, cy: y, r: half,
      fill: ringColor, 'fill-opacity': NODE_RING_FILL_ALPHA,
      stroke: ringColor, 'stroke-width': 1.5,
    }),
  ]

  if (!iconError && node.text) {
    // Text-in-circle. The geometry is:
    //   1. Compute a per-glyph aspect estimate → text aspect ratio
    //      AR = (maxChars * CHAR_ASPECT) / nLines.
    //   2. Take the largest rectangle of that aspect that's inscribed
    //      in the node circle (W² + H² ≤ px²; W = AR · H).
    //   3. If H exceeds the icon-area height, clamp H = iconSize and
    //      shrink W proportionally (keeping AR) — height never spills
    //      past where a glyph would have sat.
    //   4. Use `textLength` to lock each line's rendered width to its
    //      proportional share of W, so the text actually fits even
    //      when the font's true aspect drifts from the estimate.
    const lines = node.text.split('\n')
    const nLines = lines.length
    const charCounts = lines.map((ln) => Math.max(1, Array.from(ln).length))
    const maxChars = Math.max(...charCounts)
    // Per-glyph em-width estimate for sans-serif bold; digits/letters
    // average ≈ 0.55–0.65. Combined with textLength below, the exact
    // value drives box shape rather than fit.
    const CHAR_ASPECT = 0.6
    const textAR = (maxChars * CHAR_ASPECT) / nLines
    let H = px / Math.sqrt(textAR * textAR + 1)
    if (H > iconSize) H = iconSize
    const W = textAR * H
    const fontSize = H / nLines
    const tspans = lines.map((ln, i) =>
      h('tspan', {
        key: i,
        x,
        y: y - H / 2 + (i + 0.5) * fontSize,
        'dominant-baseline': 'central',
        textLength: W * (charCounts[i] / maxChars),
        lengthAdjust: 'spacingAndGlyphs',
      }, ln),
    )
    children.push(
      h('text', {
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': fontSize,
        'font-family': 'sans-serif',
        'font-weight': 700,
        fill: color,
      }, tspans),
    )
  } else if (!iconError && node.src) {
    // clip:
    //   'square' (default) → overflow: hidden on the ICON_VIEWPORT box
    //   'circle'           → overflow: hidden + clip-path circle inscribed in the square
    //   'none'             → overflow: visible, icon can extend past its cell
    const clip = node.clip ?? 'square'
    const svgAttrs: Record<string, unknown> = {
      x: x - iconHalf, y: y - iconHalf,
      width: iconSize, height: iconSize,
      viewBox: ICON_VIEWBOX,
      overflow: clip === 'none' ? 'visible' : 'hidden',
      color: (node.iconTheme ?? 'theme') === 'native' ? undefined : color,
    }
    if (clip === 'circle') {
      // functional CSS clip-path: a circle inscribed in the icon's box
      svgAttrs['clip-path'] = 'circle(50% at 50% 50%)'
    }
    children.push(hFragment('svg', svgAttrs, node.src))
  }

  // Badges reach the renderer already expanded to concrete NodeBadge
  // entries by Diagram.foldLayers — cast away the wider BadgeSpec.
  for (const [i, badge] of ((node.badges ?? []) as NodeBadge[]).entries()) {
    const position = badge.position ?? 'top-right'
    const badgeFrac = badge.size ?? 0.3
    const badgeDiameter = px * badgeFrac
    const badgeHalf = badgeDiameter / 2
    const dir = {
      'top-right':    { dx:  1, dy: -1 },
      'top-left':     { dx: -1, dy: -1 },
      'bottom-right': { dx:  1, dy:  1 },
      'bottom-left':  { dx: -1, dy:  1 },
    }[position]
    const d = (half - badgeHalf) / Math.SQRT2
    const bx = x + dir.dx * d
    const by = y + dir.dy * d
    const badgeTheme = badge.iconTheme ?? 'native'
    const badgeColor = badgeTheme === 'native' ? undefined : (resolveColor(badge.color, theme) ?? color)
    children.push(
      hFragment('svg', {
        key: `badge-${i}`,
        x: bx - badgeHalf, y: by - badgeHalf,
        width: badgeDiameter, height: badgeDiameter,
        viewBox: ICON_VIEWBOX, overflow: 'visible',
        color: badgeColor,
      }, badge.icon)
    )
  }

  if (node.label && labelCorner) {
    const m = nodeLabelMetrics(node, layout)
    // Multiply the base leaderGap by the tier the placer chose, so a
    // tier-2 / tier-3 winner actually draws at its longer offset.
    const best = computeCallout(x, y, half, SLOTS[labelCorner], m.fs, m.textW, m.textH, m.leaderGap * (labelTier ?? 1))
    const labelColor = labelError ? ERROR_COLOR : color

    children.push(
      h('g', null, [
        h('line', {
          x1: best.edgeX, y1: best.edgeY,
          x2: best.leaderTargetX, y2: best.leaderTargetY,
          stroke: labelColor, 'stroke-width': 1, opacity: 0.7,
        }),
        h('text', {
          x: best.textX, y: best.textY,
          'text-anchor': best.anchor,
          'font-size': m.fs,
          'font-family': 'sans-serif',
          'font-weight': 600,
          fill: labelColor,
        }, node.label),
      ])
    )
  }

  return h('g', null, children)
}
