# Quickstart (TS API)

The TypeScript API is a regular npm package. Install it, import
`renderDiagram`, hand it a `DiagramDef`, and get SVG back.

## Install

```sh
npm install gridgram
# or
bun add gridgram
pnpm add gridgram
yarn add gridgram
```

Runtime requirements:

- **Node.js ≥ 18** or **Bun ≥ 1.0**. Preact SSR is the renderer; it
  has no browser or DOM dependency at render time.
- **`sharp`** is only needed if you want PNG output. The library
  imports it lazily — SVG-only callers can skip installing it.

## Your first render

```ts
import { renderDiagram } from 'gridgram'
import type { DiagramDef } from 'gridgram'

const def: DiagramDef = {
  nodes: [
    { id: 'user', pos: 'A1', label: 'User' },
    { id: 'api',  pos: 'B1', label: 'API' },
    { id: 'db',   pos: 'C1', label: 'DB'  },
  ],
  connectors: [
    { from: 'user', to: 'api', label: 'HTTPS' },
    { from: 'api',  to: 'db',  label: 'SQL'   },
  ],
}

const { svg, diagnostics } = renderDiagram(def)

console.log(svg)           // <svg …> … </svg>
console.log(diagnostics)   // [] for a clean layout
```

No coordinates? No icon sources? All fine — `renderDiagram` fills in
sensible defaults (auto-position along row 0, placeholder icons) and
reports anything noteworthy via `diagnostics`.

## Building a `DiagramDef`

`DiagramDef` is a plain object. See [Types](./types) for the full
field reference. The important parts:

- `nodes: NodeDef[]` — required. Each has an `id`, optional `pos`,
  optional `label`, and an `src` that names its icon.
- `connectors?: ConnectorDef[]` — optional. `from` / `to` reference
  node ids.
- `regions?: RegionDef[]` — background cell spans with a fill.
- `notes?: NoteDef[]` — callout boxes with optional leader lines.
- `theme?`, `cellSize?`, `columns?`, `rows?`, `padding?` — document
  settings. Any of them can also come from a
  [project config file](./config).

Coordinates accept three forms — A1 strings, 1-based tuples, 1-based
objects:

```ts
pos: 'A1'          // column 1, row 1 (top-left)
pos: [1, 1]        // same thing
pos: { col: 1, row: 1 }
```

The pipeline normalizes them all to the canonical 0-based
`{ col, row }` object before rendering. See [Types](./types) for
`GridPosInput` vs `GridPos`.

## Adding an icon

The default node has no icon — it renders as a ring with a label.
For icons, set `src` to a Tabler name:

```ts
{ id: 'user', pos: 'A1', label: 'User', src: 'tabler/user' }
```

Or a raw SVG string, or a URL (see [Parser](./parser) for the full
`resolveDiagramIcons` flow + `buildIconContext` for URL / filesystem
loaders).

```ts
import { tablerOutline } from 'gridgram'

{ id: 'user', pos: 'A1', label: 'User', src: tablerOutline('user') }
```

`tablerOutline(name)` returns the inline SVG fragment for any of the
5,500+ Tabler icons. Safer than a string identifier when you want
the TypeScript compiler to fail on typos.

## Writing to a file

```ts
import { renderDiagram } from 'gridgram'
import { writeFileSync } from 'fs'

const { svg } = renderDiagram(def)
writeFileSync('out.svg', `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`)
```

For PNG, use `computeRenderDimensions` for the native canvas size,
then run it through `sharp`:

```ts
import { renderDiagram, computeRenderDimensions } from 'gridgram'
import sharp from 'sharp'

const { svg } = renderDiagram(def)
const { width, height } = computeRenderDimensions(def)
await sharp(Buffer.from(svg)).resize(width, height).png().toFile('out.png')
```

## From a .gg source

When the diagram is authored as a `.gg` file, parse it first:

```ts
import {
  renderDiagram,
  parseGg,
  buildIconContext,
  resolveDiagramIcons,
} from 'gridgram'

const source = readFileSync('hello.gg', 'utf-8')
const { def: rawDef, errors, icons } = parseGg(source)

if (errors.length > 0) {
  // Parse / integrity failures — bail or report.
  throw new Error(errors.map((e) => e.message).join('\n'))
}

// Optional: resolve icon references (tabler/, URLs, paths) to
// inline SVG. Skip if your def already has inline src values.
const ctx = await buildIconContext({
  jsonIconsMap: icons,
  def: rawDef,
  docDir: dirname(sourcePath),
})
const { def, diagnostics: iconDiagnostics } = resolveDiagramIcons(rawDef, ctx)

// Render
const { svg, diagnostics } = renderDiagram(def)

// Combine both diagnostic streams so agents see everything in one list.
const allDiagnostics = [...iconDiagnostics, ...diagnostics]
```

See [Parser](./parser) for the parse pipeline in depth, and
[Diagnostics](./diagnostics) for what the `diagnostics` arrays
carry.

## Next

- [`renderDiagram` & friends](./render) — options, return shapes,
  `buildDiagramTree` for Preact embedding.
- [Types](./types) — every field on every diagram-def type.
- [Diagnostics](./diagnostics) — agent-facing feedback stream.
