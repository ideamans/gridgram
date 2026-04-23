---
title: Plugin distribution
description: Install gridgram as an Agent Skills plugin in Claude Code, via gh skill, or in any host that speaks the open standard.
---

# Plugin distribution

`plugins/gridgram/` in the repository is a ready-to-install
[Agent Skills](https://agentskills.io/) bundle. Four skills, shipped
in a single plugin:

| Skill         | What it does                                                                      |
| ------------- | --------------------------------------------------------------------------------- |
| `/gg-render`  | Render a `.gg` file. Runs `gg <file> --format json --diagnostics` first, surfaces diagnostics, then writes SVG / PNG / JSON.        |
| `/gg-icons`   | Drive the [`gg icons`](./cli#gg-icons) search workflow conversationally.         |
| `/gg-author`  | Compose a new diagram from a natural-language description, validate, and render. |
| `/gg-install` | Install or update the `gg` CLI from the latest GitHub release. Detects OS + arch, picks a writable PATH directory, or falls back to a sudo hint when every candidate is read-only. |

Every `SKILL.md` uses **only** the standard frontmatter fields
(`name`, `description`, `license`, `compatibility`, `allowed-tools`),
so the same bundle works across Claude Code, Copilot (via `gh skill`),
Cursor, Gemini CLI, Codex, and any future host that speaks the spec.

## Install in Claude Code

```text
/plugin marketplace add ideamans/claude-public-plugins
/plugin install gridgram@ideamans-plugins
```

The marketplace repository lives at
<https://github.com/ideamans/claude-public-plugins>. The entry points at a
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
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-install
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

`gg-render`, `gg-icons`, and `gg-author` shell out to the `gg` binary.
If `gg` isn't on `PATH`, any of them can hand off to `/gg-install`,
which:

- detects the user's OS and arch
- fetches the matching archive from
  <https://github.com/ideamans/gridgram/releases/latest>
- drops the binary into the first writable `$PATH` directory
  (`~/.local/bin`, `/usr/local/bin`, …)
- or, when every candidate is read-only, stages it at `/tmp/gg` and
  prints the exact `sudo mv …` the user can run themselves

`gg-install` is also the upgrade path: when `gg` is already on `PATH`,
it replaces the existing binary in place with the latest release.

A skill that can't find `gg` will tell the user how to fix it
immediately, instead of silently producing nothing.

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
