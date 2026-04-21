# Education

Concept maps, processes, timelines — the slide-deck diagrams that
show up in teaching material.

## Water cycle

The classic grade-school diagram. Evaporation → condensation →
precipitation → collection, back to start.

```gg-diagram gallery
doc { cols: 4 }

icon :sea   tabler/droplet     "Ocean"
icon :vapor tabler/cloud       "Evaporate"
icon :cloud tabler/cloud "Cloud"
icon :rain  tabler/cloud-rain  "Rain"

sea   --> vapor "evap"
vapor --> cloud "cond"
cloud --> rain  "precip"
rain  --> sea   "collect"
```

## Cell biology: photosynthesis

Chloroplasts absorb light; water and CO₂ become glucose and O₂.
Regions group inputs vs outputs; a theme override matches the
standard green/blue/orange chemistry conventions.

Hover and scrub: frame 1 shows the inputs arriving at the leaf,
frame 2 lights the leaf up with the full formula, frame 3 produces
O₂ and glucose.

```gg-diagram gallery framing=1-3
doc {
  cols: 4, rows: 3,
  theme: { primary: '#047857', secondary: '#16a34a', accent: '#f59e0b' },
}

icon :h2o  @A1 tabler/droplet    "H₂O"
icon :co2  @A3 tabler/air        "CO₂"
icon :leaf @B2 tabler/leaf       "Leaf"    sizeScale=1.4
icon :o2   @D1 tabler/wind       "O₂"
icon :glu  @D3 tabler/circle-dot "Glucose"

h2o --> leaf
co2 --> leaf

# Frame 2+: the leaf is lit up and the formula note is displayed.
[2-] icon :leaf color=accent sizeScale=1.5
[2-] note @C2 (leaf) "6 CO₂ + 6 H₂O\n→ C₆H₁₂O₆ + 6 O₂"

# Frame 3: products emerge.
[3] leaf --> o2
[3] leaf --> glu
[3] icon :o2  color=accent { badges: ['check'] }
[3] icon :glu color=accent { badges: ['star'] }
```

## Historical timeline

Five eras on one line. Connectors make relative position explicit
so readers don't mistake the spacing for proportional time.

```gg-diagram gallery
doc { cols: 5 }

icon :anc   tabler/tower        "Ancient"
icon :med   tabler/building-castle "Medieval"
icon :ren   tabler/flower       "Renaissance"
icon :ind   tabler/bulldozer    "Industrial"
icon :mod   tabler/rocket       "Modern"

anc --> med
med --> ren
ren --> ind
ind --> mod
```

## Learning progression

Prerequisite graph for a curriculum. A student starts at "basics"
and chooses a track based on their goal.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :basics @A2 tabler/book         "Basics"
icon :algo   @B1 tabler/circles     "Algo"
icon :web    @B3 tabler/world       "Web"
icon :sys    @C1 tabler/server      "Systems"
icon :app    @C3 tabler/device-mobile "Apps"
icon :pro    @D2 tabler/trophy      "Pro"

basics --> algo
basics --> web
algo --> sys
web --> app
sys --> pro
app --> pro
```
