# Install

The fastest way to install `gg` is the one-liner shown in the
[Quick start](./) — a curl-pipes-bash script that downloads the right
binary for your platform and drops it on your `PATH`. This page covers
every other option: the install landing page, GitHub Releases, and
building from source.

## The install landing page

The install scripts are served from a dedicated page:

**<https://bin.ideamans.com/oss/gg>**

::: tip
The landing page itself is in Japanese, but the install commands
are universal and work as-is on any locale.
:::

It publishes the latest versioned script for each platform:

| Platform             | Command                                                         |
|----------------------|-----------------------------------------------------------------|
| macOS / Linux        | `curl -fsSL https://bin.ideamans.com/install/gg.sh \| bash`     |
| Windows (PowerShell) | `irm https://bin.ideamans.com/install/gg.ps1 \| iex`            |

Default install locations:

- **Linux / macOS** — a system-wide directory (usually `/usr/local/bin`).
  Override per-user with `--install-dir $HOME/bin`:
  ```sh
  curl -fsSL https://bin.ideamans.com/install/gg.sh | bash -s -- --install-dir "$HOME/bin"
  ```
- **Windows (admin)** — `C:\Program Files\gg\gg.exe`
- **Windows (standard user)** — `%USERPROFILE%\bin\gg.exe`

If you installed to a custom directory, make sure it's on your `PATH`.

## GitHub Releases (manual download)

Every tagged release publishes prebuilt archives plus a
`checksums.txt`. Download, verify, and move the binary yourself.

**<https://github.com/ideamans/gridgram/releases/latest>**

| Platform              | Asset                                      |
|-----------------------|--------------------------------------------|
| Linux x64             | `gridgram_<version>_linux_amd64.tar.gz`    |
| Linux ARM64           | `gridgram_<version>_linux_arm64.tar.gz`    |
| macOS (Intel)         | `gridgram_<version>_darwin_amd64.tar.gz`   |
| macOS (Apple Silicon) | `gridgram_<version>_darwin_arm64.tar.gz`   |
| Windows x64           | `gridgram_<version>_windows_amd64.zip`     |

### Linux / macOS

```sh
VERSION=0.1.0
OS=linux       # or darwin
ARCH=amd64     # or arm64

curl -fsSL -o gg.tar.gz \
  "https://github.com/ideamans/gridgram/releases/download/v${VERSION}/gridgram_${VERSION}_${OS}_${ARCH}.tar.gz"

tar -xzf gg.tar.gz
sudo mv "gridgram_${VERSION}_${OS}_${ARCH}/gg" /usr/local/bin/
```

### Windows (PowerShell)

```powershell
$Version = "0.1.0"
$Url = "https://github.com/ideamans/gridgram/releases/download/v$Version/gridgram_${Version}_windows_amd64.zip"

Invoke-WebRequest $Url -OutFile gg.zip
Expand-Archive gg.zip -DestinationPath .
# move gg.exe somewhere on your PATH, e.g. %USERPROFILE%\bin
```

### Verifying checksums

```sh
curl -fsSL -O "https://github.com/ideamans/gridgram/releases/download/v${VERSION}/checksums.txt"
sha256sum -c --ignore-missing checksums.txt
```

## Build from source

Gridgram is built with [Bun](https://bun.sh). Install Bun, then:

```sh
git clone https://github.com/ideamans/gridgram
cd gridgram
bun install
bun run sync-tabler        # required after install (populates src/data/)
bun run compile            # produces ./gg in the repo root
```

Or run without compiling — handy for hacking on the CLI itself:

```sh
bun run src/cli/gg.ts diagram.gg -o out.svg
```

## Upgrade

Re-run the one-liner from [Quick start](./), or pull the latest asset
from Releases. The script is idempotent — it replaces the existing
binary in place.

## Uninstall

Delete the binary from wherever it was installed (`/usr/local/bin/gg`,
`$HOME/bin/gg`, or the Windows install directory). That's the only
file the installer writes. At runtime `gg` also caches sharp's native
modules under `~/.cache/gridgram/` for PNG output; delete that
directory to reclaim the space.
