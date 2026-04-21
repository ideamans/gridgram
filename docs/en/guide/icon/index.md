# Icon

Every node in Gridgram is declared with the `icon` command — a small
monochrome glyph that tells the reader at a glance what kind of thing
this node is (a server, a user, a message bus, …).

## The three flavors

```gg
icon :front @A1 tabler/user           "Front"    # 1. built-in Tabler outline
icon :star  @B1 tabler/filled/star    "Star"     # 2. built-in Tabler filled
icon :my    @C1 @assets/my-widget.svg "Custom"   # 3. external file / alias / URL
```

| Flavor                    | Asset reference            | Notes |
|---------------------------|----------------------------|-------|
| Tabler outline            | `tabler/<name>`            | 5,500+ icons; the default |
| Tabler filled             | `tabler/filled/<name>`     | Filled variants where they exist |
| External file / URL       | `./x.svg`, `@alias/x.svg`, `https://…` | Resolved by the loader |
| Registered bare name      | `<name>` (no prefix)       | Needs `doc { icons: … }` or a config alias |

"Bare name" here means a single identifier like `logo` with no
namespace prefix — Gridgram treats those strictly and doesn't try to
autoresolve them, so they can't collide with Tabler icon names.

## Bare word = `src` shorthand

The unprefixed word following `:id` and `@pos` is the asset reference.
The following three lines produce identical diagrams:

```gg
icon :server @A1 tabler/server "Server"                       # bare form (preferred)
icon :server @A1 src=tabler/server "Server"                   # explicit attr
icon :server @A1 "Server" { src: "tabler/server" }            # body form
```

Use whichever reads best. The bare form is easiest to scan; `src=` and
the body form are useful when you're generating `.gg` programmatically
or need to combine `src` with many other attributes.

## A minimal example

<Example name="basic-01-hello" />

The icon renders inside the node's circular clip. Its color is
inherited from the node color via `currentColor`: Tabler's monochrome
icons adopt whatever color you set on the node, so you never have to
color-match the icon to the ring.

## When an icon can't be resolved

If you pass a `src=` value that doesn't map to anything the resolver
can find, the node is flagged `iconError: true` and rendered with a
**red ring and no glyph**. You see the problem immediately in the
output, and the diagram still renders — no broken build, no missing
image placeholder.

```gg
icon :front @A1 tabler/userr "typo"   # Tabler has no "userr" → red ring
```

## `iconTheme`: theme vs native

Monochrome Tabler icons use `currentColor` so they pick up the node
color. If you reference a **multicolor** asset (a branded logo, a
flag), the automatic `currentColor` cascade would flatten it to one
color. Set `iconTheme=native` on the node to preserve the file's own
fills:

<Example name="icon-native" />

The left icon has `color=accent` (orange) applied the default way —
`currentColor` wins over the asset's fills, so the multicolor glyph
collapses into a single orange blob. The right one adds
`iconTheme=native`, which **skips** the `currentColor` cascade so
the SVG's own colors render as authored. Typical use: brand logos,
flags, photos-as-glyphs (use a raster asset + `clip=circle` for
avatar-style).

```gg
icon @A1 @brand/aws.svg      "AWS"
icon @B1 @brand/aws.svg      "AWS" iconTheme=native
```

The node *ring* still uses `color` in both cases — `iconTheme` only
governs the icon's inside.

## Argument order is free

Between the `icon` keyword and an optional `{ … }` body, the arguments
can come in any order — each one is identified by its prefix
(`:` id, `@` pos, `src=` / `color=` / … attr, `"…"` label). The
following four lines are all equivalent:

```gg
icon :a @A1 tabler/user "A"
icon "A" @A1 tabler/user :a
icon tabler/user :a "A" @A1
icon :a tabler/user { label: "A", pos: [1, 1] }
```

Most authors stick with one consistent order for readability; the
freedom helps when generating `.gg` from code.

## Where to next

- **[Badge](./badge)** — corner markers (check / alert / lock / …)
- **[Size](./size)** — `size` vs `sizeScale`, label scaling
- **[Custom](./custom)** — registering your own icons
