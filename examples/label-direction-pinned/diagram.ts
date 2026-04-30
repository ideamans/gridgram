import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'a', pos: 'A1', src: t('user'), label: 'default' },
    { id: 'b', pos: 'B1', src: t('user'), label: 'TR', labelDirection: 'top-right' },
    { id: 'c', pos: 'C1', src: t('user'), label: 'BR', labelDirection: 'bottom-right' },
    { id: 'd', pos: 'A2', src: t('user'), label: 'ML', labelDirection: 'left-center' },
    { id: 'e', pos: 'B2', src: t('user'), label: 'TC', labelDirection: 'top-center' },
    { id: 'f', pos: 'C2', src: t('user'), label: 'MR', labelDirection: 'right-center' },
    { id: 'g', pos: 'A3', src: t('user'), label: 'BL', labelDirection: 'bottom-left' },
    { id: 'h', pos: 'B3', src: t('user'), label: 'BC', labelDirection: 'bottom-center' },
    { id: 'i', pos: 'C3', src: t('user'), label: 'TL', labelDirection: 'top-left' },
    { id: 'j', pos: 'A4', src: t('user'), label: 'L1', labelDirection: 'top-right', leaderLength: 1 },
    { id: 'k', pos: 'B4', src: t('user'), label: 'L2', labelDirection: 'top-right', leaderLength: 2 },
    { id: 'l', pos: 'C4', src: t('user'), label: 'L3', labelDirection: 'top-right', leaderLength: 3 },
  ],
} as DiagramDef
