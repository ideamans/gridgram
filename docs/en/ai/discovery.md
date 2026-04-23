---
title: Discovery files — llms.txt, llms-full.txt, context7
description: How an LLM agent finds gridgram's documentation without being told about it.
---

# Discovery files

The `gg llm` reference is only useful if the agent already has the
binary installed. For agents that are browsing the open web or using
retrieval-augmented search, gridgram ships three discovery surfaces.

## `/llms.txt`

An index file following the [llmstxt.org](https://llmstxt.org/)
convention, served from the root of the docs site:

<https://gridgram.ideamans.com/llms.txt>

The file is Markdown with an H1 + blockquote + H2-delimited sections.
Every link points at the `.md` source of a docs page so agents can
fetch raw markdown directly:

```markdown
# gridgram

> Grid-based diagram rendering library and CLI. Renders `.gg` DSL or
> a TypeScript `DiagramDef` to SVG / PNG / JSON with deterministic
> layout and 6,000+ built-in Tabler icons.

gridgram is designed for agent/LLM workflows. The `gg` CLI exposes
`render`, `icons` (semantic icon search), `llm` (this reference as a
single bundle), and `license`.

## Home
- [Gridgram](https://gridgram.ideamans.com/en.md)

## Guide
- [Quick start](https://gridgram.ideamans.com/en/guide.md)
- …

## Developer
- [Developer Guide](https://gridgram.ideamans.com/en/developer.md)
- …

## LLM reference (single bundle)
- [gridgram LLM reference](https://gridgram.ideamans.com/llms-full.txt)
```

The file is regenerated from `docs/en/**` on every docs build
(`bun run build-llms-txt`), so the link list always reflects the
published site.

## `/llms-full.txt`

The Mintlify/Anthropic convention for a **single concatenated
payload**. Every docs page's Markdown body, separated by source
comments, followed by the full `gg llm` reference:

<https://gridgram.ideamans.com/llms-full.txt>

Around 210 KB for the current docs tree. Usable as a one-shot context
dump for an agent that has enough window to swallow it:

```bash
curl -s https://gridgram.ideamans.com/llms-full.txt | your-agent --context -
```

Prefer `llms-full.txt` when you need the docs on top of the generated
reference; prefer `gg llm` locally when you just want the reference
without the human-oriented tutorials.

## `context7.json`

[context7](https://context7.com/) indexes open-source documentation
for retrieval over MCP. Libraries register themselves by placing a
`context7.json` manifest at their repository root. gridgram's lives
at:

<https://github.com/ideamans/gridgram/blob/main/context7.json>

The manifest tells context7 which folders to index, which to skip,
and a short set of hand-picked rules that are easy for agents to
get wrong. For gridgram those rules cover:

- Preact, not React (components return VNodes via `h()`).
- `doc { … }` replaced the legacy `%%{…}%%` directive — reject the
  old form even though older docs might still show it.
- Diagnostics are **warnings** returned alongside a successful render,
  not exceptions to catch.
- Coordinates accept A1 strings (`@A1`), 1-based tuples (`@1,1`), or
  `{col,row}` objects. Internal layers consume 0-based normalized
  positions only.
- Icons are referenced as `tabler/<name>` (outline) or
  `tabler/filled/<name>` (filled).

Once an agent is connected to context7 (many Claude Code sessions are
by default), it can fetch gridgram's reference from
`context7.com/ideamans/gridgram` without needing any prior knowledge
of the repository.

### Testing the integration

With the `context7` MCP server running, an agent can invoke:

- `resolve-library-id("gridgram")` — confirm gridgram is indexed.
- `query-docs("how do I draw a region in gg")` — retrieve the docs
  pages most relevant to the query.

If the tool returns no results, the repo may not have been re-indexed
yet after registration. See the context7 docs for the refresh cadence.

## How they compose

| You need…                                                            | Reach for…                 |
| -------------------------------------------------------------------- | -------------------------- |
| Teach an agent session with a single paste                           | `gg llm` (local) or `/llms-full.txt` (remote) |
| An agent to crawl the docs site in the background                    | `/llms.txt`                |
| An MCP-connected agent to retrieve just the relevant pages           | context7                   |
| A repeatable reference bundled with the CLI, no network needed       | `gg llm`                   |
| An agent to list pages without ingesting them first                  | `/llms.txt`                |

Putting all three in place means: agents that know gridgram reach for
`gg llm`; agents that don't can still stumble onto it via crawlers,
context7, or `/llms.txt`.
