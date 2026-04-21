import { tablerOutline as t, tablerFilled as tf, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { src: t('user'),     label: 'user' },
    { src: t('world'),    label: 'world' },
    { src: t('server'),   label: 'server' },
    { src: t('database'), label: 'database' },
    { src: t('bolt'),     label: 'bolt' },
    { src: tf('star'),    label: 'star' },
    { src: tf('heart'),   label: 'heart' },
  ],
} as DiagramDef
