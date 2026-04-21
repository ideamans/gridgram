# Configuration

Gridgram resolves settings through four layers, in order of
increasing precedence:

```
  system defaults
      ↓
  project config  (gridgram.config.{ts,js,json,json5})
      ↓
  document        (doc { … } block inside a .gg file)
      ↓
  render override (CLI flag / DiagramOptions on a render call)
```

Every surface — CLI, TS API, HTTP endpoint, MCP tool — builds an
array of `DiagramSettings` layers in this order and calls
`resolveSettings()`. No surface branches past the resolver.

## The layer types

```ts
interface DiagramSettings {
  cellSize?: number
  padding?: number
  columns?: number
  rows?: number
  theme?: Partial<DiagramTheme>
  renderWidth?: number
  suppressErrors?: boolean
  assetAliases?: Record<string, string>
  iconsDir?: string
}

interface ResolvedSettings extends Required<Pick<DiagramSettings,
  'cellSize' | 'suppressErrors' | 'assetAliases'>> {
  padding?: number
  columns?: number
  rows?: number
  theme: DiagramTheme
  renderWidth?: number
  iconsDir?: string
}
```

Every `DiagramSettings` field is optional. `ResolvedSettings`
guarantees the fields that always have a sane default
(`cellSize`, `theme`, `suppressErrors`, `assetAliases`).

## `resolveSettings(layers)`

```ts
import { resolveSettings, SYSTEM_DEFAULTS } from 'gridgram'

const resolved = resolveSettings([
  projectLayer,        // from gridgram.config.ts
  documentLayer,       // from doc { } in the .gg
  renderOverride,      // CLI flag or DiagramOptions
])
```

Merge rules:

- Scalars (`cellSize`, `renderWidth`, …) — last layer wins.
- `theme` — deep-merged: each layer overlays its keys onto the
  previous theme.
- `assetAliases` — shallow-merged: later entries replace earlier
  ones by alias name.
- `SYSTEM_DEFAULTS` is always the starting point; you never need to
  include it explicitly.

## Project config files

A project-wide baseline lives in the nearest `gridgram.config.*`
walking up from `cwd`. The CLI and the library-level
`loadProjectConfig` helper both use this discovery.

```ts
// gridgram.config.ts
import { defineConfig } from 'gridgram'

export default defineConfig({
  cellSize: 128,
  theme: {
    primary: '#1e3a5f',
    accent: '#e8792f',
  },
  assetAliases: {
    brand: './assets/logos',   // → '@brand/aws.svg' resolves under here
  },
})
```

Supported extensions: `.ts`, `.mjs`, `.js`, `.cjs`, `.json5`,
`.json`. TS/JS files can be fully typed via `defineConfig`, which is
an identity helper:

```ts
import { defineConfig } from 'gridgram'
export default defineConfig({ … })
```

### Loading a config from code

```ts
import { loadProjectConfig, resolveSettings } from 'gridgram'

const found = await loadProjectConfig({ cwd: process.cwd() })
const projectLayer = found?.settings ?? {}

const resolved = resolveSettings([projectLayer, renderOverride])
```

Pass `explicitPath` to skip walk-up discovery, or omit it for
`findProjectConfig`'s default behaviour. Returns `null` if no
config is found (no error — projects without one are fine).

## The `doc { }` layer

A `.gg` file's `doc { }` block provides the document-layer settings:

```gg
doc {
  cellSize: 256,
  theme: { primary: '#1e3a5f' },
}

icon @A1 tabler/user "U"
```

When rendered through the CLI, this sits between the project config
and any `--cell-size` / `--width` flags. Via the TS API it ends up
on `rawDef.cellSize` / `.theme` after `parseGg`; `foldLayers` (inside
`renderDiagram`) merges those into the document layer automatically.

## `SYSTEM_DEFAULTS`

```ts
import { SYSTEM_DEFAULTS } from 'gridgram'

SYSTEM_DEFAULTS = {
  cellSize: 256,
  suppressErrors: false,
  assetAliases: {},
  theme: {
    primary:   '#1e3a5f',
    secondary: '#3b5a80',
    accent:    '#e8792f',
    text:      '#2d3748',
    bg:        '#ffffff',
  },
}
```

Read-only. Exported so callers can introspect (for example, a
settings UI that shows "default" alongside an override).

## Surface-specific composition

### CLI

```
[projectLayer, documentLayer, cliFlagOverrides]
```

Walks up from `--config <path>` or cwd; parses the .gg source for
its `doc { }`; collects CLI flags into the last layer.

### TS API (single call)

```
[documentLayer, opts]
```

`documentLayer` is extracted from the raw `DiagramDef`'s own
`cellSize` / `theme` / etc. on the fly. `opts` is what you pass to
`renderDiagram(def, opts)`.

### TS API (with a project config)

Call `loadProjectConfig` yourself and prepend:

```ts
const { settings: projectLayer } = (await loadProjectConfig({})) ?? {}
const resolved = resolveSettings([projectLayer ?? {}, documentLayer, opts])
```

### HTTP / MCP

Same shape as the TS API. The server decides whether a project
config applies (usually yes — a single config per deployment) and
prepends it.

## See also

- [`renderDiagram` & friends](./render) — the settings flow into
  `foldLayers` automatically.
- [Parser](./parser) — `parseGg` extracts the document layer from
  `doc { }`.
- [User Guide: Document](../guide/document/merging) — same rules
  from the author's perspective.
