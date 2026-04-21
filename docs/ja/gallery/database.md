# データベース

レプリケーション、シャーディング、キャッシュ、そして
変更データキャプチャのトポロジ。

## プライマリとリードレプリカ

書き込みは 1 つ、読み込みは多数から。2 つのリージョンでデータ層の
「書き側」と「読み側」を切り分け、プライマリは `sizeScale` で強調
しています。

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

note @C2 [r1, r2] "Async\nlag ≤ 5s"
```

## キーによるシャーディング

素朴なレイアウト — 3 つのシャードと 1 つのルーター。上の例の
リッチさとの対比を意識しています。

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

## リードスルーキャッシュ

緑テーマでキャッシュヒットの幸せな道を示し、破線 + ノートで
ミス時の遅い経路を補足します。コンパクトな 3 ノード図で
素早く読めます。

```gg-diagram gallery
doc {
  cols: 3,
  theme: { primary: '#047857', secondary: '#0d9488', accent: '#f59e0b' },
}

icon :app   @A1 tabler/server   "App"
icon :cache @B1 tabler/bolt     "Cache" sizeScale=1.3
icon :db    @C1 tabler/database "DB"

app   <-> cache  "fast"  width=2
cache --> db     "miss"  dash="4 4" color=accent

note @B2 [cache] "invalidate\non write"
```

## CDC → 下流

プライマリから 4 つの下流コンシューマへ供給します。バッジで
健全なフィードと追従中のフィードを示します。

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
