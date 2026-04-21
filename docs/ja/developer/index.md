# 開発者ガイド

このページを見ているのは、コードから Gridgram を駆動したい方でしょう — Preact や素の ESM で動くブラウザアプリ、リクエストに応じて描画する Node サーバ、`.gg` を編集してループで再描画するエージェント、CI のビルドステップ、あるいは LLM に図版機能を提供する MCP ツールなど。

[ユーザーガイド](/ja/guide/) はオーサリング — `.gg` ファイルを書いて `gg` CLI を実行する — を扱います。こちらは TypeScript API を扱います。npm パッケージが何をエクスポートしているか、何がどこで動くか、そしてエージェントが消費する構造化フィードバック面について。

## 2 つのエントリポイント

```ts
// Browser-safe. Pure — no fs, no path, no network.
import { renderDiagram, parseGg, Diagram /* … */ } from 'gridgram'

// Node-only. Reads the filesystem (and optionally fetches over HTTP).
import { buildIconContext, loadProjectConfig } from 'gridgram/node'
```

メインのエントリポイントはあらゆる ESM ホストで動作します — モダンブラウザ（Vite / Rspack / esbuild / 任意のバンドラ経由）、Node ≥ 22、Bun、Deno。`gridgram/node` サブパスは Node ランタイム内でのみ安全で、ブラウザ用バンドルに誤って import されるとビルドに失敗します。

## 描画プリミティブ

4 つのエントリポイントですべての統合パターンをカバーします：

| Import                         | シグネチャ                                                 | 使いどころ                                                          |
|--------------------------------|---------------------------------------------------------|------------------------------------------------------------------|
| `renderDiagram(def, opts)`     | `(DiagramDef, opts?) => { svg, diagnostics }`           | 既定の選択肢。SVG 文字列に加え、レイアウト／アイコンのフィードバックも返す。 |
| `renderDiagramSvg(def, opts)`  | `(DiagramDef, opts?) => string`                         | SVG のみ — 呼び出し側が入力はクリーンだと分かっているとき。         |
| `Diagram`                      | Preact FC — `<Diagram def={…} …opts />`                 | Preact アプリ内にインラインで埋め込む場合。                         |
| `buildDiagramTree(def, opts)`  | `(DiagramDef, opts?) => VNode`                          | カスタムレンダラ／SSR パイプライン向けの生の Preact VNode ツリー。   |

4 つとも最終的には `DiagramDef` を受け取ります。プログラム的に構築するか、`parseGg` 経由で `.gg` ソースから生成できます。

## 読む順序

1. **[クイックスタート（TS API）](./quickstart)** — インストールし、コードから最初の図版を描画。
2. **[`renderDiagram` と仲間たち](./render)** — 4 つのエントリポイントを詳しく。`<Diagram>`、`RenderResult`、`computeRenderDimensions` を含む。
3. **[型定義](./types)** — `DiagramDef` とそのメンバ。正規化された形と生入力の形。
4. **[設定](./config)** — レイヤ式の設定システム（システム → プロジェクト → ドキュメント → レンダ上書き）と、各面がどう合成するか。
5. **[パーサ](./parser)** — `.gg` ソースから `DiagramDef` へ。`parseGg`、アイコン解決、`GgError`、`checkIntegrity`。
6. **[診断](./diagnostics)** — `PlacementDiagnostic` ストリーム。エージェント向けワークフローに必須で、人間オーサにとっても有用。
7. **[統合例](./integrations)** — HTTP エンドポイント、MCP ツール、CI でのヘッドレス描画、Preact 埋め込み、PNG。
8. **[仕様](./spec)** — リファレンス: トークン文法、解決パイプライン、決定性の保証。

## 決定性は契約である

すべての Gridgram 面（CLI、TS API、HTTP、MCP）は同じパイプラインを駆動します。同じ `DiagramDef` — 同じノード、同じ設定、同じアイコンソース — を与えれば、パイプラインは面と実行を跨いで **バイト単位で同一の SVG** を出力します。エージェントはこれに依存します：

- `.gg` ソースを git にコミット。AI の編集はすべて diff として読める。
- CI で SVG ベースラインをピン留め。描画の回帰は目に見える変更として現れる。
- `src` をインライン SVG に事前解決すればアイコンローダをスキップでき、レンダラは完全に純粋 — I/O は一切なし。

[仕様](./spec) のページで不変条件を形式的にカバーしています。
