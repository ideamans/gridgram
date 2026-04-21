# Parser

`.gg` source → `DiagramDef` in three stages, each exposed as a
separate function you can call directly:

```
  .gg source
      │
      ▼
  parseGg(source)             → { def, errors, icons }
      │                          (includes integrity checks)
      ▼
  buildIconContext({ … })     → IconContext
      │                          (filesystem / network reads for icon refs)
      ▼
  resolveDiagramIcons(def,ctx) → { def, diagnostics }
      │
      ▼
  renderDiagram(def)           → { svg, diagnostics }
```

## `parseGg(source)`

```ts
import { parseGg } from 'gridgram'

interface ParseResult {
  def: DiagramDef
  errors: GgError[]
  icons?: Record<string, string>   // from `doc { icons: … }`
}

function parseGg(source: string): ParseResult
```

Tokenizes the source, folds `doc`/`icon`/`region`/`note`/connector
statements into a `DiagramDef`, and runs integrity checks (connector
refs, note targets, region spans). Three categories of error end up
in `errors`:

| `source` | Meaning |
|----------|---------|
| `'dsl'`  | Tokenizer / statement-parser issue — unknown statement, malformed attr. |
| `'json'` | The JSON5 parser rejected a `doc { }` or `icons:` body. |
| `'check'`| Integrity: unknown connector target, disjoint region, etc. |

Parse errors are surfaced before the def is assembled; an errored
def may still be partially usable for quick-look previews, but don't
render one in production without handling `errors`.

### `GgError` shape

```ts
interface GgError {
  message: string
  line: number                   // 1-based
  source: 'dsl' | 'json' | 'check' | 'icon'
  snippet?: string               // the offending source line
  related?: { line: number; source: GgErrorSource; snippet?: string }
}
```

Use `formatError` for a readable string:

```ts
import { formatError } from 'gridgram/gg/errors'

for (const e of errors) console.error(formatError(e, filename))
// Error: Unknown statement "icn"
//   at diagram.gg:3  (DSL:  icn :a @A1 "hello")
```

### The `icons` field

A `.gg` file can register inline icon sources directly:

```gg
doc {
  icons: {
    logo:  'https://example.com/logo.svg',
    brand: './assets/brand.svg',
  },
}

icon @A1 logo  "Us"
icon @B1 brand "You"
```

`parseGg` returns those as `icons: Record<string, string>` alongside
the def. The resolver consumes it via `buildIconContext`'s
`jsonIconsMap`. Keeps the source-time icon references off the
`DiagramDef` type (which models the rendered diagram, not its
provenance).

## `buildIconContext(opts)`

```ts
import { buildIconContext } from 'gridgram'

function buildIconContext(opts: {
  iconsDir?: string
  jsonIconsMap?: Record<string, string>
  aliases?: Record<string, string>
  def?: DiagramDef
  docDir: string      // for cwd-relative paths AND for the icons map
  aliasDir?: string   // defaults to docDir
}): Promise<IconContext>
```

Walks the def for every external-path icon reference and pre-reads
it (filesystem or HTTP). Returns an `IconContext` the resolver
consumes. Non-fatal per-icon failures end up on `ctx.errors` (as
`GgError`) and `ctx.failedSources` (map keyed by the DSL identifier).

```ts
const ctx = await buildIconContext({
  iconsDir: settings.iconsDir,            // --icons <dir>
  jsonIconsMap: parseResult.icons,        // from parseGg
  aliases: settings.assetAliases,         // from project config
  def: rawDef,
  docDir: dirname(sourcePath),
  aliasDir: process.cwd(),
})

// Surface per-icon loader errors early
for (const err of ctx.errors ?? []) console.error(formatError(err, sourcePath))
```

### Path reference resolution

| DSL form              | Where it resolves |
|-----------------------|-------------------|
| `'@brand/aws.svg'`    | `aliases.brand + '/aws.svg'` (absolute if `aliases.brand` is absolute; else joined with `aliasDir`) |
| `'./foo.svg'`         | `docDir + '/foo.svg'` |
| `'/abs/path.svg'`     | as-is |
| `'foo.svg'`           | `docDir + '/foo.svg'` |

## `resolveDiagramIcons(def, ctx)`

```ts
import { resolveDiagramIcons } from 'gridgram'

function resolveDiagramIcons(
  def: DiagramDef,
  ctx: IconContext,
): { def: DiagramDef; diagnostics: PlacementDiagnostic[] }
```

Replaces every string-valued `node.src` with its resolved SVG
fragment. Nodes whose src couldn't be resolved get `iconError: true`
and their `src` deleted. Each of those failures emits a
[PlacementDiagnostic](./diagnostics) with:

- `kind: 'icon-unresolved'`
- `iconSrc`: the original DSL identifier
- `iconReason`: `'not-found'` (tabler miss / unregistered) or
  `'load-failed'` (the loader tried and errored)

Callers usually concat these with the render-time diagnostics to
hand an agent one stream:

```ts
const iconResolve = resolveDiagramIcons(rawDef, ctx)
const rendered = renderDiagram(iconResolve.def)
const allDiagnostics = [...iconResolve.diagnostics, ...rendered.diagnostics]
```

## `IconContext`

```ts
interface IconContext {
  inline?: Record<string, string>           // from doc.icons / --icons map
  dir?: Record<string, string>              // from --icons <dir> basename
  aliases?: Record<string, string>          // from --alias / project config
  paths?: Record<string, string>            // pre-loaded external refs
  errors?: GgError[]                        // non-fatal loader issues
  failedSources?: Map<string, string>       // identifier → reason
}
```

You can construct one by hand if your pipeline doesn't use
`buildIconContext` (e.g. a build that already has every icon
inlined). As long as the keys / values line up, the resolver doesn't
care how the map was populated.

## `checkIntegrity(def)`

```ts
import { checkIntegrity } from 'gridgram/gg/integrity'

function checkIntegrity(def: DiagramDef): GgError[]
```

Post-parse checks that `parseGg` runs for you automatically:

- Connector `from` / `to` reference known node ids
- Note `targets` reference known node / connector ids
- Region spans fit within `columns × rows`
- Region spans form a single 4-connected shape
- Coordinate malformations (bad A1, col < 1, …)

Exposed separately so programmatic callers who build a
`DiagramDef` from scratch (skipping `parseGg`) can still validate
it. Error messages use 1-based A1 coordinates — "`A1-J10 exceeds
A1-B2 grid`" — so agents don't need to decode the internal
0-based form.

## See also

- [Types](./types) — `DiagramDef` and its members.
- [Diagnostics](./diagnostics) — consumer-side view of the
  icon-unresolved stream.
- [User Guide: CLI](../guide/cli) — same parsing from the CLI side.
