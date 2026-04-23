---
title: AI Guide
description: Tutorials for using gridgram with LLM agents — Claude Code plugin, GitHub `gh skill`, and context7.
---

# AI Guide

Gridgram is built to be **author-able by an LLM agent**. You describe
what you want in natural language; an agent produces a valid `.gg`
file, renders it, reads back diagnostics, and iterates — no manual
reference-pasting required.

This guide is **task-oriented**. Pick one of the three usage paths
below and follow it end-to-end. Each tutorial starts from a clean
machine and ends with a rendered diagram plus the command to update
later.

## Three ways to use gridgram from an agent

| Tutorial                                  | Best for                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| [Claude Code plugin](./claude-plugin)     | You use Claude Code. Slash commands (`/gg-install`, `/gg-icons`, `/gg-author`, `/gg-render`) drive the whole workflow. |
| [`gh skill`](./gh-skill)                  | You want the same skill bundle installed into Copilot, Cursor, Gemini CLI, or Codex alongside (or instead of) Claude Code. |
| [context7 (MCP)](./context7)              | You want an agent to retrieve gridgram's docs via MCP without installing anything plugin-side. Read-only. |

You can mix and match. The Claude plugin includes a `/gg-install`
skill that fetches the CLI binary; `gh skill` gives you the same
skills in other hosts; context7 is a parallel retrieval channel that
works even without any plugin.

## What you'll need

None of this is installed by gridgram itself. Install whatever the
tutorial of your choice calls for before starting.

| Software                                                         | For which tutorial                    | Why                                    |
| ---------------------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| [git](https://git-scm.com/)                                      | All                                   | Plugin marketplaces clone over git.    |
| [Claude Code](https://code.claude.com/)                          | Claude plugin, context7               | Host that runs the skills / MCP.       |
| [GitHub CLI `gh`](https://cli.github.com/) (v2.90+)              | `gh skill`                            | Provides the `gh skill` subcommand.    |
| [Cursor](https://cursor.com/) / [Gemini CLI](https://github.com/google-gemini/gemini-cli) / [Codex](https://openai.com/index/introducing-codex/) | `gh skill` (optional target)          | Alternative skill hosts.               |
| `curl`, `tar`, `unzip` (windows)                                 | `/gg-install` runtime                 | Downloading the `gg` binary.          |
| `bun` ([install](https://bun.sh/))                               | Only if building `gg` from source     | You can use the release binary instead.|

You do **not** need to install the `gg` CLI manually — the Claude
plugin has a `/gg-install` skill that handles it, and `gh skill`
users can run the same skill after installing it.

## At a glance: what gridgram exposes

If you want the full tour before picking a tutorial:

- **[`gg llm`](./cli#gg-llm)** — one-shot Markdown / JSON reference
  teaching an agent the `.gg` grammar, CLI, icons, JSON envelope, and
  canonical examples.
- **[`gg icons`](./cli#gg-icons)** — scored semantic search over
  5,039 outline + 1,053 filled Tabler icons.
- **[`/llms.txt`](https://gridgram.ideamans.com/llms.txt) + [`/llms-full.txt`](https://gridgram.ideamans.com/llms-full.txt)** — public discovery files on the docs site.
- **[`context7.json`](https://github.com/ideamans/gridgram/blob/main/context7.json)** — registers gridgram for [context7](./context7) MCP retrieval.
- **[`plugins/gridgram`](https://github.com/ideamans/gridgram/tree/main/plugins/gridgram)** — four skills (`gg-install`, `gg-render`, `gg-icons`, `gg-author`) distributed via Claude Code and `gh skill`.

The [CLI reference page](./cli) documents `gg llm` and `gg icons` in
full — useful whether an agent is driving them through a skill or
you're running them manually in a terminal.

## Tutorials

Start here:

- **[Claude Code plugin](./claude-plugin)** — 10-minute path if you
  already use Claude Code.
- **[`gh skill`](./gh-skill)** — if you want the skills in Copilot
  / Cursor / Gemini / Codex.
- **[context7](./context7)** — if you want an agent to *retrieve*
  gridgram docs over MCP without installing anything gridgram-specific.
