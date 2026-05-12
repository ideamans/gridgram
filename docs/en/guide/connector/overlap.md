# Overlapping pairs

When **exactly two** connectors share the same unordered endpoint pair
— irrespective of arrow direction, so `a → b` plus `b → a` counts as a
pair — gridgram automatically rotates each line's **connection points
on the node circles** so the two arrows emerge in mirrored positions
and run side by side instead of stacking on top of each other.

The treatment is **only** applied when a pair would otherwise render as
two straight lines on top of each other. Connectors with explicit
`waypoints: [...]` are left alone — the author has already decided how
they route — and connectors that the router bends around obstacles are
left alone too.

## Example

<Example name="conn-overlap-split" />

All 16 connectors above are declared as plain `a --> b "label"` lines.
Because every node pair has exactly two connectors, each pair is
auto-split — once for `req`, once for `ack` — into mirrored parallel
lines. The pattern works uniformly in all 8 directions (E, N, W, S and
the 4 diagonals).

## Geometry

The lines remain **strictly straight**. What changes is the angle on
each node's circle where the line attaches:

```
            ╱─── req ───╲
node A ┤ rotated by ±15°  ├ node B
            ╲─── ack ───╱
```

- Each member of the pair rotates its connection point by **15°** on
  the participating node circles, in mirrored directions.
- For default circle nodes (radius = 22.5% of `cellSize`), this works
  out to a perpendicular separation of ≈ 12% of `cellSize` between the
  two paired arrows — visibly distinct without looking unrelated.
- The rotation is computed in the **canonical** (alphabetically ordered)
  endpoint frame, so `a → b` and `b → a` still come out on opposite
  canonical sides regardless of arrow direction.

Because the path is still a single straight segment, connector labels,
the JSON output, and downstream consumers all see normal-shaped
geometry; only the SVG polyline endpoints move.

## Labels follow the line

Connector labels are placed against the rotated line using the same
candidate-segment search as any straight connector. No author action
required.

## Three or more — the overlap is treated as an error

The auto-split only works for exactly two connectors. If three or more
connectors share the same unordered endpoint pair, gridgram draws **all
of them as straight lines** (so the first two stack on top of each
other) and marks the **3rd and beyond** with the error color. A
`connector-overlap` diagnostic is emitted with a suggestion to either
remove the duplicate or add explicit waypoints.

```gg
a --> b "first"
a --> b "second"
a --> b "third"   # rendered in error color + diagnostic
```

To fix: keep at most two connectors between any pair of nodes, or give
the extras explicit waypoints so they take a deliberate path:

```gg
a --> b "first"
a --> b "second"
a --> b "third" {
  waypoints: [{ col: 2, row: 1.5 }],
}
```

## Opting out

A pair with at least one of the two connectors carrying explicit
`waypoints: [...]` is **not** auto-split — the explicit routing is taken
as the author's intent and the other connector renders as a straight
line. Use this when you want one connector to follow a specific path
and the other to stay direct.
