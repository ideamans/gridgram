# CLI

The `gg` CLI renders a `.gg` file to SVG, PNG, or JSON (for debugging
the merged `DiagramDef`). It's the tool most people will use.

## Usage

```
gg <input.gg> [options]
```

```sh
gg diagram.gg -o out.svg
gg diagram.gg -o out.png --width 2048
gg diagram.gg --cell-size 128 -o out.png
gg diagram.gg --icons ./icons/ -o out.svg
gg diagram.gg --format json > merged.json
```

Without `-o`, `gg` writes to stdout. Without `--format`, the extension
of `-o` picks the format (`.svg` / `.png` / `.json`); lacking both, the
default is SVG.

## Options

| Flag                   | Meaning |
|------------------------|---------|
| `-o, --output <path>`  | Output path. Extension drives format when `--format` is absent. |
| `--format <kind>`      | `svg` / `png` / `json`. `json` emits the merged `DiagramDef`. |
| `--config <path>`      | Explicit `gridgram.config.{ts,js,json,json5}` (skips walk-up discovery). |
| `--no-config`          | Disable project-config discovery entirely. |
| `--icons <dir>`        | Register every `<dir>/*.svg` by its basename (bare-name alias). |
| `--alias name=dir`     | Register an asset-alias prefix: `@name/x.svg` → `<dir>/x.svg`. Repeatable. |
| `--cell-size <px>`     | Pixel size per cell (default `256`). Changes geometry. |
| `--width <px>`         | Final output width in px, aspect preserved. Doesn't change geometry. |
| `--scale <n>`          | Extra multiplier on the final width (default `1`; useful for high-DPI PNG). |
| `--stdout`             | Write to stdout even when `-o` is set. |
| `--no-errors`          | Suppress red error markers (missing icons, unresolved refs) in the output. |
| `--license`            | Print bundled third-party license texts. |
| `-h, --help`           | Show the help text. |

## Settings resolution

`gg` merges configuration from four sources, later layers winning:

```
system defaults
  ↓
project config           (gridgram.config.{ts,js,json,json5})
  ↓
document doc { … }       (blocks inside the .gg file)
  ↓
CLI flags                (--cell-size, --width, --icons, …)
```

Each layer contributes whatever it sets; omitted fields fall through
from the layer above. So `--cell-size 128` always wins over
`doc { cellSize: 256 }`, which always wins over the project config,
which always wins over the built-in defaults.

## Project config

`gg` walks up from the current working directory to find the first
`gridgram.config.{ts,js,json,json5}`. Everything it exports / returns
is merged as the "project" layer above. Use it to pin shared theme
tokens, icon aliases, and cell size across a whole docs tree:

```ts
// gridgram.config.ts
import { defineConfig } from 'gridgram'

export default defineConfig({
  cellSize: 200,
  theme: {
    primary: '#065f46',
    accent:  '#d97706',
  },
  assetAliases: {
    brand: './assets/brand',
  },
})
```

Skip discovery with `--no-config`, or point at a specific file with
`--config`.

## Output formats

- **SVG** (default) — text output; portable, editable, DPI-independent.
- **PNG** — rasterized via `sharp` at `--width` × aspect. Use
  `--scale 2` for retina output.
- **JSON** — the merged `DiagramDef` as JSON. Useful for debugging
  `doc` merges, feeding other tools, or inspecting what the parser
  resolved from a `.gg` file.

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Success |
| `1`  | Parse error (bad DSL, malformed `doc { … }`, unknown flag) |
| `2`  | Integrity error (duplicate node id, unresolved ref, disjoint region spans) |
| `3`  | I/O or render error (config load, file read/write, icon load, PNG render) |

The exit codes split into "your source has a problem" (1, 2) vs "the
environment has a problem" (3). CI scripts can use that to decide
whether to fail the build or retry the step.
