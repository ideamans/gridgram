---
title: context7 チュートリアル
description: MCP 対応エージェントに、gridgram ドキュメントの読み取り専用アクセスを context7 経由で提供する。プラグイン不要。
---

# context7 チュートリアル

[context7](https://context7.com/) はオープンソースのドキュメントを
[MCP](https://modelcontextprotocol.io/) 経由で取得できるように
インデックスするサービスです。gridgram はリポジトリルートの
`context7.json` マニフェストで登録されているので、MCP 接続された
エージェントは gridgram 固有のインストール無しで gridgram の
ドキュメントを検索・取得できます。

**所要**: 約 5 分（ほとんどは MCP クライアントの設定）。
**成果物**: エージェントがオンデマンドで gridgram のドキュメントを
引けるようになった状態。

[Claude プラグイン](./claude-plugin) や [`gh skill`](./gh-skill)
との違い: こちらは **取得専用**。ドキュメントを引く手段は与えるが、
スラッシュコマンドや CLI 駆動は提供しません。オーサリング機能も
欲しければ他のどちらか（あるいは両方）と併用を。

## 前提

- **MCP 対応エージェントホスト**: Claude Code、Cursor など、
  [MCP サーバー](https://modelcontextprotocol.io/) を動かせるもの。
- **[context7 MCP サーバー](https://github.com/upstash/context7)** —
  通常はエージェント設定から追加。
- **ネットワーク** — `context7.com` に到達できること。

git も `gh` も、`$PATH` 上のバイナリも不要。全部クエリ時に MCP で
引いて来ます。

## 1. context7 MCP サーバーを追加

### Claude Code

Claude Code の MCP 設定は `~/.claude/settings.json`（ユーザー
スコープ）か `.claude/settings.json`（プロジェクト）に書きます:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

Claude Code を再起動すれば `/mcp` に `context7` ツールが並びます。

### Cursor など

各ホストの MCP 設定ドキュメントを参照してください。上記の
`command` + `args` はそのまま使えます。Cursor は
`~/.cursor/mcp.json` に書きます。

## 2. context7 が gridgram を知っているか確認

エージェントにこう問います:

> context7 で `gridgram` ライブラリを探して。

エージェントが `resolve-library-id("gridgram")` を呼び、`/ideamans/gridgram`
のような id が返るはず。`not found` ならまだインデックスされて
いないので、[登録](#まだインデックスされていない場合) を参照。

## 3. gridgram のドキュメントを引く

試しにこう:

> context7 から gridgram の `.gg` 文法リファレンスを取ってきて、
> `icon` ノードの宣言方法を説明して。

エージェントが `query-docs` を解決済み library id に対して実行し、
該当セクションを引きます。`context7.json` マニフェストで `docs/en`、
`examples/`、`src/generated/` をインデックス対象にしているので、
エージェントが見られるのは:

- ユーザー / 開発者 / AI ガイドの英語ページ全部
- `.gg` の代表例
- 自動生成された `src/generated/llm-reference.md`

`docs/ja/`、テスト、内部ソースは見えません。

## 4. オーサリングと組み合わせる

context7 単体では `gg` を実行できません。以下と組み合わせると便利:

- [Claude Code プラグイン](./claude-plugin) — 最も相性のよい組合せ。
  スラッシュコマンドが図を描き、context7 がスキル本体に含まれない
  背景情報を補います。
- [`gh skill`](./gh-skill) — 他のホストで同じスキル群。

エージェントは「背景情報が必要な場面で context7」「`gg` 実行が
必要な場面でプラグインスキル」を自然に使い分けます。

## 5. 最新化

context7 は GitHub の既定ブランチから **自動で再インデックス**
します。あなた側でする作業はありません。gridgram の新版が main に
マージされて数分で context7 上でも新しい内容になります。

「context7 経由 gridgram」のバージョン指定インストール、という
概念はなく、エージェントが引くのは常に現時点の既定ブランチです。

## まだインデックスされていない場合

`resolve-library-id("gridgram")` が `not found` を返したら、
context7 側がまだリポジトリを取り込んでいません。`context7.json`
はリポジトリルートに配置済みですが、最初の登録は 1 回だけ手動:

- <https://context7.com/add-package> を開く
- `https://github.com/ideamans/gridgram` を貼り付け
- context7 がリポジトリをクロール、マニフェスト検証、インデックス

<https://context7.com> に載れば、どの MCP クライアントからも発見
可能。この操作はライブラリあたり 1 回だけ。以降の再インデックスは
自動。

## `context7.json` マニフェスト

参考までに gridgram のマニフェストが context7 に伝えている内容:

- `docs/en`、`examples`、`src/generated` をインデックス対象に
- `docs/.vitepress`、`docs/ja`、`node_modules`、`tests`、`dist`、
  `src/data` は除外
- エージェントが間違えがちな制約を 5〜10 本の **rules** 配列で
  明示（Preact であって React ではない、`doc { … }` が旧
  `%%{…}%%` ディレクティブを置き換えている、診断は警告であって
  例外ではない、など）

現行の中身は
[GitHub 上のマニフェスト](https://github.com/ideamans/gridgram/blob/main/context7.json)
をご覧ください。

## トラブルシューティング

### エージェントが `MCP ツールが無い` と言う

ホストを再起動。多くの MCP クライアントは起動時にしか設定を
読まない仕様です。

### `resolve-library-id` が惜しいが違うマッチを返す

org を明示: `resolve-library-id("ideamans/gridgram")`。でないと
先にインデックスされた別の `gridgram` にヒットします。

### 取得された情報が古い気がする

エージェントが学習時知識を使っていて context7 を呼んでいない可能性。
明示的に:

> context7 で gridgram の最新 CLI フラグを取得して。

## 次に読む

- [Claude Code プラグイン](./claude-plugin) — context7 とスラッシュ
  コマンドオーサリングの組合せ。
- [`gh skill`](./gh-skill) — 他ホストで同じスキル群。
- [llms.txt](https://gridgram.ideamans.com/llms.txt) /
  [llms-full.txt](https://gridgram.ideamans.com/llms-full.txt) —
  MCP ではなく単一ペイロードとしてドキュメントをエージェントに
  渡したい場合。
