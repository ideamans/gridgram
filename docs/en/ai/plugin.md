---
title: Plugin distribution
description: Install gridgram as an Agent Skills plugin in Claude Code, via gh skill, or in any host that speaks the open standard.
---

# Plugin distribution

`plugins/gridgram/` in the repository is a ready-to-install
[Agent Skills](https://agentskills.io/) bundle. Three skills, shipped
in a single plugin:

| Skill         | What it does                                                                      |
| ------------- | --------------------------------------------------------------------------------- |
| `/gg-render`  | Render a `.gg` file. Runs `gg <file> --format json --diagnostics` first, surfaces diagnostics, then writes SVG / PNG / JSON.        |
| `/gg-icons`   | Drive the [`gg icons`](./cli#gg-icons) search workflow conversationally.         |
| `/gg-author`  | Compose a new diagram from a natural-language description, validate, and render. |

Every `SKILL.md` uses **only** the standard frontmatter fields
(`name`, `description`, `license`, `compatibility`, `allowed-tools`),
so the same bundle works across Claude Code, Copilot (via `gh skill`),
Cursor, Gemini CLI, Codex, and any future host that speaks the spec.

## Install in Claude Code

```text
/plugin marketplace add ideamans/claude-plugins
/plugin install gridgram@ideamans-plugins
```

The marketplace repository lives at
<https://github.com/ideamans/claude-plugins>. The entry points at a
`git-subdir` source inside `ideamans/gridgram`, so the plugin's version
always matches the gridgram release — no separate version bump needed.

After installing, restart Claude Code (or open a new session). The
three `/gg-*` slash commands will appear in the autocomplete list.

### Verifying

```text
/gg-icons
```

Claude should acknowledge the skill and ask what concept you're looking
for. If it responds with "no such skill", run:

```text
/plugin list
```

to confirm `gridgram@ideamans-plugins` is installed and enabled.

## Install via GitHub CLI (`gh skill`)

GitHub CLI v2.90.0+ ships the `gh skill` subcommand, which installs
Agent Skills from any repository — not just Claude-branded ones. Each
skill can be installed independently:

```bash
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render --agent claude-code
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author
```

The `--agent` flag picks which host to install into. Supported
targets include `claude-code` (the default), `copilot`, `cursor`,
`codex`, `gemini-cli`, and `antigravity`.

### Provenance tracking

`gh skill install` writes the source repository, ref, and git-tree SHA
directly into each `SKILL.md`'s frontmatter before dropping it into
the host's skills directory. That means `gh skill update` detects
content changes even when the gridgram version string hasn't bumped —
useful for iterating on skill bodies between releases.

## Runtime dependency: the `gg` CLI

All three skills shell out to the `gg` binary. If `gg` isn't on
`PATH`, the skill body tells the user how to install it:

- **Binary**: <https://github.com/ideamans/gridgram/releases>
- **Source build**: `git clone … && bun install && bun run compile`

A skill that can't find `gg` reports the failure instead of silently
producing nothing. Users who never intended to install gridgram find
out immediately and with an install command to copy-paste.

## Installing from a local checkout (development)

When iterating on the plugin itself, skip the marketplace and install
directly from disk:

```text
/plugin marketplace add /path/to/gridgram/plugins/gridgram
```

Claude Code treats any directory containing a `.claude-plugin/` as a
single-plugin marketplace. Use this while editing SKILL bodies or
trying a new skill.

To run the schema validator that CI enforces:

```bash
# Inside the gridgram repo:
bun scripts/validate-plugin-skills.ts
```

It checks every `SKILL.md` against the Agent Skills open standard
(name length, description length, allowed fields) and warns on any
non-standard frontmatter keys that would break portability to other
hosts.

## What the plugin doesn't do

- **It doesn't bundle the `gg` binary.** The skill shells out; it
  doesn't ship platform-specific binaries.
- **It doesn't embed the full reference.** `/gg-author` will invoke
  `gg llm` the first time it runs in a session if the agent asks for
  the grammar, but the plugin itself is kept small so it can load
  quickly.
- **It doesn't replace the [TS API](/en/developer/render).** Skills
  are for chat-driven authoring; code pipelines should use the library
  directly.
