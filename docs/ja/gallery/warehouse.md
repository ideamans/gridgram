# 倉庫

物理的なゾーン配置とピッキング経路。リージョンで機能エリアを
区切り、ウェイポイントで棚の間を縫うピック経路を指定します。

## 倉庫ゾーン

入荷／保管／ピッキング／出荷をグリッド上に配置し、それぞれを
色分けしたリージョンに収めます。図面はそのままマップとしても
機能します。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

region @A1:A3 "Receive"  color=primary/14
region @B1:C2 "Storage"  color=secondary/14
region @B3:C3 "Picking"  color=accent/14
region @D1:D3 "Ship"     color=primary/14

icon :dock1 @A1 tabler/truck-loading "Dock 1"
icon :dock2 @A3 tabler/truck-loading "Dock 2"
icon :a1   @B1 tabler/stack-2  "Aisle A"
icon :a2   @C1 tabler/stack-2  "Aisle B"
icon :a3   @B2 tabler/stack-2  "Aisle C"
icon :a4   @C2 tabler/stack-2  "Aisle D"
icon :pick1 @B3 tabler/package "Pick 1"
icon :pick2 @C3 tabler/package "Pick 2"
icon :out1 @D1 tabler/truck-delivery "Out 1"
icon :out2 @D3 tabler/truck-delivery "Out 2"
```

## ウェイポイントつきピック経路

1 回のピックツアーで 4 つのアイルを固定ルートで回ります。
ウェイポイントを指定することで、ルーターが近道を選ばないように
経路を強制します。

```gg-diagram gallery
doc { cols: 5, rows: 4 }

icon :start @A1 tabler/map-pin "Start"
icon :a1 @B1 tabler/stack-2 "A1"
icon :b1 @C1 tabler/stack-2 "B1"
icon :a3 @B3 tabler/stack-2 "A3"
icon :b3 @C3 tabler/stack-2 "B3"
icon :ship @E4 tabler/truck-delivery "Ship"

start --> ship "route" {
  waypoints: [
    { col: 2, row: 1 }, { col: 3, row: 1 },
    { col: 3, row: 3 }, { col: 2, row: 3 },
    { col: 5, row: 3 },
  ]
}
```

## ピック＆パックのフロー

注文が入り、WMS がピック作業に分解し、パッカーが注文単位で
まとめてから出荷されます。ノートで目標スループットを示します。

```gg-diagram gallery
doc { cols: 5 }

icon :order  tabler/shopping-cart "Orders"
icon :wms    tabler/device-desktop "WMS"
icon :picker tabler/user-check     "Picker"
icon :pack   tabler/package        "Pack"
icon :out    tabler/truck-delivery "Out"

order  --> wms
wms    --> picker "drop"
picker --> pack
pack   --> out
```

## 循環棚卸しと監査

定期的な在庫監査をバックグラウンドで実施。差異は調査に分岐し、
監査ログはコンプライアンスと継続的改善のループの両方に
フィードされます。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :sched  @A2 tabler/calendar         "Schedule"
icon :count  @B2 tabler/barcode          "Count"
icon :match  @C2 tabler/equal            "Match"
icon :invest @D1 tabler/search           "Investigate"
icon :log    @D3 tabler/clipboard-list   "Log"

sched  --> count
count  --> match
match  --> log
match  --> invest "delta > 2%" dash="4 4" color=accent
invest --> log
```
