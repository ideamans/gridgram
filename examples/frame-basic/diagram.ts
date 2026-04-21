import { tablerOutline as t, tablerFilled as tf, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  columns: 3,
  rows: 3,
  nodes: [
    { id: 'user', pos: 'A2', src: t('user'),     label: 'User' },
    { id: 'api',  pos: 'B2', src: t('server'),   label: 'API' },
    { id: 'db',   pos: 'C2', src: t('database'), label: 'DB' },

    // Frame 2: login round-trip, API recolored.
    { id: 'api', src: t('server'), label: 'API', color: 'accent', frames: 2 },

    // Frame 3: session active — the user icon becomes filled/accent.
    { id: 'user', src: tf('user'), label: 'User', color: 'accent', frames: 3 },
  ],
  connectors: [
    { id: 'login', from: 'user', to: 'api', arrow: 'end', label: 'login', frames: 2 },
    { id: 'query', from: 'api',  to: 'db',  arrow: 'end', label: 'query', frames: 3 },
  ],
  notes: [
    { pos: 'B1', text: 'Stateless,\nauto-scaled',      targets: ['api'],   frames: 2 },
    { pos: 'C3', text: 'SQL with\nindex hints',        targets: ['query'], frames: 3 },
  ],
}
