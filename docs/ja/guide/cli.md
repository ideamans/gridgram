# CLI

`gg` は `.gg` ファイルを SVG / PNG / JSON（マージ済み `DiagramDef` の
デバッグ出力）に変換する CLI です。多くのユーザーにとっての入口です。

## 使い方

```
gg <input.gg> [options]
gg <subcommand> [args…]
```

```sh
gg diagram.gg -o out.svg
gg diagram.gg -o out.png --width 2048
gg diagram.gg --cell-size 128 -o out.png
gg diagram.gg --icons ./icons/ -o out.svg
gg diagram.gg --format json > merged.json
```

`-o` を省略すると stdout に出力。`--format` を省略した場合、`-o` の
拡張子（`.svg` / `.png` / `.json`）でフォーマットを判定。どちらもない
場合は SVG が既定です。

## サブコマンド

| サブコマンド          | 役割                                                                                  |
|----------------------|---------------------------------------------------------------------------------------|
| `gg render <file>`   | `.gg` ファイルのレンダリング（ファイルパスを渡したときの既定動作。`gg <file>` のショートカット） |
| `gg icons`           | 同梱の 6,000+ Tabler アイコンを検索（name / tag / category）                           |
| `gg llm`             | LLM 向けリファレンスバンドルを出力（`.gg` 文法 / CLI / アイコン / JSON スキーマ / 例）  |
| `gg license`         | 同梱のサードパーティライセンスを表示                                                   |

`gg icons` と `gg llm` は主に LLM 駆動のワークフロー向けです。フラグや
スコアリング、JSON 出力の形、エージェント向けプロンプト雛形などの
詳細は [AI ガイド → CLI リファレンス](/ja/ai/cli) に。Claude Code /
`gh skill` / MCP エージェントから `gg` を駆動したい場合は
[AI ガイドの概要](/ja/ai/) を参照してください。

## オプション

| フラグ                 | 意味 |
|------------------------|------|
| `-o, --output <path>`  | 出力パス。`--format` 未指定時は拡張子で判定。 |
| `--format <kind>`      | `svg` / `png` / `json`。`json` はマージ後の `DiagramDef` を出力。 |
| `--config <path>`      | 明示的に `gridgram.config.{ts,js,json,json5}` を指定（walk-up 探索を省略）。 |
| `--no-config`          | プロジェクト設定ファイルの探索を完全に無効化。 |
| `--icons <dir>`        | `<dir>/*.svg` を basename で一括登録（bare-name エイリアス）。 |
| `--alias name=dir`     | アセット・エイリアスを登録: `@name/x.svg` → `<dir>/x.svg`。複数回指定可。 |
| `--cell-size <px>`     | セルあたりのピクセルサイズを上書き（既定 `256`）。幾何形状が変わる。 |
| `--width <px>`         | 最終出力幅（px）。アスペクト比は維持される。幾何形状は変わらない。 |
| `--scale <n>`          | 最終幅への追加倍率（既定 `1`、高 DPI の PNG 用）。 |
| `--stdout`             | `-o` 指定時でも stdout に出力。 |
| `--no-errors`          | 出力中の赤エラー表示（未解決アイコン・未知参照など）を抑制。 |
| `--license`            | 同梱のサードパーティライセンスを表示。 |
| `-h, --help`           | ヘルプ。 |

## 設定の解決順序

`gg` は 4 層の設定を合成します。後ろの層ほど優先度が高い：

```
システム既定値
  ↓
プロジェクト設定         （gridgram.config.{ts,js,json,json5}）
  ↓
ドキュメント doc { … }   （.gg 内の doc ブロック）
  ↓
CLI フラグ               （--cell-size / --width / --icons …）
```

各層は自身が設定した値のみを提供し、未指定のフィールドは上位の層の
値がそのまま残ります。したがって `--cell-size 128` は
`doc { cellSize: 256 }` に勝ち、それはプロジェクト設定に勝ち、
さらにそれはシステム既定に勝ちます。

## プロジェクト設定

`gg` は現在のディレクトリから walk-up で `gridgram.config.{ts,js,json,json5}`
を探索し、最初に見つかったものを「プロジェクト」レイヤとして合成します。
テーマ・アイコンエイリアス・セルサイズなどを 1 箇所で共通化する用途：

```ts
// gridgram.config.ts
import { defineConfig } from 'gridgram'

export default defineConfig({
  cellSize: 200,
  theme: {
    primary: '#065f46',
    accent:  '#d97706',
  },
  assetAliases: {
    brand: './assets/brand',
  },
})
```

探索を止めたい場合は `--no-config`、特定ファイルを指定したい場合は
`--config` を使います。

## 出力フォーマット

- **SVG**（既定）— テキスト。編集可能・DPI 非依存。
- **PNG** — `sharp` でラスタライズ。幅は `--width` × アスペクト比。
  高 DPI 出力は `--scale 2` などを併用。
- **JSON** — マージ済み `DiagramDef` を JSON で出力。`doc` マージの
  挙動確認、外部ツールへの受け渡し、パース結果のデバッグに便利です。

## 終了コード

| コード | 意味 |
|--------|------|
| `0`    | 成功 |
| `1`    | パースエラー（DSL の構文誤り、`doc { … }` 形式不正、不明なフラグなど） |
| `2`    | 整合性エラー（ノード ID 重複、未知参照、飛び地リージョンなど） |
| `3`    | I/O またはレンダリングエラー（設定読込・ファイル読書・アイコン読込・PNG 出力） |

コードは「ソース側の問題」（1, 2）と「環境側の問題」（3）に分かれて
います。CI スクリプトではこれを基にビルドを落とすかリトライするかを
判定できます。
