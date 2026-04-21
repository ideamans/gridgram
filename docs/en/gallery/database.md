# Database

Replication, sharding, caching, and change-data-capture topologies.

## Primary with read replicas

Writes to one, reads from many. Two regions carve out the "write
side" and "read side" of the data tier; the primary is
`sizeScale`-emphasised.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

region @B1:B2 "Write path" color=accent/30
region @C1:D2 "Read-only"  color=primary/28

icon :app @A1 tabler/server          "App"
icon :pri @B1 tabler/database        "Primary" sizeScale=1.4
icon :r1  @C1 tabler/database-export "r-1"
icon :r2  @D1 tabler/database-export "r-2"

app --> pri "writes" width=2
app --> r1  "reads"
app --> r2  "reads"
pri --> r1 dash="2 4"
pri --> r2 dash="2 4"

note @C2 (r1, r2) "Async\nlag ≤ 5s"
```

## Sharding by key

Plain layout — three shards, one router. A deliberate contrast with
the richer example above.

```gg-diagram gallery
doc { cols: 3, rows: 3 }

icon :app    @A2 tabler/server         "App"
icon :router @B2 tabler/arrows-shuffle "Router" sizeScale=1.3
icon :s1     @C1 tabler/database       "Shard A"
icon :s2     @C2 tabler/database       "Shard B"
icon :s3     @C3 tabler/database       "Shard C"

app --> router
router --> s1
router --> s2
router --> s3
```

## Read-through cache

Two frames contrast the hot and cold paths. Hover and flip between
them — frame 1 is the fast round-trip served from cache; frame 2
is the miss falling back to the DB with a "populate on read" note.

<Example name="frame-gallery-cache" framing="1-2" layout="single" />

## CDC → downstream

Four downstream consumers fed off the primary. Badges mark which
feeds are healthy vs catching up.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :db     @A1 tabler/database       "Primary"  sizeScale=1.3
icon :cdc    @B1 tabler/arrows-shuffle "CDC"
icon :search @C1 tabler/search         "Search"   { badges: ['check'] }
icon :bi     @D1 tabler/chart-dots     "BI"       { badges: ['check'] }
icon :cache  @C2 tabler/bolt           "Cache"    { badges: ['alert'] }
icon :ml     @D2 tabler/brain          "ML"       { badges: ['check'] }

db  --> cdc
cdc --> search
cdc --> bi
cdc --> cache dash="2 4"
cdc --> ml
```
