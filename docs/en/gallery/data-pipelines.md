# Data pipelines

Moving data from where it lands to where analysts and models can
reach it.

## Classic ETL

Simplest possible pipeline, shown in its simplest form. Sequential,
uniform node size, one theme colour — intentionally flat so the
following examples read as elaborations.

```gg-diagram gallery
doc { cols: 5 }

icon :src   @A1 tabler/database "Source"
icon :xtrct @B1 tabler/download "Extract"
icon :xform @C1 tabler/refresh  "Transform"
icon :load  @D1 tabler/upload   "Load"
icon :wh    @E1 tabler/database "Warehouse"

src --> xtrct
xtrct --> xform
xform --> load
load  --> wh
```

## Streaming with consumers

Kafka-style event log fanning out to three consumers. The log node
takes visual weight via `sizeScale`; a purple theme signals "stream
domain."

```gg-diagram gallery
doc {
  cols: 3, rows: 3,
  theme: { primary: '#6d28d9', secondary: '#7c3aed', accent: '#db2777' },
}

icon :app   @A2 tabler/server         "App"
icon :kafka @B2 tabler/arrows-shuffle "Kafka" sizeScale=1.8
icon :sink  @C1 tabler/database       "DW"
icon :ml    @C2 tabler/brain          "ML"
icon :audit @C3 tabler/file-text      "Audit"

app   --> kafka width=2
kafka --> sink  dash="2 4"
kafka --> ml    dash="2 4"
kafka --> audit dash="2 4"
```

## Lambda architecture (speed + batch)

Two lanes over the same events. Regions separate the real-time
and scheduled bands visually; annotations name the latencies.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

region @B1:B1 "Speed" color=accent/30
region @B2:B2 "Batch" color=secondary/28

icon :src    @A1 tabler/database      "Events" sizeScale=1.3
icon :stream @B1 tabler/bolt          "Speed"
icon :batch  @B2 tabler/clock         "Batch"
icon :serve  @D1 tabler/server        "Serve"
icon :hist   @D2 tabler/files         "History"

src --> stream
src --> batch
stream --> serve
batch  --> hist

note @C1 [stream] "Approximate,\nlow-latency"
note @C2 [batch]  "Exact,\nreplayable"
```

## CDC → lake → catalog

Change data capture into a lake, discoverable via a catalog. Badges
mark the "health" of each CDC feed.

```gg-diagram gallery
doc { cols: 4 }

icon :db      @A1 tabler/database       "OLTP"    sizeScale=1.2
icon :cdc     @B1 tabler/arrows-shuffle "CDC"     { badges: ['check'] }
icon :lake    @C1 tabler/files          "Lake"
icon :catalog @D1 tabler/book           "Catalog"

db      --> cdc
cdc     --> lake
lake    <-> catalog "register"
```
