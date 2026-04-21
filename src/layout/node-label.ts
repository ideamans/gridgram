/**
 * Pure layout for node labels.
 *
 * Generates the callout slot geometry (corner, leader line endpoints,
 * text anchor) and the placed label rect. The render component consumes
 * a `Corner` from `computeNodeLabelRect` and re-runs `computeCallout`
 * to get the leader line + text positions.
 *
 * Kept React-free so it can be tested without a renderer.
 */
import type { NormalizedNodeDef } from '../types.js'
import type { GridLayout } from '../geometry/grid.js'
import { gridToPixel, resolveNodeSizeFrac } from '../geometry/grid.js'
import type { LabelRect, LineSeg, CanvasBounds, Circle } from '../geometry/collision.js'
import { fontSize } from '../geometry/metrics.js'
import { placeLabel, type SlotCandidate, type AttemptRecord } from '../geometry/label-placer.js'

export type Corner =
  | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'
  | 'top-center' | 'bottom-center'

export interface CalloutSlot {
  dx: number
  dy: number
  anchor: 'start' | 'middle' | 'end'
}

export const SLOTS: Record<Corner, CalloutSlot> = {
  'top-right':     { dx:  1, dy: -1, anchor: 'start'  },
  'bottom-right':  { dx:  1, dy:  1, anchor: 'start'  },
  'bottom-left':   { dx: -1, dy:  1, anchor: 'end'    },
  'top-left':      { dx: -1, dy: -1, anchor: 'end'    },
  'top-center':    { dx:  0, dy: -1, anchor: 'middle' },
  'bottom-center': { dx:  0, dy:  1, anchor: 'middle' },
}

/**
 * Candidate order. The 4 diagonal corners remain primary (tried first, CW
 * starting from TR). TC/BC are fallbacks used only when no corner fits.
 */
export const CORNER_ORDER: Corner[] = [
  'top-right', 'bottom-right', 'bottom-left', 'top-left',
  'top-center', 'bottom-center',
]

export interface CalloutGeometry {
  labelRect: LabelRect
  edgeX: number
  edgeY: number
  textX: number
  textY: number
  leaderTargetX: number
  leaderTargetY: number
  anchor: 'start' | 'middle' | 'end'
}

export function computeCallout(
  x: number, y: number, half: number,
  slot: CalloutSlot, fontSize: number, textW: number, textH: number,
  leaderGap: number
): CalloutGeometry {
  const inv2 = 1 / Math.SQRT2
  const isVertical = slot.dx === 0

  // Text anchor point
  let textX: number
  if (slot.anchor === 'start') textX = x + (half + leaderGap) * inv2
  else if (slot.anchor === 'end') textX = x - (half + leaderGap) * inv2
  else textX = x

  const textY = isVertical
    ? (slot.dy < 0
        ? y - half - leaderGap - textH * 0.2
        : y + half + leaderGap + textH * 0.8)
    : (slot.dy < 0
        ? y - half * inv2 - leaderGap - textH * 0.2
        : y + half * inv2 + leaderGap + textH * 0.8)

  let rectX: number
  if (slot.anchor === 'start') rectX = textX - 2
  else if (slot.anchor === 'end') rectX = textX - textW - 2
  else rectX = textX - textW / 2 - 2

  const rectY = textY - textH * 0.8
  const labelRect: LabelRect = { x: rectX, y: rectY, w: textW + 4, h: textH }

  const leaderTargetX = slot.anchor === 'start' ? rectX
                      : slot.anchor === 'end' ? rectX + textW + 4
                      : rectX + (textW + 4) / 2
  const leaderTargetY = slot.dy < 0 ? rectY + textH : rectY

  // Contact point on the node circle: lie on the ray from the node
  // *centre* to the label's leader target, so the leader visually
  // continues a line that passes through the centre (“aimed at the
  // middle of the icon”). Falls back to the slot direction on the
  // degenerate case where the target is exactly at the centre.
  const dx = leaderTargetX - x
  const dy = leaderTargetY - y
  const len = Math.hypot(dx, dy)
  let edgeX: number
  let edgeY: number
  if (len > 1e-6) {
    edgeX = x + (dx / len) * half
    edgeY = y + (dy / len) * half
  } else {
    edgeX = isVertical ? x : x + slot.dx * half * inv2
    edgeY = isVertical ? y + slot.dy * half : y + slot.dy * half * inv2
  }

  return { labelRect, edgeX, edgeY, textX, textY, leaderTargetX, leaderTargetY, anchor: slot.anchor }
}

export interface NodeLabelMetrics {
  x: number
  y: number
  half: number
  fs: number
  leaderGap: number
  textW: number
  textH: number
}

/** Resolve the geometry inputs needed to position a node label. */
export function nodeLabelMetrics(node: NormalizedNodeDef, layout: GridLayout): NodeLabelMetrics {
  const { x, y } = gridToPixel(layout, node.pos)
  const half = (layout.cellSize * resolveNodeSizeFrac(node)) / 2
  const fs = fontSize(layout, 'node', node.labelScale)
  const leaderGap = half * 0.18
  const text = typeof node.label === 'string' ? node.label : ''
  const textW = text.length * fs * 0.85 + fs
  const textH = fs * 1.5
  return { x, y, half, fs, leaderGap, textW, textH }
}

export interface NodeLabelResult {
  rect: LabelRect
  corner: Corner
  error: boolean
  /** Every corner the placer tried, for diagnostic emission. */
  attempts: AttemptRecord[]
}

/** Pre-compute node label placement. Order: TR → BR → BL → TL → TC → BC */
export function computeNodeLabelRect(
  node: NormalizedNodeDef, layout: GridLayout,
  placedLabels: LabelRect[], connLines: LineSeg[],
  bounds?: CanvasBounds,
  iconCircles?: Circle[],
): NodeLabelResult | null {
  if (!node.label) return null

  const m = nodeLabelMetrics(node, layout)
  const buildRect = (corner: Corner): LabelRect =>
    computeCallout(m.x, m.y, m.half, SLOTS[corner], m.fs, m.textW, m.textH, m.leaderGap).labelRect
  const candidates: SlotCandidate<Corner>[] = CORNER_ORDER.map((c) => ({
    slot: c,
    rect: buildRect(c),
    description: c,
  }))
  const fallback: SlotCandidate<Corner> = { slot: 'top-left', rect: buildRect('top-left'), description: 'top-left' }
  const result = placeLabel<Corner>(
    candidates,
    { placedLabels, connLines, bounds, iconCircles },
    fallback,
  )!
  return { rect: result.rect, corner: result.slot, error: result.error, attempts: result.attempts }
}
