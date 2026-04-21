# スタイリング

リージョンは「主役にならない」ことが目的です。グルーピングは伝えたい
けれど、ノードから注目を奪いたくはない。この思想は、**テーマキーワード
指定時の自動 tint** に現れています。`color=accent` と書くだけで、
読みやすい薄い背景色が自動で決まります。

## 自動 tint（既定動作）

<Example name="region-styling" coords cols="4" rows="2" />

`color` が **bare なテーマキーワード**（`primary` / `accent` など）の
場合、リージョンは **約 7% 不透明度** で描画されます。alpha を自分で
指定せずとも、ほどよい薄さのタイル色が得られます：

```gg
region @A1:D1 "Public" color=accent      # → accent @ ~7%
```

## 上書き: alpha 明示 / リテラル

濃くしたい・薄くしたい場合は、キーワードに alpha を付けるか、リテラル
色を直書きします：

```gg
region @B1:B2 "accent/30"  color=accent/30   # 明示的に 30% alpha
region @C1:C2 "#d1fae5"    color=#d1fae5     # リテラル → 自動 tint なし
region @D1:D2 "red"        color=red         # CSS 名 → 自動 tint なし
```

自動 tint は **bare なテーマキーワード限定**。alpha を付けるか、
リテラル色を使えば、書いた通りの色になります。

## コーナー半径

既定では少し角丸です。`radius` で上書きできます：

```gg
region @A1:D1 "Top row"  color=primary/12 radius=4      # 角を立てる
region @A2:D2 "App"      color=primary/12 radius=20     # 柔らかく
```

複数スパンによる L / T / ブロブの場合、半径は union 外周の凸角・凹角
すべてに一様に適用されます。

## ラベルスケール

リージョンのラベルは既定でノードラベルより少し小さめ。`labelScale` で
基準からの倍率を指定できます：

```gg
region @A1:D1 "BIG" color=accent labelScale=1.5
region @A2:D2 "sm"  color=primary labelScale=0.8
```

## 属性早見表

| 属性         | 型     | 既定   | 効果 |
|--------------|--------|--------|------|
| `color`      | 色     | —      | theme キーワード / `keyword/AA` / CSS 名 / hex |
| `radius`     | number | 自動   | union 外周のコーナー半径（px） |
| `labelScale` | number | `1`    | ラベルのフォントサイズ倍率 |
