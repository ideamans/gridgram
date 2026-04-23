---
title: llms.txt — public discovery files
description: The two root-level text files that make gridgram's docs retrievable by any LLM agent without prior setup.
---

# `llms.txt` — public discovery files

gridgram's docs site serves two files at the root of the deployed
domain. They follow the [llmstxt.org](https://llmstxt.org/) convention
and the Mintlify / Anthropic "full bundle" convention respectively.

| File                                                                     | Size      | Contents                                                                                                       |
| ------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------- |
| [`/llms.txt`](https://gridgram.ideamans.com/llms.txt)                    | ~5 KB     | Markdown index: project name, one-line summary, grouped links to every English docs page plus the LLM bundle.  |
| [`/llms-full.txt`](https://gridgram.ideamans.com/llms-full.txt)          | ~230 KB   | Every docs page's markdown body concatenated end-to-end, followed by the full [`gg llm`](./cli#gg-llm) reference. |

Both are regenerated from `docs/en/**` at docs build time
(`bun run build-llms-txt`), so the links and content always match
the live site.

## When to use which

- **`/llms.txt`** — when an agent is crawling and needs an index to
  decide what to fetch next. Every link points at the raw `.md`
  source of a page (not the rendered HTML), so the agent can
  consume it directly.
- **`/llms-full.txt`** — when you want to **hand an agent the whole
  docs tree plus the grammar reference in one payload**. Around
  230 KB fits comfortably in modern context windows; saves the
  agent from N round-trips.

## Quick examples

### Feed the bundle to a CLI agent

```sh
curl -s https://gridgram.ideamans.com/llms-full.txt | your-agent --context -
```

### Check the index from a shell

```sh
curl -s https://gridgram.ideamans.com/llms.txt | head -30
```

### Extract the LLM reference block

```sh
curl -s https://gridgram.ideamans.com/llms-full.txt \
  | sed -n '/<!-- source: src\/generated\/llm-reference.md -->/,$p'
```

## Relationship to the other surfaces

These files are a **discovery** channel, not a replacement for the
other paths in this guide:

- If you control an agent and can install plugins, the
  [Claude plugin](./claude-plugin) or [`gh skill`](./gh-skill)
  gives you slash-command authoring on top of the CLI.
- If you want retrieval over MCP (the `context7` protocol),
  [context7](./context7) indexes the same docs but exposes them
  through an MCP server.
- If you only have read-only HTTP, `llms.txt` / `llms-full.txt` is
  the zero-setup path — no auth, no config, just `curl`.

An agent that walks `/llms.txt` can find everything else (including
`/llms-full.txt` itself, the GitHub releases, and the plugin
install commands), so it's a good single entry point if you're not
sure what's available.

## Languages

Only the English docs (`docs/en/**`) feed these files. Japanese
pages (`docs/ja/**`) are not indexed — gridgram is registered as an
English-primary library on context7, and keeping a single agent-facing
locale avoids the risk of agents mixing translations mid-answer.

## Source

The generator is `scripts/build-llms-txt.ts` in the gridgram repo.
It's wired into `bun run ai:regen` and into `docs:build`, so a fresh
deploy always ships current files. The source of truth is simply
`docs/en/**/*.md` — there's no hand-maintained link list.
