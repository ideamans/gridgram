# バッジ

**バッジ** はノードの四隅のいずれかに付けられる小さなマーカーです。
メインのアイコンを変えずに、ステータス（緑のチェック、赤の警告）や
ドメイン的な意味（プライベートリソースを示す鍵）を重ねたいときに
使います。

## プリセット

<Example name="icon-badge" />

Gridgram には 8 種類のセマンティック・プリセットが同梱されています。
いずれも「白い円板 + 色付きの Tabler アイコン」という 2 層構造です
（Tabler の塗りつぶしアイコンはグリフを *塗りを抜く* ことで表現する
ため、白板がないとカットアウト部分に背景色が透けてしまいます）：

| プリセット | Tabler グリフ      | 既定色 |
|-----------|--------------------|--------|
| `check`   | `circle-check`     | 緑  (`#16a34a`) |
| `star`    | `star`             | 琥珀 (`#f59e0b`) |
| `alert`   | `alert-circle`     | 赤  (`#dc2626`) |
| `info`    | `info-circle`      | 青  (`#0ea5e9`) |
| `help`    | `help-circle`      | 青  (`#0ea5e9`) |
| `lock`    | `lock`             | 石板色 (`#475569`) |
| `flag`    | `flag`             | 赤  (`#dc2626`) |
| `heart`   | `heart`            | バラ (`#e11d48`) |

## バッジの付け方

バッジは `icon` ステートメント末尾の `{ … }` JSON5 ボディに書いて
付けます。上の例はこの形式：

```gg
icon :ok   @A1 tabler/server "ok"   { badges: ['check'] }
icon :warn @B1 tabler/server "warn" { badges: ['alert'] }
```

もっと込み入ったバッジ構成なら、ノード全体を `doc { nodes: … }`
に置く書き方も使えます：

```gg
doc {
  nodes: [
    {
      id: 'ok', pos: [1, 1], src: 'tabler/server', label: 'ok',
      badges: [{ preset: 'check', position: 'bottom-left' }],
    },
  ],
}
```

TypeScript では `NodeDef` の 1 フィールドとしてそのまま書けます：

```ts
{ id: 'ok', pos: [1, 1], src: t('server'), label: 'ok', badges: ['check'] }
```

3 つの記法すべて同じ出力になります。1〜2 個のシンプルなバッジは
インライン `{ … }`、属性が多い要素は `doc { nodes: … }`、という
使い分けが目安です。

## 位置とサイズ

既定位置は `top-right`。オブジェクト形式で上書きできます：

```ts
badges: [
  { preset: 'check', position: 'bottom-right' },
  { preset: 'alert', position: 'top-left', size: 0.35 },
]
```

位置の有効値: `top-right` / `top-left` / `bottom-right` / `bottom-left`。
`size` はノード直径に対するバッジ直径の比（既定 `0.3`）。

## 複数バッジの重ね順

同じ隅に複数のバッジを指定すると、**宣言順** に描画され、先に書いた
ほうが下になります。違う隅のバッジ同士は独立です：

```ts
badges: ['check', 'lock']                             // 両方 top-right、check が上
badges: [{ preset: 'check', position: 'top-right' },
         { preset: 'lock',  position: 'bottom-left' }]
```

## 完全カスタムのバッジ

プリセットにない表現は `NodeBadge` を直接渡します：

```ts
badges: [
  {
    icon: yourSvgVNode,           // Preact VNode または生 SVG 文字列
    position: 'top-right',
    size: 0.3,
    color: '#8b5cf6',
    iconTheme: 'theme',           // 'theme' | 'native'（既定 'native'）
  },
]
```

`iconTheme: 'theme'` は `color` を `currentColor` 経由で適用します。
モノクロアイコンに使ってください。`'native'` は元の塗り属性を
保持するので、多色グリフはこちら。
