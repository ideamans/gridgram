import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'user', src: t('user'),     label: 'User' },
    { id: 'web',  src: t('world'),    label: 'Web' },
    { id: 'api',  src: t('server'),   label: 'API' },
    { id: 'db',   src: t('database'), label: 'DB' },
  ],
  connectors: [
    { from: 'user', to: 'web', arrow: 'end',  label: 'HTTPS' },
    { from: 'web',  to: 'api', arrow: 'both', label: 'REST' },
    { from: 'api',  to: 'db',  arrow: 'both', label: 'SQL' },
  ],
}
