import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  columns: 4,
  nodes: [
    { id: 'ok',    pos: [1, 1], src: t('server'), label: 'ok',    badges: ['check'] },
    { id: 'warn',  pos: [2, 1], src: t('server'), label: 'warn',  badges: ['alert'] },
    { id: 'info',  pos: [3, 1], src: t('server'), label: 'info',  badges: ['info'] },
    { id: 'guard', pos: [4, 1], src: t('server'), label: 'guard', badges: ['lock'] },
  ],
}
