---
title: AI ガイド
description: gridgram を LLM エージェントから使うためのチュートリアル集 — Claude Code プラグイン、GitHub `gh skill`、context7。
---

# AI ガイド

gridgram は **LLM エージェントに書かせられる** よう作られています。
自然言語で要件を伝えると、エージェントが正しい `.gg` ファイルを作り、
レンダリングして、診断を読んでリトライする —
参考資料を貼り付けなくても完結するイメージです。

このガイドは**タスク指向**です。以下の 3 つの経路のうち 1 つを選び、
最初から最後までそのまま辿ってください。どれも「まっさらな環境から
1 枚の図をレンダリング、その後最新化」まで案内します。

## gridgram をエージェントから使う 3 つの道

| チュートリアル                         | こんな人向け                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| [Claude Code プラグイン](./claude-plugin) | Claude Code を使っている。`/gg-install` / `/gg-icons` / `/gg-author` / `/gg-render` のスラッシュコマンドがワークフローを駆動。 |
| [`gh skill`](./gh-skill)             | 同じスキルバンドルを Copilot / Cursor / Gemini CLI / Codex にも入れたい（Claude Code と併用可）。 |
| [context7（MCP）](./context7)        | プラグインを入れずに、MCP 経由で gridgram のドキュメントをエージェントから取得させたい。読み取り専用。 |

併用も可能です。Claude プラグインには `gg` CLI 本体を取得する
`/gg-install` スキルがあり、`gh skill` は他ホストに同じスキル群を届け、
context7 はどちらとも独立に動くドキュメント取得チャネルです。

## 必要なもの

gridgram が勝手に入れるものはありません。選んだチュートリアルが
要求するソフトウェアはご自身で入れておいてください。

| ソフトウェア                                                     | どのチュートリアルで必要              | 用途                                       |
| ---------------------------------------------------------------- | ------------------------------------ | ------------------------------------------ |
| [git](https://git-scm.com/)                                      | 全部                                  | プラグインマーケットが git clone を使う    |
| [Claude Code](https://code.claude.com/)                          | Claude プラグイン、context7           | スキル実行 / MCP のホスト                  |
| [GitHub CLI `gh`](https://cli.github.com/)（v2.90+）             | `gh skill`                            | `gh skill` サブコマンドを提供              |
| [Cursor](https://cursor.com/) / [Gemini CLI](https://github.com/google-gemini/gemini-cli) / [Codex](https://openai.com/index/introducing-codex/) | `gh skill`（別ホストに入れたい場合）  | 代替のスキルホスト                         |
| `curl`、`tar`、`unzip`（Windows）                                | `/gg-install` の実行環境              | `gg` バイナリのダウンロード                |
| `bun`（[入手](https://bun.sh/)）                                 | `gg` をソースビルドするときのみ       | 通常は release バイナリで十分              |

`gg` CLI を手動で入れる必要は **ありません** — Claude プラグインの
`/gg-install` スキルが面倒を見ますし、`gh skill` 側でも同じスキルが
インストール後に動きます。エージェントを介さず自分で `gg` を入れたい
場合は、標準の [クイックスタート](/ja/guide/) か
[インストール](/ja/guide/install) ページに従ってください。`$PATH` に
`gg` が乗っていればスキル側は経路を問いません。

## 概観: gridgram が LLM 向けに公開しているもの

チュートリアルに入る前に全体像を掴みたい方向けに:

- **[`gg llm`](./cli#gg-llm)** — エージェントに `.gg` 文法・CLI・
  アイコン・JSON エンベロープ・代表例を一発で教える Markdown / JSON
  リファレンス。
- **[`gg icons`](./cli#gg-icons)** — Tabler アイコン 5,039（outline）
  + 1,053（filled）をスコア付きセマンティック検索。
- **[`/llms.txt`](https://gridgram.ideamans.com/llms.txt)** と
  **[`/llms-full.txt`](https://gridgram.ideamans.com/llms-full.txt)**
  — ドキュメントサイトの公開 discovery ファイル。
- **[`context7.json`](https://github.com/ideamans/gridgram/blob/main/context7.json)**
  — [context7](./context7) 経由で MCP 取得できるようにする登録ファイル。
- **[`plugins/gridgram`](https://github.com/ideamans/gridgram/tree/main/plugins/gridgram)**
  — Claude Code / `gh skill` で配布される 4 つのスキル（`gg-install` /
  `gg-render` / `gg-icons` / `gg-author`）。

[CLI リファレンス](./cli) は `gg llm` と `gg icons` の完全仕様。
スキル経由でも直接シェルからでも、同じドキュメントを見れば
理解できます。

## チュートリアル

ここから開始:

- **[Claude Code プラグイン](./claude-plugin)** — Claude Code を
  すでに使っているなら約 10 分。
- **[`gh skill`](./gh-skill)** — Copilot / Cursor / Gemini / Codex にも
  同じスキルを入れたい場合。
- **[context7](./context7)** — gridgram のドキュメントを MCP 経由で
  取得させたいだけなら（プラグイン不要）。
