---
title: gh skill tutorial
description: Install the gridgram Agent Skills bundle into Copilot, Cursor, Gemini CLI, or Codex via the GitHub CLI.
---

# `gh skill` tutorial

The GitHub CLI ships a `gh skill` subcommand (v2.90+) that installs
Agent Skills from any GitHub repository — not just Anthropic ones.
gridgram's four skills (`gg-install`, `gg-render`, `gg-icons`,
`gg-author`) use standards-only frontmatter, so the same bundle you
see in the Claude marketplace also works in Copilot, Cursor, Gemini
CLI, Codex, and Antigravity.

**Time**: ~5 minutes. **Result**: the gridgram skills installed into
your agent of choice, plus the update command.

## Prerequisites

Install these yourself:

- [**GitHub CLI (`gh`)**](https://cli.github.com/), **v2.90 or later**
  (earlier versions don't have the `skill` subcommand).
- **A target agent host**: Claude Code, GitHub Copilot, Cursor,
  Gemini CLI, Codex, or Antigravity. The `--agent` flag picks which.
- **git** (gh uses it under the hood).
- **Network access** to `github.com`.

Authenticate gh once if you haven't already:

```sh
gh auth status       # check
gh auth login        # if "not logged in"
```

Authentication isn't strictly required for a public repo like
gridgram, but it avoids rate-limiting on repeated installs.

Check your `gh skill` availability:

```sh
gh skill --help
```

If you see "unknown command: skill", upgrade gh:

```sh
# Homebrew
brew upgrade gh

# Debian/Ubuntu
sudo apt install --only-upgrade gh
```

## 1. Pick your target agent

`gh skill install --agent <target>` supports six host targets. Each
tutorial snippet from here on has a tab per target — pick yours and
the commands copy-paste directly.

| Target          | Where skills end up                                                |
| --------------- | ------------------------------------------------------------------ |
| `claude-code`   | `~/.claude/skills/<skill>/SKILL.md`                                |
| `copilot`       | GitHub Copilot's skills directory (default if `--agent` is omitted)|
| `cursor`        | Cursor's skill directory                                           |
| `codex`         | OpenAI Codex                                                       |
| `gemini-cli`    | Google Gemini CLI                                                  |
| `antigravity`   | Antigravity                                                        |

## 2. Preview before installing

`gh skill preview` downloads a `SKILL.md` and shows the frontmatter
+ body so you can read what it'll do before letting it run:

```sh
gh skill preview ideamans/gridgram/plugins/gridgram/skills/gg-install
```

Do the same for the other three (`gg-render`, `gg-icons`, `gg-author`)
if you want to inspect each.

## 3. Install the skills

Install all four with one copy-paste. Switch tabs to match your
target agent:

::: code-group

```sh [Claude Code]
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-install --agent claude-code
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render  --agent claude-code
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons   --agent claude-code
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author  --agent claude-code
```

```sh [Copilot]
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-install --agent copilot
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render  --agent copilot
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons   --agent copilot
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author  --agent copilot
```

```sh [Cursor]
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-install --agent cursor
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render  --agent cursor
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons   --agent cursor
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author  --agent cursor
```

```sh [Codex]
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-install --agent codex
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render  --agent codex
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons   --agent codex
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author  --agent codex
```

```sh [Gemini CLI]
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-install --agent gemini-cli
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render  --agent gemini-cli
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons   --agent gemini-cli
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author  --agent gemini-cli
```

```sh [Antigravity]
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-install --agent antigravity
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render  --agent antigravity
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons   --agent antigravity
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author  --agent antigravity
```

:::

Verify:

```sh
gh skill list
```

The list shows each skill plus the source repository + ref + tree SHA.
That provenance metadata gets written directly into each
`SKILL.md`'s frontmatter on install, so `gh skill update` can detect
content changes later even without a version bump.

## 4. Install the `gg` CLI

The skills shell out to the `gg` binary. Restart your agent host so
the new skills load, then ask:

> Install the gridgram CLI for my platform.

The agent picks up `/gg-install` and performs:

1. OS + arch detection.
2. Download of the latest release from
   <https://github.com/ideamans/gridgram/releases/latest>.
3. Install into the first writable `$PATH` directory (or stage at
   `/tmp/gg` with a sudo hint).

Verify with:

```sh
gg --help
```

You should see `gg v<version>`.

## 5. Try a first render

> Draw a gridgram diagram showing a browser calling an API backed by
> a Postgres database. Save it as `~/first-diagram.svg`.

The agent uses `/gg-icons` to pick icons, `/gg-author` to compose
the `.gg` source, and `/gg-render` to produce the SVG with
diagnostics. Open the result in a browser.

## 6. Keep everything up to date

### Update skills

```sh
gh skill update
```

With no arguments it updates every installed skill. The provenance
metadata in each `SKILL.md` tells gh where to fetch from — the tree
SHA comparison means you'll get genuine content changes, not spurious
no-op updates.

Update a single skill:

```sh
gh skill update ideamans/gridgram/plugins/gridgram/skills/gg-author
```

### Update the `gg` binary

Just ask the agent:

> Update my gridgram CLI to the latest version.

`/gg-install` replaces the existing binary in place.

## 7. Uninstall (optional)

```sh
gh skill remove ideamans/gridgram/plugins/gridgram/skills/gg-author
# …and the other three
```

To remove `gg`:

```sh
rm "$(which gg)"
rm -rf ~/.cache/gridgram
```

## Troubleshooting

### `unknown command: skill`

Upgrade gh to **v2.90+**. Check with `gh --version`.

### "Rate limit exceeded" from `gh skill install`

Run `gh auth login` and retry — authenticated requests get a higher
rate limit.

### Skill installed but agent doesn't see it

Restart the agent host. Most hosts only scan the skills directory at
startup.

### Skill with extra frontmatter fields logs a warning

Expected: Claude Code's frontmatter extensions (`disable-model-invocation`,
`paths`, …) aren't in gridgram's SKILL files, so this shouldn't
happen. If it does, file an issue.

## Where next

- [Claude Code plugin tutorial](./claude-plugin) — slash-command-driven
  flow for Claude Code users, with marketplace-level auto-update.
- [CLI reference](./cli) — what the skills are doing under the hood.
- [context7](./context7) — complementary MCP retrieval; works
  alongside any skill host.
