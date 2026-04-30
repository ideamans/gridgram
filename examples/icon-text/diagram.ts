import type { DiagramDef } from 'gridgram'

export const def: DiagramDef = {
  nodes: [
    { id: 'a', pos: 'A1', text: '1',      label: 'single digit' },
    { id: 'b', pos: 'B1', text: '42',     label: 'two digits' },
    { id: 'c', pos: 'C1', text: '1234',   label: 'width-bound' },
    { id: 'd', pos: 'A2', text: 'A\nB',   label: 'two lines' },
    { id: 'e', pos: 'B2', text: 'OK\nGO', size: 0.3, label: 'size=0.3' },
    { id: 'f', pos: 'C2',                 label: 'ring only' },
  ],
} as DiagramDef
