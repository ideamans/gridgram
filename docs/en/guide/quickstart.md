# Quickstart (.gg)

## Install the `gg` binary

```sh
# Pre-built binary release (coming soon)
curl -L https://github.com/ideamans/gridgram/releases/latest/download/gg -o gg
chmod +x gg

# Or run from source
bun install
bun run src/cli/gg.ts
```

## Your first diagram

Create `hello.gg`:

```gg
icon :user tabler/user     "User"
icon :web  tabler/world    "Web"
icon :api  tabler/server   "API"
icon :db   tabler/database "DB"

user --> web "HTTPS"
web  <-> api "REST"
api  <-> db  "SQL"
```

Every line begins with a **command keyword** (`icon`, `region`, `note`,
`doc`) — except connectors, which take the Mermaid-like
`<id> <arrow> <id>` shape. `:user` is the id (`:` sigil), `src=…` names
the icon asset, and `"…"` is the label. Arguments are
order-independent — the prefix character tells Gridgram what each
token is.

`tabler/<name>` is the built-in icon namespace. Any of the 5,500+
Tabler outline icons work — `tabler/filled/<name>` for the filled
variants where they exist. Bare names (`logo`, `my-widget`) only
resolve when you've registered them via `doc { icons: … }` or a
project config alias.

Render:

```sh
gg hello.gg -o hello.svg
gg hello.gg -o hello.png   # PNG via sharp
```

You get this:

<Example name="quickstart-01-no-coords" />

Notice there are no `@col,row` markers on the icons. When position is
omitted, Gridgram assigns one automatically by walking the `icon`
statements in declaration order — column increments along row 0, so a
simple horizontal flow needs no coordinates at all.

## Adding structure with explicit positions

Once you outgrow a single row, give each icon a grid address. Gridgram
accepts both **Excel-style A1 notation** (the preferred form) and
numeric `@col,row` coordinates — both are 1-based, so `@A1` == `@A1`
== top-left:

```gg
icon :cdn @A1 tabler/cloud "CDN"    # A1 form (recommended)
icon :api @A2 tabler/server "API"  # numeric, same semantics
```

Use a `doc { … }` statement to fix diagram-level settings. Regions
group related cells; connectors thread between them.

<Example name="quickstart-02-grid-3x3" coords cols="3" rows="3" />

Key things in this example:

- `doc { cols: 3, rows: 3, theme: { … } }` — diagram-level settings
- `region @A1-C1 "Public" color=accent/12` — a single range across a row
- `color=accent/12` — theme keyword + alpha (the `/12` syntax)
- `<-> ` (`session`) — bidirectional arrow with a label

Both `.gg` and the equivalent TypeScript `DiagramDef` produce
byte-identical SVG. The TypeScript source also accepts the tuple
shorthand `pos: [col, row]` so the two notations stay 1:1 with the
`.gg` `@col,row` syntax.

## Where to next

- **[Document](./document/)** — `doc { … }`, merge rules, commands list
- **[Icon](./icon/)** — Tabler, external paths, aliases, custom
- **[Badge](./icon/badge)** — preset semantic markings
- **[CLI reference](./cli)** — every flag, exit codes
