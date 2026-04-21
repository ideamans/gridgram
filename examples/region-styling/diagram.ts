import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  columns: 4,
  rows: 2,
  nodes: [
    { id: 'a', pos: [1, 1], src: t('circle'), label: 'a' },
    { id: 'b', pos: [2, 1], src: t('circle'), label: 'b' },
    { id: 'c', pos: [3, 1], src: t('circle'), label: 'c' },
    { id: 'd', pos: [4, 1], src: t('circle'), label: 'd' },
    { id: 'e', pos: [1, 2], src: t('circle'), label: 'e' },
    { id: 'f', pos: [2, 2], src: t('circle'), label: 'f' },
    { id: 'g', pos: [3, 2], src: t('circle'), label: 'g' },
    { id: 'h', pos: [4, 2], src: t('circle'), label: 'h' },
  ],
  regions: [
    { spans: [{ from: [1, 1], to: [1, 2] }], color: 'accent',    label: 'accent' },
    { spans: [{ from: [2, 1], to: [2, 2] }], color: 'accent/30', label: 'accent/30' },
    { spans: [{ from: [3, 1], to: [3, 2] }], color: '#d1fae5',   label: '#d1fae5' },
    { spans: [{ from: [4, 1], to: [4, 2] }], color: 'primary/12', label: 'radius=4', borderRadius: 4 },
  ],
}
