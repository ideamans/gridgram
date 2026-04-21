# Labels

A connector's label sits near the midpoint of the line on a semi-
transparent pill so the text reads cleanly over the arrow.

## Basic syntax

```
<from> <arrow> <to> "<label>"
```

The label is a **positional** quoted string — no separator (the old
`: "label"` form is gone). Either `"…"` or `'…'` quotes work. They're
mandatory whenever the label contains spaces or punctuation.

## Multi-line, emphasis, color

<Example name="conn-labels" />

- **Multi-line labels** — use `\n` inside the string. The line wraps
  stay manual (we don't auto-wrap; it would fight the grid layout).
- **`labelScale`** — multiplier on the font size (default `1`). Useful
  for one emphasized flow among many, or for shrinking a long label to
  fit.
- **`color`** — the connector color cascades into the label pill's
  border and text via `currentColor`, so one attribute restyles the
  whole edge.

## Escape characters

Labels accept standard backslash escapes inside the quoted string:

| Escape | Produces  | When to use |
|--------|-----------|-------------|
| `\n`   | newline   | Force a line break |
| `\t`   | tab       | Rarely needed; grid-like layouts |
| `\"`   | `"`       | Literal double-quote inside a label |
| `\\`   | `\`       | Literal backslash |

```gg
api --> db "DELETE /users/\"me\"\nsync"
```

## When one line has too many attributes

Once a connector grows a label, a waypoint list, a custom width, and a
dash pattern, DSL attributes start fighting for legibility. Two
escape hatches:

**Inline `{ … }`** — append a JSON5 body to the same line:

```gg
api --> db "cold-read" { strokeWidth: 3, labelScale: 1.25, color: 'accent' }
```

**`doc { connectors: … }`** — lift the whole connector into JSON5 for
multi-line clarity:

```gg
doc {
  connectors: [
    {
      from: 'api', to: 'db', arrow: 'end',
      label: 'cold-read\n(~200ms)',
      color: 'accent',
      labelScale: 1.25,
      strokeWidth: 3,
    },
  ],
}
```

All three notations produce the same SVG. Pick whichever reads better.
