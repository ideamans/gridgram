# 型定義

ライブラリが受け取る、または返すすべての形。すべての型はパッケージルートからエクスポートされています：

```ts
import type {
  DiagramDef, NodeDef, ConnectorDef, RegionDef, NoteDef,
  GridPos, GridPosInput, GridSpan, WayPoint, WayPointInput,
  DiagramTheme, NodeBadge, BadgePosition, BadgeSpec,
  SvgFragment,
  DiagramOptions, DiagramProps, RenderResult,
  DiagramSettings, ResolvedSettings,
  PlacementDiagnostic, PlacementAttempt, Obstacle, ElementRef,
  ParseResult, GgError, GgErrorSource,
  IconContext,
} from 'gridgram'
```

## 座標系

ユーザー向けの座標はすべて **1-based** です：`A1` / `{col: 1, row: 1}` / `[1, 1]` はいずれも左上セルを指し、スプレッドシートの慣例に従います。パイプラインはレイアウト実行前にすべてを標準形の内部 0-based — `GridPos` — に正規化します。

### `GridPos` — 標準形、0-based

```ts
interface GridPos {
  col: number   // 0-based column index
  row: number   // 0-based row index
}
```

正規化パスでのみ生成されます。ユーザコードで書くことはありません。

### `GridPosInput` — ユーザー向け入力のユニオン

```ts
type GridPosInput =
  | { col: number; row: number }           // 1-based object
  | readonly [col: number, row: number]    // 1-based tuple
  | string                                  // A1 string ('A1', 'aa100')
```

位置を受け取るすべての公開フィールドは `GridPosInput` を使います。

### `WayPoint` / `WayPointInput`

グリッド座標と同じ形ですが小数を許容します。`{col: 1.5, row: 2}` はセル中心の間にコネクタを通します。中継点には A1 文字列は **使えません** — タプルかオブジェクト形式を使ってください。

## `DiagramDef` — トップレベルの形

```ts
interface DiagramDef {
  cellSize?: number
  padding?: number
  columns?: number        // explicit grid width; inferred otherwise
  rows?: number
  theme?: DiagramTheme
  regions?: RegionDef[]   // rendered first (background)
  nodes: NodeDef[]        // required, can be empty array
  connectors?: ConnectorDef[]
  notes?: NoteDef[]
}
```

必須は `nodes` のみ。それ以外はすべて妥当な既定値を持ちます。

## `NodeDef` — グリッド上のアイコン

```ts
interface NodeDef {
  id: string                 // unique; referenced by connectors / notes
  pos?: GridPosInput         // auto-positions across row 0 if omitted
  src?: SvgFragment          // icon asset (see below)
  label?: SvgFragment        // visible label (string or VNode)
  size?: number              // absolute diameter as fraction of cell (0–1)
  sizeScale?: number         // multiplier on the default (0.45 × this)
  color?: string             // ring / icon color (CSS literal or theme keyword)
  labelScale?: number        // font-size multiplier (default 1)
  iconTheme?: 'theme' | 'native'
  clip?: 'square' | 'circle' | 'none'
  badges?: BadgeSpec[]
  iconError?: boolean        // set by resolveDiagramIcons on a lookup miss
}
```

### `src` について

いくつかの形式を受け付けます — 解決の優先順で：

| 形式                    | 例                               | 備考 |
|-------------------------|----------------------------------|------|
| Tabler 名前空間         | `'tabler/user'`、`'tabler/filled/star'` | 5,500 以上の outline + filled サブセット |
| 生の SVG                | `'<svg …>'` または `'<g>…</g>'`  | ラッパを除去した上でそのまま通す |
| パス参照                | `'./foo.svg'`、`'@brand/aws.svg'` | アイコンローダ経由で読み込み |
| 素の名前                | `'logo'`、`'widget'`              | `doc.icons` / `--icons` に対して解決 |

完全な解決順は [パーサ](./parser) を参照。

### `color` について

任意の CSS カラーリテラル（`'#e8792f'`、`'red'`、`'rgb(…)'`）と、5 つのテーマキーワード `'primary'` / `'secondary'` / `'accent'` / `'text'` / `'muted'` を受け付けます。キーワード／アルファの組み合わせも動作します：`'primary/40'` はテーマの primary 色を 25% アルファで混ぜます。

## `ConnectorDef` — ノード間のエッジ

```ts
interface ConnectorDef {
  id?: string
  from: string            // node id
  to: string              // node id
  arrow?: 'none' | 'start' | 'end' | 'both'   // default 'end'
  strokeWidth?: number    // default 1.5
  color?: string
  dash?: string           // e.g. '6 3' for dashed
  label?: SvgFragment
  waypoints?: WayPointInput[]
  nodeMargin?: number     // default 0.6 — pull-back distance as radius fraction
  labelScale?: number
}
```

`waypoints` が空で、直線が他のノードの円盤を通過する場合、ルータが自動で迂回ルートを引きます。クリーンなルートが存在しない場合は `lineError` が `route-failed` 診断として現れ、線は直線を突き抜けるフォールバック描画になります。

## `RegionDef` — 背景ゾーン

```ts
interface RegionDef {
  spans: GridSpan[]        // one or more contiguous cell ranges
  color: string            // fill (theme keywords supported — auto-tinted)
  label?: SvgFragment
  borderRadius?: number
  labelScale?: number
}

interface GridSpan {
  from: GridPosInput
  to: GridPosInput
}
```

1 つのリージョンのすべてのスパンは **単一の 4-連結な形** を構成する必要があります（L 字はよく、斜めだけの隣接は不可）。飛び地スパンはパース時に整合性エラーとして報告されます。

## `NoteDef` — 任意の引き出し線付きの注釈ボックス

```ts
interface NoteDef {
  pos: GridPosInput
  text: string
  targets?: string[]       // ids of nodes or connectors to draw leaders to
  bg?: string
  color?: string
  labelScale?: number
}
```

`text` は改行に `\n`、強調に `**bold**` をサポートします。オーサリング視点からの解説は [ユーザーガイドのノートページ](../guide/note/) を参照。

## `DiagramTheme`

```ts
interface DiagramTheme {
  primary: string
  secondary: string
  accent: string
  text: string
  bg?: string
  muted?: string
}
```

`'gridgram'` からの `SYSTEM_DEFAULTS.theme` は妥当な既定値を持ちます。`DiagramOptions.theme` は partial を受け付け、省略されたキーは下位層から継承されます。

## `SvgFragment`

```ts
type SvgFragment =
  | string                // raw markup or a text label
  | number                // coerced to string
  | VNode                 // a Preact virtual DOM node
  | null | undefined | false
  | SvgFragment[]
```

SVG コンテンツを受け付けるあらゆるフィールド — `label`、`src`、バッジアイコン — は `SvgFragment` を取ります。文字列が一般的なケースで、`VNode` はプログラム的な呼び出し側が事前構築した Preact ツリーを差し込めるようにします。

## 正規化後のバリアント（内部用だがエクスポート済み）

`normalizeDiagramDef` 実行後、すべての座標は標準形の 0-based オブジェクトになり、すべてのノードは解決済みの `pos` を持ちます。パイプライン内部はその保証をエンコードする **ブランド** バリアントで動作します：

```ts
interface NormalizedNodeDef     extends Omit<NodeDef, 'pos'>       { pos: GridPos }
interface NormalizedConnectorDef extends Omit<ConnectorDef, 'waypoints'> { waypoints?: WayPoint[] }
interface NormalizedNoteDef     extends Omit<NoteDef, 'pos'>       { pos: GridPos }
interface NormalizedRegionDef   extends Omit<RegionDef, 'spans'>   { spans: NormalizedGridSpan[] }
interface NormalizedDiagramDef  extends Omit<DiagramDef, ...>      { nodes: NormalizedNodeDef[]; /* … */ }
```

多くの呼び出し側はこれらに触れる必要はありません — `renderDiagram` が自動的に正規化します。これらが重要になるのは、正規化済み入力を期待するカスタムレイアウト拡張（たとえば `resolveDiagram` の出力を消費するプラグイン）を書く場合です。

## 関連

- [`renderDiagram` と仲間たち](./render) — これらの型を消費する関数。
- [パーサ](./parser) — `parseGg` は `.gg` テキストから `DiagramDef` を生成。
- [設定](./config) — `DiagramSettings` のマージルール。
