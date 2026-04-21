# Project planning

Task dependencies, sprint cycles, and milestone timelines.

## Task dependency graph

A small project where some tasks can run in parallel and others
must serialise. Critical path surfaces as the longest chain.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :design @A2 tabler/pencil  "Design"
icon :api    @B1 tabler/code    "API"
icon :ui     @B3 tabler/layout  "UI"
icon :int    @C2 tabler/link    "Integrate"
icon :test   @D2 tabler/check   "Test"

design --> api
design --> ui
api --> int
ui  --> int
int --> test
```

## Sprint cycle

A two-week agile loop: plan → work → review → retro, then
repeat. The retro feeds improvements back into the next plan.

```gg-diagram gallery
doc { cols: 4 }

icon :plan    tabler/calendar   "Plan"
icon :work    tabler/hammer     "Work"
icon :review  tabler/eye        "Review"
icon :retro   tabler/refresh    "Retro"

plan   --> work
work   --> review
review --> retro
retro --> plan "next sprint"
```

## Milestone timeline

Linear progression of project milestones. Useful for keeping
stakeholders aligned on "where are we right now."

```gg-diagram gallery
doc { cols: 5 }

icon :m1 tabler/flag       "Kickoff"
icon :m2 tabler/target     "Alpha"
icon :m3 tabler/rocket     "Beta"
icon :m4 tabler/trophy     "GA"
icon :m5 tabler/chart-line "Scale"

m1 --> m2
m2 --> m3
m3 --> m4
m4 --> m5
```

## Release train

Fixed cadence trains leaving on schedule; features board whichever
train is ready. Missing a train is fine — you catch the next.

```gg-diagram gallery
doc { cols: 5 }

icon :f1  tabler/box       "Feature A"
icon :f2  tabler/box       "Feature B"
icon :f3  tabler/box       "Feature C"
icon :t1  tabler/train     "Train Q1"
icon :t2  tabler/train     "Train Q2"

f1 --> t1 "ready"
f2 --> t1 "ready"
f3 --> t2 "next"
t1 --> t2 dash="4 4"
```
