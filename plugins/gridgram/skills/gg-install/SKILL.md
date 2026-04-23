---
name: gg-install
description: Install or update the gg gridgram CLI from the latest GitHub release. Use when the user asks to install gridgram, set up gg, update / upgrade gg to the newest version, or when another gridgram skill reports that `gg` is missing from PATH. Detects OS + arch, picks the right release archive, tries a writable directory on PATH (e.g. ~/.local/bin, /usr/local/bin), and falls back to dropping the binary in /tmp with a sudo hint when every candidate is read-only.
license: MIT
compatibility: Requires curl (or wget), tar (linux/macos) or unzip (windows), and network access to github.com / api.github.com. Standalone — does NOT need `gg` to already be installed.
allowed-tools: Bash(curl:*) Bash(wget:*) Bash(tar:*) Bash(unzip:*) Bash(which:*) Bash(command:*) Bash(uname:*) Bash(mkdir:*) Bash(mv:*) Bash(cp:*) Bash(rm:*) Bash(chmod:*) Bash(ls:*) Bash(echo:*) Bash(test:*) Bash(sh:*) Bash(bash:*) Read Write
---

# gg-install

Install or update the `gg` gridgram CLI from the GitHub Releases of
`ideamans/gridgram`, cross-platform.

This skill is **one of several ways to install `gg`**. If the user
already prefers their own install method (Homebrew, a system
package manager, a downloaded binary, or one of the curl / PowerShell
one-liners documented at <https://gridgram.ideamans.com/en/guide/>),
confirm they want to use this skill before proceeding. Any install
that puts `gg` on `$PATH` works equally well; the other gridgram
skills don't care how the binary got there.

## Workflow

### 1. Detect platform

```bash
uname -s       # Linux / Darwin / MINGW* / MSYS* → windows
uname -m       # x86_64 / arm64 / aarch64
```

Normalize to the release-asset naming:

| `uname -s`             | `os`      |
| ---------------------- | --------- |
| `Linux`                | `linux`   |
| `Darwin`               | `darwin`  |
| `MINGW*` / `MSYS*` / `CYGWIN*` | `windows` |

| `uname -m`             | `arch`    |
| ---------------------- | --------- |
| `x86_64` / `amd64`     | `amd64`   |
| `aarch64` / `arm64`    | `arm64`   |

Release assets follow `gridgram_<version>_<os>_<arch>.<ext>` where
`<ext>` is `zip` for windows and `tar.gz` for everything else.

If the user is on `windows-arm64`, currently no prebuilt asset
exists. Tell the user and stop — direct them to build from source
(`bun run compile`) instead.

### 2. Look up the latest release

Use the GitHub API; no auth needed for public repos:

```bash
curl -fsSL https://api.github.com/repos/ideamans/gridgram/releases/latest \
  | grep -o '"tag_name": *"[^"]*"' | head -1 | sed 's/.*"\(v[0-9.]*\)"/\1/'
```

Call the result `TAG` (e.g. `v0.4.1`). Version without the `v` is `VER`.

Asset URL:

```
https://github.com/ideamans/gridgram/releases/download/<TAG>/gridgram_<VER>_<os>_<arch>.<ext>
```

### 3. Check if gg is already installed

```bash
if command -v gg >/dev/null 2>&1; then
  INSTALLED_PATH="$(command -v gg)"
  INSTALLED_VERSION="$(gg --help 2>&1 | head -1 | grep -oE 'v[0-9.]+' || echo 'unknown')"
else
  INSTALLED_PATH=""
fi
```

- **If `INSTALLED_PATH` is non-empty**: this is an **update**. The
  target directory is the parent of `INSTALLED_PATH`. Skip PATH
  discovery; go straight to download + replace.
- **Already at the latest version**: tell the user and stop (nothing
  to do).

### 4. Pick a writable install directory (fresh install only)

Candidate list in order of preference:

| Path                               | Rationale                                |
| ---------------------------------- | ---------------------------------------- |
| `$HOME/.local/bin`                 | User-local, no sudo. Most Linux distros + newer macOS put this on PATH by default. |
| `$HOME/bin`                        | Older convention still in many setups.   |
| `/usr/local/bin`                   | Classic system-wide. Writable on most macOS + Homebrew systems. |
| `/opt/homebrew/bin`                | Apple Silicon Homebrew.                  |

For each candidate, check both (a) it's on `$PATH` and (b) it's
writable **by the current user without sudo**:

```bash
for d in "$HOME/.local/bin" "$HOME/bin" "/usr/local/bin" "/opt/homebrew/bin"; do
  case ":$PATH:" in *":$d:"*) :;; *) continue;; esac
  if [ -d "$d" ] && [ -w "$d" ]; then
    echo "ok: $d"
  elif [ ! -d "$d" ] && mkdir -p "$d" 2>/dev/null; then
    echo "ok: $d (created)"
  fi
done
```

- **One or more candidates match**: ask the user which to install
  into. Default to the first (`~/.local/bin`).
- **No candidate matches**: go to the sudo fallback (step 6).

### 5. Download and install

```bash
ASSET="gridgram_${VER}_${OS}_${ARCH}.${EXT}"
URL="https://github.com/ideamans/gridgram/releases/download/${TAG}/${ASSET}"
TMP=$(mktemp -d)
curl -fsSL -o "$TMP/$ASSET" "$URL"

# Extract.
if [ "$EXT" = "zip" ]; then
  unzip -q "$TMP/$ASSET" -d "$TMP"
else
  tar -xzf "$TMP/$ASSET" -C "$TMP"
fi

# The archive extracts to a directory named like the archive stem.
EXTRACTED="$TMP/gridgram_${VER}_${OS}_${ARCH}"
BIN="$EXTRACTED/gg"
[ "$OS" = "windows" ] && BIN="$EXTRACTED/gg.exe"

chmod +x "$BIN"
mv "$BIN" "$TARGET_DIR/"
rm -rf "$TMP"
```

Verify:

```bash
"$TARGET_DIR/gg" --help | head -1   # should show `gg v<VER>`
```

If that fails, fall back to the sudo hint (step 6) rather than
leaving a half-installed state.

### 6. Sudo fallback

When no writable PATH directory exists (or when the move at step 5
failed with EACCES), leave the binary in a temp location and tell
the user the exact command to run themselves:

```bash
FALLBACK="/tmp/gg"
cp "$BIN" "$FALLBACK"
chmod +x "$FALLBACK"
echo "gg is ready at $FALLBACK."
echo "Install it system-wide with:"
echo "  sudo mv $FALLBACK /usr/local/bin/gg"
```

Do **not** run `sudo` from the skill — that needs a terminal. Just
produce the command and let the user paste it.

## Reporting back to the user

Always finish with a summary line so the user can tell what happened:

- `gg installed at ~/.local/bin/gg (v0.4.1 → new)`
- `gg updated at /usr/local/bin/gg (v0.3.0 → v0.4.1)`
- `gg already at the latest version (v0.4.1) at …`
- `gg staged at /tmp/gg — run 'sudo mv /tmp/gg /usr/local/bin/gg' to finish`

## Edge cases

- **No `curl`**: try `wget` next. Neither available → report clearly
  and stop.
- **Network failure**: propagate the HTTP status. GitHub API rate-limits
  are high for anonymous GETs, but if hit, tell the user to retry in a
  minute or to set `GITHUB_TOKEN` in the environment (curl can use it
  via `-H "Authorization: Bearer $GITHUB_TOKEN"`).
- **Binary arch mismatch** (e.g. running x86_64 userland under rosetta):
  trust `uname -m` first. If the resulting binary fails `--help` with
  "cannot execute binary file", retry with the other `arch`.
- **Existing `gg` was installed by a different method** (e.g. npm
  global, bun link): still update in place at the location
  `command -v gg` returns. Don't try to uninstall the old method.

## After a successful install

- If the user's current shell just gained a new PATH entry (first
  install under `~/.local/bin` on a system where it wasn't created
  yet), point that out and suggest `exec $SHELL` or opening a new
  terminal.
- Suggest `gg --help` or `gg icons --tags --limit 5` as a smoke test.
