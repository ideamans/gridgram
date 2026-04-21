import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  columns: 3,
  rows: 3,
  nodes: [
    { id: 'user', pos: [1, 2], src: t('user'),     label: 'User' },
    { id: 'api',  pos: [2, 2], src: t('server'),   label: 'API' },
    { id: 'db',   pos: [3, 2], src: t('database'), label: 'DB' },
  ],
  connectors: [
    { id: 'login', from: 'user', to: 'api', arrow: 'end', label: 'login' },
    { id: 'query', from: 'api',  to: 'db',  arrow: 'end', label: 'query' },
  ],
  notes: [
    { pos: [2, 1], text: 'Stateless\nauto-scaled',               targets: ['api'] },
    { pos: [3, 1], text: 'SQL with\njoin + index hints',         targets: ['query'], color: '#15803d' },
    { pos: [1, 3], text: 'Session token\ncarried as Bearer JWT', targets: ['login'] },
    { pos: [3, 3], text: 'Read replica\nlagged up to 5s',        targets: ['db'], color: '#b45309' },
  ],
}
