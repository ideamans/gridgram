# クイックスタート（TS API）

TypeScript API は ESM として npm に公開されています。インストールし、必要なものを import し、`renderDiagram` に `DiagramDef` を渡せば SVG が返ってきます。

## インストール

```sh
npm install gridgram
# or
bun add gridgram
pnpm add gridgram
yarn add gridgram
```

ランタイム要件：

- **ESM のみ。** `package.json` の `"type": "module"`（または同等のバンドラ設定）が必要です。
- **Node ≥ 22** — ネイティブ ESM と JSON import attributes のため。Bun は任意のバージョンで動作。モダンブラウザは任意の ES モジュール対応バンドラ（Vite、Rspack、esbuild、Rollup、webpack 5+）で動作します。
- **Preact** と **preact-render-to-string** は通常の依存として、バンドラ経由で解決されます。ホスト側が既に異なる Preact バージョンを持っている場合は 2 コピーになりますが、いずれでも出力は同一です（グローバルには何もピン留めしません）。
- **TS API に `sharp` は含まれません。** ライブラリは SVG のみを描画します。PNG ラスタライズはエッジの `gg` CLI か、ホストが選択した場合に行います（[統合例](./integrations) 参照）。

## はじめての描画

```ts
import { renderDiagram, tablerOutline } from 'gridgram'
import type { DiagramDef } from 'gridgram'

const def: DiagramDef = {
  nodes: [
    { id: 'user', pos: 'A1', src: tablerOutline('user'),    label: 'User' },
    { id: 'api',  pos: 'B1', src: tablerOutline('server'),  label: 'API'  },
    { id: 'db',   pos: 'C1', src: tablerOutline('database'),label: 'DB'   },
  ],
  connectors: [
    { from: 'user', to: 'api', label: 'HTTPS' },
    { from: 'api',  to: 'db',  label: 'SQL'   },
  ],
}

const { svg, diagnostics } = renderDiagram(def)

console.log(svg)           // <svg …> … </svg>
console.log(diagnostics)   // [] for a clean layout
```

座標なし？アイコンソースなし？問題ありません — `renderDiagram` が妥当な既定値（行 0 に沿って自動配置、プレースホルダのリング）を埋め、注目すべき事項は `diagnostics` で報告します。

## Preact コンポーネントを使う

ホストが Preact アプリなら、文字列のラウンドトリップを省略し VNode ツリーを直接埋め込めます：

```tsx
import { Diagram } from 'gridgram'
import type { DiagramDef } from 'gridgram'

export function Architecture({ def }: { def: DiagramDef }) {
  return <Diagram def={def} renderWidth={1024} />
}
```

`<Diagram>` はすべての `DiagramOptions` フィールドを prop として受け取ります（例：`renderWidth`、`suppressErrors`、`theme`、`cellSize`）。内部的には `buildDiagramTree` の薄いラッパです。

## `DiagramDef` を構築する

`DiagramDef` はプレーンなオブジェクトです。全フィールドのリファレンスは [型定義](./types) を参照してください。要点：

- `nodes: NodeDef[]` — 必須。各ノードは `id`、任意の `pos`、任意の `label`、アイコンを指定する `src` を持ちます。
- `connectors?: ConnectorDef[]` — 任意。`from` / `to` はノード ID を参照。
- `regions?: RegionDef[]` — 塗りつぶし付きの背景セルスパン。
- `notes?: NoteDef[]` — 引き出し線付きの注釈ボックス。
- `theme?`、`cellSize?`、`columns?`、`rows?`、`padding?` — ドキュメント設定。これらは [プロジェクト設定ファイル](./config) からも来ることができます。

座標は 3 つの形式を受け付けます — A1 文字列、1-based タプル、1-based オブジェクト：

```ts
pos: 'A1'                 // column 1, row 1 (top-left)
pos: [1, 1]               // same thing
pos: { col: 1, row: 1 }
```

パイプラインはこれらすべてを、描画前に標準形の 0-based `{ col, row }` オブジェクトに正規化します。`GridPosInput` と `GridPos` については [型定義](./types) を参照してください。

## アイコンを追加する

既定のノードはアイコンを持たず、リングとラベルで描画されます。`src` の一般的な形式：

```ts
import { tablerOutline, tablerFilled } from 'gridgram'

{ id: 'user', pos: 'A1', src: tablerOutline('user'), label: 'User' }
{ id: 'star', pos: 'B1', src: tablerFilled('star'),  label: 'Hot'  }
{ id: 'raw',  pos: 'C1', src: '<g>…</g>',            label: 'Raw'  }
```

`tablerOutline(name)` / `tablerFilled(name)` は、5,500 以上の Tabler アイコンのうち任意のインライン SVG フラグメントを返します。文字列識別子より安全です — TypeScript コンパイラはタイポを検出できませんが、実行時のアイコン欠落は明らかに分かります（ノードに赤いリングがつく）。

URL / ファイルパスのアイコンには、自分で事前解決する（`src` を最終 SVG 文字列に設定）か、`.gg` のアイコンローダを走らせます（[統合例](./integrations) と `gridgram/node` サブパスを参照）。

## ファイルに書き出す

```ts
import { renderDiagram } from 'gridgram'
import { writeFileSync } from 'node:fs'

const { svg } = renderDiagram(def)
writeFileSync('out.svg', `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`)
```

PNG については [PNG ラスタライズ](./integrations#png-rasterization) のパターンを参照 — `sharp` をあなたが持ち込み、こちらは `computeRenderDimensions` でキャンバスサイズを提供します。

## `.gg` ソースから

図版がテキストとして書かれている場合は、まずパースします。`parseGg` と `resolveDiagramIcons` は純粋（ファイルシステム非依存）なので、あらゆる ESM ホストで動作します：

```ts
import {
  parseGg,
  resolveDiagramIcons,
  renderDiagram,
  formatError,
} from 'gridgram'

const source = `
icon :user @A1 tabler/user   "User"
icon :api  @B1 tabler/server "API"
user --> api "HTTPS"
`

const { def: rawDef, errors, icons } = parseGg(source)
if (errors.length > 0) {
  throw new Error(errors.map((e) => formatError(e, 'inline.gg')).join('\n'))
}

// With `inline`, the resolver handles Tabler built-ins + any inline
// SVG strings from `doc { icons: { … } }`. For URL / file-path refs,
// pre-load them via `buildIconContext` (Node only) — see below.
const { def, diagnostics: iconDiagnostics } = resolveDiagramIcons(rawDef, {
  inline: icons,
})

const { svg, diagnostics: layoutDiagnostics } = renderDiagram(def)
const allDiagnostics = [...iconDiagnostics, ...layoutDiagnostics]
```

ファイルシステム / HTTP アイコン参照（`./foo.svg`、`@brand/aws.svg`、`https://…`）には、Node サブパスから非同期ローダを import します：

```ts
import { buildIconContext } from 'gridgram/node'

const ctx = await buildIconContext({
  jsonIconsMap: icons,
  def: rawDef,
  docDir: '/path/to/project',
})
const { def } = resolveDiagramIcons(rawDef, ctx)
```

フルパイプラインは [パーサ](./parser)、`diagnostics` 配列が運ぶ内容は [診断](./diagnostics) を参照。

## 次に

- [`renderDiagram` と仲間たち](./render) — オプション、返却の形、Preact 埋め込み用の `Diagram` と `buildDiagramTree`。
- [型定義](./types) — 各 diagram-def 型のすべてのフィールド。
- [パーサ](./parser) — `.gg` → `DiagramDef` を詳しく。
- [診断](./diagnostics) — エージェント向けフィードバックストリーム。
