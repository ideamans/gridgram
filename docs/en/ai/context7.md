---
title: context7 tutorial
description: Give an MCP-capable agent read-only access to gridgram's docs through context7 — no plugin install needed.
---

# context7 tutorial

[context7](https://context7.com/) indexes open-source documentation
for retrieval over [MCP](https://modelcontextprotocol.io/). gridgram
registers itself with context7 via a `context7.json` manifest, so any
MCP-connected agent can query gridgram's docs without installing
anything gridgram-specific.

**Time**: ~5 minutes (most of it is configuring your MCP client).
**Result**: your agent can pull gridgram docs on demand.

Unlike [the Claude plugin](./claude-plugin) or
[`gh skill`](./gh-skill), this path is **retrieval-only** — it gives
the agent a searchable view of gridgram's documentation but no
slash commands and no automatic CLI driving. For a full authoring
workflow, pair it with one of the other two.

## Prerequisites

- **An MCP-capable agent host**: Claude Code, Cursor, or anything
  else that can run [MCP servers](https://modelcontextprotocol.io/).
- **[context7 MCP server](https://github.com/upstash/context7)** —
  usually added as an MCP server in the agent's config.
- **Network access** to `context7.com`.

No git, no `gh`, no binaries on PATH. Everything is pulled over MCP
at query time.

## 1. Add the context7 MCP server

### Claude Code

Claude Code's MCP configuration lives in `~/.claude/settings.json`
(user scope) or `.claude/settings.json` (project scope). Add:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

Restart Claude Code. The `context7` tools should now appear in
`/mcp`.

### Cursor and others

Follow each host's MCP configuration docs; the `command` + `args`
above is portable. Cursor writes MCP settings to
`~/.cursor/mcp.json`.

## 2. Verify context7 sees gridgram

Ask your agent:

> Look up the `gridgram` library on context7.

The agent calls `resolve-library-id("gridgram")`, which should return
something like `/ideamans/gridgram`. If it returns "not found", the
library hasn't been indexed yet — see
[Registration](#registration-if-not-yet-indexed) below.

## 3. Query gridgram docs

Try:

> Using context7, fetch gridgram's `.gg` grammar reference and
> explain how to declare an `icon` node.

The agent calls `query-docs` against the resolved library id and
gets back the relevant doc sections. Because context7 indexes
`docs/en`, `examples/`, and `src/generated/` (per the
`context7.json` manifest), the agent sees:

- The English user + developer + AI guide pages (this whole site).
- Canonical `.gg` examples.
- The generated `src/generated/llm-reference.md` bundle.

It does **not** see `docs/ja/`, tests, or internal source files.

## 4. Pair context7 with authoring

context7 alone can't run `gg`. Combine it with one of:

- [Claude Code plugin](./claude-plugin) — the most ergonomic
  pairing; slash commands render while context7 provides retrieval
  for anything the skill bodies don't cover.
- [`gh skill`](./gh-skill) — same skills in other hosts.

The agent will naturally use context7 when it needs background
information and the plugin skills when it needs to invoke `gg`.

## 5. Staying up to date

context7 **re-indexes automatically** from the GitHub repository
whenever gridgram's default branch changes. There's nothing to
update on your side; a new release of gridgram becomes available in
context7 within a few minutes of the merge.

You don't "install" a version of context7-backed gridgram docs — the
agent always gets the current default branch view.

## Registration (if not yet indexed)

If `resolve-library-id("gridgram")` returns "not found", context7
hasn't seen the repo yet. gridgram's `context7.json` is already in
place at the repo root, but the initial submission happens once per
library:

- Visit <https://context7.com/add-package>.
- Paste `https://github.com/ideamans/gridgram`.
- context7 crawls the repo, validates the manifest, and indexes.

Once listed on <https://context7.com>, every MCP client can discover
it. This step is only needed once per library; future re-indexes
happen automatically.

## The `context7.json` manifest

For reference, gridgram's manifest at the repo root tells context7:

- Index `docs/en`, `examples`, and `src/generated`.
- Skip `docs/.vitepress`, `docs/ja`, `node_modules`, `tests`,
  `dist`, and `src/data`.
- Apply a small set of hand-picked **rules** — the non-obvious
  constraints agents are most likely to get wrong (Preact not React,
  `doc { … }` replaced the legacy `%%{…}%%` directive, diagnostics
  are warnings not exceptions, etc.).

See the [manifest on GitHub](https://github.com/ideamans/gridgram/blob/main/context7.json)
for the current content.

## Troubleshooting

### Agent says "no MCP tools available"

Restart the host. Most MCP clients only scan the config on startup.

### `resolve-library-id` returns a close-but-wrong match

Specify the org: `resolve-library-id("ideamans/gridgram")`. Otherwise
you may hit a different library called `gridgram` indexed earlier.

### Docs feel stale

The agent might be using its own training-time knowledge instead of
calling context7. Ask explicitly:

> Query context7 for the latest gridgram CLI flags.

## Where next

- [Claude Code plugin](./claude-plugin) — pair context7 with
  slash-command authoring.
- [`gh skill`](./gh-skill) — same skill bundle in other hosts.
- [llms.txt](https://gridgram.ideamans.com/llms.txt) /
  [llms-full.txt](https://gridgram.ideamans.com/llms-full.txt) — if
  you'd rather hand the docs to an agent as a single payload
  without MCP.
