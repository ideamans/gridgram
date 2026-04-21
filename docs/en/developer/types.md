# Types

Every shape the library accepts or produces. All types are exported
from the package root:

```ts
import type {
  DiagramDef, NodeDef, ConnectorDef, RegionDef, NoteDef,
  GridPos, GridPosInput, WayPoint, WayPointInput,
  DiagramTheme, NodeBadge, BadgePosition, BadgeSpec,
  SvgFragment,
} from 'gridgram'
```

## Coordinate system

All user-facing coordinates are **1-based**: `A1` / `{col: 1, row: 1}` /
`[1, 1]` all refer to the top-left cell, matching spreadsheet
convention. The pipeline normalizes everything to a canonical
internal 0-based form before layout runs — `GridPos`.

### `GridPos` — canonical, 0-based

```ts
interface GridPos {
  col: number   // 0-based column index
  row: number   // 0-based row index
}
```

Produced only by the normalization pass; never write one in user
code.

### `GridPosInput` — user-facing input union

```ts
type GridPosInput =
  | { col: number; row: number }           // 1-based object
  | readonly [col: number, row: number]    // 1-based tuple
  | string                                  // A1 string ('A1', 'aa100')
```

Every public field that accepts a position uses `GridPosInput`.

### `WayPoint` / `WayPointInput`

Same shape as grid pos, but fractional. `{col: 1.5, row: 2}` threads
a connector between cell centres. A1 strings are **not** accepted
for waypoints — use tuple or object form.

## `DiagramDef` — the top-level shape

```ts
interface DiagramDef {
  cellSize?: number
  padding?: number
  columns?: number        // explicit grid width; inferred otherwise
  rows?: number
  theme?: DiagramTheme
  regions?: RegionDef[]   // rendered first (background)
  nodes: NodeDef[]        // required, can be empty array
  connectors?: ConnectorDef[]
  notes?: NoteDef[]
}
```

Required: `nodes`. Everything else has a sensible default.

## `NodeDef` — icons on the grid

```ts
interface NodeDef {
  id: string                 // unique; referenced by connectors / notes
  pos?: GridPosInput         // auto-positions across row 0 if omitted
  src?: SvgFragment          // icon asset (see below)
  label?: SvgFragment        // visible label (string or VNode)
  size?: number              // absolute diameter as fraction of cell (0–1)
  sizeScale?: number         // multiplier on the default (0.45 × this)
  color?: string             // ring / icon color (CSS literal or theme keyword)
  labelScale?: number        // font-size multiplier (default 1)
  iconTheme?: 'theme' | 'native'
  clip?: 'square' | 'circle' | 'none'
  badges?: BadgeSpec[]
  iconError?: boolean        // set by resolveDiagramIcons on a lookup miss
}
```

### About `src`

Accepts several forms — in order of how they're resolved:

| Form                    | Example                          | Notes |
|-------------------------|----------------------------------|-------|
| Tabler namespace        | `'tabler/user'`, `'tabler/filled/star'` | 5,500+ outline + filled subset |
| Raw SVG                 | `'<svg …>'` or `'<g>…</g>'`      | Passed through after wrapper stripping |
| Path reference          | `'./foo.svg'`, `'@brand/aws.svg'` | Loaded via the icon loader |
| Bare name               | `'logo'`, `'widget'`              | Resolved against `doc.icons` / `--icons` |

See [Parser](./parser) for the full resolution order.

### About `color`

Accepts any CSS color literal (`'#e8792f'`, `'red'`, `'rgb(…)'`) and
five theme keywords: `'primary'`, `'secondary'`, `'accent'`, `'text'`,
`'muted'`. Keyword / alpha pairs also work: `'primary/40'` mixes the
theme's primary color with 25% alpha.

## `ConnectorDef` — edges between nodes

```ts
interface ConnectorDef {
  id?: string
  from: string            // node id
  to: string              // node id
  arrow?: 'none' | 'start' | 'end' | 'both'   // default 'end'
  strokeWidth?: number    // default 1.5
  color?: string
  dash?: string           // e.g. '6 3' for dashed
  label?: SvgFragment
  waypoints?: WayPointInput[]
  nodeMargin?: number     // default 0.6 — pull-back distance as radius fraction
  labelScale?: number
}
```

If `waypoints` is empty and the straight line passes through another
node's disc, the router automatically routes around. If no clean
route exists, `lineError` surfaces via a `route-failed` diagnostic
and the line falls back to drawing straight through.

## `RegionDef` — background zones

```ts
interface RegionDef {
  spans: GridSpan[]        // one or more contiguous cell ranges
  color: string            // fill (theme keywords supported — auto-tinted)
  label?: SvgFragment
  borderRadius?: number
  labelScale?: number
}

interface GridSpan {
  from: GridPosInput
  to: GridPosInput
}
```

All spans of one region must form a **single 4-connected shape**
(L-shapes are fine; diagonals-only are not). A disjoint set of
spans is reported as an integrity error at parse time.

## `NoteDef` — callout boxes with optional leaders

```ts
interface NoteDef {
  pos: GridPosInput
  text: string
  targets?: string[]       // ids of nodes or connectors to draw leaders to
  bg?: string
  color?: string
  labelScale?: number
}
```

`text` supports `\n` for line breaks and `**bold**` for inline
emphasis. See [the User Guide note page](../guide/note/) for the
authoring perspective.

## `DiagramTheme`

```ts
interface DiagramTheme {
  primary: string
  secondary: string
  accent: string
  text: string
  bg?: string
  muted?: string
}
```

`SYSTEM_DEFAULTS.theme` in `gridgram/config` has sane defaults.
`DiagramOptions.theme` accepts a partial — omitted keys inherit from
the layer below.

## `SvgFragment`

```ts
type SvgFragment =
  | string                // raw markup or a text label
  | number                // coerced to string
  | VNode                 // a Preact virtual DOM node
  | null | undefined | false
  | SvgFragment[]
```

Every field that accepts SVG content — `label`, `src`, badge icons
— takes an `SvgFragment`. Strings are the common case; `VNode` lets
a programmatic caller drop a pre-built Preact tree in.

## Normalized variants (internal-but-exported)

After `normalizeDiagramDef` runs, every coordinate is a canonical
0-based object and every node has a resolved `pos`. The pipeline
internals operate on **branded** variants that encode that guarantee:

```ts
interface NormalizedNodeDef     extends Omit<NodeDef, 'pos'>       { pos: GridPos }
interface NormalizedConnectorDef extends Omit<ConnectorDef, 'waypoints'> { waypoints?: WayPoint[] }
interface NormalizedNoteDef     extends Omit<NoteDef, 'pos'>       { pos: GridPos }
interface NormalizedRegionDef   extends Omit<RegionDef, 'spans'>   { spans: NormalizedGridSpan[] }
interface NormalizedDiagramDef  extends Omit<DiagramDef, ...>      { nodes: NormalizedNodeDef[]; /* … */ }
```

Most callers never need to touch these — `renderDiagram` normalizes
automatically. They matter if you're writing a custom layout
extension that expects already-normalized inputs (e.g. a plugin that
consumes the output of `resolveDiagram`).

## See also

- [`renderDiagram` & friends](./render) — functions that consume these types.
- [Parser](./parser) — `parseGg` produces a `DiagramDef` from `.gg` text.
- [Configuration](./config) — `DiagramSettings` merge rules.
