# 製造

生産ライン、品質ゲート、継続的改善のループ。バッジで合否を示し、
リージョンで工場フロアを区画化します。

## 品質ゲートつき生産ライン

4 つの工程を経て、梱包前に QA ゲートへ。不合格品はリワークに
ループバックします。欠陥を最もよく捕捉する工程はバッジで強調します。

```gg-diagram gallery
doc { cols: 5, rows: 2 }

icon :raw  @A1 tabler/box                    "Raw"
icon :cut  @B1 tabler/scissors               "Cut"
icon :weld @C1 tabler/bolt                   "Weld"
icon :qa   @D1 tabler/clipboard-check        "QA" { badges: ['star'] }
icon :pack @E1 tabler/package                "Pack"
icon :re   @C2 tabler/refresh                "Rework"

raw  --> cut
cut  --> weld
weld --> qa
qa   --> pack "pass"
qa   --> re   "fail" dash="4 4" color=accent
re   --> weld
```

## 工場フロアのゾーン

原材料倉庫／加工／組立／出荷を矩形リージョンで配置。MES（製造
実行システム）はライン外に置き、各ゾーンと通信します。

```gg-diagram gallery
doc { cols: 5, rows: 2 }

region @A1:A2 "Raw"      color=secondary/14
region @B1:C2 "Fab"      color=primary/14
region @D1:D2 "Assembly" color=accent/14
region @E1:E2 "Ship"     color=primary/14

icon :wh    @A2 tabler/building-warehouse "WH"
icon :cnc   @B2 tabler/tools              "CNC"
icon :paint @C2 tabler/brush              "Paint"
icon :asm   @D2 tabler/hammer             "Assemble"
icon :out   @E2 tabler/truck-delivery     "Out"
icon :mes   @C1 tabler/device-desktop     "MES" sizeScale=1.2

wh    --> cnc
cnc   --> paint
paint --> asm
asm   --> out

mes --> cnc   "plan" dash="2 4"
mes --> paint "plan" dash="2 4"
mes --> asm   "plan" dash="2 4"
```

## カイゼンの改善サイクル

PDCA ループ。各サイクルは前回のメトリクスを受け継ぎ、小さな
改善が四半期を経て積み重なります。

```gg-diagram gallery
doc { cols: 4 }

icon :plan  tabler/pencil       "Plan"
icon :do    tabler/hammer       "Do"
icon :check tabler/clipboard-check "Check"
icon :act   tabler/check        "Act"

plan  --> do
do    --> check
check --> act
act   --> plan "next" dash="4 4"

note @A2 (plan) "1 week\ncadence"
```

## OEE ダッシュボードの入力

OEE（設備総合効率）は可用性・性能・品質を集約した指標です。
各機械が独自のメトリクスを送り、ダッシュボードがそれらを
まとめ上げます。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :m1 @A1 tabler/tools   "Machine 1"
icon :m2 @A2 tabler/tools   "Machine 2"
icon :m3 @A3 tabler/tools   "Machine 3"
icon :avail @C1 tabler/clock       "Availability"
icon :perf  @C2 tabler/chart-line  "Performance"
icon :qual  @C3 tabler/star        "Quality"
icon :oee   @D2 tabler/chart-bar   "OEE" sizeScale=1.3

m1 --> avail
m2 --> perf
m3 --> qual
avail --> oee
perf  --> oee
qual  --> oee
```
