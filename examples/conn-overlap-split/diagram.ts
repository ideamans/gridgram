import { tablerOutline as t, type DiagramDef } from 'gridgram'

// When two straight connectors share the same unordered endpoint pair,
// gridgram auto-bows them in mirrored directions (10% of cellSize off
// the centerline). Works uniformly in all 8 directions.
export const def: DiagramDef = {
  cellSize: 200,
  columns: 8,
  rows: 4,
  nodes: [
    // Axis-aligned pairs
    { id: 'a_e', pos: [1, 1], src: t('circle'), label: 'A' },
    { id: 'b_e', pos: [2, 1], src: t('circle'), label: 'B' },

    { id: 'a_n', pos: [4, 2], src: t('circle'), label: 'A' },
    { id: 'b_n', pos: [4, 1], src: t('circle'), label: 'B' },

    { id: 'a_w', pos: [6, 1], src: t('circle'), label: 'A' },
    { id: 'b_w', pos: [5, 1], src: t('circle'), label: 'B' },

    { id: 'a_s', pos: [7, 1], src: t('circle'), label: 'A' },
    { id: 'b_s', pos: [7, 2], src: t('circle'), label: 'B' },

    // Diagonal pairs
    { id: 'a_ne', pos: [1, 4], src: t('circle'), label: 'A' },
    { id: 'b_ne', pos: [2, 3], src: t('circle'), label: 'B' },

    { id: 'a_se', pos: [3, 3], src: t('circle'), label: 'A' },
    { id: 'b_se', pos: [4, 4], src: t('circle'), label: 'B' },

    { id: 'a_sw', pos: [6, 3], src: t('circle'), label: 'A' },
    { id: 'b_sw', pos: [5, 4], src: t('circle'), label: 'B' },

    { id: 'a_nw', pos: [8, 4], src: t('circle'), label: 'A' },
    { id: 'b_nw', pos: [7, 3], src: t('circle'), label: 'B' },
  ],
  connectors: [
    { from: 'a_e', to: 'b_e', label: 'req' },
    { from: 'a_e', to: 'b_e', label: 'ack' },
    { from: 'a_n', to: 'b_n', label: 'req' },
    { from: 'a_n', to: 'b_n', label: 'ack' },
    { from: 'a_w', to: 'b_w', label: 'req' },
    { from: 'a_w', to: 'b_w', label: 'ack' },
    { from: 'a_s', to: 'b_s', label: 'req' },
    { from: 'a_s', to: 'b_s', label: 'ack' },
    { from: 'a_ne', to: 'b_ne', label: 'req' },
    { from: 'a_ne', to: 'b_ne', label: 'ack' },
    { from: 'a_se', to: 'b_se', label: 'req' },
    { from: 'a_se', to: 'b_se', label: 'ack' },
    { from: 'a_sw', to: 'b_sw', label: 'req' },
    { from: 'a_sw', to: 'b_sw', label: 'ack' },
    { from: 'a_nw', to: 'b_nw', label: 'req' },
    { from: 'a_nw', to: 'b_nw', label: 'ack' },
  ],
}
