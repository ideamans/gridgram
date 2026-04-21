import { tablerOutline as t, type DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'a', pos: [1, 1], src: t('world'),  label: 'Source' },
    { id: 'b', pos: [4, 3], src: t('server'), label: 'Sink' },
  ],
  connectors: [
    {
      from: 'a', to: 'b', arrow: 'end', label: 'via',
      // Thread through D1 then D2 — right along row 1, then down col D.
      waypoints: [[4, 1], [4, 2]],
    },
  ],
}
