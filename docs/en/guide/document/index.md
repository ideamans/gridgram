# Document

"Document" is everything in a `.gg` file that isn't an icon, connector,
region, or note — the **diagram-level settings** (columns, rows, theme,
icons) carried inside one or more `doc { … }` statements.

## The `doc { … }` statement

```gg
doc {
  cols: 3, rows: 3,
  theme: { primary: '#1e3a5f', accent: '#e8792f' },
  icons: {
    logo: './assets/logo.svg',
  },
}
```

Everything inside the braces is JSON5 (not strict JSON). You get:

- **Unquoted keys** — `cols: 3` is fine; no need for `"cols"`
- **Trailing commas** — every list/object can end with one
- **`//` comments** — `// inside JSON5`
- **Single-quoted strings** — `'#1e3a5f'` works as well as `"…"`

Strict JSON is a subset of JSON5, so anything you'd write in plain
JSON parses unchanged.

## Multiple `doc` blocks per file

A single `.gg` can contain as many `doc` blocks as you want; they're
merged in source order (later values win). Arrays concatenate; scalars
deep-merge:

```gg
doc { cols: 4 }

# … DSL …

doc {
  theme: { accent: '#d97706' },
}
```

Both the `cols` and `theme.accent` values end up in the final
`DiagramDef`. See [Merging](./merging) for the full rules.

## The five commands

Every `.gg` line starts with one of these keywords, **except
connectors** (which take the `<id> <arrow> <id>` shape):

| Command  | Purpose                                            |
|----------|----------------------------------------------------|
| `doc`    | diagram-level settings (theme / cols / icons / …) |
| `icon`   | declare a node with an icon                        |
| `region` | declare a colored background zone                  |
| `note`   | declare an annotation callout                      |

Connectors never start with a keyword — Gridgram detects them by the
arrow in position 2.

## What can go in a `doc` body

Every top-level field of `DiagramDef` is accepted:

| Key                    | What it controls                                         |
|------------------------|----------------------------------------------------------|
| `cellSize`             | Pixel size per grid cell (default `256`)                 |
| `padding`              | Outer padding on the SVG (default scaled from cellSize)  |
| `cols` / `columns`     | Number of columns (auto-inferred when omitted)           |
| `rows`                 | Number of rows (auto-inferred when omitted)              |
| `theme`                | Color palette                                            |
| `icons`                | Bare-name → SVG map for custom icons                     |
| `nodes`                | Node array (usually prefer `icon` DSL)                   |
| `connectors`           | Connector array (usually prefer DSL)                     |
| `regions`              | Region array (usually prefer `region` DSL)               |
| `notes`                | Note array (usually prefer `note` DSL)                   |

## Comments

`.gg` supports **line comments** with `#` or `//`:

```gg
# section: public layer
icon :web @A1 tabler/world "Web"   // externally visible
```

## Where to next

- **[Grid](./grid)** — `cols` / `rows` / `cellSize` / auto-inference
- **[Merging](./merging)** — multiple `doc` blocks, deep merge, DSL vs
  JSON tradeoffs
