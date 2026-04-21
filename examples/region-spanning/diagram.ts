import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  columns: 4,
  rows: 3,
  nodes: [
    { id: 'a', pos: [1, 1], src: t('server'), label: 'a' },
    { id: 'b', pos: [2, 1], src: t('server'), label: 'b' },
    { id: 'c', pos: [3, 1], src: t('server'), label: 'c' },
    { id: 'd', pos: [4, 1], src: t('server'), label: 'd' },
    { id: 'e', pos: [1, 2], src: t('server'), label: 'e' },
    { id: 'f', pos: [2, 2], src: t('server'), label: 'f' },
    { id: 'g', pos: [3, 2], src: t('server'), label: 'g' },
    { id: 'h', pos: [4, 2], src: t('server'), label: 'h' },
    { id: 'i', pos: [1, 3], src: t('server'), label: 'i' },
    { id: 'j', pos: [2, 3], src: t('server'), label: 'j' },
    { id: 'k', pos: [3, 3], src: t('server'), label: 'k' },
    { id: 'l', pos: [4, 3], src: t('server'), label: 'l' },
  ],
  regions: [
    {
      spans: [
        { from: [1, 1], to: [4, 1] },   // top row
        { from: [2, 1], to: [2, 2] },   // stem down from B1 → B2 (T-shape)
      ],
      color: 'accent/14',
      label: 'Top row',
    },
    {
      spans: [
        { from: [1, 2], to: [1, 3] },
        { from: [1, 3], to: [4, 3] },
      ],
      color: 'primary/14',
      label: 'L-shape',
    },
  ],
}
