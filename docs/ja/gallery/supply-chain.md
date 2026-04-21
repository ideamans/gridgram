# サプライチェーン

原材料がサプライヤーからエンドユーザーへと流れ、返品は逆方向に
戻ります。リージョンで上流／生産／下流の帯をグルーピングし、
破線で逆方向の経路を示します。

## 返品対応つき 3 段階サプライチェーン

上流のサプライヤーが生産に供給し、生産から配送を経て顧客へ。
破線の逆向き矢印が返品を DC に戻します。ノートでリードタイムを
強調します。

```gg-diagram gallery
doc { cols: 6, rows: 3, theme: { primary: '#1e3a5f', accent: '#e8792f' } }

region @A1:B3 "Upstream"   color=primary/14
region @E1:F3 "Downstream" color=accent/14

icon :sup1 @A1 tabler/building-factory   "Supplier A"
icon :sup2 @A3 tabler/building-factory   "Supplier B"
icon :wh   @B2 tabler/building-warehouse "Raw WH"
icon :prod @C2 tabler/hammer             "Production"  sizeScale=1.3
icon :qa   @D2 tabler/clipboard-check    "QA"
icon :dc   @E2 tabler/building-warehouse "DC"
icon :cust @F2 tabler/user               "Customer"

sup1 --> wh
sup2 --> wh
wh   --> prod
prod --> qa
qa   --> dc
dc   --> cust
cust --> dc "returns" dash="4 4"

note @C1 (prod) "Lead time\n14 days"
```

## 複数階層のサプライヤー

ティア 2 のサプライヤーがティア 1 のアセンブラに供給し、それが
OEM に渡ります。ティアを視覚化することで依存の深さが一目で
わかります。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

region @A1:A3 "Tier 2" color=secondary/14
region @B1:B3 "Tier 1" color=primary/14

icon :t2a @A1 tabler/building-factory "raw mat"
icon :t2b @A2 tabler/building-factory "components"
icon :t2c @A3 tabler/building-factory "packaging"
icon :t1a @B1 tabler/building-factory "assembly"
icon :t1b @B2 tabler/building-factory "assembly"
icon :oem @C2 tabler/building-factory "OEM" sizeScale=1.3
icon :ship @D2 tabler/truck-delivery "Ship"

t2a --> t1a
t2b --> t1a
t2b --> t1b
t2c --> t1b
t1a --> oem
t1b --> oem
oem --> ship
```

## 在庫の流れ：受入 → 保管 → ピッキング

どの DC でも回している最小限のループ。バーコード／QR スキャンが
各遷移を駆動し、不一致は例外ビンへルーティングされます。

```gg-diagram gallery
doc { cols: 5 }

icon :recv  tabler/truck-loading   "Receive"
icon :scan  tabler/barcode         "Scan"
icon :store tabler/stack-2         "Store"
icon :pick  tabler/package         "Pick"
icon :ship  tabler/truck-delivery  "Ship"

recv  --> scan
scan  --> store "match"
scan  --> pick  "mismatch" dash="4 4" color=accent
store --> pick
pick  --> ship
```

## 逆物流

返品は検品 → リファービッシュまたはリサイクル → 倉庫へ戻ります。
ノートで分岐条件を示します。

<Example name="frame-gallery-reverse-logistics" framing="1-3" layout="single" />
