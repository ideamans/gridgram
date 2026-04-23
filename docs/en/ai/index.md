---
title: AI Guide
description: Using gridgram with LLM agents — the `gg llm` reference bundle, semantic icon search, public discovery files, and the Claude Code / gh skill plugin.
---

# AI Guide

Gridgram is built from the ground up to be **author-able by an LLM
agent**. You can describe what you want in natural language and have
Claude, Cursor, or any other coding agent produce a valid `.gg` file,
render it, and iterate on diagnostics — all without handing the agent
a separate reference document.

This guide walks through the surfaces gridgram exposes to agents and
how to use each of them as a human (or as the agent's instructor).

## At a glance

| Surface                         | What it is                                                                                | Who runs it       |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ----------------- |
| [`gg llm`](./cli#gg-llm)        | One-shot Markdown / JSON reference: grammar, CLI, icons, JSON envelope, examples.         | Any agent or shell |
| [`gg icons`](./cli#gg-icons)    | Semantic search over 6,092 built-in Tabler icons, scored.                                 | Any agent or shell |
| [`/llms.txt`](./discovery)      | Index of the docs site, [llmstxt.org](https://llmstxt.org/) convention.                   | Agent crawlers    |
| [`/llms-full.txt`](./discovery) | Every docs page concatenated + the `gg llm` reference. One-payload context.               | Agent crawlers    |
| [`context7.json`](./discovery#context7)  | Manifest that registers gridgram with [context7](https://context7.com/) for MCP consumers. | MCP-connected agents |
| [`plugins/gridgram`](./plugin)  | Claude Code + `gh skill` distribution of three skills (`gg-render`, `gg-icons`, `gg-author`). | Plugin hosts      |

## Reading order

1. **[CLI surfaces](./cli)** — `gg llm` and `gg icons`, with the exact
   commands an agent should run. Start here even if you don't plan to
   use the other surfaces; these two alone are enough to drive most
   agent workflows.
2. **[Discovery files](./discovery)** — `/llms.txt`, `/llms-full.txt`,
   and `context7.json`. How agents find gridgram without being told
   about it.
3. **[Plugin distribution](./plugin)** — installing gridgram as an
   Agent Skills plugin in Claude Code, via `gh skill`, or in any
   other host that speaks the spec.
4. **[End-to-end workflow](./workflow)** — a worked example: ask
   Claude to draw an architecture diagram, show the exact prompts,
   the agent's `.gg` output, and how to iterate on diagnostics.

## Why this exists

Most LLMs don't know what a `.gg` file looks like. Teaching them by
pasting documentation into a chat works but is brittle:

- The reference grows stale as gridgram evolves.
- Each agent session starts from zero.
- The agent can't see which icons actually exist in the bundled set.
- Layout failures (collisions, routing) are hidden — the agent just
  sees the SVG output.

Every surface on this page solves one of those problems:

- **`gg llm`** keeps the reference in the agent's reach, regenerated
  from source on every build. No drift.
- **`gg icons`** gives the agent a programmatic search over the real
  icon set, so it picks names that exist.
- **`--diagnostics`** surfaces layout issues as structured JSON the
  agent can read and react to.
- **`/llms.txt` and `context7.json`** make the above discoverable
  without anyone telling the agent about gridgram first.

## Quick test (~60 seconds)

If you have `gg` installed and Claude Code running, you can try the
plugin workflow right now:

```text
/plugin marketplace add https://github.com/ideamans/claude-public-plugins.git
/plugin install gridgram@ideamans-plugins
```

Then ask Claude:

> Draw me a diagram showing a web frontend calling an API backed by a
> Postgres database and a Redis cache. Use the gridgram plugin.

Claude will:

1. Call `/gg-icons` to pick the right icons.
2. Call `/gg-author` to compose a `.gg` file.
3. Call `/gg-render` to produce an SVG, checking diagnostics.

See [End-to-end workflow](./workflow) for the full dialogue and what
to tweak when the first pass isn't what you wanted.
