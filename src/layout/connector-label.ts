/**
 * Pure layout for connector labels.
 *
 * Builds candidate label rects for every sub-segment of the (resolved)
 * polyline, ordered middle-segment-outward, then delegates to placeLabel.
 */
import type { NormalizedConnectorDef, NormalizedNodeDef } from '../types'
import type { GridLayout } from '../geometry/grid'
import type { LabelRect, LineSeg, CanvasBounds, Circle } from '../geometry/collision'
import { fontSize } from '../geometry/metrics'
import { placeLabel, type SlotCandidate, type AttemptRecord } from '../geometry/label-placer'
import { resolveConnectorPath, type Pixel } from '../geometry/connector-path'

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
 *   - horizontal segment → each t-point yields above + below candidates
 *   - diagonal / vertical → each t-point yields a single overlay candidate
 *
 * Order: t=0.5 is tried first (for horizontal: above then below), then
 * t=0.25, then t=0.75.
 */
export function candidatesForSegment(
  p1: Pixel, p2: Pixel,
  labelWidth: number, labelH: number,
  fontSize: number, strokeWidth: number
): AnnotatedRect[] {
  const dx = Math.abs(p2.x - p1.x)
  const dy = Math.abs(p2.y - p1.y)
  const isHorizontal = dy < dx * 0.3
  const gap = Math.max(strokeWidth * 3, fontSize * 0.6)
  const ts = [0.5, 0.25, 0.75]

  const result: AnnotatedRect[] = []
  for (const t of ts) {
    const px = p1.x + (p2.x - p1.x) * t
    const py = p1.y + (p2.y - p1.y) * t
    if (isHorizontal) {
      result.push({
        rect: { x: px - labelWidth / 2, y: py - labelH - gap, w: labelWidth, h: labelH },
        description: `t=${t} above`,
      })
      result.push({
        rect: { x: px - labelWidth / 2, y: py + gap, w: labelWidth, h: labelH },
        description: `t=${t} below`,
      })
    } else {
      result.push({
        rect: { x: px - labelWidth / 2, y: py - labelH / 2, w: labelWidth, h: labelH },
        description: `t=${t} overlay`,
      })
    }
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
): ConnectorLabelResult | null {
  if (!connector.label) return null

  const path = resolveConnectorPath(connector, nodeMap, layout, pixelWaypoints)
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
