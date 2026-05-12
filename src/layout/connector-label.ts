/**
 * Pure layout for connector labels.
 *
 * Builds candidate label rects for every sub-segment of the (resolved)
 * polyline, ordered middle-segment-outward, then delegates to placeLabel.
 */
import type { NormalizedConnectorDef, NormalizedNodeDef } from '../types.js'
import type { GridLayout } from '../geometry/grid.js'
import type { LabelRect, LineSeg, CanvasBounds, Circle } from '../geometry/collision.js'
import { fontSize } from '../geometry/metrics.js'
import { placeLabel, type SlotCandidate, type AttemptRecord } from '../geometry/label-placer.js'
import { resolveConnectorPath, type Pixel } from '../geometry/connector-path.js'

export interface ConnectorLabelResult {
  rect: LabelRect
  error: boolean
  /** Every (segment, t-position) candidate tried, for diagnostic emission. */
  attempts: AttemptRecord[]
}

/** Labelled candidate: the pixel rect plus a short "seg 2 / t=0.5 above"
 *  description the pipeline can attach to diagnostics. */
interface AnnotatedRect {
  rect: LabelRect
  description: string
}

/**
 * Build hop order starting from the middle segment and alternating outward.
 * n=5 segments → [2, 1, 3, 0, 4]
 */
export function hopOrder(n: number): number[] {
  const mid = Math.floor(n / 2)
  const result: number[] = [mid]
  for (let d = 1; d <= Math.max(mid, n - mid - 1); d++) {
    if (mid - d >= 0) result.push(mid - d)
    if (mid + d < n) result.push(mid + d)
  }
  return result
}

/**
 * Candidate rects for a single sub-segment at t-values 0.5, 0.25, 0.75.
 *
 * For every direction (horizontal, vertical, diagonal) each t-point
 * yields TWO candidates — one perpendicular-shifted to each side of the
 * line — so the placer can escape a busy axis by stepping off it. The
 * rect stays axis-aligned; only its center moves.
 *
 * Horizontal lines retain their familiar "above" / "below" labels in
 * the candidate descriptions; non-horizontal lines say "side-A" /
 * "side-B" where side-A sits on the perpendicular's +CCW side of the
 * line direction.
 *
 * Order: t=0.5 is tried first (both sides), then t=0.25 (both sides),
 * then t=0.75 (both sides). 6 candidates per segment.
 */
export function candidatesForSegment(
  p1: Pixel, p2: Pixel,
  labelWidth: number, labelH: number,
  fontSize: number, strokeWidth: number
): AnnotatedRect[] {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.hypot(dx, dy)
  const gap = Math.max(strokeWidth * 3, fontSize * 0.6)
  const ts = [0.5, 0.25, 0.75]
  const result: AnnotatedRect[] = []

  // Degenerate (zero-length) segment: place a single candidate centred
  // on the point so we still emit something the placer can consider.
  if (len < 1e-6) {
    result.push({
      rect: { x: p1.x - labelWidth / 2, y: p1.y - labelH / 2, w: labelWidth, h: labelH },
      description: 'degenerate',
    })
    return result
  }

  // Unit along + perpendicular vectors. perpX/perpY = (ux, uy) rotated
  // 90° CCW.
  const ux = dx / len
  const uy = dy / len
  const perpX = -uy
  const perpY =  ux

  // Distance from the line at which to plant the rect's center so the
  // rect's axis-aligned bounding box clears the line by `gap` on the
  // selected side. For a rect with half-extents (w/2, h/2) projected
  // onto the perpendicular axis: |w/2 · perpX| + |h/2 · perpY|.
  const rectProj = Math.abs(labelWidth / 2 * perpX) + Math.abs(labelH / 2 * perpY)
  const shift = rectProj + gap

  const horizontal = Math.abs(dy) < Math.abs(dx) * 0.3

  for (const t of ts) {
    const cx = p1.x + dx * t
    const cy = p1.y + dy * t

    // Side A — along +perpendicular. For a horizontal line +perpendicular
    // is +y (screen-down), so side A naturally maps to "below"; for a
    // line going up-right the perpendicular points down-right, etc.
    const aCx = cx + perpX * shift
    const aCy = cy + perpY * shift
    const bCx = cx - perpX * shift
    const bCy = cy - perpY * shift

    const aDesc = horizontal ? `t=${t} below` : `t=${t} side-A`
    const bDesc = horizontal ? `t=${t} above` : `t=${t} side-B`

    result.push({
      rect: { x: aCx - labelWidth / 2, y: aCy - labelH / 2, w: labelWidth, h: labelH },
      description: aDesc,
    })
    result.push({
      rect: { x: bCx - labelWidth / 2, y: bCy - labelH / 2, w: labelWidth, h: labelH },
      description: bDesc,
    })
  }
  return result
}

export function computeConnectorLabelRect(
  connector: NormalizedConnectorDef,
  nodeMap: Map<string, NormalizedNodeDef>,
  layout: GridLayout,
  placedLabels: LabelRect[],
  connLines: LineSeg[],
  pixelWaypoints?: Pixel[],
  bounds?: CanvasBounds,
  iconCircles?: Circle[],
  fromAngleOffset?: number,
  toAngleOffset?: number,
): ConnectorLabelResult | null {
  if (!connector.label) return null

  const path = resolveConnectorPath(connector, nodeMap, layout, {
    pixelWaypoints, fromAngleOffset, toAngleOffset,
  })
  if (!path) return null

  const labelText = typeof connector.label === 'string' ? connector.label : ''
  const fs = fontSize(layout, 'connector', connector.labelScale)
  const strokeWidth = connector.strokeWidth ?? 1.5
  // Tight pill: ≈ 0.35 * fs padding on each side, min-width floor of
  // ≈ 1.8 * fs for very short labels. Keeps short labels from looking
  // balloon-y while still leaving room for the rounded ends.
  const labelWidth = Math.max(labelText.length * fs * 0.85, fs * 1.8) + fs * 0.7
  const labelH = fs * 1.4

  const points = path.points
  const numSegs = points.length - 1
  if (numSegs < 1) return null

  // Flatten segment-of-search × within-segment-candidate into one list
  const candidates: SlotCandidate<LabelRect>[] = []
  for (const i of hopOrder(numSegs)) {
    for (const c of candidatesForSegment(points[i], points[i + 1], labelWidth, labelH, fs, strokeWidth)) {
      candidates.push({ slot: c.rect, rect: c.rect, description: `seg ${i} / ${c.description}` })
    }
  }

  // Fallback when nothing fits: first candidate of the middle segment
  const mid = Math.floor(numSegs / 2)
  const fbAnn = candidatesForSegment(
    points[mid], points[mid + 1], labelWidth, labelH, fs, strokeWidth,
  )[0]
  const fallback: SlotCandidate<LabelRect> = {
    slot: fbAnn.rect, rect: fbAnn.rect, description: `seg ${mid} / ${fbAnn.description} (fallback)`,
  }

  const result = placeLabel<LabelRect>(
    candidates,
    { placedLabels, connLines, bounds, iconCircles },
    fallback,
  )!
  return { rect: result.rect, error: result.error, attempts: result.attempts }
}
