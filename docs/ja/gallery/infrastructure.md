# インフラ

クラウドトポロジ、デプロイレイアウト、キャパシティプランニング。
ここではリージョンが大きな役割を果たします — パブリック vs
プライベートのゾーン、リージョン単位のフェイルオーバー帯、
ブラストラディウスの境界線。

## 3 層 Web アーキテクチャ

定番のフロント / アプリ / データの分離です。色を強めに効かせた
2 つのリージョンでパブリックとプライベートの信頼境界を示し、
ノートで API 層の SLA 目標を記しています。

```gg-diagram gallery
doc { cols: 4 }

region @A1:B1 "Public zone"  color=accent/28
region @C1:D1 "Private zone" color=primary/28

icon :client tabler/device-laptop "Client"
icon :web    tabler/world         "Web"
icon :api    tabler/server        "API"   sizeScale=1.2
icon :db     tabler/database      "DB"

client --> web "HTTPS" width=2
web    --> api "REST"
api    --> db  "SQL"

note @C2 [api] "SLA 99.95%\np99 < 200ms"
```

## リードレプリカ付きのロードバランス構成

LB が 2 つのアプリインスタンスへ振り分け、書き込みはプライマリへ、
読み込みはレプリカから流れます。色付きの 3 つのリージョンで各層が
一目で読み取れます。

```gg-diagram gallery
doc { cols: 4 }

region @A1:A1 "Edge"     color=accent/28
region @B1:B1 "App tier" color=primary/24
region @C1:D1 "Data"     color=secondary/24

icon :lb    @A1 tabler/equal            "LB"
icon :app1  @B1 tabler/server           "app-1"
icon :dbw   @C1 tabler/database         "primary" sizeScale=1.3
icon :dbr   @D1 tabler/database-export  "replica"

lb   --> app1
app1 --> dbw   "write" width=2
dbw  --> dbr   dash="2 4"

note @C2 [dbr] "Lag ≤ 5s"
```

## CDN + オリジン + キャッシュ

エッジキャッシュとオリジンへのフォールバックです。ミス時の分岐を
破線にすることで 2 本の経路が一目で見分けられます。

```gg-diagram gallery
doc { cols: 4 }

region @A1:A1 "Client"  color=accent/24
region @B1:C1 "Edge"    color=primary/28
region @D1:D1 "Origin"  color=secondary/24

icon :user   @A1 tabler/user        "User"
icon :edge   @B1 tabler/cloud-bolt  "CDN"  sizeScale=1.2
icon :cache  @C1 tabler/bolt        "Cache"
icon :origin @D1 tabler/server-bolt "Origin"

user   --> edge   "request"
edge   --> cache  "lookup"
cache  --> edge   "cached" dash="2 4"
edge   --> origin "miss"
origin --> edge   "fill"

note @B2 [cache] "hit rate\ntarget 92%"
```

## アクティブ / パッシブ マルチリージョン

2 つのリージョンが同じスタックを持ちます。DNS はヘルスチェックが
トリップするまで全トラフィックをアクティブ側へ流します。リージョンで
「すべて東」vs「すべて西」の分割を明示できます。

```gg-diagram gallery
doc { cols: 3, rows: 3 }

region @A1:C1 "DNS"    color=accent/24
region @A2:A3 "us-east (active)" color=primary/28
region @C2:C3 "eu-west (standby)" color=secondary/24

icon :dns  @B1 tabler/world       "DNS" sizeScale=1.2
icon :us   @A2 tabler/server      "us-east"
icon :eu   @C2 tabler/server      "eu-west"
icon :dbus @A3 tabler/database    "db-us"
icon :dbeu @C3 tabler/database    "db-eu"

dns  --> us    "100%" width=2
dns  --> eu    "0%"   dash="2 4"
us   <-> dbus
eu   <-> dbeu
dbus <-> dbeu  "async" dash="4 4"

note @B2 "Failover via\nhealth checks"
```
