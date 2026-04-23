---
title: CLI reference — gg llm and gg icons
description: Reference for the two gg subcommands that power the AI-agent workflow. One dumps a full reference; the other searches the built-in Tabler icon set semantically.
---

# CLI reference for AI workflows

This is a **reference page**, not a tutorial. Start with one of the
tutorials ([Claude plugin](./claude-plugin) / [`gh skill`](./gh-skill)
/ [context7](./context7)) if you haven't installed anything yet.

Two `gg` subcommands exist specifically for LLM consumption. Neither
needs network access; both are bundled in the `gg` single-file
binary. The skills in `plugins/gridgram` drive them on the agent's
behalf; you can also invoke them directly from a shell.

## `gg llm`

Emits a self-contained reference that teaches an agent everything it
needs to author `.gg` files. Pipe it into your agent's context on
session start.

### Markdown (default)

```sh
gg llm
```

The output covers:

- CLI usage for every subcommand
- `.gg` grammar (BNF) and statement semantics
- Document-level settings (`doc { … }` keys)
- Icon resolution order (inline map → `--icons` → built-in Tabler → error)
- Exit codes (0 success, 1 parse error, 2 integrity error, 3 I/O)
- JSON envelope shape returned by `gg render --format json`
- Canonical examples from the `examples/` directory
- Best-practices checklist for agent-authored diagrams

The Markdown is regenerated from source (the BNF comment in
`src/gg/dsl.ts`, the citty arg schema, the real example files) on
every build, so it can never drift from the implementation.

### JSON

```sh
gg llm --format json
```

Returns a structured view that agents can parse without worrying about
Markdown heuristics:

```json
{
  "version": "0.4.0",
  "iconCounts": { "outline": 5039, "filled": 1053, "total": 6092 },
  "grammar": "…BNF extracted from dsl.ts…",
  "reference": "…full Markdown body as a string…"
}
```

Useful when the agent just needs the version or the grammar block and
doesn't want to eat the rest of the Markdown.

### Agent prompt template

A good opening turn for a gridgram-authoring session:

```text
You are going to author diagrams in the gridgram `.gg` format.

The complete reference follows. It covers the grammar, CLI, icon
naming, and the JSON output shape.

---
<paste output of `gg llm`>
---

When you produce a `.gg` file:
1. Validate with `gg <file> --format json --diagnostics --stdout`
2. If the exit code is non-zero or diagnostics is non-empty, fix and retry.
3. Report the final `.gg` plus the diagnostics array.
```

## `gg icons`

Semantic search over the 6,092 built-in Tabler icons (5,039 outline +
1,053 filled). The index is generated at build time from Tabler's own
metadata, unioned with gridgram-authored synonym tags in
`src/data/icon-tags.json`.

### Commands

```sh
# Exact-concept search.
gg icons --search database --limit 5

# Browse available tags (useful when the keyword isn't obvious).
gg icons --tags --limit 30

# Filter by tag.
gg icons --tag queue --limit 10

# Restrict to a specific style.
gg icons --set tabler-filled --search star

# JSON output for agent consumption.
gg icons --search loadbalancer --format json --limit 3
```

### Output formats

**Plain text** (default) — tab-separated columns: `ref / label / category / tags`:

```
tabler/database        Database    Database    storage,data,memory,…
tabler/filled/database Database    Database    storage,data,memory,…
tabler/database-cog    Database cog Database   cog,configuration,…
```

**JSON** — each hit includes its score:

```json
[
  { "name": "database", "set": "tabler-outline", "ref": "tabler/database",
    "label": "Database", "category": "Database",
    "tags": ["storage", "data", "memory", "database", …],
    "score": 10 },
  …
]
```

### Scoring

| Score | Match type          |
| ----- | ------------------- |
| 10    | exact name          |
| 7     | name prefix         |
| 5     | exact tag           |
| 4     | name substring      |
| 3     | label substring     |
| 2     | category substring  |
| 1     | tag substring       |

Results are sorted by score descending, then alphabetically for ties.
Anything above score 5 is almost always the right pick.

### Recommended agent flow

1. **Try direct search first.** `gg icons --search <term> --format json --limit 5`.
2. **If top score ≤ 2, pivot on tags.** `gg icons --tags --limit 30` shows
   the frequency ranking; pick a related tag, then
   `gg icons --tag <tag> --limit 15`.
3. **Choose a reference string to embed.** Output the picked icon as
   `tabler/<name>` (outline) or `tabler/filled/<name>` (filled).

### Why the scoring matters

Tabler tags are rich (often 5–15 tags per icon), but they were written
for human browsing, not for architecture-diagram vocabulary. The
gridgram-authored overrides in `src/data/icon-tags.json` patch the
common misses:

- `cache` → `tabler/bolt`, `tabler/clock-play`
- `microservice` → `tabler/box`, `tabler/puzzle`
- `kubernetes` → `tabler/box-multiple`
- `websocket` → `tabler/plug`, `tabler/route`
- `loadbalancer` → `tabler/arrows-split`, `tabler/route`
- `frontend` → `tabler/browser`, `tabler/world`, `tabler/layout`
- `backend` → `tabler/server`, `tabler/database`
- `payment` → `tabler/credit-card`, `tabler/cash`

If you hit a concept that still returns poor results, file an issue —
the tag overrides are a user-facing knob intended to be extended.

## Verifying a rendered diagram

Every agent workflow should end in a validation step. `gg render`
combines the SVG output with a diagnostics stream:

```sh
gg render diagram.gg --format json --diagnostics --stdout > /tmp/envelope.json 2>/tmp/diag.json
```

- Exit code `1` → parse error. The error message is on stderr.
- Exit code `2` → integrity error (unknown node reference, region not
  4-connected, etc.).
- Exit code `0` with `/tmp/diag.json === "[]"` → clean render.
- Exit code `0` with non-empty diagnostics → SVG produced, but with
  warnings (missing icon, failed routing, etc.) that an agent should
  surface or retry on.

See the [Diagnostics page](/en/developer/diagnostics) for the full
diagnostic shape.
