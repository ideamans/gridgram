import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  cols: 2,
  rows: 2,
  nodes: [
    { id: 'user',  pos: { col: 1, row: 1 }, src: t('user'),     label: 'User' },
    { id: 'api',   pos: { col: 2, row: 1 }, src: t('server'),   label: 'API' },
    { id: 'cache', pos: { col: 1, row: 2 }, src: t('bolt'),     label: 'Cache' },
    { id: 'db',    pos: { col: 2, row: 2 }, src: t('database'), label: 'DB' },
  ],
  connectors: [
    { from: 'user', to: 'api',   arrow: 'end',  label: 'HTTPS' },
    { from: 'api',  to: 'cache', arrow: 'both', label: 'read/write' },
    { from: 'api',  to: 'db',    arrow: 'end',  label: 'SQL' },
  ],
}
