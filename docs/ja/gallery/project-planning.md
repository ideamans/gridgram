# プロジェクト計画

タスクの依存関係、スプリントサイクル、マイルストーンのタイムライン。

## タスク依存グラフ

並列実行できるタスクと直列化しなければならないタスクが混在する
小さめのプロジェクト。最長の連鎖としてクリティカルパスが浮かび
上がります。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :design @A2 tabler/pencil  "Design"
icon :api    @B1 tabler/code    "API"
icon :ui     @B3 tabler/layout  "UI"
icon :int    @C2 tabler/link    "Integrate"
icon :test   @D2 tabler/check   "Test"

design --> api
design --> ui
api --> int
ui  --> int
int --> test
```

## スプリントサイクル

2 週間のアジャイルループ。計画 → 開発 → レビュー → 振り返り、
そして繰り返し。振り返りで得た改善点は次の計画にフィードバックされます。

```gg-diagram gallery
doc { cols: 4 }

icon :plan    tabler/calendar   "Plan"
icon :work    tabler/hammer     "Work"
icon :review  tabler/eye        "Review"
icon :retro   tabler/refresh    "Retro"

plan   --> work
work   --> review
review --> retro
retro --> plan "next sprint"
```

## マイルストーンのタイムライン

プロジェクトのマイルストーンを線形に進めていきます。
ステークホルダーと「いまどこにいるのか」を共有するのに便利です。

```gg-diagram gallery
doc { cols: 5 }

icon :m1 tabler/flag       "Kickoff"
icon :m2 tabler/target     "Alpha"
icon :m3 tabler/rocket     "Beta"
icon :m4 tabler/trophy     "GA"
icon :m5 tabler/chart-line "Scale"

m1 --> m2
m2 --> m3
m3 --> m4
m4 --> m5
```

## リリーストレイン

一定間隔で出発するリリーストレイン。機能は準備ができたトレインに
乗り込みます。乗り遅れても大丈夫 ── 次のトレインに乗ればよいのです。

```gg-diagram gallery
doc { cols: 5, rows: 2 }

icon :f1  @A1 tabler/box       "Feature A"
icon :f2  @B1 tabler/box       "Feature B"
icon :f3  @C1 tabler/box       "Feature C"  color=accent
icon :t1  @D1 tabler/train     "Train Q1"
icon :t2  @E2 tabler/train     "Train Q2"

f1 --> t1 "ready"
f2 --> t1 "ready"
f3 --> t2 "next"                             color=accent
t1 --> t2 dash="4 4"
```
