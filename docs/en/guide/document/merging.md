# Merging

A `.gg` file is allowed to have **multiple `doc` blocks** and to mix
DSL statements (`icon` / `region` / `note` / connectors) with JSON5
arrays inside those blocks. Gridgram resolves everything into a single
`DiagramDef` by following a small set of deterministic rules.

## Scalar and object settings: deep merge

`cellSize`, `padding`, `cols` / `rows`, `theme`, `icons` all merge
**in source order**, later values winning. For objects, the merge is
**deep** — unset sub-keys keep their earlier value:

```gg
doc { theme: { primary: '#065f46' } }
doc { theme: { accent:  '#d97706' } }
```

Final theme:
```
{ primary: '#065f46', accent: '#d97706', ... (other slots from default) }
```

The icons map merges key-by-key — later values win per key, but the
map as a whole stays additive:

```gg
doc { icons: { logo: './v1.svg' } }
doc { icons: { logo: './v2.svg', hero: './hero.svg' } }
```

Final: `{ logo: './v2.svg', hero: './hero.svg' }`.

## Array content: concat with ID checks

`nodes`, `connectors`, `regions`, `notes` **concatenate**. Declaring
them inside a `doc { }` body adds to anything declared via DSL:

| Array         | Dedup key  | On collision       |
|---------------|------------|--------------------|
| `nodes`       | `id`       | **error**          |
| `connectors`  | none       | concatenate as-is  |
| `regions`     | none       | concatenate as-is  |
| `notes`       | none       | concatenate as-is  |

Only `nodes` has a uniqueness constraint — duplicate node ids are
caught across DSL and JSON boundaries. The other arrays have no id
field to check, so it's on you not to duplicate them by accident.

## DSL vs JSON: when to use which

Both notations produce the same `DiagramDef`. Pick based on which
reads better for the situation:

- **DSL is denser** for bulk declarations — 10 nodes on a grid are
  one line each with `icon`, 4+ lines each in JSON.
- **JSON is clearer** when an item has many attributes — a connector
  with a label, 3 waypoints, a custom width, and a dash pattern fits
  better as an object than as a line.
- **Themes and icon maps aren't DSL-expressible** — always `doc { … }`.

### Inline `{ … }` — the middle ground

Every DSL statement (`icon`, `region`, `note`, connector) accepts a
trailing JSON5 body:

```gg
icon :ok @A1 tabler/server "ok" { badges: ['check'], color: 'accent/60' }
a --> b "routed"                    { waypoints: [{ col: 2.5, row: 1 }], strokeWidth: 3 }
region @A1:C1 "Top"               { color: 'accent/12', borderRadius: 8 }
```

Think of it as the DSL's escape hatch for richer attributes — badges
on an icon, a waypoint list on a connector, anything that would be
awkward as a sequence of `key=value` pairs. `name=value` and `{ … }`
can coexist on the same line; later occurrences win on key collisions.

A typical progression:

1. **Pure DSL** for simple elements.
2. **DSL + inline `{ … }`** when one attribute needs structure
   (badges, waypoints, nested objects).
3. **`doc { connectors: … }` / `doc { notes: … }` etc.** when an
   element has so many attributes that a whole multi-line object is
   clearer.

## Reference integrity

After merge, Gridgram runs reference checks against the merged
`DiagramDef`:

- Duplicate node ids → error (with both declaration sites)
- Connector `from` / `to` referencing unknown node ids → error
- Note `targets` referencing unknown node / connector ids → error
- Region spans outside `cols × rows` → error
- Region spans that aren't 4-connected → error

The parser runs these **after** merge so an error message can cite
both sides when the conflict straddles DSL and JSON.

## Ordering tips

`doc` blocks don't have to be at the top of the file — they take
effect in source order, so you can group them with related DSL if that
reads better:

```gg
# --- global settings ---
doc { theme: { primary: '#065f46' } }

# --- public layer ---
icon :front @A1 tabler/world  "Front"
icon :edge  @B1 tabler/server "Edge"

# --- complex connector that wants multi-line JSON ---
doc {
  connectors: [
    {
      from: 'front', to: 'edge', arrow: 'end',
      label: 'GET /\n(CDN-cached)',
      labelScale: 1.1,
      waypoints: [{ col: 1.5, row: 1 }],
    },
  ],
}
```
