import { tablerOutline as t, type DiagramDef } from 'gridgram'

// Tuple `pos: [col, row]` matches the .gg `@col,row` notation 1:1.
// You can also write `pos: { col, row }` if you prefer the named form.
export const def: DiagramDef = {
  columns: 3,
  rows: 3,
  theme: { primary: '#1e3a5f', accent: '#e8792f' },
  regions: [
    { spans: [{ from: [1, 1], to: [3, 1] }], color: 'accent/12',    label: 'Public' },
    { spans: [{ from: [1, 2], to: [3, 2] }], color: 'primary/14',   label: 'App' },
    { spans: [{ from: [1, 3], to: [3, 3] }], color: 'secondary/14', label: 'Data' },
  ],
  nodes: [
    // Public
    { id: 'cdn',   pos: [1, 1], src: t('cloud'),    label: 'CDN',  color: 'accent' },
    { id: 'edge',  pos: [2, 1], src: t('world'),    label: 'Edge', color: 'accent' },
    { id: 'waf',   pos: [3, 1], src: t('lock'),     label: 'WAF',  color: 'accent' },
    // App
    { id: 'api',   pos: [1, 2], src: t('server'),   label: 'API GW' },
    { id: 'auth',  pos: [2, 2], src: t('lock'),     label: 'Auth' },
    { id: 'queue', pos: [3, 2], src: t('bolt'),     label: 'Queue' },
    // Data
    { id: 'db',    pos: [1, 3], src: t('database'), label: 'Postgres' },
    { id: 'cache', pos: [2, 3], src: t('server'),   label: 'Redis' },
    { id: 'audit', pos: [3, 3], src: t('file'),     label: 'Audit' },
  ],
  connectors: [
    { from: 'edge',  to: 'waf',   arrow: 'end',  label: 'filter' },
    { from: 'waf',   to: 'api',   arrow: 'end',  label: 'verify' },
    { from: 'api',   to: 'auth',  arrow: 'both', label: 'session' },
    { from: 'api',   to: 'queue', arrow: 'end',  label: 'enqueue' },
    { from: 'queue', to: 'cache', arrow: 'end',  label: 'lookup' },
    { from: 'api',   to: 'db',    arrow: 'end',  label: 'write' },
    { from: 'api',   to: 'audit', arrow: 'end',  label: 'log' },
    { from: 'cdn',   to: 'edge',  arrow: 'end',  label: 'static' },
  ],
}
