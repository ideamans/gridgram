import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  columns: 3,
  theme: {
    primary:   '#065f46',
    secondary: '#0369a1',
    accent:    '#d97706',
    text:      '#1f2937',
    bg:        'transparent',
  },
  regions: [
    { spans: [{ from: [1, 1], to: [3, 1] }], color: 'accent', label: 'Theme preview' },
  ],
  nodes: [
    { id: 'a', pos: [1, 1], src: t('server'),   label: 'primary' },
    { id: 'b', pos: [2, 1], src: t('database'), label: 'secondary', color: 'secondary' },
    { id: 'c', pos: [3, 1], src: t('bolt'),     label: 'accent',    color: 'accent' },
  ],
  connectors: [
    { from: 'a', to: 'b', arrow: 'end', label: 'links' },
    { from: 'b', to: 'c', arrow: 'end', label: 'links' },
  ],
}
