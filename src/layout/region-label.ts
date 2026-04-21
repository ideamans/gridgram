/**
 * Pure layout for region labels.
 *
 * Picks one of six positions (TL/TR/BR/BL/TC/BC) inside the region's
 * bounding box, skipping any whose representative cell sits outside
 * the cell-union (so labels don't float in empty L-shape gaps).
 */
import type { RegionDef } from '../types'
import type { GridLayout } from '../geometry/grid'
import type { LabelRect, LineSeg, CanvasBounds, Circle } from '../geometry/collision'
import { fontSize, regionInset, regionDefaultRadius } from '../geometry/metrics'
import { placeLabel, type SlotCandidate, type AttemptRecord } from '../geometry/label-placer'
import { buildBlob, isCellFilled } from '../geometry/blob'
import type { Blob } from '../geometry/blob'

export type RegionPosition =
  | 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left'
  | 'top-center' | 'bottom-center'

/** Fixed order: TL → TR → BR → BL → TC → BC */
export const POSITION_ORDER: RegionPosition[] = [
  'top-left', 'top-right', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center',
]

export interface LabelSlot {
  lx: number
  ly: number
  anchor: 'start' | 'middle' | 'end'
  rect: LabelRect
}

/**
 * Place the label rect inside the bbox with `pad` clearance from the
 * inset rounded corner. Since the arc eats `~0.29 * radius` from the
 * corner, pad must account for inset + that arc bite + a small margin.
 */
export function computeRegionSlot(
  minX: number, maxX: number, minY: number, maxY: number,
  fontSize: number, estW: number, labelH: number,
  position: RegionPosition,
  pad: number
): LabelSlot {
  const rectW = estW + 4
  let rectX: number
  let rectY: number
  let anchor: 'start' | 'middle' | 'end'

  switch (position) {
    case 'top-left':
      rectX = minX + pad; rectY = minY + pad; anchor = 'start'; break
    case 'top-right':
      rectX = maxX - pad - rectW; rectY = minY + pad; anchor = 'end'; break
    case 'bottom-right':
      rectX = maxX - pad - rectW; rectY = maxY - pad - labelH; anchor = 'end'; break
    case 'bottom-left':
      rectX = minX + pad; rectY = maxY - pad - labelH; anchor = 'start'; break
    case 'top-center':
      rectX = (minX + maxX) / 2 - rectW / 2; rectY = minY + pad; anchor = 'middle'; break
    case 'bottom-center':
      rectX = (minX + maxX) / 2 - rectW / 2; rectY = maxY - pad - labelH; anchor = 'middle'; break
  }

  // Text baseline ~ 78% down the rect (matches fontSize * 1.3 lineHeight)
  const ly = rectY + labelH * 0.78
  const lx = anchor === 'start' ? rectX + 2
           : anchor === 'end' ? rectX + rectW - 2
           : rectX + rectW / 2

  const rect: LabelRect = { x: rectX, y: rectY, w: rectW, h: labelH }
  return { lx, ly, anchor, rect }
}

/** Representative cell (grid coords) for a candidate label position. */
function representativeCell(blob: Blob, position: RegionPosition): { col: number; row: number } {
  const { minCol, maxCol, minRow, maxRow } = blob.bbox
  const midCol = Math.floor((minCol + maxCol) / 2)
  switch (position) {
    case 'top-left':      return { col: minCol, row: minRow }
    case 'top-right':     return { col: maxCol, row: minRow }
    case 'bottom-right':  return { col: maxCol, row: maxRow }
    case 'bottom-left':   return { col: minCol, row: maxRow }
    case 'top-center':    return { col: midCol, row: minRow }
    case 'bottom-center': return { col: midCol, row: maxRow }
  }
}

export function bboxInPixels(blob: Blob, layout: GridLayout) {
  const { minCol, maxCol, minRow, maxRow } = blob.bbox
  return {
    minX: layout.offsetX + minCol * layout.cellSize,
    maxX: layout.offsetX + (maxCol + 1) * layout.cellSize,
    minY: layout.offsetY + minRow * layout.cellSize,
    maxY: layout.offsetY + (maxRow + 1) * layout.cellSize,
  }
}

/**
 * Padding from bbox corner to label rect. The rounded corner eats
 * ~(1 − 1/√2) × radius ≈ 0.293 × radius into the bbox. Add inset and
 * a small extra margin so the label sits visibly clear of the arc.
 */
export function labelPadding(inset: number, radius: number, fontSize: number): number {
  return inset + radius * 0.3 + fontSize * 0.3
}

export interface RegionLabelMetrics {
  fs: number
  estW: number
  labelH: number
  pad: number
  inset: number
  radius: number
}

export function regionLabelMetrics(region: RegionDef, layout: GridLayout): RegionLabelMetrics {
  const inset = regionInset(layout)
  const radius = region.borderRadius ?? regionDefaultRadius(layout)
  const fs = fontSize(layout, 'region', region.labelScale)
  const labelText = typeof region.label === 'string' ? region.label : ''
  const estW = labelText.length * fs * 0.85 + fs * 1.2
  const labelH = fs * 1.3
  const pad = labelPadding(inset, radius, fs)
  return { fs, estW, labelH, pad, inset, radius }
}

export interface RegionLabelResult {
  rect: LabelRect
  position: RegionPosition
  error: boolean
  /** Every position the placer tried, for diagnostic emission. */
  attempts: AttemptRecord[]
}

/** Pre-compute region label placement. Order: TL → TR → BR → BL → TC → BC */
export function computeRegionLabelRect(
  region: RegionDef, layout: GridLayout,
  placedLabels: LabelRect[], connLines: LineSeg[],
  bounds?: CanvasBounds,
  iconCircles?: Circle[],
): RegionLabelResult | null {
  if (!region.label) return null

  const m = regionLabelMetrics(region, layout)
  const blob = buildBlob(region.spans, layout, m.inset)
  const { minX, maxX, minY, maxY } = bboxInPixels(blob, layout)

  // Keep only candidates whose representative cell is inside the union
  const validPositions = POSITION_ORDER.filter((p) => {
    const cell = representativeCell(blob, p)
    return isCellFilled(blob, cell.col, cell.row)
  })

  const buildRect = (p: RegionPosition): LabelRect =>
    computeRegionSlot(minX, maxX, minY, maxY, m.fs, m.estW, m.labelH, p, m.pad).rect
  const candidates: SlotCandidate<RegionPosition>[] = validPositions.map((p) => ({
    slot: p,
    rect: buildRect(p),
    description: p,
  }))
  const fallback: SlotCandidate<RegionPosition> = {
    slot: 'top-left', rect: buildRect('top-left'), description: 'top-left',
  }
  const result = placeLabel<RegionPosition>(
    candidates,
    { placedLabels, connLines, bounds, iconCircles },
    fallback,
  )!
  return { rect: result.rect, position: result.slot, error: result.error, attempts: result.attempts }
}
