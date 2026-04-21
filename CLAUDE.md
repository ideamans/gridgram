# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**gridgram** — a grid-based diagram rendering library and CLI. Two surfaces share one rendering pipeline:

- **`gg` CLI** consuming `.gg` files (DSL + `doc { … }` blocks) → SVG / PNG / normalized-JSON
- **TypeScript API** consuming a `DiagramDef` → `renderDiagram(def, opts)` returns `{ svg, diagnostics }`

`gridgram.md` is the authoritative design spec but parts are out of date: the parser no longer accepts `%%{…}%%` directives — use `doc { … }` command statements instead. Treat live code (`src/gg/parser.ts`, `src/gg/dsl.ts`, `docs/en/guide/`) as ground truth when the spec disagrees.

## Runtime and commands

This project **requires Bun**, not Node/npm/yarn. TypeScript is executed directly by Bun (no transpile step for dev).

```bash
bun install                  # install deps
bun run sync-tabler          # REQUIRED post-install: copies tabler JSON into src/data/
                             # (src/data/ is gitignored — typecheck/tests fail without it)
bun run sync-licenses        # regenerate THIRD_PARTY_LICENSES.md + src/data/licenses.txt

bun run typecheck            # tsc --noEmit (strict)
bun test                     # run full unit test suite
bun test tests/unit/router.test.ts        # single file
bun test --test-name-pattern "blob"       # filter by name

bun run gg <file.gg> [opts]  # run CLI from source (no compile)
bun run compile              # produce ./gg single-file binary (bun --compile)

bun run docs:dev             # vitepress dev (builds examples + logo first)
bun run docs:build           # production docs build
```

CI runs `bun install --frozen-lockfile && bun run typecheck && bun test` on Ubuntu (see `.github/workflows/test.yml`). Release workflow cross-compiles `gg` for linux/darwin/windows × amd64/arm64 on tag push.

## Architecture

The rendering pipeline is intentionally layered so every surface (CLI, TS API, future MCP/HTTP) funnels through one place. Key boundaries:

```
.gg text ─► gg/parser ─► DiagramDef ─┐
                                     ├─► config.resolveSettings (layered merge)
TS user's DiagramDef ────────────────┤
                                     ▼
                            normalize (A1/tuple→0-based; auto-position)
                                     ▼
                            icon-loader + gg/icons  (resolve src → SvgFragment)
                                     ▼
                            layout/pipeline.resolveDiagram
                              • geometry/grid, connector-path, router, blob
                              • layout/{node,connector,region}-label, note-layout
                              • geometry/collision + label-placer (with diagnostics)
                                     ▼
                            components/Diagram (Preact h() tree)
                                     ▼
                            preact-render-to-string → SVG string
                                     ▼
                            sharp (optional, PNG only)
```

### Layered settings

Everything merge-eligible goes through `src/config.ts`. Order (earliest = lowest priority):

1. `SYSTEM_DEFAULTS` (prepended automatically)
2. Project config — `gridgram.config.{ts,js,json,json5}` discovered by walk-up from cwd (`src/config-loader.ts`)
3. Document layer — embedded `cellSize`/`padding`/`columns`/`rows`/`theme` from the `DiagramDef` (or `.gg`'s `doc { }`)
4. Override layer — CLI flags or `renderDiagram`'s `opts` argument

`DiagramSettings` is the merge-eligible shape; `ResolvedSettings` is what comes out. Don't branch on surface ("if CLI…") past `resolveSettings` — new flags should be added to `DiagramSettings` and flow through naturally.

### Coordinate normalization

`src/normalize.ts` turns any user-facing `GridPosInput` (A1 string, `[col,row]` tuple, `{col,row}` object — 1-based) into the canonical 0-based `GridPos`. It also auto-fills node positions in declaration order, wrapping at `columns` when set. **Everything downstream (geometry/, layout/, components/) consumes `NormalizedDiagramDef` only** — don't plumb raw input types deeper.

### `.gg` parser pipeline

`src/gg/parser.ts` is the fold step:

1. `tokenize()` (dsl.ts) — character stream → tokens
2. `parseStatements()` (dsl.ts) — tokens → statement nodes
3. Fold: deep-merge each `doc { … }` body into settings; concat nodes/connectors/regions/notes; track first-declaration line for each node id
4. `checkIntegrity()` (integrity.ts) — duplicate ids, unknown connector/note references, spans in bounds, region 4-connectedness (no disjoint spans)

Parse errors have `source !== 'check'`; integrity errors have `source === 'check'`. CLI distinguishes them: exit code 1 vs 2. Errors carry source-location info consumed by `formatError()`.

### Rendering framework

**Preact, not React.** `src/components/Diagram.ts` uses `h()` from `preact` and `renderToString` from `preact-render-to-string`. All `*.ts` component files return VNodes via `h()` directly (no TSX). `SvgFragment` (in `src/types.ts`) is the universal "something embeddable in SVG" type — string / VNode / number / falsy / nested array.

### Icons

- **Tabler** is the built-in icon set. JSON dumps live in `src/data/tabler-outline.json` and `src/data/tabler-filled.json`, copied from `node_modules/@tabler/icons` by `scripts/sync-tabler-icons.ts`. `src/data/` is gitignored — always re-run `bun run sync-tabler` after a fresh checkout.
- `src/tabler.ts` exposes `tabler(name)`, `tablerOutline(name)`, `tablerFilled(name)` as VNode builders for the TS API.
- `.gg` icon resolution (`src/gg/icons.ts` + `icon-loader.ts`): priority is `doc { icons: … }` inline map > `--icons <dir>` / `iconsDir` auto-register > built-in tabler (`tabler/xxx`, `tabler/filled/xxx`) > error (flags the node with `iconError`, red ring).
- Asset aliases (`--alias name=dir` or `assetAliases`) expand `@name/x.svg` → `<dir>/x.svg`.

### Diagnostics

The layout pipeline surfaces placement/routing/icon issues as `PlacementDiagnostic[]` (see `src/gg/diagnostics.ts`) instead of throwing. `renderDiagram` returns them alongside the SVG; the CLI's `--diagnostics` flag writes them as JSON to stderr. When layout can't satisfy a constraint (label collision with no free candidate, connector routing failure, unresolved icon) the renderer draws a red marker unless `suppressErrors` / `--no-errors` is set. **Don't turn these into thrown errors** — callers like the docs `<Example>` builder and the future MCP surface rely on rendering-with-warnings.

## Style conventions

- **Single quotes, no semicolons, 120-col lines** (matches the Prettier settings common across the user's projects — no `.prettierrc` in this repo).
- **Preact imports**: `import { h } from 'preact'` — never React.
- **Strict TypeScript** with `allowImportingTsExtensions`; `types: ["bun", "node"]`. No emit — `tsc` is typecheck-only.
- Tests are **Bun's built-in test runner** (`import { test, expect } from 'bun:test'`), colocated under `tests/unit/*.test.ts`. No Jest/Vitest.

## Examples and docs

Every `examples/<name>/` directory holds a **pair**: `diagram.gg` (CLI form) and `diagram.ts` (TS-API form) that must render identically. `scripts/build-docs-examples.ts` batches them into `docs/public/examples/` (both SVGs, both sources) so VitePress's `<Example name="…" />` component can show CLI↔TS-API tabs side by side. When adding a feature that touches the spec, add or update an example pair — the docs loop `bun run docs:examples` runs before dev/build and will surface rendering drift.
