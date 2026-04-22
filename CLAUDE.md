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
bun run sync-tabler          # REQUIRED post-install: copies tabler JSON into
                             # src/data/, builds src/generated/icon-index.json,
                             # and rebuilds src/generated/llm-reference.md.
                             # (both src/data/ and src/generated/ are gitignored —
                             # typecheck/tests fail without this step)
bun run sync-licenses        # regenerate THIRD_PARTY_LICENSES.md + src/data/licenses.txt

bun run typecheck            # tsc --noEmit (strict)
bun test                     # run full unit test suite
bun test tests/unit/router.test.ts        # single file
bun test --test-name-pattern "blob"       # filter by name

bun run gg <file.gg> [opts]  # run CLI from source (no compile)
bun run compile              # produce ./gg single-file binary (bun --compile)

bun run ai:regen             # regenerate all LLM-facing artifacts:
                             #   src/generated/icon-index.json
                             #   src/generated/llm-reference.md
                             #   docs/public/llms.txt + llms-full.txt
bun run validate-plugin-skills  # check plugins/**/SKILL.md against the
                                # Agent Skills open standard

bun run docs:dev             # vitepress dev (builds examples, logo, llms.txt first)
bun run docs:build           # production docs build (same pre-steps)
```

CI runs `bun install --frozen-lockfile && bun run sync-tabler && bun run ai:regen && bun run typecheck && bun test` on Ubuntu (see `.github/workflows/test.yml`). Release workflow cross-compiles `gg` for linux/darwin/windows × amd64/arm64 on tag push.

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

- **Tabler** is the built-in icon set. JSON dumps live in `src/data/tabler-outline.json` and `src/data/tabler-filled.json`, copied from `node_modules/@tabler/icons` by `scripts/sync-tabler-icons.ts`. `src/data/*` is gitignored (except for `icon-tags.json` — see below) — always re-run `bun run sync-tabler` after a fresh checkout.
- `src/tabler.ts` exposes `tabler(name)`, `tablerOutline(name)`, `tablerFilled(name)` as VNode builders for the TS API.
- `.gg` icon resolution (`src/gg/icons.ts` + `icon-loader.ts`): priority is `doc { icons: … }` inline map > `--icons <dir>` / `iconsDir` auto-register > built-in tabler (`tabler/xxx`, `tabler/filled/xxx`) > error (flags the node with `iconError`, red ring).
- Asset aliases (`--alias name=dir` or `assetAliases`) expand `@name/x.svg` → `<dir>/x.svg`.
- **Icon search index** (`src/generated/icon-index.json`, built by `scripts/build-icon-index.ts`) — one record per icon+style pair: `{name, set, ref, label, category, tags}`. Feeds `gg icons` semantic search and the LLM reference bundle. Tabler's own tags cover most queries; `src/data/icon-tags.json` (hand-curated, **tracked**) patches misses (`cache`, `kubernetes`, `websocket`, `loadbalancer`, etc.). Adding a tag override here is almost always better than hardcoding synonyms in search logic.

### CLI structure (citty)

`src/cli/gg.ts` dispatches via [citty](https://github.com/unjs/citty) subcommands. Root-level help lives in `src/cli/args.ts` (shared between the bare `gg <file>` and explicit `gg render <file>` forms); per-command files are thin citty wrappers in `src/cli/commands/`. The pure render pipeline is `src/cli/render.ts` — no citty imports — so it can be called from tests or scripts.

- `gg render <file>` (alias: `gg <file>`) — SVG/PNG/JSON output
- `gg icons` — Tabler search over `icon-index.json`
- `gg llm` — emit the LLM reference (`--format markdown|json`)
- `gg license` — bundled third-party licenses

Non-standard citty behaviors worth remembering: `--no-X` gets translated to `X: false`, which collides with the `--config <path>` string arg, so `--no-config` is read directly from `rawArgs`. Repeated flags (`--alias a=b --alias c=d`) also need rawArgs parsing — citty only keeps the last value.

### LLM-facing artifacts (SSOT → derived)

Everything agents consume is generated from a single source of truth. Never hand-edit a file under `src/generated/`, `docs/public/llms.txt`, or `docs/public/llms-full.txt` — the source will overwrite it on the next `ai:regen`.

| Source of truth                              | Derived artifact                                |
| -------------------------------------------- | ----------------------------------------------- |
| `src/gg/dsl.ts` (leading BNF comment)        | LLM reference grammar section                   |
| `src/cli/args.ts` + `src/cli/commands/*`     | CLI help + LLM reference                        |
| `src/data/icon-tags.json` + tabler dumps     | `src/generated/icon-index.json`                 |
| `src/templates/llm-reference.template.md`    | `src/generated/llm-reference.md`                |
| `docs/en/**` + `src/generated/llm-reference.md` | `docs/public/llms.txt`, `docs/public/llms-full.txt` |

`context7.json` at the repo root registers gridgram with [context7](https://context7.com/). Its `rules` array calls out non-obvious gotchas (Preact-not-React, `doc { }` replaced legacy `%%{}%%`, diagnostics are warnings not exceptions, etc.) — add to it only when a gotcha isn't surfaced anywhere else.

### Project-local Claude Code state

`.claude/rules/` and `.claude/skills/` are committed; everything else under `.claude/` is gitignored (settings.local.json, scheduled_tasks.lock, caches).

- `.claude/rules/ai-artifacts-policy.md` — policy listing every generated file and its SSOT. Loaded every session.
- `.claude/rules/regen-triggers.md` — `paths:`-scoped rule, loads only when the user edits one of the SSOT files; reminds the session to run `/regen-ai`.
- `.claude/skills/regen-ai/SKILL.md` — `/regen-ai` slash command. Runs the three generators + typecheck + tests.

### Plugin distribution

`plugins/gridgram/` is the gridgram plugin for Claude Code marketplaces and `gh skill`. Three skills (`gg-render`, `gg-icons`, `gg-author`) use **only** Agent Skills standard fields (`name`, `description`, `license`, `compatibility`, `allowed-tools`, `metadata`) — no Claude-specific frontmatter — so the same bundle also works with Copilot, Cursor, Gemini CLI, and Codex. `scripts/validate-plugin-skills.ts` enforces that; see `plugins/gridgram/PUBLISH.md` for the release checklist and the marketplace-side entry lives in `~/dev/claude-plugins` (separate repo).

### Diagnostics

The layout pipeline surfaces placement/routing/icon issues as `PlacementDiagnostic[]` (see `src/gg/diagnostics.ts`) instead of throwing. `renderDiagram` returns them alongside the SVG; the CLI's `--diagnostics` flag writes them as JSON to stderr. When layout can't satisfy a constraint (label collision with no free candidate, connector routing failure, unresolved icon) the renderer draws a red marker unless `suppressErrors` / `--no-errors` is set. **Don't turn these into thrown errors** — callers like the docs `<Example>` builder and the future MCP surface rely on rendering-with-warnings.

## Style conventions

- **Single quotes, no semicolons, 120-col lines** (matches the Prettier settings common across the user's projects — no `.prettierrc` in this repo).
- **Preact imports**: `import { h } from 'preact'` — never React.
- **Strict TypeScript** with `allowImportingTsExtensions`; `types: ["bun", "node"]`. No emit — `tsc` is typecheck-only.
- Tests are **Bun's built-in test runner** (`import { test, expect } from 'bun:test'`), colocated under `tests/unit/*.test.ts`. No Jest/Vitest.

## Examples and docs

Every `examples/<name>/` directory holds a **pair**: `diagram.gg` (CLI form) and `diagram.ts` (TS-API form) that must render identically. `scripts/build-docs-examples.ts` batches them into `docs/public/examples/` (both SVGs, both sources) so VitePress's `<Example name="…" />` component can show CLI↔TS-API tabs side by side. When adding a feature that touches the spec, add or update an example pair — the docs loop `bun run docs:examples` runs before dev/build and will surface rendering drift.
