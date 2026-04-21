# Release & roadmap

Version lifecycles, feature rollouts, deprecation timelines.

## Version timeline

Three releases across a year, each introducing a theme. Useful for
communicating direction to stakeholders outside the team.

```gg-diagram gallery
doc { cols: 5 }

icon :v1 tabler/flag      "v1.0"
icon :v2 tabler/rocket    "v1.1"
icon :v3 tabler/bolt      "v2.0"
icon :v4 tabler/star      "v2.1"
icon :v5 tabler/trophy    "v3.0"

v1 --> v2
v2 --> v3
v3 --> v4
v4 --> v5

note @C2 "v1→v3: search & accounts\nv4→v5: mobile & AI"
```

## Feature rollout (canary → beta → GA)

Percentage-based rollout. Each stage holds for a period; a spike in
errors rolls back instead of advancing.

```gg-diagram gallery
doc { cols: 4 }

icon :dev    tabler/pencil       "Dev"
icon :canary tabler/percentage   "Canary 1%"
icon :beta   tabler/percentage   "Beta 10%"
icon :ga     tabler/percentage   "GA 100%"

dev    --> canary "deploy"
canary --> beta   "no spikes"
beta   --> ga     "no spikes"
```

## Quarterly roadmap

Four quarters, themed. Mid-quarter reviews check if the theme is
still the right bet; the plan shifts if the market moved.

```gg-diagram gallery
doc { cols: 4 }

icon :q1 tabler/calendar "Q1 Foundations"
icon :q2 tabler/calendar "Q2 Scale"
icon :q3 tabler/calendar "Q3 Polish"
icon :q4 tabler/calendar "Q4 Ecosystem"

q1 --> q2
q2 --> q3
q3 --> q4
```

## Deprecation schedule

New-and-old running in parallel, then old turned off. The
"announce → deprecate → sunset" cadence gives consumers time to
migrate.

```gg-diagram gallery
doc { cols: 4 }

icon :ann   tabler/bell      "Announce"
icon :dep   tabler/alert-triangle "Deprecate"
icon :sun   tabler/sunset    "Sunset"
icon :rem   tabler/trash     "Remove"

ann --> dep "6 months"
dep --> sun "3 months"
sun --> rem "immediate"
```
