# CI / CD

Continuous integration and delivery flows, from a developer's
commit to a running production.

## Pipeline with gated promotions

Region bands (three tinted tiers) + success badges + a manual gate
marked with extra stroke width. Gives the feel of a control
console.

```gg-diagram gallery
doc {
  cols: 5,
  theme: { primary: '#0369a1', secondary: '#0284c7', accent: '#f59e0b' },
}

region @A1:B1 "Build"    color=primary/30
region @C1:C1 "Staging"  color=secondary/28
region @D1:E1 "Prod"     color=accent/30

icon :dev    @A1 tabler/user       "Dev"
icon :ci     @B1 tabler/settings   "CI"      { badges: ['check'] } sizeScale=1.3
icon :stage  @C1 tabler/server     "staging" { badges: ['check'] }
icon :gate   @D1 tabler/lock       "Gate"    { badges: ['alert'] }
icon :prod   @E1 tabler/rocket     "prod"    { badges: ['star'] }  sizeScale=1.4

dev   --> ci    "push"
ci    --> stage "auto"
stage --> gate  "ready"
gate  --> prod  "approve" width=3
```

## Matrix build

A single commit fans out across five workers in parallel. The
diagram is deliberately plain — one theme colour, no regions — so
it contrasts with the richer examples above and below.

```gg-diagram gallery
doc { cols: 3, rows: 3 }

icon :src   @A2 tabler/git-commit  "Commit"
icon :n18   @B1 tabler/server      "18/linux"
icon :n20   @B2 tabler/server      "20/linux"
icon :n22   @B3 tabler/server      "22/linux"
icon :merge @C2 tabler/check       "Merge"   sizeScale=1.3

src --> n18
src --> n20
src --> n22
n18 --> merge
n20 --> merge
n22 --> merge
```

## Feature branch preview

Dashed "preview" deploy for peer review; solid path for merge-to-
main. A note anchors the decision point so reviewers know what
triggers the automation.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :pr      @A1 tabler/git-pull-request "PR"
icon :preview @B1 tabler/world             "Preview"
icon :merge   @C1 tabler/git-merge         "merge"
icon :main    @D1 tabler/server            "staging"

pr      --> preview "deploy" dash="2 4"
pr      --> merge
merge   --> main    "promote" width=2

note @B2 (preview) "URL posted\nback to the PR"
```

## Deployment topology

Final CI step: one artefact, one binary, many runtimes. The hub
carries the visual weight via `sizeScale`.

```gg-diagram gallery
doc { cols: 3, rows: 2 }

region @A1:C1 "Artefact" color=primary/28
region @A2:C2 "Runtimes" color=secondary/24

icon :art @B1 tabler/package "Artefact" sizeScale=1.5
icon :r1  @A2 tabler/brand-ubuntu   "Linux"
icon :r2  @B2 tabler/brand-apple    "macOS"
icon :r3  @C2 tabler/brand-windows  "Windows"

art --> r1
art --> r2
art --> r3
```
