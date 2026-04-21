import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'a', pos: [1, 1], src: t('world'),  label: 'a' },
    { id: 'b', pos: [3, 1], src: t('server'), label: 'b' },
    { id: 'c', pos: [1, 2], src: t('world'),  label: 'c' },
    { id: 'd', pos: [3, 2], src: t('server'), label: 'd' },
    { id: 'e', pos: [1, 3], src: t('world'),  label: 'e' },
    { id: 'f', pos: [3, 3], src: t('server'), label: 'f' },
    { id: 'g', pos: [1, 4], src: t('world'),  label: 'g' },
    { id: 'h', pos: [3, 4], src: t('server'), label: 'h' },
  ],
  connectors: [
    { from: 'a', to: 'b', arrow: 'end', label: 'plain' },
    { from: 'c', to: 'd', arrow: 'end', label: 'POST /users\nreturns 201' },
    { from: 'e', to: 'f', arrow: 'end', label: 'big', labelScale: 1.5 },
    { from: 'g', to: 'h', arrow: 'end', label: 'emphasized', color: 'accent' },
  ],
}
