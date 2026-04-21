import { h } from 'preact'
import type { VNode } from 'preact'
import type { RegionDef, DiagramTheme } from '../types'
import type { GridLayout } from '../geometry/grid'
import { buildBlob, blobPathD } from '../geometry/blob'
import { ERROR_COLOR, regionInset, regionDefaultRadius } from '../geometry/metrics'
import {
  bboxInPixels, computeRegionSlot, regionLabelMetrics,
  type RegionPosition,
} from '../layout/region-label'
import { resolveRegionFill } from './colors'

export interface RegionProps {
  region: RegionDef
  layout: GridLayout
  theme: DiagramTheme
  labelPosition?: RegionPosition
  labelError?: boolean
}

export function Region({ region, layout, theme, labelPosition, labelError }: RegionProps): any {
  const inset = regionInset(layout)
  const blob = buildBlob(region.spans, layout, inset)
  const radius = region.borderRadius ?? regionDefaultRadius(layout)
  const d = blobPathD(blob, radius, inset)

  const { fill, opacity } = resolveRegionFill(region.color, theme)
  const children: any[] = [h('path', { d, fill, 'fill-opacity': opacity })]

  if (region.label && labelPosition) {
    const { minX, maxX, minY, maxY } = bboxInPixels(blob, layout)
    const m = regionLabelMetrics(region, layout)
    const slot = computeRegionSlot(minX, maxX, minY, maxY, m.fs, m.estW, m.labelH, labelPosition, m.pad)

    children.push(
      h('text', {
        x: slot.lx, y: slot.ly,
        'text-anchor': slot.anchor,
        'font-size': m.fs,
        'font-family': 'sans-serif',
        'font-weight': 600,
        fill: labelError ? ERROR_COLOR : 'currentColor',
        opacity: labelError ? 1 : 0.45,
      }, region.label)
    )
  }

  return h('g', null, children)
}
