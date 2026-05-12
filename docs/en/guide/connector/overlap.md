# Overlapping pairs

When **exactly two** connectors share the same unordered endpoint pair
— irrespective of arrow direction, so `a → b` plus `b → a` counts as a
pair — gridgram automatically splits them into two **bowed paths** that
mirror each other across the original axis. This keeps both arrows
visible (and individually clickable / labellable) without forcing the
author to add waypoints.

The treatment is **only** applied when a pair would otherwise render as
two straight lines on top of each other. Connectors with explicit
`waypoints: [...]` are left alone — the author has already decided how
they route — and connectors that the router bends around obstacles are
left alone too.

## Example

<Example name="conn-overlap-split" />

All 16 connectors above are declared as plain `a --> b "label"` lines.
Because every node pair has exactly two connectors, each pair is
auto-split — once for `req`, once for `ack` — in mirrored bows. The
pattern works uniformly in all 8 directions (E, N, W, S and the 4
diagonals).

## Geometry

For each member of the pair, gridgram inserts two pixel waypoints at
either end of the centerline:

```
start ─┐
       └────────── horizontal middle ──────────┐
                                               └─ end
```

- Perpendicular bow distance ≈ **10% of `cellSize`** (so a pair's two
  paths are separated by roughly 20% of a grid cell at their widest).
- The diagonals at each end aim for **45°** from the connector axis;
  for larger nodes the along-offset is extended just enough to keep
  the waypoint outside the node circle, which softens the angle a bit
  but keeps the bow well-formed.

The bow waypoints are computed against the **canonical** (alphabetically
ordered) endpoint pair, so `a → b` and `b → a` still come out on
opposite canonical sides regardless of arrow direction.

## Labels follow the bow

Connector labels are placed by walking the resolved polyline
(`start → w1 → w2 → end`), so a meandered connector's label lands on
its own bowed path using the same candidate-segment search as a
straight or hand-routed connector. No author action required.

## Three or more — the overlap is treated as an error

The auto-split geometry only works for exactly two connectors. If three
or more connectors share the same unordered endpoint pair, gridgram
draws **all of them as straight lines** (so the first two stack on top
of each other) and marks the **3rd and beyond** with the error color.
A `connector-overlap` diagnostic is emitted with a suggestion to either
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
