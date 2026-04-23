---
title: Claude Code プラグイン・チュートリアル
description: gridgram の Claude Code プラグインをインストールし、最初の図をレンダリングして、更新まで一気通貫で学ぶ。
---

# Claude Code プラグイン・チュートリアル

まっさらな環境から Claude Code の `/gg-*` スラッシュコマンドで
図をレンダリングするまでのフルコース。

**所要**: 約 10 分。 **成果物**: ブラウザで開ける SVG 1 枚と、
最新化に使うコマンド。

## 前提

足りなければ各自インストール:

- [**Claude Code**](https://code.claude.com/)（新しめならなんでも）
- [**git**](https://git-scm.com/)
- **シェル**（macOS / Linux なら bash / zsh、Windows なら PowerShell）
- **ネットワーク** — `github.com` に到達できること

`gg` CLI はまだ入れなくて大丈夫です。プラグインが入れてくれます。

## 1. gridgram マーケットプレイスを追加

Claude Code を起動して `ideamans/claude-public-plugins` マーケットを
追加:

```text
/plugin marketplace add ideamans/claude-public-plugins
```

次のように表示されます:

```
✔ Successfully added marketplace: ideamans-plugins
```

確認:

```text
/plugin marketplace list
```

## 2. gridgram プラグインをインストール

```text
/plugin install gridgram@ideamans-plugins
```

出力:

```
✔ Successfully installed plugin: gridgram@ideamans-plugins
```

確認:

```text
/plugin list
```

`gridgram@ideamans-plugins` が `enabled` で載っているはずです。

スキルを今のセッションに読み込むためにリロード:

```text
/reload-plugins
```

`/gg-` と打つと Claude Code の補完に `/gg-install` / `/gg-render` /
`/gg-icons` / `/gg-author` が並ぶはず。

## 3. `gg` CLI をインストール

スキルは `gg` バイナリをシェル経由で呼びます。どちらの方法でも OK。

### 選択肢 A: Claude 内から `/gg-install` を使う（初めての人向け）

こう頼みます:

> gridgram CLI を自分のプラットフォーム向けにインストールして。

Claude が `/gg-install` を起動して:

1. OS + CPU アーキテクチャを `uname` で検出
2. 最新リリースを <https://github.com/ideamans/gridgram/releases/latest>
   から取得
3. `$PATH` 上で書き込み可能なディレクトリを探す
   （`~/.local/bin`、`~/bin`、`/usr/local/bin`、`/opt/homebrew/bin`
   の順）
4. どこにインストールするかを確認
5. アーカイブをダウンロード → 展開 → 配置

どこも sudo なしで書けない場合は `/tmp/gg` にステージして `sudo mv ...`
の具体的なコマンドを提示してくれます:

```
gg staged at /tmp/gg — run 'sudo mv /tmp/gg /usr/local/bin/gg' to finish
```

### 選択肢 B: 通常の方法で `gg` を入れる

別の方法でインストールしたい、あるいは Claude Code の外で用意して
おきたい場合は、標準の
**[クイックスタート](/ja/guide/)**（curl / PowerShell の 1 行
スクリプト）か **[インストール](/ja/guide/install)**（手動手順）
に従ってください。`$PATH` に `gg` さえ乗っていれば、スキルは入手
経路を問いません。

### 確認

```sh
gg --help
```

`gg v<version>` がバナーに出ればOK。

## 4. 最初の図をレンダリング

普通の日本語でお願いします:

> gridgram で Web アプリの構成図を描いて。ブラウザクライアントが
> API を呼び、API は Postgres DB と Redis キャッシュに依存、
> バックグラウンドジョブのキューもある。`~/first-diagram.svg` に保存して。

裏では Claude が:

- `/gg-icons` を回して browser / api / database / cache / queue の
  Tabler アイコンを特定
- `/gg-author` で `.gg` ソースを組み立てて検証
- `/gg-render` で SVG をレンダリング、diagnostics を読む

SVG をブラウザで開いてください。シンプルなアーキテクチャ図が
見えます。`.gg` ソースも提示されているので保存しておくと後編集が
楽です。

### 最初のレンダリングに警告が出たら

`--diagnostics` チャンネルには致命的でない問題（未解決アイコンは
赤い丸、配置できなかったラベル、など）が流れます。そのまま言えば
OK:

> キャッシュノードの周りの赤丸を直して。

Claude が `/gg-icons` を再実行して適切な名前に差し替え、`.gg` を
直して再レンダリング。ループはチャット内で完結します。

## 5. 全部を最新化

動くパーツは 2 つ: プラグイン（スキル本体）と `gg` バイナリ。

### プラグインを更新

```text
/plugin marketplace update ideamans-plugins
/reload-plugins
```

マーケットのエントリは gridgram 本体の既定ブランチを `git-subdir`
ソースでピンしているので、これだけで最新スキルを取り込みます。

### `gg` バイナリを更新

頼むだけ:

> gridgram CLI を最新版に更新して。

`/gg-install` は `$PATH` 上の既存 `gg` を検出し、同じディレクトリで
差し替えます。元の場所が sudo 必須でなければ sudo プロンプトも
出ません（`~/.local/bin` ならだいたい不要）。

直接呼ぶなら:

```text
/gg-install
```

スキルは常に最新版と比較するので、すでに最新ならその旨を伝えて
終わります。

## 6. アンインストール（任意）

```text
/plugin uninstall gridgram@ideamans-plugins
/plugin marketplace remove ideamans-plugins
```

`gg` バイナリの削除:

```sh
rm "$(which gg)"
rm -rf ~/.cache/gridgram   # PNG 用 sharp キャッシュ
```

## トラブルシューティング

### `/plugin marketplace add` が `Premature close` で落ちる

Claude Code 内部の非対話 git clone で稀に発生。`owner/repo` ショート
ハンドで通らないときは HTTPS URL を直接:

```text
/plugin marketplace add https://github.com/ideamans/claude-public-plugins.git
```

### `/gg-install` が `/tmp/gg` にステージして止まる

`$PATH` 上のどこも書き込み不可だった場合です。スキルが表示する
`sudo mv` コマンドをそのまま実行してから `gg --help` で確認。
あるいは `~/.zshrc` / `~/.bashrc` に user-local な bin ディレクトリ
を足してください:

```sh
export PATH="$HOME/.local/bin:$PATH"
```

シェル再起動後に `/gg-install` をもう一度。

### 初回の PNG レンダリングが失敗する

PNG パイプライン（sharp + libvips）は初回だけ lazy に取得して
`~/.cache/gridgram/` にキャッシュします。ネット不調なら再試行。
v0.4.0 以前は Linux arm64 で detect-libc 解決の既知バグがあるので
`/gg-install` で更新してください。

## 次に読む

- [CLI リファレンス](./cli) — `gg llm` と `gg icons` の詳細。スキル
  が裏で何をしているかを理解したい、あるいは手動で叩きたい人向け。
- [`gh skill` チュートリアル](./gh-skill) — 同じスキル群を Copilot /
  Cursor / Gemini / Codex にもインストール。
- [context7 チュートリアル](./context7) — MCP 経由で gridgram の
  ドキュメントを取得させたいだけの場合（プラグイン不要）。
