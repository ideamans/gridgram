---
title: CLI リファレンス — gg llm と gg icons
description: AI エージェント用ワークフローを支える gg の 2 つのサブコマンドの詳細。一方はリファレンスを吐き、もう一方は組み込み Tabler アイコンをセマンティック検索する。
---

# AI 向け CLI リファレンス

このページは **リファレンス** であってチュートリアルではありません。
まだ何もインストールしていなければ、[Claude プラグイン](./claude-plugin) /
[`gh skill`](./gh-skill) / [context7](./context7) のいずれかの
チュートリアルから読み始めてください。

LLM 消費向けに特化した `gg` サブコマンドは 2 つ。どちらもネット
アクセス不要で、`gg` 単一バイナリに同梱されています。`plugins/gridgram`
のスキルはエージェント越しにこれらを駆動しますが、ターミナルから
直接叩いても同じ結果を得られます。

## `gg llm`

エージェントが `.gg` を書けるようになるために必要な情報を自己完結
させたリファレンスを出力します。セッション開始時にエージェントの
コンテキストへ流し込む用途です。

### Markdown（既定）

```sh
gg llm
```

出力カバー範囲:

- 各サブコマンドの CLI usage
- `.gg` 文法（BNF）と statement のセマンティクス
- ドキュメントレベル設定（`doc { … }` のキー）
- アイコン解決順序（インラインマップ → `--icons` → 組み込み tabler → error）
- 終了コード（0 成功、1 パースエラー、2 整合性エラー、3 I/O）
- `gg render --format json` が返す JSON エンベロープ形式
- `examples/` の代表例
- エージェント作成時のベストプラクティス

Markdown はソース（`src/gg/dsl.ts` の BNF コメント、citty の arg
スキーマ、実在する examples）からビルド時に再生成されるので、
実装とズレません。

### JSON

```sh
gg llm --format json
```

Markdown のパースに依存せず解析したいエージェント向け構造化
ビュー:

```json
{
  "version": "0.4.1",
  "iconCounts": { "outline": 5039, "filled": 1053, "total": 6092 },
  "grammar": "…dsl.ts から抽出した BNF…",
  "reference": "…Markdown 全文を文字列で…"
}
```

version だけ、あるいは grammar だけ欲しいときに `jq` で抜けます。

### エージェントへのプロンプト雛形

gridgram オーサリング用セッションの出だしに使えるテンプレ:

```text
これから gridgram `.gg` フォーマットで図を書いてもらう。

完全なリファレンスが以下にある。文法・CLI・アイコン名・JSON 出力形式
を網羅している。

---
<`gg llm` の出力を貼る>
---

`.gg` を書く際の手順:
1. `gg <file> --format json --diagnostics --stdout` で検証
2. exit が非 0、または diagnostics が空でなければ直してリトライ
3. 最終の `.gg` と diagnostics 配列を報告
```

## `gg icons`

同梱 Tabler アイコン 6,092 件（5,039 outline + 1,053 filled）の
セマンティック検索。インデックスはビルド時に Tabler 自身のメタと、
gridgram 独自の synonym タグ（`src/data/icon-tags.json`）を合成して
生成されます。

### コマンド

```sh
# 概念で検索
gg icons --search database --limit 5

# 検索キーワードが思い浮かばないときは tag 一覧から
gg icons --tags --limit 30

# 特定 tag で絞る
gg icons --tag queue --limit 10

# スタイル固定
gg icons --set tabler-filled --search star

# JSON（エージェント消費向け）
gg icons --search loadbalancer --format json --limit 3
```

### 出力形式

**Plain text**（既定）— タブ区切り `ref / label / category / tags`:

```
tabler/database        Database    Database    storage,data,memory,…
tabler/filled/database Database    Database    storage,data,memory,…
tabler/database-cog    Database cog Database   cog,configuration,…
```

**JSON** — 各ヒットに score が付きます:

```json
[
  { "name": "database", "set": "tabler-outline", "ref": "tabler/database",
    "label": "Database", "category": "Database",
    "tags": ["storage", "data", "memory", "database", …],
    "score": 10 },
  …
]
```

### スコアリング

| スコア | マッチ種別           |
| ------ | -------------------- |
| 10     | name 完全一致         |
| 7      | name 前方一致         |
| 5      | tag 完全一致          |
| 4      | name 部分一致         |
| 3      | label 部分一致        |
| 2      | category 部分一致     |
| 1      | tag 部分一致          |

スコア降順、同点はアルファベット順で安定化。5 以上ならだいたい
正解です。

### 推奨エージェントフロー

1. **直接検索から**: `gg icons --search <term> --format json --limit 5`
2. **トップスコアが 2 以下なら tag pivot**: `gg icons --tags --limit 30`
   で頻出タグを把握 → 関連タグを 1 つ選んで
   `gg icons --tag <tag> --limit 15`
3. **埋め込む参照文字列を選ぶ**: `tabler/<name>`（outline）か
   `tabler/filled/<name>`（filled）

### スコアリングが効く理由

Tabler のタグは豊富（1 アイコン 5〜15 個）ですが、「人間の閲覧」
向けで、「アーキテクチャ図の語彙」向けではありません。
`src/data/icon-tags.json` の gridgram 独自 override が、よくある
ミスマッチを補っています:

- `cache` → `tabler/bolt` / `tabler/clock-play`
- `microservice` → `tabler/box` / `tabler/puzzle`
- `kubernetes` → `tabler/box-multiple`
- `websocket` → `tabler/plug` / `tabler/route`
- `loadbalancer` → `tabler/arrows-split` / `tabler/route`
- `frontend` → `tabler/browser` / `tabler/world` / `tabler/layout`
- `backend` → `tabler/server` / `tabler/database`
- `payment` → `tabler/credit-card` / `tabler/cash`

それでも結果が貧弱な概念に当たったら issue で教えてください。
タグ override はユーザー向けの拡張点で、拡充を想定しています。

## 出力の検証

エージェントワークフローは最後に validation を入れるべき。
`gg render` は SVG とともに diagnostics を流します:

```sh
gg render diagram.gg --format json --diagnostics --stdout > /tmp/envelope.json 2>/tmp/diag.json
```

- exit code `1` → パースエラー。stderr に理由
- exit code `2` → 整合性エラー（未知ノード参照、リージョン非 4-連結、…）
- exit code `0` + `/tmp/diag.json === "[]"` → クリーン
- exit code `0` + 非空 diagnostics → SVG は出たが警告あり
  （未解決アイコン、ルーティング失敗など）。エージェントは表示か
  リトライを判断すべし

diagnostic の詳細構造は
[Diagnostics ページ](/ja/developer/diagnostics) を参照。
