import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  columns: 4,
  theme: { primary: '#1e3a5f', secondary: '#3b5a80', accent: '#e8792f' },
  nodes: [
    { id: 'a', pos: [1, 1], src: t('circle'), label: 'primary',   color: 'primary' },
    { id: 'b', pos: [2, 1], src: t('circle'), label: 'accent',    color: 'accent' },
    { id: 'c', pos: [3, 1], src: t('circle'), label: 'accent/60', color: 'accent/60' },
    { id: 'd', pos: [4, 1], src: t('circle'), label: '#8b5cf6',   color: '#8b5cf6' },
  ],
}
