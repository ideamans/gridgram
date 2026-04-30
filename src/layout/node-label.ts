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
  | 'left-center' | 'right-center'

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
  'left-center':   { dx: -1, dy:  0, anchor: 'end'    },
  'right-center':  { dx:  1, dy:  0, anchor: 'start'  },
}

/**
 * Candidate order. The 4 diagonal corners remain primary (tried first, CW
 * starting from TR). TC/BC are tried next; LC/RC come after the up/down
 * fallbacks so labels prefer above/below before sliding to the side.
 */
export const CORNER_ORDER: Corner[] = [
  'top-right', 'bottom-right', 'bottom-left', 'top-left',
  'top-center', 'bottom-center',
  'left-center', 'right-center',
]

/**
 * Leader-gap multipliers for the tiered search. Tier 1 is the tight
 * default; tiers 2 and 3 pull the label progressively further from the
 * node so crowded cells have somewhere to put the callout. Each tier
 * walks all six corners in CORNER_ORDER before the next tier begins.
 * If none fit cleanly, the placer falls back to the candidate with the
 * smallest collision (see `placeLabel`'s 'smallest-collision' strategy).
 */
export const LEADER_TIERS = [1, 2, 3] as const

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
  const isVertical   = slot.dx === 0  // top/bottom-center
  const isHorizontal = slot.dy === 0  // left/right-center

  // Text anchor point. Horizontal slots sit a full half-width to the
  // side; diagonal corners use the inv2 projection so the leader can
  // exit on the diagonal of the node circle.
  let textX: number
  if (isHorizontal) {
    textX = slot.anchor === 'start' ? x + half + leaderGap : x - half - leaderGap
  } else if (slot.anchor === 'start') {
    textX = x + (half + leaderGap) * inv2
  } else if (slot.anchor === 'end') {
    textX = x - (half + leaderGap) * inv2
  } else {
    textX = x
  }

  const textY = isVertical
    ? (slot.dy < 0
        ? y - half - leaderGap - textH * 0.2
        : y + half + leaderGap + textH * 0.8)
    : isHorizontal
    // Vertically centered on the node (textY is the baseline; nudge
    // down by ~textH*0.3 so the cap sits across the node's centerline).
    ? y + textH * 0.3
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
  // Horizontal slots: leader meets the label at its vertical mid-line.
  const leaderTargetY = isHorizontal
    ? rectY + textH / 2
    : (slot.dy < 0 ? rectY + textH : rectY)

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
  /** Leader-length tier (1 = tight, 2 = medium, 3 = long) the placer
   *  chose for this label. The renderer multiplies its base leaderGap
   *  by this value when drawing the callout, so tier-2 / tier-3 wins
   *  actually appear at their longer offsets. */
  tier: number
  error: boolean
  /** Every corner the placer tried, for diagnostic emission. */
  attempts: AttemptRecord[]
}

/**
 * Pre-compute node label placement.
 *
 * Candidate order:
 *   tier 1 (leader×1): TR → BR → BL → TL → TC → BC
 *   tier 2 (leader×2): TR → BR → BL → TL → TC → BC
 *   tier 3 (leader×3): TR → BR → BL → TL → TC → BC
 *
 * 18 positions total. If every tier collides, the placer picks the
 * candidate with the fewest collision hits (tie-break: earliest in the
 * list, i.e. tier-1 wins over tier-2 wins over tier-3 on ties), so the
 * label degrades gracefully instead of always landing in one forced
 * corner. Slot is still returned as a plain `Corner` — the tier is
 * encoded only in the attempt description for diagnostics.
 */
export function computeNodeLabelRect(
  node: NormalizedNodeDef, layout: GridLayout,
  placedLabels: LabelRect[], connLines: LineSeg[],
  bounds?: CanvasBounds,
  iconCircles?: Circle[],
): NodeLabelResult | null {
  if (!node.label) return null

  const m = nodeLabelMetrics(node, layout)
  const buildRect = (corner: Corner, tier: number): LabelRect =>
    computeCallout(
      m.x, m.y, m.half, SLOTS[corner], m.fs, m.textW, m.textH, m.leaderGap * tier,
    ).labelRect
  const candidates: SlotCandidate<Corner>[] = []
  // The auto-search has two axes: leader-length tier (outer, so tier 1
  // is preferred) × direction (inner, CORNER_ORDER). `labelDirection`
  // and `leaderLength` independently filter their axis to a single
  // value; setting both fixes the placement to one combination.
  // Collisions in the filtered candidate set still surface as
  // `error: true` + a `label-collision` diagnostic.
  const directions: readonly Corner[] = node.labelDirection
    ? [node.labelDirection]
    : CORNER_ORDER
  const tiers: readonly number[] = node.leaderLength
    ? [node.leaderLength]
    : LEADER_TIERS
  // Parallel array so we can recover the tier of the winning candidate.
  const candidateTiers: number[] = []
  for (const tier of tiers) {
    for (const c of directions) {
      candidates.push({
        slot: c,
        rect: buildRect(c, tier),
        description: tier === 1 ? c : `${c} (leader×${tier})`,
      })
      candidateTiers.push(tier)
    }
  }
  const result = placeLabel<Corner>(
    candidates,
    { placedLabels, connLines, bounds, iconCircles },
    undefined,
    { noFitStrategy: 'smallest-collision' },
  )!
  // The accepted attempt's index lines up with the candidate index for
  // both the success path and the smallest-collision fallback (no
  // `fallback` arg is passed here, so we never get an off-by-one).
  const acceptedIdx = result.attempts.findIndex((a) => a.accepted)
  const chosenTier = acceptedIdx >= 0 ? candidateTiers[acceptedIdx] : 1
  return {
    rect: result.rect,
    corner: result.slot,
    tier: chosenTier,
    error: result.error,
    attempts: result.attempts,
  }
}
