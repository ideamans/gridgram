---
title: End-to-end workflow
description: A worked example — asking Claude to draw a system diagram, validating, and iterating until the render is clean.
---

# End-to-end workflow

This page walks through a realistic conversation with Claude Code
after the [gridgram plugin](./plugin) is installed. The goal: a clean
SVG of a small system architecture, with no red error rings.

## Setup

```text
/plugin marketplace add ideamans/claude-plugins
/plugin install gridgram@ideamans-plugins
```

Verify `gg` is on `PATH`:

```sh
gg --help
gg icons --tags --limit 3
```

## The prompt

The simplest productive prompt is a sentence describing the system.
Claude doesn't need to be told about the plugin explicitly — the
skill descriptions carry enough signal for the agent to pick them up
on its own:

> Draw a gridgram diagram of a web app: a browser client hitting an
> API server, which reads from a Postgres DB and a Redis cache, and
> pushes background jobs onto a queue. Give me the `.gg` source and
> render it to an SVG.

## What Claude does

On a well-behaved run the agent:

1. Calls **`/gg-icons`** a few times to resolve each concept:
   ```text
   gg icons --search browser --limit 3 --format json
   gg icons --search api --limit 3 --format json
   gg icons --search database --limit 3 --format json
   gg icons --search cache --limit 3 --format json
   gg icons --search queue --limit 3 --format json
   ```
   For each query it picks the top `score ≥ 5` hit. `browser`, `api`,
   `database` all come back with exact matches. `cache` resolves via
   the gridgram-authored tag override to `tabler/bolt` or
   `tabler/clock-play`.
2. Calls **`/gg-author`** to lay out the grid. The agent picks a 3×2
   grid and produces:
   ```gg
   icon :client @A1 tabler/browser  "Browser"
   icon :api   @B1 tabler/api       "API"
   icon :queue @C1 tabler/stack     "Jobs queue"

   icon :db    @B2 tabler/database  "Postgres"
   icon :cache @C2 tabler/bolt      "Redis"

   client --> api   "HTTPS"
   api    --> db    "SQL"
   api    --> cache "get/set"
   api    --> queue "enqueue"
   ```
3. Calls **`/gg-render`** to validate and render:
   ```sh
   gg web-app.gg --format json --diagnostics --stdout > /tmp/envelope.json 2>/tmp/diag.json
   gg web-app.gg -o web-app.svg
   ```
4. Reports back: the SVG path, the diagnostics count, and the final
   `.gg` source.

## When it doesn't work first time

Two failure modes are common:

### Icon not found → red ring

If Claude guessed an icon name instead of searching (e.g. `tabler/postgres`
doesn't exist), `--diagnostics` surfaces:

```json
[{
  "kind": "icon-unresolved",
  "element": { "id": "db" },
  "iconSrc": "tabler/postgres",
  "iconReason": "not-found"
}]
```

Tell the agent:

> Check the diagnostics. Re-run `gg icons --search <concept>` for any
> unresolved icon and pick a real name.

The skill body instructs Claude to do this automatically, but when a
prompt overrides the skill (e.g. "use tabler/postgres for Postgres"),
the agent may still try. Diagnostics make the failure visible.

### Label collision → displaced label

gridgram tries several label positions around each node. If none are
free it places the label anyway and emits:

```json
[{
  "kind": "label-collision",
  "element": { "id": "api" },
  "attempts": ["right", "below", "above", "left"]
}]
```

Ask the agent to widen the grid:

> Add `doc { cols: 4 }` at the top and retry. With more horizontal
> room, labels shouldn't collide.

Or let the agent decide the fix — `/gg-author` is meant to be a
closed loop:

> That has a `label-collision`. Fix it and re-render.

## Iteration tips

- **Stay in one chat.** Every skill invocation prepends its body to
  context; starting fresh every request loses the grammar / icon
  knowledge Claude just loaded.
- **Ask for the `.gg` source.** The SVG is the deliverable, but the
  source is what you edit next time.
- **Commit the `.gg` source to git.** The pipeline is deterministic —
  every future edit shows up as a readable diff, and CI can diff the
  rendered SVG as a regression check.
- **Use `gg icons --tags --limit 30`** when Claude is guessing. It
  shows the agent the vocabulary the icon index actually understands.

## Beyond Claude Code

The same workflow works in any host that speaks Agent Skills, because
the [plugin](./plugin) uses only standard frontmatter. Equivalent
installs:

- **Cursor**: `gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author --agent cursor`
- **Gemini CLI**: `gh skill install … --agent gemini-cli`
- **Any generic agent** with shell access: pipe `gg llm` into its
  context and let it drive the CLI directly.

The SKILL bodies and the CLI surface are both standard enough that
"works in Claude" and "works everywhere" are the same thing.
