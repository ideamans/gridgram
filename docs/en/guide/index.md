# Quick start

Install the `gg` binary and render your first diagram in under a
minute. If you'd rather not pipe a remote script into a shell, see
[Install](./install) for manual alternatives.

## Install

Pick the command for your operating system. Both scripts place `gg` on
your `PATH` automatically.

### macOS / Linux

```sh
curl -fsSL https://bin.ideamans.com/install/gg.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://bin.ideamans.com/install/gg.ps1 | iex
```

### Verify

```sh
gg --help
```

You should see the usage banner. If `gg: command not found`, open a new
shell (so the updated `PATH` is picked up) or consult
[Install](./install).

## Render your first diagram

Write a tiny `.gg` file and render it to SVG and PNG:

```sh
cat > hello.gg <<'EOF'
icon :user tabler/user   "User"
icon :api  tabler/server "API"
user --> api "request"
EOF

gg hello.gg -o hello.svg
gg hello.gg -o hello.png --width 1024
```

Windows (PowerShell) equivalent:

```powershell
@'
icon :user tabler/user   "User"
icon :api  tabler/server "API"
user --> api "request"
'@ | Set-Content hello.gg

gg hello.gg -o hello.svg
gg hello.gg -o hello.png --width 1024
```

Open `hello.svg` in any browser or `hello.png` in your image viewer —
you should see two icons with a labelled arrow between them. That's
it; the CLI is working.

<Example name="basic-02-multi-node" />

## Where to next

- **[First Gridgram](./first-gridgram)** — a guided tour of the `.gg`
  language, one concept at a time.
- **[Install](./install)** — GitHub Releases, build from source, and
  other ways to get the binary.
- **[Editor](/en/editor)** — try `.gg` live in your browser, no install
  needed.
- **[CLI reference](./cli)** — every flag and exit code.
