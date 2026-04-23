---
title: gh skill チュートリアル
description: gridgram の Agent Skills バンドルを GitHub CLI で Copilot / Cursor / Gemini CLI / Codex にインストール。
---

# `gh skill` チュートリアル

GitHub CLI v2.90+ は `gh skill` サブコマンドを提供していて、Agent Skills
を任意の GitHub リポジトリからインストールできます（Anthropic 系に
限らない）。gridgram の 4 スキル（`gg-install` / `gg-render` /
`gg-icons` / `gg-author`）は標準外フロントマターを使っていないので、
Claude Code 用マーケットで配っているのと同じバンドルが Copilot /
Cursor / Gemini CLI / Codex / Antigravity でもそのまま動きます。

**所要**: 約 5 分。 **成果物**: お好みのエージェントに gridgram
スキルが入った状態と、更新コマンド。

## 前提

各自インストール:

- [**GitHub CLI（`gh`）**](https://cli.github.com/) **v2.90 以上**
  （古いバージョンには `skill` サブコマンドがありません）
- **対象エージェント**: Claude Code、GitHub Copilot、Cursor、
  Gemini CLI、Codex、Antigravity のいずれか。`--agent` でどれに
  入れるか指定します。
- **git**（gh が内部で使います）
- **ネットワーク** — `github.com` に到達できること

認証がまだなら:

```sh
gh auth status       # 状態確認
gh auth login        # 未ログインなら
```

gridgram のようなパブリックリポジトリなら認証は必須ではありませんが、
繰り返し install するなら rate limit を避けるためにログインして
おいた方が無難です。

`gh skill` サブコマンドが使える版か確認:

```sh
gh skill --help
```

「unknown command: skill」と出たら gh をアップグレード:

```sh
# Homebrew
brew upgrade gh

# Debian/Ubuntu
sudo apt install --only-upgrade gh
```

## 1. 対象エージェントを選ぶ

`gh skill install --agent <target>` が対応している 6 つのホスト。
以降のインストール例は各 target のタブに分けてあるので、自分の
環境のタブを選んで丸ごとコピーしてください。

| Target          | スキルの置き場所                                            |
| --------------- | ----------------------------------------------------------- |
| `claude-code`   | `~/.claude/skills/<skill>/SKILL.md`                         |
| `copilot`       | GitHub Copilot のスキルディレクトリ（`--agent` 省略時の既定）|
| `cursor`        | Cursor のスキルディレクトリ                                 |
| `codex`         | OpenAI Codex                                                |
| `gemini-cli`    | Google Gemini CLI                                           |
| `antigravity`   | Antigravity                                                 |

## 2. インストール前にプレビュー

`gh skill preview` は `SKILL.md` を取得してフロントマター + 本体を
表示します。中身を確認してからインストールしたいとき用:

```sh
gh skill preview ideamans/gridgram plugins/gridgram/skills/gg-install
```

他の 3 つ（`gg-render` / `gg-icons` / `gg-author`）も同様に確認可能。

## 3. スキルをインストール

自分の対象のタブを選んでそのまま貼り付けるだけ:

::: code-group

```sh [Claude Code]
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-install --agent claude-code
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-render  --agent claude-code
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-icons   --agent claude-code
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-author  --agent claude-code
```

```sh [Copilot]
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-install --agent copilot
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-render  --agent copilot
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-icons   --agent copilot
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-author  --agent copilot
```

```sh [Cursor]
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-install --agent cursor
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-render  --agent cursor
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-icons   --agent cursor
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-author  --agent cursor
```

```sh [Codex]
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-install --agent codex
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-render  --agent codex
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-icons   --agent codex
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-author  --agent codex
```

```sh [Gemini CLI]
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-install --agent gemini-cli
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-render  --agent gemini-cli
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-icons   --agent gemini-cli
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-author  --agent gemini-cli
```

```sh [Antigravity]
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-install --agent antigravity
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-render  --agent antigravity
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-icons   --agent antigravity
gh skill install ideamans/gridgram plugins/gridgram/skills/gg-author  --agent antigravity
```

:::

確認:

```sh
gh skill list
```

各スキルに対して source repo + ref + tree SHA が表示されます。
この provenance メタは install 時に各 `SKILL.md` のフロントマターに
書き込まれるので、後で `gh skill update` が content 変化を version
文字列なしで検出できます。

## 4. `gg` CLI をインストール

スキルは `gg` バイナリを呼びます。どちらでも OK:

### 選択肢 A: エージェント内から `/gg-install` を使う

エージェントホストを再起動して新スキルを読み込ませ、こう頼みます:

> gridgram CLI を自分のプラットフォーム向けにインストールして。

エージェントが `/gg-install` を起動して:

1. OS + アーキ検出
2. <https://github.com/ideamans/gridgram/releases/latest> から
   最新版をダウンロード
3. `$PATH` 上で書き込み可能な最初のディレクトリにインストール
   （書けなければ `/tmp/gg` にステージ + sudo ヒント）

### 選択肢 B: 通常の方法で `gg` を入れる

スキルを使いたくないなら、標準の
**[クイックスタート](/ja/guide/)**（curl / PowerShell の 1 行
スクリプト）か **[インストール](/ja/guide/install)**（手動手順）
に従ってください。`$PATH` に `gg` があれば、スキル側は入手経路を
問いません。

### 確認

```sh
gg --help
```

`gg v<version>` が出ればOK。

## 5. 最初のレンダリングを試す

> gridgram で Web アプリの構成図を描いて。ブラウザが API を呼び、
> API の裏に Postgres DB。`~/first-diagram.svg` に保存。

エージェントは `/gg-icons` でアイコンを選び、`/gg-author` で `.gg`
を組み立て、`/gg-render` で SVG を生成します。ブラウザで開いて確認。

## 6. 全部を最新化

### スキルを更新

```sh
gh skill update
```

引数なしだと全スキルを対象にします。各 `SKILL.md` の provenance が
ソースを覚えているので、tree SHA の比較で本当に変化したものだけが
更新されます。

単体で更新したい場合:

```sh
gh skill update ideamans/gridgram plugins/gridgram/skills/gg-author
```

### `gg` バイナリを更新

エージェントに頼むだけ:

> gridgram CLI を最新版に更新して。

`/gg-install` が既存バイナリを見つけて同じ場所を差し替えます。

## 7. アンインストール（任意）

```sh
gh skill remove ideamans/gridgram plugins/gridgram/skills/gg-author
# 他の 3 つも同様
```

`gg` の削除:

```sh
rm "$(which gg)"
rm -rf ~/.cache/gridgram
```

## トラブルシューティング

### `unknown command: skill`

gh を **v2.90 以上**に更新。`gh --version` で確認。

### `gh skill install` が rate limit 到達

`gh auth login` で認証してから再試行。認証済みリクエストは上限が
高くなります。

### スキルはインストール済みなのにエージェントから見えない

エージェントホストを再起動。多くのホストは起動時にしかスキル
ディレクトリをスキャンしません。

### フロントマターに未知フィールド警告が出る

想定外の事態: gridgram のスキルは Claude Code 独自拡張
（`disable-model-invocation`、`paths`、…）を使っていません。発生
したら issue を立ててください。

## 次に読む

- [Claude Code プラグイン・チュートリアル](./claude-plugin) — Claude
  Code ユーザー向け。マーケットレベルの自動更新などが効きます。
- [CLI リファレンス](./cli) — スキルが裏で何をしているか。
- [context7](./context7) — MCP 経由の取得ルート。どのスキルホスト
  とも併用可。
