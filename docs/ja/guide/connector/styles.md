# スタイル

線の太さ・色・点線パターンなどは、末尾の `attr=value` 属性、
または `{ … }` ボディ（`ConnectorDef` のフィールド）で指定します。

## 属性一覧

| 属性         | 型     | 既定値           | 意味 |
|--------------|--------|------------------|------|
| `width`      | number | `2`              | 線幅（px） |
| `color`      | color  | theme.secondary  | 線色・ラベル色を上書き |
| `dash`       | string | 実線             | SVG `stroke-dasharray`（例: `"6 3"`, `"1 3"`） |
| `nodeMargin` | 0–1    | `0.6`            | 矢印先端をノード中心から引くマージン |
| `labelScale` | number | `1`              | ラベルのフォントサイズ倍率 |
| `id`         | string | —                | Note の `targets` から参照する ID |

## 点線パターン

<Example name="conn-styles" />

点線にする方法は 2 通り：

- **点線の矢印演算子** を使う（`..>` / `<..` / `<..>` / `...`）。
  既定の `"6 3"` が適用されます。
- **`dash=` を明示** する。値は標準の SVG `stroke-dasharray` と同じで、
  「描く長さ 空白の長さ」のペアを並べます。`"1 3"` で細かな点線、
  `"8 2 2 2"` で一点鎖線風。

両方を同時に指定した場合は明示した `dash` が優先されます。

## 色

コネクタの既定色は **`theme.secondary`**。コネクタごとに上書きできます：

```gg
a --> b "hot path" color=accent
c --> d "private"  color=#8b5cf6
```

テーマキーワード（`primary` / `secondary` / `accent` …）や alpha
接尾辞（`accent/60`）は、ノードと同じ規則で使えます。詳しくは
[カラー](../color/) を参照。

## 線幅と矢印のマージン

`width` は線と矢印先端の太さだけを変えます。`nodeMargin` は先端を
ノード中心から引く比率で、既定で矢印がアイコンに被ってしまう場合に
引き出します：

```gg
user --> api "req" width=3
api  --> db  "write" nodeMargin=0.85
```
