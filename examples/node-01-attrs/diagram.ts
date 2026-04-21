import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'a', src: t('user'), label: 'default' },
    { id: 'b', src: t('user'), label: 'color=accent',   color: 'accent' },
    { id: 'c', src: t('user'), label: 'size=0.7',       size: 0.7 },
    { id: 'd', src: t('user'), label: 'labelScale=0.7', labelScale: 0.7 },
  ],
}
