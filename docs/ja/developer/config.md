# 設定

Gridgram は 4 層の設定を優先度の低いものから順に解決します：

```
  system defaults
      ↓
  project config  (gridgram.config.{ts,js,json,json5})
      ↓
  document        (doc { … } block inside a .gg file)
      ↓
  render override (CLI flag / DiagramOptions on a render call)
```

すべての面 — CLI、TS API、HTTP エンドポイント、MCP ツール — はこの順序で `DiagramSettings` レイヤ配列を構築し、`resolveSettings()` を呼びます。リゾルバより後で面ごとに分岐することはありません。

## レイヤの型

```ts
interface DiagramSettings {
  cellSize?: number
  padding?: number
  columns?: number
  rows?: number
  theme?: Partial<DiagramTheme>
  renderWidth?: number
  suppressErrors?: boolean
  assetAliases?: Record<string, string>
  iconsDir?: string
}

interface ResolvedSettings extends Required<Pick<DiagramSettings,
  'cellSize' | 'suppressErrors' | 'assetAliases'>> {
  padding?: number
  columns?: number
  rows?: number
  theme: DiagramTheme
  renderWidth?: number
  iconsDir?: string
}
```

`DiagramSettings` の全フィールドは任意です。`ResolvedSettings` は常に妥当な既定値を持つフィールド（`cellSize`、`theme`、`suppressErrors`、`assetAliases`）を保証します。

## `resolveSettings(layers)`

```ts
import { resolveSettings, SYSTEM_DEFAULTS } from 'gridgram'

const resolved = resolveSettings([
  projectLayer,        // from gridgram.config.ts
  documentLayer,       // from doc { } in the .gg
  renderOverride,      // CLI flag or DiagramOptions
])
```

マージルール：

- スカラ（`cellSize`、`renderWidth` など）— 最後のレイヤが勝ち。
- `theme` — deep merge：各レイヤは自身のキーを前のテーマの上にオーバーレイします。
- `assetAliases` — shallow merge：同じエイリアス名で後のエントリが前のエントリを置き換えます。
- `SYSTEM_DEFAULTS` は常に出発点です。明示的に含める必要はありません。

## プロジェクト設定ファイル

プロジェクト全体のベースラインは、`cwd` から walk-up で最寄りの `gridgram.config.*` に置きます。CLI とライブラリレベルの `loadProjectConfig` ヘルパはどちらもこの探索を用います。

```ts
// gridgram.config.ts
import { defineConfig } from 'gridgram'

export default defineConfig({
  cellSize: 128,
  theme: {
    primary: '#1e3a5f',
    accent: '#e8792f',
  },
  assetAliases: {
    brand: './assets/logos',   // → '@brand/aws.svg' resolves under here
  },
})
```

サポートされる拡張子：`.ts`、`.mjs`、`.js`、`.cjs`、`.json5`、`.json`。TS/JS ファイルは `defineConfig`（identity ヘルパ）経由で完全に型付けできます：

```ts
import { defineConfig } from 'gridgram'
export default defineConfig({ … })
```

### コードから設定を読み込む

`loadProjectConfig` はファイルシステムを読むため、`'gridgram/node'` サブパスにあります：

```ts
import { loadProjectConfig } from 'gridgram/node'
import { resolveSettings } from 'gridgram'

const found = await loadProjectConfig({ cwd: process.cwd() })
const projectLayer = found?.settings ?? {}

const resolved = resolveSettings([projectLayer, renderOverride])
```

`explicitPath` を渡せば walk-up 探索をスキップできます。設定が見つからない場合は `null` を返します（エラーではありません — 設定のないプロジェクトでも構いません）。

ブラウザバンドルではこの import は失敗します。ブラウザアプリでプロジェクト単位の既定が必要なら、ビルド時にプレーンな `DiagramSettings` オブジェクトへシリアライズし、通常のデータとして import してください。

## `doc { }` レイヤ

`.gg` ファイルの `doc { }` ブロックがドキュメント層の設定を提供します：

```gg
doc {
  cellSize: 256,
  theme: { primary: '#1e3a5f' },
}

icon @A1 tabler/user "U"
```

CLI 経由で描画するとき、これはプロジェクト設定と `--cell-size` / `--width` などのフラグの間に挟まります。TS API 経由では `parseGg` 後に `rawDef.cellSize` / `.theme` に載り、`renderDiagram` 内部の `foldLayers` がそれらをドキュメント層に自動的にマージします。

## `SYSTEM_DEFAULTS`

```ts
import { SYSTEM_DEFAULTS } from 'gridgram'

SYSTEM_DEFAULTS = {
  cellSize: 256,
  suppressErrors: false,
  assetAliases: {},
  theme: {
    primary:   '#1e3a5f',
    secondary: '#3b5a80',
    accent:    '#e8792f',
    text:      '#2d3748',
    bg:        '#ffffff',
  },
}
```

読み取り専用。呼び出し側が内省できるようエクスポートされています（たとえば、上書き値の隣に「既定値」を表示する設定 UI）。

## 面ごとの合成

### CLI

```
[projectLayer, documentLayer, cliFlagOverrides]
```

`--config <path>` または cwd から walk-up し、`.gg` ソースをパースしてその `doc { }` を得て、CLI フラグを最後のレイヤに集めます。

### TS API（単発呼び出し）

```
[documentLayer, opts]
```

`documentLayer` は生の `DiagramDef` 自体の `cellSize` / `theme` などからオンザフライで抽出されます。`opts` は `renderDiagram(def, opts)` に渡したものです。

### TS API（プロジェクト設定あり）

自分で `loadProjectConfig` を呼び、先頭に追加します：

```ts
const { settings: projectLayer } = (await loadProjectConfig({})) ?? {}
const resolved = resolveSettings([projectLayer ?? {}, documentLayer, opts])
```

### HTTP / MCP

TS API と同じ形です。サーバ側がプロジェクト設定を適用するかを決めます（通常は適用する — デプロイごとに 1 つの設定）、先頭に追加します。

## 関連

- [`renderDiagram` と仲間たち](./render) — 設定は `foldLayers` に自動的に流れ込みます。
- [パーサ](./parser) — `parseGg` は `doc { }` からドキュメント層を抽出します。
- [ユーザーガイド：ドキュメント](../guide/document/merging) — 同じルールをオーサ視点から。
