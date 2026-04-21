# クイックスタート

`gg` バイナリをインストールして、最初の図を 1 分以内にレンダリング
できます。リモートスクリプトをシェルにパイプするのが気になる方は、
手動のインストール方法を紹介した [インストール](./install) を
参照してください。

## インストール

お使いの OS に合わせたコマンドを選んでください。どちらのスクリプトも
自動で `gg` を PATH に追加します。

### macOS / Linux

```sh
curl -fsSL https://bin.ideamans.com/install/gg.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://bin.ideamans.com/install/gg.ps1 | iex
```

### 動作確認

```sh
gg --help
```

使い方のバナーが表示されれば成功です。`gg: command not found` と
出る場合は、シェルを開き直す（更新後の PATH を読み込むため）か、
[インストール](./install) を参照してください。

## 最初の図をレンダリング

1 行の `.gg` ソースを `gg` にパイプするだけで図が作れます。入力パスを
`-` にすると `gg` は標準入力から読み取るので、`;` で文を区切れば
ワンライナーに収まります。

### macOS / Linux

```sh
echo 'icon :u tabler/user "User"; icon :a tabler/server "API"; u --> a "request"' | gg -o hello.png - --width 1024
```

`hello.png` を `hello.svg` に変えれば（`--width` は省略）ベクター
出力になります。`--format svg --stdout` でターミナルへ SVG を直接
流し込むことも可能です。

### Windows (PowerShell)

```powershell
'icon :u tabler/user "User"; icon :a tabler/server "API"; u --> a "request"' | gg -o hello.png - --width 1024
```

`hello.png` を画像ビューアで開くと、2 つのアイコンがラベル付きの
矢印で繋がっているのが見えるはずです。これで CLI が動作していることが
確認できました。

<Example name="quickstart-echo" />

## 次に読む

- **[First Gridgram](./first-gridgram)** — `.gg` 言語の概念を 1 つずつ
  紹介するガイド付きツアー。
- **[インストール](./install)** — GitHub Releases、ソースからの
  ビルド、その他のインストール方法。
- **[CLI リファレンス](./cli)** — 全フラグと終了コード。
