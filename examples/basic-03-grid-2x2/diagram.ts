import { tablerOutline as t, type DiagramDef } from 'gridgram'

// columns/rows are inferred from the node positions (max col/row + 1).
// For a 2×2 grid that means "no setup needed" beyond the @col,row marks.
export const def: DiagramDef = {
  nodes: [
    { id: 'front', pos: [1, 1], src: t('world'),    label: 'Frontend' },
    { id: 'api',   pos: [2, 1], src: t('server'),   label: 'API' },
    { id: 'cache', pos: [1, 2], src: t('database'), label: 'Cache' },
    { id: 'db',    pos: [2, 2], src: t('database'), label: 'DB' },
  ],
  connectors: [
    { from: 'front', to: 'api',   arrow: 'end', label: 'REST' },
    { from: 'api',   to: 'cache', arrow: 'end', label: 'lookup' },
    { from: 'cache', to: 'db',    arrow: 'end', label: 'miss' },
    { from: 'api',   to: 'db',    arrow: 'end', label: 'write' },
  ],
}
