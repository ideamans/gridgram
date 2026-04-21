# カスタムアイコン

汎用グリフは Tabler でおおよそ賄えますが、ブランドロゴやアプリ固有の
シンボル、チームで共有したい独自アイコンなどは外部から持ち込む必要が
あります。Gridgram には 3 通りの登録方法があります。

## 1. `doc { icons: … }`（単一ファイル内）

最も手軽な方法。`.gg` 内の `doc { … }` にマップを直接書きます。
キーが `src=` に指定する **bare name** になります。

<Example name="icon-custom" />

値には以下が使えます：

- **生 SVG 文字列** — `'<svg viewBox="…">…</svg>'`。外側の `<svg>` は
  剥がされ、内側だけがインライン化されます。
- **データ URL** — `'data:image/svg+xml,…'` / `'data:image/png;base64,…'`
  など。デコードしてインライン化。
- **HTTP(S) URL** — `'https://…'`。ビルド時にフェッチしてインライン化。
- **ファイルパス** — 絶対、または `.gg` ファイルからの相対。

SVG / PNG / JPEG / GIF / WebP / AVIF のいずれも受け付けます。ラスタ
画像は拡張子（`.png`、`.jpg` など）または HTTP レスポンスの
`Content-Type` で判別され、アイコンの正方形に **短辺フィット** で
埋め込まれます（長辺は切り落とし、SVG の `preserveAspectRatio="xMidYMid slice"`）。

```gg
doc {
  icons: {
    logo:   './assets/logo.svg',
    hero:   'https://cdn.example.com/hero.svg',
    widget: 'data:image/svg+xml,<svg …/>',
  },
}
```

登録した名前は `src=` にそのまま指定できます：

```gg
icon :home @A1 logo "Home"
icon :app  @B1 hero "App"
```

## 2. `--icons <dir>`（CLI ディレクトリ一括登録）

SVG がたくさんあるフォルダを指定すれば、ファイル名（拡張子除く）が
そのまま bare name になります：

```sh
gg diagram.gg --icons ./icons/ -o out.svg
```

```
icons/
  bolt.svg    → "bolt"
  gateway.svg → "gateway"
  queue.svg   → "queue"
```

名前が衝突した場合、ディレクトリ登録は `doc { icons: … }` に **負け**
ます。共有フォルダを触らずに単一ファイルだけで上書きできます。

## 3. パス表記（エイリアス対応）

一部のノードだけ個別にファイルを指定したい場合は、パスを直接書けます：

```gg
icon :front @A1 ./icons/front.svg "Front"
icon :core  @B1 @brand/core.svg   "Core"
```

- `./x.svg` / `../x.svg` / `/abs/x.svg` — `.gg` ファイルのある
  ディレクトリを基準に解決（絶対パスもそのまま使用）。
- `@alias/x.svg` — `gridgram.config.ts` に登録したエイリアスで解決。
  バージョン付きの共有アイコンパックなどを固定参照するときに便利。

## 優先順位

```
1. doc { icons: … } マップ          （ファイルごと）
2. パス参照 + --icons dir           （ファイルシステム）
3. Tabler 組込                      （tabler/… と tabler/filled/…）
4. いずれも該当なし → iconError    （赤リング）
```

`doc` マップが最優先なので、共有設定を壊さずに 1 ファイル単位で
上書きできます。

## ラスタ画像（PNG, JPEG…）と clip

ラスタアセットはアイコンの 24×24 ビューポートに **短辺フィット** で
埋め込まれ、長辺は切り落とされます。`clip` 属性と組み合わせれば
アバター風の丸抜きも作れます：

<Example name="icon-raster" />

```gg
doc {
  icons: {
    me: 'https://www.gravatar.com/avatar/<hash>?s=200',
  },
}

icon @A1 me "square（既定）"
icon @B1 me "circle"  clip=circle
icon @C1 me "none"    clip=none
```

`clip` の値：

| 値       | 挙動                                                     |
|----------|----------------------------------------------------------|
| `square` | **既定**。アイコンの正方形でクリップ。 |
| `circle` | 正方形に内接する円でクリップ — アバター風。 |
| `none`   | クリップなし。アイコンが境界をはみ出せる。ベクターにはほぼ不要、装飾的なラスタ重ねで便利。 |

SVG にも同じ `clip=circle` が効きますが、Tabler のグリフは元々 24×24
に収まっているので見た目はほぼ変わりません。

## `.gg` と `.ts` でアイコンを一致させる

TS API には `icons:` マップはなく、Preact VNode（または生 SVG 文字列）
を `node.src` に直接渡します：

```ts
import { h } from 'preact'

const def: DiagramDef = {
  nodes: [
    { id: 'home', src: h('svg', { viewBox: '0 0 24 24' }, …), label: 'Home' },
  ],
}
```

同じ図版を `.gg` / `.ts` の両方で表現したい場合（ドキュメント用例で
典型的）、**SVG 文字列を両者で同一に保つ必要があります**。ビルドは
最終 SVG をバイト単位で比較するためです。
