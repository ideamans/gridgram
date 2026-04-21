import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'user', src: t('user'),     label: 'ユーザー' },
    { id: 'web',  src: t('world'),    label: '网站' },
    { id: 'api',  src: t('server'),   label: 'API 伺服器' },
    { id: 'db',   src: t('database'), label: '데이터베이스' },
  ],
  connectors: [
    { from: 'user', to: 'web', arrow: 'end',  label: 'HTTPS' },
    { from: 'web',  to: 'api', arrow: 'both', label: '要求' },
    { from: 'api',  to: 'db',  arrow: 'both', label: '쿼리' },
  ],
}
