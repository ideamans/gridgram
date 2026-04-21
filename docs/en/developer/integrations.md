# Integrations

Patterns for embedding Gridgram in a host system. None of these are
separate packages — they're conventions that compose the primitive
API into whatever shape your host needs.

## HTTP endpoint

A minimal service that accepts `.gg` source and returns SVG +
diagnostics:

```ts
import { serve } from 'bun'
import {
  parseGg, buildIconContext, resolveDiagramIcons, renderDiagram,
} from 'gridgram'

serve({
  port: 3000,
  async fetch(req) {
    if (req.method !== 'POST') return new Response('POST /render', { status: 405 })
    const source = await req.text()

    const { def: rawDef, errors, icons } = parseGg(source)
    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 })
    }

    const ctx = await buildIconContext({
      jsonIconsMap: icons,
      def: rawDef,
      docDir: process.cwd(),
    })
    const { def, diagnostics: iconDiags } = resolveDiagramIcons(rawDef, ctx)
    const { svg, diagnostics: layoutDiags } = renderDiagram(def)

    return Response.json({
      svg,
      diagnostics: [...iconDiags, ...layoutDiags],
    })
  },
})
```

Notes:

- No per-request project config — deploy-wide settings go in a
  `gridgram.config.ts` loaded once at startup and prepended via
  `resolveSettings` (see [Configuration](./config)).
- Node.js works the same; swap `Bun.serve` for `http.createServer` or
  Fastify / Hono.

## MCP tool

A Model Context Protocol server exposing Gridgram as an agent tool.
Skeleton:

```ts
import { Server } from '@modelcontextprotocol/sdk/server'
import {
  parseGg, buildIconContext, resolveDiagramIcons, renderDiagram,
} from 'gridgram'

const server = new Server({ name: 'gridgram', version: '0.1.0' }, {
  capabilities: { tools: {} },
})

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== 'render_diagram') throw new Error('unknown tool')

  const source = req.params.arguments?.source as string
  const { def: rawDef, errors, icons } = parseGg(source)
  if (errors.length) {
    return { content: [{ type: 'text', text: JSON.stringify({ errors }) }] }
  }

  const ctx = await buildIconContext({
    jsonIconsMap: icons, def: rawDef, docDir: process.cwd(),
  })
  const { def, diagnostics: iconDiags } = resolveDiagramIcons(rawDef, ctx)
  const { svg, diagnostics: layoutDiags } = renderDiagram(def)
  const diagnostics = [...iconDiags, ...layoutDiags]

  return {
    content: [
      { type: 'text', text: JSON.stringify({ diagnostics }, null, 2) },
      { type: 'image', data: Buffer.from(svg).toString('base64'), mimeType: 'image/svg+xml' },
    ],
  }
})
```

The critical bit for agent usability: return the `diagnostics` array
in the response so the LLM sees *why* its diagram didn't render
cleanly, not just the red-tinted SVG. See [Diagnostics](./diagnostics)
for an example agent loop.

## Headless build step

In a static-site generator or CI job, process every `.gg` file in a
directory:

```ts
import { readdir, readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import {
  parseGg, buildIconContext, resolveDiagramIcons, renderDiagram,
} from 'gridgram'

async function buildAll(dir: string): Promise<void> {
  for (const entry of await readdir(dir, { recursive: true })) {
    if (!entry.endsWith('.gg')) continue
    const path = join(dir, entry)
    const source = await readFile(path, 'utf-8')

    const { def: rawDef, errors, icons } = parseGg(source)
    if (errors.length) throw new Error(`${path}: ${errors[0].message}`)

    const ctx = await buildIconContext({
      jsonIconsMap: icons, def: rawDef, docDir: dirname(path),
    })
    const { def } = resolveDiagramIcons(rawDef, ctx)
    const { svg, diagnostics } = renderDiagram(def)

    if (diagnostics.length > 0) {
      console.warn(`${path}:`, diagnostics.map((d) => d.message).join('\n  '))
    }

    await writeFile(path.replace(/\.gg$/, '.svg'),
      `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`)
  }
}
```

The docs site in this repository uses exactly this pattern — see
`scripts/build-docs-examples.ts` for the full version (adds PNG
rasterization via `sharp` and a `.gg` / `.ts` parity check).

## PNG rasterization

Gridgram doesn't ship `sharp` as a direct dependency — many callers
render SVG only, and `sharp` is a heavy optional. Install it when
you need PNG:

```sh
npm install sharp
```

```ts
import sharp from 'sharp'
import { renderDiagram, computeRenderDimensions } from 'gridgram'

const { svg } = renderDiagram(def, { renderWidth: 2048 })
const { width, height } = computeRenderDimensions(def, { renderWidth: 2048 })

await sharp(Buffer.from(svg))
  .resize(width, height)
  .png()
  .toFile('out.png')
```

`computeRenderDimensions` and `renderDiagram` both take the same
`DiagramOptions`, so the aspect ratio lines up.

## Preact app embedding

If your host is a Preact application and you want the diagram as a
live VNode tree (no intermediate string):

```tsx
import { h } from 'preact'
import { buildDiagramTree } from 'gridgram'

export function DiagramView({ def }: { def: DiagramDef }) {
  return buildDiagramTree(def)
}
```

`buildDiagramTree` is the internal path `renderDiagram` uses before
`renderToString`. If you want diagnostics too, use `renderDiagram`
and parse the SVG back with a DOM library — or wait for a planned
`renderDiagramVNodes` that returns `{ tree, diagnostics }` (see the
[roadmap](https://github.com/ideamans/gridgram/issues) for progress).

## Workers / worker threads

`renderDiagram` is pure and thread-safe — no module-level mutable
state, no globals. Each worker can import `gridgram` and call it
independently. The Tabler icon JSON is read-only and shared safely.

## Caching

For a memoized render layer:

```ts
const cache = new Map<string, string>()

function renderCached(def: DiagramDef): string {
  const key = JSON.stringify(def)                  // good enough for equality
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const { svg } = renderDiagram(def)
  cache.set(key, svg)
  return svg
}
```

Because `renderDiagram` is deterministic, a cache keyed on the full
input def is sound. If you've resolved icons upstream, the def's
`src` fields are inline SVG strings — the cache key will be long but
stable.

## See also

- [CLI](../guide/cli) — built-in one-shot rendering.
- [Configuration](./config) — composing project / deploy-wide
  defaults.
- [Diagnostics](./diagnostics) — the feedback format every
  integration surfaces.
