# gridgram — LLM reference

Version: {{VERSION}}

This document is generated from the gridgram source tree. It covers everything an AI agent needs to produce or lint `.gg` diagram files and to invoke the `gg` CLI.

If you're looking at the full generated file, it includes:

- The `gg` CLI command reference
- The `.gg` DSL grammar (BNF) and semantics
- Document-level settings (`doc { … }`)
- Built-in icon resolution (Tabler sets) and counts
- JSON output envelope shape
- Canonical examples

---

## gg CLI

gridgram is invoked as `gg`. The primary action renders a `.gg` file to SVG, PNG, or a JSON envelope. Utility subcommands expose icon search and this LLM reference.

```
{{CLI_USAGE}}
```

### Subcommands

{{CLI_SUBCOMMANDS}}

### Exit codes

- `0` — success
- `1` — parse error (bad `.gg` syntax) or bad CLI usage
- `2` — integrity error (unknown node reference, region not 4-connected, etc.)
- `3` — I/O or environment error (can't read file, sharp missing for PNG, etc.)

The CLI's `--diagnostics` flag emits placement / icon-resolution diagnostics as JSON to stderr. The core render still succeeds (exit 0), but a machine-readable log of warnings is produced that agents can use to retry with better inputs.

---

## .gg DSL

The `.gg` format is a whitespace-tolerant, command-first DSL. Every file is a list of statements. Each statement declares a document-level setting, a node (icon / region / note), or a connector.

### Grammar (informal BNF)

```
{{GG_GRAMMAR}}
```

### Statement kinds

- **`doc { … }`** — a JSON5 body of document settings. Merged with project config and CLI overrides. Known keys: `cellSize`, `padding`, `columns` (or `cols`), `rows`, `theme`, `icons`, and frame-specific overrides.
- **`icon`** — a node. `icon :id @pos [tabler/<name>|…|<src>] "label" attr=val`. Position is optional; omitted positions auto-flow along `cols`. The asset reference can be omitted entirely — see "Text in place of an icon" below for the empty / `text=` cases.
- **`region`** — a rectangular background span. `region :id @col,row-col,row [label]`. Must be 4-connected.
- **`note`** — an annotation with a leader line pointing at one or more targets.
- **`<id> <arrow> <id>`** — a connector between nodes. Arrow forms: `-->`, `->`, `<--`, `<->`, `---`, `..>`, `<..`, `<..>`, `...` (dashed = `.`, solid = `-`).

### Coordinate forms

All of these refer to the same cell:

- **A1 string**: `@A1`, `@B2`, `@Z99`
- **Tuple form**: `@1,1` (1-based, `col,row`)
- **Span (region)**: `@A1-B3` or `@1,1-2,3`

Internally gridgram normalizes everything to 0-based `{ col, row }` before layout.

### Frame specifiers

A leading `[<frame>]` or inline `[<frame>]` arg restricts a statement to specific frame numbers: `[1]`, `[2-5]`, `[3-]` (from 3 to last). Used with `--frame <n>` or the TS API's `frame` option to render multi-step sequence diagrams.

---

## Icons

gridgram ships with the full Tabler icon set. Reference them from `.gg` as:

- `tabler/<name>` — outline style (default, 24×24 stroke)
- `tabler/filled/<name>` — filled style

Counts:

- **Outline**: {{ICON_OUTLINE_COUNT}} icons
- **Filled**: {{ICON_FILLED_COUNT}} icons
- **Total records**: {{ICON_TOTAL_COUNT}} (one per icon+style pair)

### Finding the right icon

Use `gg icons` from the CLI to search. Recommended agent flow:

1. `gg icons --tags --limit 50` — see the most common tag namespaces.
2. `gg icons --tag <tag>` — pivot on a tag that looks relevant.
3. `gg icons --search <query>` — fuzzy match across name, label, tags, category.
4. `gg icons --search <query> --format json --limit 10` — structured results with scores, for a deterministic pick.

Scoring (higher = better): exact name 10, prefix 7, exact tag 5, name substring 4, label substring 3, category substring 2, tag substring 1.

### Registering your own icons

- `gg render … --icons <dir>` registers every `*.svg` in `<dir>` by basename.
- `gg render … --alias name=dir` (repeatable) sets up `@name/x.svg` → `<dir>/x.svg`.
- Inside a `.gg` file, `doc { icons: { <key>: "<svg path or inline markup>" } }` declares per-document icons.

Resolution order: inline `doc { icons }` → `--icons`/`iconsDir` scan → built-in tabler resolver → error (red ring + diagnostic).

The error trigger is *"asset name supplied but didn't resolve"*. An `icon` declaration with **no asset reference** is fine — the node renders as a colored ring (useful as a placeholder, or with `text=`).

### Text in place of an icon

`text="<string>"` puts short text inside the node circle instead of an icon. Use it for step numbers, status codes, single CJK characters, etc.

```gg
icon :step1 @A1 text="1" "Submit"
icon :step2 @B1 text="42" "Two digits"
icon :step3 @C1 text="A\nB" "Multi-line via \\n"
```

Sizing rules — gridgram picks the largest font that satisfies both:

1. text aspect ratio = (max line chars) / (line count)
2. the bounding box is the largest rectangle of that aspect inscribed in the node circle (so wider one-line strings spill past the icon-area's left/right edges, gaining width from the rounded corners)
3. if the box height exceeds the icon-area height, height is clamped to that and width shrinks proportionally (aspect preserved)
4. each line's `<tspan>` carries `textLength` so glyphs lock to the computed width regardless of the font's true per-glyph aspect

If both `src=` and `text=` are given on the same node, `text=` wins (the icon is suppressed). The convention is to use one or the other.

### Pinning the label direction

By default the label placer auto-searches eight slots around the node. To force a specific slot, use the CSS-style `style=` attribute:

```gg
icon :hub @B2 tabler/server "Hub" style="label-direction: bottom-right"
```

Accepted values (kebab-case): `top-right`, `top-center`, `top-left`, `right-center`, `left-center`, `bottom-right`, `bottom-center`, `bottom-left`. In the TypeScript API the equivalent field is `labelDirection`.

The placer auto-search has two axes: **leader-length tier (1 = tight, 2 = medium, 3 = long)** × **direction (8 slots)**. `label-direction` and `leader-length` independently filter their axis to a single value:

| Pinned                  | Candidate combinations  |
|-------------------------|-------------------------|
| neither (default)       | 3 × 8 = 24              |
| `label-direction` only  | 3 × 1 = 3               |
| `leader-length` only    | 1 × 8 = 8               |
| both                    | 1                       |

```gg
icon :a @A1 tabler/server "Hub" style="leader-length: 3"
icon :b @B1 tabler/server "Hub" style="label-direction: top-right; leader-length: 2"
```

`leader-length` accepts `1`, `2`, or `3`; the TS-API equivalent is `leaderLength`. If every candidate in the filtered set collides, the label still renders at the smallest-collision candidate but the result carries `error: true` and a `label-collision` diagnostic. The `style=` syntax is `property: value` pairs separated by `;`; today recognised properties are `label-direction` and `leader-length`.

---

## Document settings (`doc { … }`)

Keys accepted inside a `doc { … }` block:

- `cellSize` — px per cell (default `256`)
- `padding` — px of inner SVG padding (default derived from cellSize)
- `columns` / `cols` — grid column count (default inferred)
- `rows` — grid row count (default inferred)
- `theme` — color theme object (`primary`, `secondary`, `background`, `fg`, etc.)
- `icons` — map of `{ name: "<path or inline svg>" }`
- `suppressErrors` — set `true` to skip red error rings

Settings resolve in order: system defaults → `gridgram.config.*` (walk-up from cwd) → `doc { }` embedded → CLI flags (highest priority).

---

## JSON output envelope

With `--format json --stdout`, `gg` prints:

```json
{
  "def": {
    "cellSize": 256,
    "padding": 64,
    "columns": 2,
    "rows": 2,
    "theme": { "primary": "#…", "secondary": "#…", "background": "#ffffff", … },
    "nodes": [ { "id": "api", "pos": { "col": 0, "row": 0 }, "icon": { … }, "label": "API" }, … ],
    "connectors": [ { "from": "front", "to": "api", "label": "REST", "arrow": "-->", … }, … ],
    "regions": [ … ],
    "notes": [ … ]
  },
  "diagnostics": [
    { "kind": "icon-unresolved", "element": { "id": "x" }, "iconSrc": "…", "iconReason": "not-found" },
    …
  ]
}
```

- `def` — the merged, normalized `DiagramDef` (post-config-merge, post-coordinate-normalize).
- `diagnostics` — layout + icon issues. Empty array means the diagram is clean.

Agents should read both: a nonzero `diagnostics.length` signals the render produced an SVG but with warnings (missing icons drawn as red rings, failed routing, etc.).

---

## Canonical examples

### Minimal (1 node)

```gg
{{EXAMPLE_MINIMAL}}
```

### Grid layout (2×2) with connectors

```gg
{{EXAMPLE_GRID}}
```

### Auto-wrap with `doc { cols }`

```gg
{{EXAMPLE_AUTO_WRAP}}
```

### Arrow variants

```gg
{{EXAMPLE_ARROWS}}
```

---

## Best practices for agents

- **Start from `tabler/<name>`**. Use `gg icons --search` before inventing new sources.
- **Use `:id` sigils** on nodes you plan to reference in connectors or notes. Auto-generated ids (from `label`) exist but change with labels.
- **Prefer A1 positions** (`@A1`) for readability — they line up visually in source.
- **Validate with `--format json --diagnostics`** before reporting success. Empty diagnostics array == clean.
- **Don't hand-edit generated files**. `src/generated/` and `docs/public/llms*.txt` are machine outputs. Fix the original (`src/cli/args.ts`, `src/gg/dsl.ts`, `src/templates/llm-reference.template.md`, the example files) and regenerate.
