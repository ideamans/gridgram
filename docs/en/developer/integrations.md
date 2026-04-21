# Integrations

Patterns for embedding Gridgram in a host system. None of these are
separate packages — they're conventions that compose the primitive
API into whatever shape your host needs.

> **Import boundary reminder:** the pure pipeline (`parseGg`,
> `resolveDiagramIcons`, `renderDiagram`, …) comes from `'gridgram'`
> and runs anywhere. Filesystem / HTTP helpers (`buildIconContext`,
> `loadProjectConfig`) come from `'gridgram/node'` and only work in a
> Node runtime.

## HTTP endpoint

A minimal service that accepts `.gg` source and returns SVG +
diagnostics:

```ts
import { serve } from 'bun'
import { parseGg, resolveDiagramIcons, renderDiagram } from 'gridgram'
import { buildIconContext } from 'gridgram/node'

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
import { parseGg, resolveDiagramIcons, renderDiagram } from 'gridgram'
import { buildIconContext } from 'gridgram/node'

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
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { parseGg, resolveDiagramIcons, renderDiagram } from 'gridgram'
import { buildIconContext } from 'gridgram/node'

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

Gridgram doesn't ship `sharp` as a dependency — the TS API renders
SVG only, and `sharp` is a heavy native module that belongs to the
host. Install it when you need PNG:

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

`computeRenderDimensions` and `renderDiagram` take the same
`DiagramOptions`, so the aspect ratio lines up.

Alternative — the `gg` CLI bundles sharp (lazy-loaded into
`~/.cache/gridgram/` on first PNG render). If your pipeline already
has access to the binary, shelling out to `gg -o out.png` is often
simpler than wiring sharp into your app.

## Preact / browser embedding

If your host is a Preact application (or any ES-module browser app
bundled by Vite / Rspack / esbuild), use the `<Diagram>` component:

```tsx
import { Diagram } from 'gridgram'
import type { DiagramDef } from 'gridgram'

export function DiagramView({ def }: { def: DiagramDef }) {
  return <Diagram def={def} renderWidth={1024} />
}
```

Or drop to the raw VNode tree with `buildDiagramTree` if you want to
wrap it yourself. Only the pure entry point (`'gridgram'`) is used —
safe to ship to browsers.

`parseGg` and `resolveDiagramIcons` are pure too, so a browser-side
live editor only needs those plus the rendering functions. See the
[docs/.vitepress/theme/Editor.vue](https://github.com/ideamans/gridgram/blob/main/docs/.vitepress/theme/Editor.vue)
source for a complete example.

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
