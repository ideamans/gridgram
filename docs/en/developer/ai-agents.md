---
title: AI agents
description: How gridgram exposes itself to LLM agents — `gg llm`, `gg icons`, llms.txt, context7, and the Claude Code / gh skill plugin.
---

# AI agents

gridgram is built from the ground up for agent-driven workflows. An LLM
can author a `.gg` file, render it, read back diagnostics, and iterate —
all without human intervention. This page catalogs every surface the
project exposes for that.

## Single CLI entry point

The `gg` CLI does everything an agent needs. Four subcommands:

```bash
gg render <file.gg> [--format svg|png|json] [--diagnostics]
gg icons  --search <query> [--tag <tag>] [--set tabler-outline|tabler-filled]
gg llm    [--format markdown|json]
gg license
```

- **`gg render`** — the default. `gg <file>` without a subcommand is a
  shortcut for `gg render <file>`. Returns a non-zero exit code on parse
  or integrity errors; `--diagnostics` emits structured warnings to
  stderr even on successful renders. See [Diagnostics](./diagnostics).
- **`gg icons`** — semantic search over 5,039 outline + 1,053 filled
  Tabler icons. Scoring: exact name 10, prefix 7, exact tag 5, substring
  matches 1–4. Details below.
- **`gg llm`** — the one-stop agent reference. Everything on this page,
  plus the full `.gg` BNF grammar and canonical examples, in a single
  Markdown (or `--format json`) payload.
- **`gg license`** — bundled third-party notices. Same as the
  `--license` flag.

Everything the `gg` binary does is also callable through the
TypeScript API — see [renderDiagram & friends](./render).

## `gg llm` — the one-shot agent reference

An agent with no prior context can run:

```bash
gg llm
```

…and receive a Markdown document covering:

- CLI usage for every subcommand
- `.gg` grammar (BNF) and statement semantics
- Document-level settings (`doc { … }` keys)
- Icon resolution order (inline map → `--icons` → built-in Tabler → error)
- Exit codes (0 success, 1 parse error, 2 integrity error, 3 I/O)
- JSON envelope shape returned by `gg render --format json`
- Canonical examples from the `examples/` directory
- Best-practices checklist

`gg llm --format json` returns a structured view:

```json
{
  "version": "0.3.0",
  "iconCounts": { "outline": 5039, "filled": 1053, "total": 6092 },
  "grammar": "…BNF…",
  "reference": "…full markdown…"
}
```

The Markdown is regenerated from source (BNF comment in
`src/gg/dsl.ts`, CLI arg schema, canonical examples) on every build, so
it can never drift from the implementation.

## `gg icons` — semantic icon search

Agents rarely guess icon names correctly. `gg icons` provides a scored
search over every built-in icon and can be chained with other CLI
tools:

```bash
# Find an icon for a concept.
gg icons --search "database" --limit 5

# List frequent tags (useful when the right keyword isn't obvious).
gg icons --tags --limit 20

# Filter by tag.
gg icons --tag queue --limit 10

# JSON output for programmatic consumption.
gg icons --search "loadbalancer" --format json --limit 3
```

The index is built from Tabler's own metadata (category + 5–15 tags per
icon), unioned with gridgram-authored overrides in
`src/data/icon-tags.json` that fill common architecture-diagram gaps
(`cache`, `microservice`, `kubernetes`, `websocket`, `loadbalancer`,
`frontend`, `backend`, `client`, `payment`, `monitoring`, …).

### Recommended agent flow

1. Try `gg icons --search <term>`. Score ≥ 5 results are usually solid.
2. If nothing scores above 2, broaden with `gg icons --tags` and pivot
   on a related tag.
3. Reference the chosen icon from `.gg` as `tabler/<name>` (outline) or
   `tabler/filled/<name>` (filled).

## Public discovery files

The docs site exposes the two files defined by the
[llmstxt.org](https://llmstxt.org/) convention:

- **[`/llms.txt`](/llms.txt)** — a grouped link index of every English
  documentation page plus the LLM reference bundle.
- **[`/llms-full.txt`](/llms-full.txt)** — every documentation page's
  markdown concatenated together, followed by the full `gg llm`
  reference. Usable as a single-payload context dump for an agent.

Both are generated from `docs/en/**` at build time and stay in sync
with the published docs.

## `context7.json`

[context7](https://context7.com/) indexes open-source docs for
retrieval by MCP-connected agents. gridgram ships a
[`context7.json`](https://github.com/ideamans/gridgram/blob/main/context7.json)
manifest at its repo root that tells context7:

- which folders to index (`docs/en`, `examples`, `src/generated`)
- which to skip (`docs/.vitepress`, `tests`, `src/data`)
- a short set of **rules** — the non-obvious constraints agents are
  most likely to get wrong (Preact not React; diagnostics are
  warnings, not exceptions; `doc { … }` replaced the legacy `%%{…}%%`
  directive; etc.)

An agent connected to context7 can fetch gridgram's reference from
`context7.com/ideamans/gridgram` without needing prior knowledge of the
repository.

## Claude Code / gh skill plugin

The repository contains a ready-to-publish plugin under
`plugins/gridgram/` built on the
[Agent Skills](https://agentskills.io/) open standard. Three skills:

- **`/gg-render`** — render a `.gg` file, validate first, surface
  diagnostics.
- **`/gg-icons`** — drive the semantic search workflow above.
- **`/gg-author`** — compose a new diagram from a natural-language
  description, validate, and render.

Every `SKILL.md` uses only the standard frontmatter (`name`,
`description`, `license`, `compatibility`, `allowed-tools`), so the
same bundle works with Claude Code, Copilot (via
[`gh skill install`](https://cli.github.com/manual/gh_skill_install)),
Cursor, Gemini CLI, Codex, and any other host that speaks the spec.

### Installing in Claude Code

```text
/plugin marketplace add ideamans/claude-plugins
/plugin install gridgram@ideamans-plugins
```

### Installing via `gh skill`

```bash
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render --agent claude-code
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author
```

`gh skill install` writes `repository` / `ref` / tree-SHA provenance
directly into each `SKILL.md`'s frontmatter, so `gh skill update`
detects content changes even without a version bump.

## Programmatic use from the TypeScript API

Everything the CLI does is available from the library:

```ts
import { parseGg, renderDiagram, type DiagramDef } from 'gridgram'

const source = '/* .gg source from anywhere */'
const { def, errors } = parseGg(source)
if (errors.length > 0) throw errors
const { svg, diagnostics } = renderDiagram(def as DiagramDef)
// svg is a standalone <svg …>…</svg> string
// diagnostics is a structured list (empty == clean)
```

See [Diagnostics](./diagnostics) for the diagnostic shape, and
[Integrations](./integrations) for patterns like exposing gridgram
over HTTP or as an MCP tool.

## Determinism

Given the same `DiagramDef`, the pipeline produces **byte-identical SVG**
output across runs and surfaces. Agents that commit `.gg` source to git
can read every AI edit as a diff and pin SVG baselines in CI. See the
[Specification](./spec) for the full determinism contract.
