# リリース & ロードマップ

バージョンのライフサイクル、機能ロールアウト、廃止タイムライン。

## バージョンのタイムライン

1 年にわたる 3 つのリリース、それぞれが 1 つのテーマを導入します。
チーム外のステークホルダーに方向性を伝えるのに役立ちます。

```gg-diagram gallery
doc { cols: 5 }

icon :v1 tabler/flag      "v1.0"
icon :v2 tabler/rocket    "v1.1"
icon :v3 tabler/bolt      "v2.0"
icon :v4 tabler/star      "v2.1"
icon :v5 tabler/trophy    "v3.0"

v1 --> v2
v2 --> v3
v3 --> v4
v4 --> v5

note @C2 "v1→v3: search & accounts\nv4→v5: mobile & AI"
```

## 機能ロールアウト（カナリア → ベータ → GA）

パーセントベースのロールアウトです。各ステージは一定期間保留され、
エラーのスパイクが発生すれば進める代わりにロールバックします。

```gg-diagram gallery
doc { cols: 4 }

icon :dev    tabler/pencil       "Dev"
icon :canary tabler/percentage   "Canary 1%"
icon :beta   tabler/percentage   "Beta 10%"
icon :ga     tabler/percentage   "GA 100%"

dev    --> canary "deploy"
canary --> beta   "no spikes"
beta   --> ga     "no spikes"
```

## 四半期ロードマップ

4 つの四半期にテーマを付けます。四半期の途中でレビューを行い、
テーマが依然として正しい賭けかを確認 — 市場が動けば計画も動かします。

```gg-diagram gallery
doc { cols: 4 }

icon :q1 tabler/calendar "Q1 Foundations"
icon :q2 tabler/calendar "Q2 Scale"
icon :q3 tabler/calendar "Q3 Polish"
icon :q4 tabler/calendar "Q4 Ecosystem"

q1 --> q2
q2 --> q3
q3 --> q4
```

## 廃止スケジュール

新旧を並行稼働させたのちに旧を停止します。「予告 → 廃止 → 日没」の
リズムで、利用者に移行の時間を与えます。

```gg-diagram gallery
doc { cols: 4 }

icon :ann   tabler/bell      "Announce"
icon :dep   tabler/alert-triangle "Deprecate"
icon :sun   tabler/sunset    "Sunset"
icon :rem   tabler/trash     "Remove"

ann --> dep "6 months"
dep --> sun "3 months"
sun --> rem "immediate"
```
