# Note

A **note** is a small callout box pinned to a grid cell, with optional
**leader lines** pointing at one or more nodes or connectors. Use notes
for annotations that don't fit as a label — invariants, caveats, links
to runbooks, or just section commentary.

Notes occupy a cell exactly like a node, but they render text on a
soft background rather than inside a circular clip.

## A basic example

<Example name="note-basic" />

In the example above, four notes annotate different parts of the
flow:

- **Stateless / auto-scaled** points at the `api` node
- **SQL with join** points at the `query` connector (note how the
  `"query"` label on the connector shifts out of the way so it
  doesn't sit on top of the note's dotted leader)
- **Session token** points at the `login` connector
- **Read replica** points at the `db` node, in an amber color

## Syntax

```
note @<pos> (<target-list>) "<text>" [attr=value ...] [{ body }]
```

- `@<pos>` is a single cell (`@A1` or `@col,row`). Required.
- `(a, b, c)` is the optional list of node / connector ids this note
  points at. Omit for a standalone callout.
- `"<text>"` is the note's body text. Required.
- Trailing `attr=value` or `{ … }` body overrides `bg`, `color`,
  `labelScale`.

```gg
note @B1 (api)     "Stateless\nauto-scaled"
note @A3 (login)   "Session token carried as Bearer JWT"
note @C3 (db, api) "Multi-target note" color=#b45309
note @D4           "Standalone — no leader line"
```

## Standalone notes, multi-target, bold

<Example name="note-advanced" />

Three patterns show up in the diagram above — all of them are
regular `note` statements, just using different optional pieces of
the grammar.

**Standalone** (no `(…)` target list) — useful for section headers
or general prose in an empty cell:

```gg
note @A1 "**Public** edge"   color=#0369a1
note @C1 "**Async** path"    color=#7c3aed
```

**Multi-target** — one note points at several ids. Leaders fan out
from the note body, each stopping short of its target:

```gg
note @D3 (queue, store) "Both **read** after\nthe request completes"
```

Targets can mix nodes and connectors; duplicates are dropped.

**Bold text** — wrap a segment in `**…**` for inline emphasis. This
is the only inline formatting notes parse; there's no italics,
links, or full Markdown:

```gg
note @B3 (req, api) "Rate-limited"  color=#b45309
```

`\n` inside the string forces a hard line break; long lines wrap to
the cell width automatically, with CJK-aware kinsoku (no punctuation
stranded at line-start or line-end).

## `targets`: what the leader lines point at

Each id inside `(…)` is matched against:

- **Node ids** (declared by `icon :name` in DSL or `{ id: 'name' }` in
  JSON)
- **Connector ids** (set via `id=<name>` in DSL or `id: '<name>'` in
  JSON)

An unresolved target produces an integrity error — same rule as
connector `from` / `to`, so broken references surface immediately.

Leaders render as dotted lines (`stroke-dasharray="1 3"`) in the
note's color at reduced opacity. They're included in the label
collision set, so node / connector / region labels automatically
avoid sitting on top of a note's leader.

## Styling

| Field        | Default       | Effect |
|--------------|---------------|--------|
| `bg`         | `#ffffff`     | Background fill of the note body |
| `color`      | `theme.text`  | Border + text + leader-line color |
| `labelScale` | `1`           | Font-size multiplier |

Setting `color=#b45309` recolors the border, the text, **and** the
leader line together, so a single attribute produces a
cohesively-themed note. Use `bg` when you need the body fill to
differ from white (e.g. on a dark theme with `theme.bg: '#0f172a'`).
