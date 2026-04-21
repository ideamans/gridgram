# Quickstart (TS API)

The TypeScript API is published to npm as ESM. Install it, import what
you need, hand `renderDiagram` a `DiagramDef`, and get SVG back.

## Install

```sh
npm install gridgram
# or
bun add gridgram
pnpm add gridgram
yarn add gridgram
```

Runtime requirements:

- **ESM only.** `"type": "module"` is required in your `package.json`
  (or equivalent bundler setup).
- **Node ≥ 22** for native ESM + JSON import attributes. Any version of
  Bun works. Modern browsers work through any ES-module-aware bundler
  (Vite, Rspack, esbuild, Rollup, webpack 5+).
- **Preact** and **preact-render-to-string** are regular dependencies,
  resolved through your bundler. If your host already has a different
  Preact version, you'll get two copies — the output is identical either
  way (we pin nothing globally).
- **No `sharp` in the TS API.** The library renders SVG only; PNG
  rasterization is done by the `gg` CLI at the edge, or by the host if
  it chooses to (see [Integrations](./integrations)).

## Your first render

```ts
import { renderDiagram, tablerOutline } from 'gridgram'
import type { DiagramDef } from 'gridgram'

const def: DiagramDef = {
  nodes: [
    { id: 'user', pos: 'A1', src: tablerOutline('user'),    label: 'User' },
    { id: 'api',  pos: 'B1', src: tablerOutline('server'),  label: 'API'  },
    { id: 'db',   pos: 'C1', src: tablerOutline('database'),label: 'DB'   },
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
sensible defaults (auto-position across row 0, placeholder rings) and
reports anything noteworthy via `diagnostics`.

## Using the Preact component

If your host is a Preact app, skip the string round-trip and embed the
VNode tree directly:

```tsx
import { Diagram } from 'gridgram'
import type { DiagramDef } from 'gridgram'

export function Architecture({ def }: { def: DiagramDef }) {
  return <Diagram def={def} renderWidth={1024} />
}
```

`<Diagram>` accepts every `DiagramOptions` field as a prop (e.g.
`renderWidth`, `suppressErrors`, `theme`, `cellSize`). Internally it's
a thin wrapper around `buildDiagramTree`.

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
pos: 'A1'                 // column 1, row 1 (top-left)
pos: [1, 1]               // same thing
pos: { col: 1, row: 1 }
```

The pipeline normalizes them all to the canonical 0-based
`{ col, row }` object before rendering. See [Types](./types) for
`GridPosInput` vs `GridPos`.

## Adding an icon

The default node has no icon — it renders as a ring with a label.
Usual forms for `src`:

```ts
import { tablerOutline, tablerFilled } from 'gridgram'

{ id: 'user', pos: 'A1', src: tablerOutline('user'), label: 'User' }
{ id: 'star', pos: 'B1', src: tablerFilled('star'),  label: 'Hot'  }
{ id: 'raw',  pos: 'C1', src: '<g>…</g>',            label: 'Raw'  }
```

`tablerOutline(name)` / `tablerFilled(name)` return the inline SVG
fragment for any of the 5,500+ Tabler icons. Safer than a string
identifier — the TypeScript compiler won't catch a typo'd name, but
a missing icon at runtime is obvious (the node gets a red ring).

For URL / file-path icons, either pre-resolve them yourself (set `src`
to the final SVG string) or run the `.gg` icon loader (see
[Integrations](./integrations) and the `gridgram/node` subpath).

## Writing to a file

```ts
import { renderDiagram } from 'gridgram'
import { writeFileSync } from 'node:fs'

const { svg } = renderDiagram(def)
writeFileSync('out.svg', `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`)
```

For PNG, see the [PNG rasterization](./integrations#png-rasterization)
pattern — you bring `sharp`, we give you `computeRenderDimensions` for
the canvas size.

## From a `.gg` source

When the diagram is authored as text, parse it first. `parseGg` and
`resolveDiagramIcons` are pure (no filesystem), so they work in any
ESM host:

```ts
import {
  parseGg,
  resolveDiagramIcons,
  renderDiagram,
  formatError,
} from 'gridgram'

const source = `
icon :user @A1 tabler/user   "User"
icon :api  @B1 tabler/server "API"
user --> api "HTTPS"
`

const { def: rawDef, errors, icons } = parseGg(source)
if (errors.length > 0) {
  throw new Error(errors.map((e) => formatError(e, 'inline.gg')).join('\n'))
}

// With `inline`, the resolver handles Tabler built-ins + any inline
// SVG strings from `doc { icons: { … } }`. For URL / file-path refs,
// pre-load them via `buildIconContext` (Node only) — see below.
const { def, diagnostics: iconDiagnostics } = resolveDiagramIcons(rawDef, {
  inline: icons,
})

const { svg, diagnostics: layoutDiagnostics } = renderDiagram(def)
const allDiagnostics = [...iconDiagnostics, ...layoutDiagnostics]
```

For filesystem / HTTP icon references (`./foo.svg`, `@brand/aws.svg`,
`https://…`), import the async loader from the Node subpath:

```ts
import { buildIconContext } from 'gridgram/node'

const ctx = await buildIconContext({
  jsonIconsMap: icons,
  def: rawDef,
  docDir: '/path/to/project',
})
const { def } = resolveDiagramIcons(rawDef, ctx)
```

See [Parser](./parser) for the full pipeline and
[Diagnostics](./diagnostics) for what the `diagnostics` arrays carry.

## Next

- [`renderDiagram` & friends](./render) — options, return shapes,
  `Diagram` and `buildDiagramTree` for Preact embedding.
- [Types](./types) — every field on every diagram-def type.
- [Parser](./parser) — `.gg` → `DiagramDef` in depth.
- [Diagnostics](./diagnostics) — agent-facing feedback stream.
