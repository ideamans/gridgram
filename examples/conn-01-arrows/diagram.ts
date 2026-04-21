import { tablerOutline as t, type DiagramDef } from 'gridgram'

const pair = (id: string, row: number) => [
  { id: `a${id}`, pos: [1, row] as [number, number], src: t('circle'), label: 'a' },
  { id: `b${id}`, pos: [2, row] as [number, number], src: t('circle'), label: 'b' },
]

export const def: DiagramDef = {
  columns: 2,
  nodes: [
    ...pair('1', 1),
    ...pair('2', 2),
    ...pair('3', 3),
    ...pair('4', 4),
    ...pair('5', 5),
    ...pair('6', 6),
    ...pair('7', 7),
    ...pair('8', 8),
  ],
  connectors: [
    { from: 'a1', to: 'b1', arrow: 'end',                    label: '-->' },
    { from: 'a2', to: 'b2', arrow: 'start',                  label: '<--' },
    { from: 'a3', to: 'b3', arrow: 'both',                   label: '<->' },
    { from: 'a4', to: 'b4', arrow: 'none',                   label: '---' },
    { from: 'a5', to: 'b5', arrow: 'end',   dash: '6 3',     label: '..>' },
    { from: 'a6', to: 'b6', arrow: 'start', dash: '6 3',     label: '<..' },
    { from: 'a7', to: 'b7', arrow: 'both',  dash: '6 3',     label: '<..>' },
    { from: 'a8', to: 'b8', arrow: 'none',  dash: '6 3',     label: '...' },
  ],
}
