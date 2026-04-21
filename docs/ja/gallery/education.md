# 教育

概念マップ、プロセス、タイムライン ── 教材のスライドに登場する
ような図です。

## 水の循環

小学校でおなじみの図。蒸発 → 凝結 → 降水 → 集水、そして最初に
戻ります。

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

## 細胞生物学：光合成

葉緑体が光を吸収し、水と CO₂ からグルコースと O₂ が生成されます。
リージョンで入力と出力をグルーピングし、テーマを上書きして
標準的な緑・青・オレンジの化学表記に合わせます。

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

## 歴史年表

5 つの時代を 1 列に並べます。コネクタで相対位置を明示することで、
間隔を実時間に比例すると読者が誤解しないようにします。

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

## 学習の進度

カリキュラムの前提条件グラフ。学生は「基礎」から始めて、
目的に応じてトラックを選びます。

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
