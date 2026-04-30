import type { DiagramDef } from 'gridgram'

const outerSmall = (id: string, pos: string) => ({ id, pos, sizeScale: 0.65 })
const demo = (id: string, pos: string, label: string) => ({ id, pos, label })
const c = (from: string, to: string) => ({ from, to, arrow: 'none' as const })

export const def: DiagramDef = {
  cellSize: 180,
  rows: 5,
  cols: 5,
  nodes: [
    // Outer ring (no labels) — small, just so connectors have anchors.
    outerSmall('a1', 'A1'), outerSmall('b1', 'B1'), outerSmall('c1', 'C1'), outerSmall('d1', 'D1'), outerSmall('e1', 'E1'),
    outerSmall('a2', 'A2'),                                                                          outerSmall('e2', 'E2'),
    outerSmall('a3', 'A3'),                                                                          outerSmall('e3', 'E3'),
    outerSmall('a4', 'A4'),                                                                          outerSmall('e4', 'E4'),
    outerSmall('a5', 'A5'), outerSmall('b5', 'B5'), outerSmall('c5', 'C5'), outerSmall('d5', 'D5'), outerSmall('e5', 'E5'),

    // Center 3×3 — each label spells out the slot the placer chose
    // for it (clockwise from TR), with C3 as an unlabelled hub.
    demo('b2', 'B2', 'TL'), demo('c2', 'C2', 'TC'), demo('d2', 'D2', 'TR'),
    demo('b3', 'B3', 'ML'), { id: 'c3', pos: 'C3' }, demo('d3', 'D3', 'MR'),
    demo('b4', 'B4', 'BL'), demo('c4', 'C4', 'BC'), demo('d4', 'D4', 'BR'),
  ],
  connectors: [
    // B2 (open=TL)
    c('b2','b1'), c('b2','c1'), c('b2','a2'), c('b2','c2'), c('b2','a3'), c('b2','b3'), c('b2','c3'),
    // C2 (open=TC)
    c('c2','b1'), c('c2','d1'), c('c2','d2'), c('c2','c3'), c('c2','b3'), c('c2','d3'),
    // D2 (open=TR)
    c('d2','c1'), c('d2','d1'), c('d2','e2'), c('d2','c3'), c('d2','d3'), c('d2','e3'),
    // B3 (open=ML / left-center)
    c('b3','a2'), c('b3','c3'), c('b3','a4'), c('b3','b4'), c('b3','c4'),
    // D3 (open=MR / right-center)
    c('d3','e2'), c('d3','c3'), c('d3','c4'), c('d3','d4'), c('d3','e4'),
    // B4 (open=BL)
    c('b4','a3'), c('b4','c3'), c('b4','a4'), c('b4','b5'), c('b4','c5'),
    // C4 (open=BC)
    c('c4','c3'), c('c4','b4'), c('c4','d4'), c('c4','b5'), c('c4','d5'),
    // D4 (open=BR)
    c('d4','c3'), c('d4','e3'), c('d4','c5'), c('d4','d5'), c('d4','e4'),
  ],
} as DiagramDef
