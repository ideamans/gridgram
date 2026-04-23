# gridgram

**Grid-based diagram rendering** — describe a diagram as a TypeScript
`DiagramDef` or a `.gg` text file, get a clean SVG. Built on Preact SSR;
runs in modern browsers and in Node.

```ts
import { tablerOutline, renderDiagramSvg, type DiagramDef } from 'gridgram'

const def: DiagramDef = {
  nodes: [
    { id: 'user', src: tablerOutline('user'), label: 'User' },
  ],
}

const svg = renderDiagramSvg(def)
```

Or embed it directly in your Preact JSX:

```tsx
import { Diagram } from 'gridgram'

export function ArchitectureDiagram() {
  return <Diagram def={def} renderWidth={1024} />
}
```

Two surfaces share one pipeline:

- **TypeScript API** (`npm install gridgram`) — this package. SVG only.
- **`gg` CLI** — a single-binary build of the same engine that also
  emits PNG (via `sharp`). Install from
  [GitHub Releases](https://github.com/ideamans/gridgram/releases).

---

## Install

```bash
npm install gridgram
# or
bun add gridgram
```

Requires an ESM environment. `preact` and `preact-render-to-string` are
peer-ish runtime deps resolved through your bundler (Vite, webpack,
esbuild, Rollup, Bun, Node ≥22 ESM, …).

## Quick example

```ts
import {
  renderDiagram,
  tablerOutline,
  type DiagramDef,
} from 'gridgram'

const def: DiagramDef = {
  nodes: [
    { id: 'user', pos: 'A1', src: tablerOutline('user'),    label: 'User' },
    { id: 'web',  pos: 'B1', src: tablerOutline('world'),   label: 'Web'  },
    { id: 'db',   pos: 'C1', src: tablerOutline('database'),label: 'DB'   },
  ],
  connectors: [
    { from: 'user', to: 'web', label: 'request' },
    { from: 'web',  to: 'db',  label: 'query'   },
  ],
}

const { svg, diagnostics } = renderDiagram(def, { renderWidth: 1024 })
// svg: a standalone <svg …>…</svg> string
// diagnostics: [] on clean layouts; non-empty when labels / connectors
//              couldn't be placed cleanly
```

## API surface

| Export                | Shape                                                           | Use when                                                    |
|-----------------------|-----------------------------------------------------------------|-------------------------------------------------------------|
| `renderDiagram`       | `(def, opts?) => { svg, diagnostics }`                          | Default choice. You want the SVG plus layout feedback.      |
| `renderDiagramSvg`    | `(def, opts?) => string`                                        | You only need the SVG.                                      |
| `Diagram`             | Preact functional component (`<Diagram def={…} />`)             | Embedding in a Preact app.                                  |
| `buildDiagramTree`    | `(def, opts?) => VNode`                                         | Embedding the VNode without going through `renderToString`. |
| `tabler`, `tablerOutline`, `tablerFilled`, `tablerHas` | Icon lookups by name (e.g. `'user'`, `'arrow-right'`) | Using Tabler icons as node `src`.     |
| `BADGE_PRESETS`, `expandBadges` | Named corner-badge presets + expander                 | Decorating nodes with status badges.                        |
| `defineConfig`, `resolveSettings`, `SYSTEM_DEFAULTS` | Layered settings merge                           | Shared defaults across many diagrams.                       |

Every type used in `DiagramDef` (`NodeDef`, `ConnectorDef`, `RegionDef`,
`NoteDef`, `DiagramTheme`, `GridPos`, `GridSpan`, …) is re-exported.

## Options

`renderDiagram(def, opts)` / `<Diagram def={…} …opts />` accepts:

| Option           | Type      | Description                                                            |
|------------------|-----------|------------------------------------------------------------------------|
| `renderWidth`    | `number`  | Final output width in px; height scales with aspect.                   |
| `cellSize`       | `number`  | Pixel size of one grid cell (default 256).                             |
| `padding`        | `number`  | Inner padding in px.                                                   |
| `columns`, `rows`| `number`  | Force the grid size (otherwise inferred from node positions).          |
| `theme`          | partial   | Deep-merged against the built-in theme (`primary`, `accent`, `bg`, …). |
| `suppressErrors` | `boolean` | Hide the red-tint markers drawn when a label can't be placed cleanly.  |

`opts` is merged on top of any settings the `DiagramDef` embeds
(`def.cellSize`, `def.theme`, …), so you can set project-wide defaults
on the def and override per-call.

## Icons

`gridgram` ships the **[Tabler](https://tabler.io/icons)** icon set
(5500+ outline, 1200+ filled) with zero setup:

```ts
import { tablerOutline, tablerFilled } from 'gridgram'

tablerOutline('user')      // '<g fill="none" stroke="currentColor">…</g>'
tablerFilled('star')       // filled variant, or undefined if none exists
```

Or use any raw SVG string / Preact VNode as `src` on a node — gridgram
doesn't care where the icon came from.

## Diagnostics

The pipeline reports layout issues as structured diagnostics instead of
throwing. Each record names the element, the failure kind
(`label-collision`, `route-failed`, `icon-unresolved`, …), and the
attempts it made:

```ts
const { svg, diagnostics } = renderDiagram(def)
for (const d of diagnostics) {
  console.warn(d.kind, d.message, d.element)
}
```

Use the red-tint markers in the SVG to find the problem visually, or the
diagnostics list to surface it in tests / CI.

## `.gg` text format & CLI

For diagrams embedded in docs or wikis there's a text format (`.gg`)
with a Mermaid-ish DSL and `doc { }` command blocks. The `gg` CLI
renders them to SVG / PNG / JSON:

```bash
gg diagram.gg -o out.svg
gg diagram.gg -o out.png --width 2048

gg render diagram.gg -o out.svg       # explicit form (same as above)
gg icons --search database            # search 6,000+ built-in Tabler icons
gg icons --tag cloud --limit 20       # or filter by tag
gg llm                                # emit the full LLM reference bundle
gg license                            # bundled third-party notices
```

The CLI is built on [citty](https://github.com/unjs/citty) and ships as
a single self-contained binary from the
[GitHub Releases](https://github.com/ideamans/gridgram/releases) page —
no npm install required.

## AI-agent integrations

gridgram is built for LLM-driven workflows out of the box:

- **`gg llm`** emits a one-shot Markdown (or `--format json`) reference
  covering the `.gg` grammar, CLI surface, `doc { }` settings, icon
  resolution, JSON envelope shape, and canonical examples. Drop it
  into an agent's context to eliminate guesswork.
- **`gg icons`** provides semantic search over 5,039 outline + 1,053
  filled Tabler icons with a scored query model
  (`name` / `label` / `tags` / `category`). `src/data/icon-tags.json`
  adds gridgram-authored synonyms so common architecture terms
  (`cache`, `microservice`, `kubernetes`, `loadbalancer`, …) surface
  the right generic icons.
- **[`/llms.txt`](https://llmstxt.org/) and `/llms-full.txt`** on the
  docs site index and concatenate every page plus the LLM reference.
- **[`context7.json`](./context7.json)** registers gridgram with
  [context7](https://context7.com/) so agents can fetch the docs over
  MCP.
- **Claude Code / gh skill plugin** at
  [`plugins/gridgram`](./plugins/gridgram) — install via the
  [`ideamans/claude-public-plugins`](https://github.com/ideamans/claude-public-plugins)
  marketplace to get `/gg-render`, `/gg-icons`, and `/gg-author` skills.
  The same `SKILL.md` bundle is compatible with `gh skill install`,
  Cursor, Gemini CLI, Codex, and any other host that speaks the
  [Agent Skills](https://agentskills.io/) open standard.

## Runtime support

- **Browsers** — any ESM-friendly bundler (Vite, Rspack, esbuild, …). SVG only.
- **Node ≥ 22** — native ESM with import attributes. SVG only.
- **Bun** — any recent version. SVG only.
- **PNG** — CLI-only, via the `gg` binary.

## License

MIT — see [`LICENSE`](./LICENSE). Bundled third-party notices (Tabler
icons, Preact, json5, sharp, …) are reproduced in
[`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md), and the `gg`
binary prints the same text via `gg --license`.

PNG output is CLI-only and depends on **[libvips](https://github.com/libvips/libvips)**
(LGPL-2.1-or-later). The `gg` binary does not bundle it: on first PNG
render, `sharp` and a prebuilt libvips for your platform are fetched
from the npm registry into `~/.cache/gridgram/` and loaded dynamically,
so the LGPL library remains user-replaceable.
