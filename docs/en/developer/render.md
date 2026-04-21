# `renderDiagram` and friends

The render module is the top of the public API — three functions and
one Preact component, all taking the same `DiagramDef` shape and
sharing one internal pipeline. The difference is only what you want
back: an SVG string, a VNode tree, or an inlined JSX element.

## `renderDiagram(def, opts?)`

```ts
function renderDiagram(def: DiagramDef, opts?: DiagramOptions): RenderResult

interface RenderResult {
  svg: string
  diagnostics: PlacementDiagnostic[]
}
```

The default choice. Returns the rendered SVG alongside any
placement / route / icon diagnostics the pipeline produced.
Diagnostics are empty on a clean layout.

```ts
const { svg, diagnostics } = renderDiagram(def, { renderWidth: 1024 })

if (diagnostics.length > 0) {
  // One record per element that couldn't be placed or routed cleanly.
  // See the Diagnostics reference for the shape.
  console.warn(diagnostics.map((d) => d.message).join('\n'))
}
```

## `renderDiagramSvg(def, opts?)`

```ts
function renderDiagramSvg(def: DiagramDef, opts?: DiagramOptions): string
```

Back-compat variant. Returns only the SVG string; discards any
diagnostics. Use it when the caller doesn't need feedback — for
instance inside a build step that already knows the input is clean.

Internally it's just `renderDiagram(def, opts).svg`; there's no
performance difference.

## `<Diagram def={…} />` — Preact component

```tsx
import { Diagram } from 'gridgram'
import type { DiagramProps } from 'gridgram'

<Diagram def={myDef} renderWidth={1024} />
```

A Preact functional component wrapping `buildDiagramTree`. Every
`DiagramOptions` field is accepted as a prop (e.g. `renderWidth`,
`theme`, `suppressErrors`, `cellSize`). Use this when your host
already renders Preact — no intermediate string, no double parse.

`DiagramProps` is `DiagramOptions & { def: DiagramDef }`.

## `buildDiagramTree(def, opts?)`

```ts
function buildDiagramTree(def: DiagramDef, opts?: DiagramOptions): any
```

Returns the raw Preact VNode tree for the diagram's root `<svg>`.
`<Diagram>` is a thin wrapper around this. Reach for it directly when:

- You want to manipulate the tree before Preact mounts it.
- You're streaming through a custom renderer (a non-SSR Preact
  renderer, a vdom-to-canvas adapter, etc.).

The return type is `any` because Preact's `VNode` import isn't part
of Gridgram's API surface; cast at the call site if you prefer.

## `computeRenderDimensions(def, opts?)`

```ts
function computeRenderDimensions(
  def: DiagramDef,
  opts?: DiagramOptions,
): { width: number; height: number }
```

Returns the pixel size the SVG's `width` / `height` attributes will
report — i.e. the final rasterized canvas size. Two distinct uses:

- **PNG output via sharp**: sharp's `.resize()` needs integers, and
  the aspect ratio has to match the SVG's `viewBox`. `computeRenderDimensions`
  bakes in any `renderWidth` override.
- **Responsive wrappers**: if you need to pre-allocate a container
  of the right aspect ratio in HTML, call this function at build
  time.

```ts
const { width, height } = computeRenderDimensions(def, { renderWidth: 2048 })
```

## The `DiagramOptions` shape

```ts
interface DiagramOptions {
  /** Override per-cell pixel size in the internal coordinate space. */
  cellSize?: number
  /** Pad the canvas by this many internal-space pixels. */
  padding?: number
  /** Force the grid dimensions (otherwise auto-inferred). */
  columns?: number
  rows?: number
  /** Override the theme (any subset of DiagramTheme). */
  theme?: Partial<DiagramTheme>
  /** Hide the red iconError / labelError decorations. */
  suppressErrors?: boolean
  /** Final rendered width in px (aspect preserved; viewBox
   *  unchanged so geometry stays pixel-perfect). */
  renderWidth?: number
}
```

Every field is optional. `DiagramOptions` is an alias for
`DiagramSettings` — the render call treats the options as the
"render override" layer in the [layered settings system](./config).

## Determinism notes

- The pipeline is synchronous and free of wall-clock / random
  inputs. Same `DiagramDef` ⇒ same bytes, every run, every platform.
- Icon resolution (network fetches, filesystem reads) happens
  upstream in `buildIconContext` (`gridgram/node`) / `resolveDiagramIcons`
  (`gridgram`). After that step the def is self-contained — render is
  pure.
- Preact SSR doesn't re-order attributes; label-placement candidate
  order is fixed per element kind. Any attribute-order drift between
  runs would be a renderer bug.

## What counts as "safe" concurrent use

`renderDiagram` is a pure function of its inputs — no globals, no
caches, no mutation of the passed `def`. Multiple calls can run in
parallel across worker threads. The only shared state is the Tabler
icon JSON loaded at module import time, which is read-only.

## See also

- [Types](./types) — `DiagramDef`, `NodeDef`, et al.
- [Configuration](./config) — how `DiagramOptions` composes with
  project / document layers.
- [Diagnostics](./diagnostics) — what comes back in `RenderResult.diagnostics`.
