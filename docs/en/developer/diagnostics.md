# Diagnostics

Gridgram's pipeline doesn't just produce an SVG — it produces
structured feedback about anything that didn't fit cleanly. Labels
that couldn't find a collision-free slot, connectors that couldn't
route around obstacles, icon sources that failed to resolve — each
becomes a `PlacementDiagnostic` record the caller can inspect,
print, or hand to an AI agent for remediation.

This is the primary surface agents use to iterate on a diagram.

## The `PlacementDiagnostic` shape

```ts
interface PlacementDiagnostic {
  kind:
    | 'label-collision'    // a label was forced into an overlapping fallback
    | 'route-failed'       // a connector couldn't route around obstacles
    | 'icon-unresolved'    // node.src / badge.icon didn't resolve
    | 'region-disjoint'    // (reserved; currently surfaces as an integrity error)
  severity: 'warning' | 'error'
  element: ElementRef
  message: string                    // human-readable one-liner
  suggestion?: string                 // optional remediation hint
  finalRect?: PixelRect               // where the element actually drew
  attempts?: PlacementAttempt[]       // full placement search history
  iconSrc?: string                    // icon-unresolved: the original DSL id
  iconReason?: 'not-found' | 'load-failed' | 'malformed'
}
```

Every diagnostic carries enough context to:

1. **Identify the element** that had trouble (`element` + optional
   `finalRect` to pinpoint the drawn position).
2. **See what went wrong** (`message`, the `attempts` search history
   with `obstacles` at each tried slot).
3. **Choose a fix** — either automatically (agent) or manually
   (human reading CLI output).

## `ElementRef`

```ts
type ElementRef =
  | { kind: 'node';      id: string; pos?: GridCellRef; line?: number }
  | { kind: 'note';      id: string; pos?: GridCellRef; line?: number }
  | { kind: 'region';    id?: string; span: GridSpanRef; line?: number }
  | { kind: 'connector'; id?: string; from: string; to: string; line?: number }

interface GridCellRef { col: number; row: number; address: string }  // 1-based
interface GridSpanRef { from: GridCellRef; to: GridCellRef }
```

All coordinates here are **1-based with A1 addresses** — the same
form an agent / human wrote in the source. No 0-based internal
coordinates reach this boundary.

## `PlacementAttempt`

```ts
interface PlacementAttempt {
  slot: string             // human-readable ("top-right", "seg 2 / t=0.5 above")
  rect: PixelRect          // where the label would have drawn
  obstacles: Obstacle[]    // everything that blocked this slot
  accepted: boolean        // the winning slot (last entry) vs rejected tries
}
```

The last attempt in the array is always marked `accepted: true` —
either a clean slot, or the fallback that got picked anyway even
with obstacles.

## `Obstacle`

```ts
type Obstacle =
  | { kind: 'label';  owner: ElementRef; rect: PixelRect }
  | { kind: 'icon';   owner: ElementRef; circle: PixelCircle }
  | { kind: 'line';   owner: ElementRef; line: PixelLine }
  | { kind: 'leader'; owner: ElementRef; line: PixelLine }
  | { kind: 'canvas-bounds'; bounds: { width: number; height: number } }
```

`owner` points back to the element whose label/icon/line blocked
the placement. Pixel geometry lets an agent reason quantitatively
about how deep the overlap went.

## Example: a label-collision diagnostic

```json
{
  "kind": "label-collision",
  "severity": "warning",
  "element": {
    "kind": "node",
    "id": "api",
    "pos": { "col": 2, "row": 1, "address": "B1" }
  },
  "message": "Label for node \"api\" could not find a clear slot across 7 candidates; final fallback still blocked by icon of node \"db\", label of node \"web\".",
  "finalRect": { "x": 512, "y": 200, "w": 82, "h": 28 },
  "attempts": [
    {
      "slot": "top-right",
      "rect": { "x": 520, "y": 148, "w": 82, "h": 28 },
      "obstacles": [
        {
          "kind": "icon",
          "owner": { "kind": "node", "id": "db", "pos": { "col": 2, "row": 2, "address": "B2" } },
          "circle": { "cx": 512, "cy": 400, "r": 57.6 }
        }
      ],
      "accepted": false
    },
    {
      "slot": "bottom-right",
      "rect": { "x": 520, "y": 252, "w": 82, "h": 28 },
      "obstacles": [
        {
          "kind": "line",
          "owner": { "kind": "connector", "from": "api", "to": "db" },
          "line": { "x1": 512, "y1": 200, "x2": 512, "y2": 400 }
        }
      ],
      "accepted": false
    },
    /* … five more attempts … */
    {
      "slot": "top-left",
      "rect": { "x": 430, "y": 148, "w": 82, "h": 28 },
      "obstacles": [/* fallback still collides */],
      "accepted": true
    }
  ]
}
```

An agent reading this can:

- Move `api` to an outer column — `C1` would clear `db`'s icon.
- Shorten the `api` label so it fits in the narrower slots.
- Remove the direct `api → db` connector or waypoint it.

## Example: a route-failed diagnostic

```json
{
  "kind": "route-failed",
  "severity": "warning",
  "element": { "kind": "connector", "from": "a", "to": "b" },
  "message": "Connector a→b crosses node(s) \"mid\" and no routed alternative was found; the line is drawn straight through.",
  "suggestion": "Move a / b to an outer cell, add waypoints to steer the connector, or relocate \"mid\" so a clear path exists.",
  "attempts": [{
    "slot": "direct line",
    "rect": { "x": 0, "y": 0, "w": 0, "h": 0 },
    "obstacles": [{
      "kind": "icon",
      "owner": { "kind": "node", "id": "mid", "pos": { "col": 2, "row": 1, "address": "B1" } },
      "circle": { "cx": 240, "cy": 120, "r": 58 }
    }],
    "accepted": true
  }]
}
```

## Example: an icon-unresolved diagnostic

```json
{
  "kind": "icon-unresolved",
  "severity": "warning",
  "element": { "kind": "node", "id": "api" },
  "message": "Node \"api\" src=\"tabler/userr\" could not be resolved (no matching Tabler icon or registered entry).",
  "iconSrc": "tabler/userr",
  "iconReason": "not-found"
}
```

`iconReason` separates two distinct remediations:

- `'not-found'` — no such tabler name, no registered bare name, no
  resolved path. **Typical fix: rename / register.**
- `'load-failed'` — the loader attempted the source and got an I/O
  or network error. **Typical fix: check connectivity / path.**

For `'load-failed'`, the loader's error message is included in the
diagnostic's `message`.

## Getting diagnostics

### From the TS API

```ts
import { renderDiagram, resolveDiagramIcons } from 'gridgram'

const { def, diagnostics: iconDiagnostics } = resolveDiagramIcons(rawDef, ctx)
const { svg, diagnostics: layoutDiagnostics } = renderDiagram(def)

const all = [...iconDiagnostics, ...layoutDiagnostics]
```

### From the CLI

```sh
gg diagram.gg -o out.svg --diagnostics
#                         ^ writes JSON array of diagnostics to stderr
```

Or bundled with `--format json`:

```sh
gg diagram.gg --format json --stdout
# { "def": { … resolved DiagramDef … },
#   "diagnostics": [ … all diagnostics … ] }
```

A single stdout read gives an agent the resolved def plus its
feedback.

## Writing an agent loop

```ts
import { parseGg, resolveDiagramIcons, renderDiagram } from 'gridgram'
import { buildIconContext } from 'gridgram/node'

async function autoFixDiagram(source: string, maxAttempts = 5): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { def, errors, icons } = parseGg(source)
    if (errors.length) throw new Error(errors.map((e) => e.message).join('\n'))

    const ctx = await buildIconContext({ jsonIconsMap: icons, def, docDir: '.' })
    const iconResolve = resolveDiagramIcons(def, ctx)
    const rendered = renderDiagram(iconResolve.def)
    const diagnostics = [...iconResolve.diagnostics, ...rendered.diagnostics]

    if (diagnostics.length === 0) return rendered.svg

    // Hand the diagnostics to an LLM that edits the .gg source.
    source = await llm.rewriteDiagram(source, diagnostics)
  }
  throw new Error('diagram still has diagnostics after retry budget')
}
```

The shape is chosen so the LLM can receive the diagnostics as JSON
directly — no custom parsing layer.

## Severity

- `'warning'` — the diagram still renders. Labels show in
  fallback positions; routes draw straight through obstacles. Red
  markers in the SVG (unless `suppressErrors: true`) make the issue
  visible.
- `'error'` — the render is structurally broken. Currently unused
  at runtime (the reserved `region-disjoint` kind surfaces through
  `parseGg`'s integrity errors instead); kept in the type for future
  extension.

## See also

- [`renderDiagram` & friends](./render) — returns `diagnostics`.
- [Parser](./parser) — `resolveDiagramIcons` returns icon-unresolved
  diagnostics.
- [Integrations](./integrations) — MCP and HTTP surfaces.
