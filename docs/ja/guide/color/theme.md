# テーマ

**テーマ** は Gridgram の描画に使われるパレット — 各テーマキーワード
（`primary`、`accent` …）が指す色の集合です。テーマを上書きすれば、
図版全体を 1 箇所で再スキンできます。

## 既定テーマ

| スロット    | Hex         |
|-------------|-------------|
| `primary`   | `#1e3a5f`   |
| `secondary` | `#3b5a80`   |
| `accent`    | `#e8792f`   |
| `text`      | `#2d3748`   |
| `bg`        | `#ffffff`   |

`bg` はキャンバス背景（最背面の矩形）。それ以外は各要素からキーワードで
参照されます。

## スロットの上書き

<Example name="color-theme" />

`doc { … }` ステートメント（または TS の `DiagramDef.theme`）で指定
します：

```gg
doc {
  theme: {
    primary:   '#065f46',
    secondary: '#0369a1',
    accent:    '#d97706',
    text:      '#1f2937',
    bg:        'transparent',
  },
}
```

上書きしたいスロットだけ書けば OK。未指定のスロットは
ディープマージで既定値にフォールバックします。

## 透過キャンバス

`bg` を `'transparent'` / `'none'` / 空文字 `''` にすると、**背景矩形
そのものが描画されません**。SVG は透過キャンバスで出力され、
スライドやカード・ダーク README などに埋め込む用途に向きます。

```gg
doc { theme: { bg: 'transparent' } }
```

透過キャンバスのとき、**コネクタラベルのピル背景は白にフォールバック**
します（通常は `theme.bg` を使用）。透過の上でも可読性を維持するための
配慮です。

## 複数 `doc` ブロック: ディープマージ

複数の `doc` ブロックでテーマを指定した場合、後勝ちの **ディープ
マージ** になります。共通設定と局所的な上書きを分けられます：

```gg
doc { theme: { primary: '#065f46' } }

# … DSL …

doc { theme: { accent: '#d97706' } }
```

`primary` と `accent` が上書きされ、残りは既定のままです。

## `muted`

`muted` は Gridgram 内部では使われない予約スロットです。テーマで値を
定義し、`color=muted` として参照すれば、「二次的な」要素群を 1 箇所で
統一管理できます：

```gg
doc { theme: { muted: '#94a3b8' } }

icon :caption @A3 tabler/info-circle "v0.9" color=muted
```
