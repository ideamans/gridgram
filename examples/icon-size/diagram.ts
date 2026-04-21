import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'a', src: t('user'), label: 'default' },
    { id: 'b', src: t('user'), label: 'sizeScale=1.3', sizeScale: 1.3 },
    { id: 'c', src: t('user'), label: 'sizeScale=0.7', sizeScale: 0.7 },
    { id: 'd', src: t('user'), label: 'size=0.9',      size: 0.9 },
  ],
}
