---
title: Claude Code plugin tutorial
description: Install the gridgram Claude Code plugin, render your first diagram, and keep everything up to date.
---

# Claude Code plugin tutorial

End-to-end walkthrough from a clean machine to rendering a diagram
with Claude Code's `/gg-*` slash commands.

**Time**: ~10 minutes. **Result**: a rendered SVG you can open in a
browser, plus the commands you'll use later to stay current.

## Prerequisites

Install these yourself if you haven't already:

- [**Claude Code**](https://code.claude.com/) (any recent version)
- [**git**](https://git-scm.com/)
- **A shell** (bash/zsh on macOS/Linux, PowerShell on Windows)
- **Network access** to `github.com`

You do **not** need the `gg` CLI installed yet — the plugin will
install it for you.

## 1. Add the gridgram marketplace

Start Claude Code and add the `ideamans/claude-public-plugins`
marketplace:

```text
/plugin marketplace add ideamans/claude-public-plugins
```

You should see:

```
✔ Successfully added marketplace: ideamans-plugins
```

Verify:

```text
/plugin marketplace list
```

## 2. Install the gridgram plugin

```text
/plugin install gridgram@ideamans-plugins
```

Output:

```
✔ Successfully installed plugin: gridgram@ideamans-plugins
```

Verify:

```text
/plugin list
```

You should see `gridgram@ideamans-plugins` with status `enabled`.

Now, **reload the session** so the skill commands become available:

```text
/reload-plugins
```

Type `/gg-` — Claude Code's autocomplete should now offer
`/gg-install`, `/gg-render`, `/gg-icons`, and `/gg-author`.

## 3. Install the `gg` CLI

The skills shell out to the `gg` binary. You have two options; either
works — pick whichever you prefer.

### Option A: Use `/gg-install` inside Claude (recommended for first-timers)

Ask Claude:

> Install the gridgram CLI for my platform.

Claude picks up `/gg-install`, which:

1. Detects your OS + CPU architecture (`uname`).
2. Fetches the latest release from
   <https://github.com/ideamans/gridgram/releases/latest>.
3. Finds a writable directory on `$PATH` (tries `~/.local/bin`,
   `~/bin`, `/usr/local/bin`, `/opt/homebrew/bin` in that order).
4. Asks you to confirm the target directory.
5. Downloads + extracts + moves the binary into place.

If no candidate is writable without sudo, the skill stages `gg` at
`/tmp/gg` and prints the exact `sudo mv …` command to run:

```
gg staged at /tmp/gg — run 'sudo mv /tmp/gg /usr/local/bin/gg' to finish
```

### Option B: Install `gg` the regular way

If you already have a preferred install method, or you want to set
up `gg` outside of Claude Code, follow the standard install guide
at **[Quick start](/en/guide/)** (one-line curl / PowerShell scripts)
or **[Install](/en/guide/install)** for manual alternatives.

Any install that puts `gg` on `$PATH` will be picked up by the
skills — they don't care how it got there.

### Verify

```sh
gg --help
```

You should see `gg v<version>` in the banner.

## 4. Render your first diagram

Ask Claude in plain English:

> Draw a gridgram diagram of a web app: browser client → API → Postgres
> database with a Redis cache and a background job queue. Save it to
> `~/first-diagram.svg`.

Behind the scenes Claude will:

- Invoke `/gg-icons` to find Tabler icons for browser/api/database/cache/queue.
- Invoke `/gg-author` to compose a `.gg` source file and validate it.
- Invoke `/gg-render` to produce the SVG and read back diagnostics.

Open the SVG in a browser. You'll see a small architecture diagram.
Claude will also have shown you the `.gg` source — save it somewhere
if you want to edit it later.

### If the first render has warnings

The `--diagnostics` channel reports non-fatal issues (unresolved
icons show as red rings, labels that can't be placed cleanly, …).
Just tell Claude:

> That diagram has a red ring around the cache node. Fix it.

Claude re-runs `/gg-icons` for the offending concept, patches the
`.gg` source, and re-renders. The whole loop stays inside the chat.

## 5. Keep everything up to date

Two moving parts: the plugin (skills + SKILL.md bodies) and the
`gg` binary itself.

### Update the plugin

```text
/plugin marketplace update ideamans-plugins
/reload-plugins
```

The marketplace entry uses a `git-subdir` source pinned to gridgram's
default branch, so this pulls the latest skills automatically.

### Update the `gg` binary

Just ask:

> Update my gridgram CLI to the latest version.

`/gg-install` detects the existing `gg` on `PATH`, downloads the
newest release, and replaces the binary in the same directory. No
sudo prompt unless the existing location needs it (rare for
`~/.local/bin`).

Or directly:

```text
/gg-install
```

The skill always checks for a newer version; if you're already on
latest it says so and exits.

## 6. Uninstall (optional)

```text
/plugin uninstall gridgram@ideamans-plugins
/plugin marketplace remove ideamans-plugins
```

To remove the `gg` binary:

```sh
rm "$(which gg)"
rm -rf ~/.cache/gridgram   # runtime-fetched sharp cache
```

## Troubleshooting

### `/plugin marketplace add` fails with `Premature close`

The non-interactive git clone inside Claude Code can hit this on
hosts where the `owner/repo` shorthand SSH path isn't set up. Retry
with the full HTTPS URL:

```text
/plugin marketplace add https://github.com/ideamans/claude-public-plugins.git
```

### `/gg-install` stages the binary at `/tmp/gg` but no `$PATH` dir is writable

Run the `sudo mv` command the skill prints, then verify with
`gg --help`. Alternatively, add a user-writable directory to your
`PATH` in `~/.zshrc` / `~/.bashrc`:

```sh
export PATH="$HOME/.local/bin:$PATH"
```

Reopen your shell and rerun `/gg-install`.

### PNG rendering fails on first use

The PNG pipeline (sharp + libvips) is fetched lazily on first PNG
render and cached in `~/.cache/gridgram/`. If that fetch fails (flaky
network, older `gg` version), retry a second time. Versions older
than 0.4.0 have a known Linux-arm64 bug with detect-libc resolution;
upgrade with `/gg-install`.

## Where next

- [CLI reference](./cli) — what `gg llm` and `gg icons` accept in
  detail, useful when you want to drive them by hand or understand
  what the skills do internally.
- [`gh skill` tutorial](./gh-skill) — install the same skill bundle
  into Copilot / Cursor / Gemini / Codex.
- [context7 tutorial](./context7) — give agents MCP-driven retrieval
  of gridgram docs with no plugin install.
