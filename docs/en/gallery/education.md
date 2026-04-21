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

```gg-diagram gallery
doc {
  cols: 4, rows: 3,
  theme: { primary: '#065f46', secondary: '#0369a1', accent: '#d97706' },
}

region @B1:B3 "Inputs"  color=primary/14
region @D1:D3 "Outputs" color=accent/14

icon :sun  @A2 tabler/sun       "Sunlight"
icon :h2o  @B1 tabler/droplet   "H₂O"
icon :co2  @B3 tabler/wind      "CO₂"
icon :leaf @C2 tabler/leaf      "Leaf"
icon :o2   @D1 tabler/wind      "O₂"
icon :glu  @D3 tabler/apple     "Glucose"

sun  --> leaf
h2o  --> leaf
co2  --> leaf
leaf --> o2
leaf --> glu

note @C3 [leaf] "6 CO₂ + 6 H₂O\n→ C₆H₁₂O₆ + 6 O₂"
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
