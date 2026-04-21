# Developer Guide

You're here because you want to drive Gridgram from code — a Preact or
plain-ESM browser app, a Node server that renders on demand, an agent
that edits `.gg` and re-renders in a loop, a build step in CI, or an
MCP tool exposing diagramming to an LLM.

The [User Guide](/en/guide/) covers authoring: writing `.gg` files and
running the `gg` CLI. This side covers the TypeScript API — what the
npm package exports, what runs where, and the structured feedback
surface agents consume.

## Two entry points

```ts
// Browser-safe. Pure — no fs, no path, no network.
import { renderDiagram, parseGg, Diagram /* … */ } from 'gridgram'

// Node-only. Reads the filesystem (and optionally fetches over HTTP).
import { buildIconContext, loadProjectConfig } from 'gridgram/node'
```

The main entry point works in every ESM host — modern browsers (via
Vite / Rspack / esbuild / any bundler), Node ≥ 22, Bun, Deno. The
`gridgram/node` subpath is only safe inside a Node runtime; browser
bundles that accidentally import it will fail to build.

## Rendering primitives

Four entry points cover every integration pattern:

| Import                         | Shape                                                   | When to reach for it                                            |
|--------------------------------|---------------------------------------------------------|------------------------------------------------------------------|
| `renderDiagram(def, opts)`     | `(DiagramDef, opts?) => { svg, diagnostics }`           | Default choice. SVG string plus layout/icon feedback.           |
| `renderDiagramSvg(def, opts)`  | `(DiagramDef, opts?) => string`                         | SVG only — the caller already knows the input is clean.         |
| `Diagram`                      | Preact FC — `<Diagram def={…} …opts />`                 | Embedding inline in a Preact app.                               |
| `buildDiagramTree(def, opts)`  | `(DiagramDef, opts?) => VNode`                          | A raw Preact VNode tree for custom renderers / SSR pipelines.   |

All four ultimately take a `DiagramDef`. You can construct one
programmatically or produce one from `.gg` source via `parseGg`.

## Reading order

1. **[Quickstart (TS API)](./quickstart)** — install, render your
   first diagram from code.
2. **[`renderDiagram` & friends](./render)** — the four entry points
   in depth, including `<Diagram>`, `RenderResult`, and
   `computeRenderDimensions`.
3. **[Types](./types)** — `DiagramDef` and its members. Normalized vs
   raw-input shapes.
4. **[Configuration](./config)** — the layered settings system
   (system → project → document → render override) and how every
   surface composes it.
5. **[Parser](./parser)** — `.gg` source to `DiagramDef`. `parseGg`,
   icon resolution, `GgError`, `checkIntegrity`.
6. **[Diagnostics](./diagnostics)** — the `PlacementDiagnostic`
   stream. Essential for agent workflows; useful for human authors too.
7. **[Integrations](./integrations)** — HTTP endpoint, MCP tool,
   headless rendering in CI, Preact embedding, PNG.
8. **[Specification](./spec)** — the reference: token grammar,
   resolution pipeline, determinism guarantees.

## Determinism is a contract

Every Gridgram surface (CLI, TS API, HTTP, MCP) drives the same
pipeline. Given the same `DiagramDef` — same nodes, same settings,
same icon sources — the pipeline produces **byte-identical SVG**
output across surfaces and runs. Agents rely on this:

- Commit the `.gg` source to git. Every AI edit reads as a diff.
- Pin an SVG baseline in CI. A rendering regression shows up as a
  visible change.
- Skip the icon loader by pre-resolving `src` to inline SVG, and the
  renderer is fully pure — no I/O at all.

The [Specification](./spec) page covers the invariants formally.
