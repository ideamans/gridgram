# Developer Guide

You're here because you want to drive Gridgram from code — an
application that generates diagrams at runtime, an agent that edits
and re-renders them in a loop, a build step that processes `.gg`
files in CI, or an MCP tool exposing diagramming to an LLM.

The [User Guide](/en/guide/) covers authoring: writing `.gg` files
and running the CLI. This side covers the TypeScript API, the parse
→ layout → render pipeline's public entry points, and the structured
feedback surface AI agents consume.

## What you get from the library

Gridgram's public API is small by design. Three entry points cover
every integration pattern:

| Function                  | When to use it |
|---------------------------|----------------|
| `renderDiagram(def, opts)` | Most callers. Returns `{ svg, diagnostics }` — the rendered SVG string plus any layout feedback the pipeline produced. |
| `renderDiagramSvg(def, opts)` | Back-compat / no-diagnostics form. Returns just the SVG string. |
| `buildDiagramTree(def, opts)` | The raw Preact VNode tree — embed directly in a Preact app, or stream through a custom renderer. |

All three ultimately take a `DiagramDef`. You can construct one
programmatically or produce one from a `.gg` source via `parseGg`.

## Reading order

1. **[Quickstart (TS API)](./quickstart)** — install, render your
   first diagram from code.
2. **[`renderDiagram` & friends](./render)** — the three entry
   points in depth, including `RenderResult` and `computeRenderDimensions`.
3. **[Types](./types)** — `DiagramDef` and its members. Normalized
   vs raw-input shapes.
4. **[Configuration](./config)** — how the layered settings system
   (system → project → document → render override) composes across
   CLI / HTTP / MCP surfaces.
5. **[Parser](./parser)** — turning `.gg` source into a
   `DiagramDef`. `parseGg`, `buildIconContext`, icon resolution,
   `GgError`.
6. **[Diagnostics](./diagnostics)** — the `PlacementDiagnostic`
   stream. Essential for AI agent workflows; optional but useful for
   humans running the CLI.
7. **[Integrations](./integrations)** — HTTP endpoint, MCP tool,
   headless rendering in CI.
8. **[Specification](./spec)** — the reference: token grammar,
   resolution pipeline, determinism guarantees.

## Determinism is a contract

Every Gridgram surface (CLI, TS API, HTTP, MCP) drives the same
pipeline. Given the same `DiagramDef` — same nodes, same settings,
same icon sources — the pipeline produces **byte-identical SVG**
output across surfaces and runs. Agents rely on this:

- Commit the `.gg` source to git. Every AI edit reads as a diff.
- Pin an SVG baseline in CI. A regression in rendering shows up as
  a visible change.
- Skip the icon loader by pre-resolving `src` to inline SVG, and
  the renderer is fully pure.

The [Specification](./spec) page covers the invariants formally.
