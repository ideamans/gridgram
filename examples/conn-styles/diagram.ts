import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'a', pos: [1, 1], src: t('circle'), label: 'a' },
    { id: 'b', pos: [3, 1], src: t('circle'), label: 'b' },
    { id: 'c', pos: [1, 2], src: t('circle'), label: 'c' },
    { id: 'd', pos: [3, 2], src: t('circle'), label: 'd' },
    { id: 'e', pos: [1, 3], src: t('circle'), label: 'e' },
    { id: 'f', pos: [3, 3], src: t('circle'), label: 'f' },
    { id: 'g', pos: [1, 4], src: t('circle'), label: 'g' },
    { id: 'h', pos: [3, 4], src: t('circle'), label: 'h' },
  ],
  connectors: [
    { from: 'a', to: 'b', arrow: 'end', label: 'default' },
    { from: 'c', to: 'd', arrow: 'end', label: 'width=4', strokeWidth: 4 },
    { from: 'e', to: 'f', arrow: 'end', label: 'dashed (..>)', dash: '6 3' },
    { from: 'g', to: 'h', arrow: 'end', label: 'dash=1 3', dash: '1 3' },
  ],
}
