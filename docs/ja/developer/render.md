# `renderDiagram` と仲間たち

render モジュールは公開 API のトップです — 3 つの関数と 1 つの Preact コンポーネントで、いずれも同じ `DiagramDef` を受け取り、1 つの内部パイプラインを共有します。違いは何を返してほしいかだけ — SVG 文字列、VNode ツリー、あるいはインラインの JSX 要素のいずれか。

## `renderDiagram(def, opts?)`

```ts
function renderDiagram(def: DiagramDef, opts?: DiagramOptions): RenderResult

interface RenderResult {
  svg: string
  diagnostics: PlacementDiagnostic[]
}
```

既定の選択肢。描画された SVG と、パイプラインが生成した配置／ルーティング／アイコンの診断を返します。クリーンなレイアウトでは診断は空配列です。

```ts
const { svg, diagnostics } = renderDiagram(def, { renderWidth: 1024 })

if (diagnostics.length > 0) {
  // One record per element that couldn't be placed or routed cleanly.
  // See the Diagnostics reference for the shape.
  console.warn(diagnostics.map((d) => d.message).join('\n'))
}
```

## `renderDiagramSvg(def, opts?)`

```ts
function renderDiagramSvg(def: DiagramDef, opts?: DiagramOptions): string
```

後方互換用のバリアント。SVG 文字列のみを返し、診断は破棄します。呼び出し側がフィードバックを必要としない場合に使用します — たとえば入力がクリーンと既に分かっているビルドステップ内など。

内部的には `renderDiagram(def, opts).svg` に過ぎず、パフォーマンス差はありません。

## `<Diagram def={…} />` — Preact コンポーネント

```tsx
import { Diagram } from 'gridgram'
import type { DiagramProps } from 'gridgram'

<Diagram def={myDef} renderWidth={1024} />
```

`buildDiagramTree` をラップする Preact 関数コンポーネント。`DiagramOptions` のすべてのフィールドを prop として受け取ります（例：`renderWidth`、`theme`、`suppressErrors`、`cellSize`）。ホストがすでに Preact を描画している場合に使用 — 中間文字列なし、二重パースなし。

`DiagramProps` は `DiagramOptions & { def: DiagramDef }` です。

## `buildDiagramTree(def, opts?)`

```ts
function buildDiagramTree(def: DiagramDef, opts?: DiagramOptions): any
```

図版のルート `<svg>` の生の Preact VNode ツリーを返します。`<Diagram>` はこれの薄いラッパです。次のようなときに直接利用します：

- Preact がマウントする前にツリーを操作したい。
- カスタムレンダラ（非 SSR の Preact レンダラ、vdom-to-canvas アダプタなど）を経由してストリーミングしたい。

戻り型が `any` なのは、Preact の `VNode` 型が Gridgram の API 面に含まれないためです。必要なら呼び出し側でキャストしてください。

## `computeRenderDimensions(def, opts?)`

```ts
function computeRenderDimensions(
  def: DiagramDef,
  opts?: DiagramOptions,
): { width: number; height: number }
```

SVG の `width` / `height` 属性に出力されるピクセルサイズ — つまり最終的なラスタライズ後のキャンバスサイズ — を返します。主な用途は 2 つ：

- **sharp による PNG 出力**: sharp の `.resize()` は整数を必要とし、アスペクト比は SVG の `viewBox` と一致していなければなりません。`computeRenderDimensions` は `renderWidth` の上書きを織り込みます。
- **レスポンシブなラッパ**: HTML 側で正しいアスペクト比のコンテナを事前確保したい場合は、ビルド時にこの関数を呼び出してください。

```ts
const { width, height } = computeRenderDimensions(def, { renderWidth: 2048 })
```

## `DiagramOptions` の形

```ts
interface DiagramOptions {
  /** Override per-cell pixel size in the internal coordinate space. */
  cellSize?: number
  /** Pad the canvas by this many internal-space pixels. */
  padding?: number
  /** Force the grid dimensions (otherwise auto-inferred). */
  columns?: number
  rows?: number
  /** Override the theme (any subset of DiagramTheme). */
  theme?: Partial<DiagramTheme>
  /** Hide the red iconError / labelError decorations. */
  suppressErrors?: boolean
  /** Final rendered width in px (aspect preserved; viewBox
   *  unchanged so geometry stays pixel-perfect). */
  renderWidth?: number
}
```

すべてのフィールドは任意です。`DiagramOptions` は `DiagramSettings` のエイリアスで、renderDiagram 呼び出しはオプションを [レイヤ式の設定システム](./config) の「レンダ上書き」層として扱います。

## 決定性についてのメモ

- パイプラインは同期的で、実時間／乱数入力から自由です。同じ `DiagramDef` ⇒ 同じバイト列、どの実行でも、どのプラットフォームでも。
- アイコン解決（ネットワーク取得、ファイルシステム読み込み）はパイプラインの上流、`buildIconContext`（`gridgram/node`）／`resolveDiagramIcons`（`gridgram`）で行われます。このステップ以降、def は自己完結しており描画は純粋です。
- Preact SSR は属性を並べ替えません。ラベル配置の候補順は要素種別ごとに固定です。実行間の属性順のドリフトが起きたら、それはレンダラのバグです。

## 「安全な」並行利用とは

`renderDiagram` は入力だけの純粋な関数です — グローバルなし、キャッシュなし、渡された `def` の変更なし。複数の呼び出しをワーカースレッドを跨いで並列に実行できます。共有状態はモジュール import 時に読み込まれる Tabler アイコン JSON だけで、これは読み取り専用です。

## 関連

- [型定義](./types) — `DiagramDef`、`NodeDef` など。
- [設定](./config) — `DiagramOptions` がプロジェクト／ドキュメント層とどう合成されるか。
- [診断](./diagnostics) — `RenderResult.diagnostics` で返ってくる内容。
