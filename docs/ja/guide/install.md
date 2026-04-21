# インストール

`gg` を最速でインストールする方法は [クイックスタート](./) で紹介した
ワンライナー — curl → bash のスクリプトが、プラットフォームに合った
バイナリをダウンロードして `PATH` に配置します。このページはそれ以外
の手段 — インストールランディングページ、GitHub Releases、ソースから
のビルド — をまとめたものです。

## インストールランディングページ

インストールスクリプトは専用ページから配布しています：

**<https://bin.ideamans.com/oss/gg>**

::: tip
ランディングページ自体は日本語ですが、インストールコマンドは
ロケールに依存せずどの環境でもそのまま動きます。
:::

各プラットフォームごとに最新のバージョン付きスクリプトが公開されて
います：

| プラットフォーム       | コマンド                                                        |
|------------------------|-----------------------------------------------------------------|
| macOS / Linux          | `curl -fsSL https://bin.ideamans.com/install/gg.sh \| bash`     |
| Windows (PowerShell)   | `irm https://bin.ideamans.com/install/gg.ps1 \| iex`            |

既定のインストール先：

- **Linux / macOS** — システム共通のディレクトリ（通常は
  `/usr/local/bin`）。ユーザー単位にしたい場合は `--install-dir $HOME/bin`
  で上書き：
  ```sh
  curl -fsSL https://bin.ideamans.com/install/gg.sh | bash -s -- --install-dir "$HOME/bin"
  ```
- **Windows（管理者）** — `C:\Program Files\gg\gg.exe`
- **Windows（一般ユーザー）** — `%USERPROFILE%\bin\gg.exe`

カスタムディレクトリに入れた場合は `PATH` に追加されていることを
確認してください。

## GitHub Releases（手動ダウンロード）

タグ付きリリースごとにビルド済みアーカイブと `checksums.txt` が
公開されます。ダウンロード → 検証 → バイナリを自分で配置する流れ
です。

**<https://github.com/ideamans/gridgram/releases/latest>**

| プラットフォーム           | アセット                                    |
|----------------------------|---------------------------------------------|
| Linux x64                  | `gridgram_<version>_linux_amd64.tar.gz`     |
| Linux ARM64                | `gridgram_<version>_linux_arm64.tar.gz`     |
| macOS (Intel)              | `gridgram_<version>_darwin_amd64.tar.gz`    |
| macOS (Apple Silicon)      | `gridgram_<version>_darwin_arm64.tar.gz`    |
| Windows x64                | `gridgram_<version>_windows_amd64.zip`      |

### Linux / macOS

```sh
VERSION=0.1.0
OS=linux       # or darwin
ARCH=amd64     # or arm64

curl -fsSL -o gg.tar.gz \
  "https://github.com/ideamans/gridgram/releases/download/v${VERSION}/gridgram_${VERSION}_${OS}_${ARCH}.tar.gz"

tar -xzf gg.tar.gz
sudo mv "gridgram_${VERSION}_${OS}_${ARCH}/gg" /usr/local/bin/
```

### Windows (PowerShell)

```powershell
$Version = "0.1.0"
$Url = "https://github.com/ideamans/gridgram/releases/download/v$Version/gridgram_${Version}_windows_amd64.zip"

Invoke-WebRequest $Url -OutFile gg.zip
Expand-Archive gg.zip -DestinationPath .
# move gg.exe somewhere on your PATH, e.g. %USERPROFILE%\bin
```

### チェックサムの検証

```sh
curl -fsSL -O "https://github.com/ideamans/gridgram/releases/download/v${VERSION}/checksums.txt"
sha256sum -c --ignore-missing checksums.txt
```

## ソースからビルド

Gridgram は [Bun](https://bun.sh) でビルドします。Bun を入れたら：

```sh
git clone https://github.com/ideamans/gridgram
cd gridgram
bun install
bun run sync-tabler        # インストール後に必須（src/data/ を生成）
bun run compile            # リポジトリ直下に ./gg が生成される
```

コンパイルせずに動かす — CLI 自体をいじりたいときに便利：

```sh
bun run src/cli/gg.ts diagram.gg -o out.svg
```

## アップグレード

[クイックスタート](./) のワンライナーを再実行するか、Releases から
最新のアセットを取得してください。スクリプトはべき等で、既存バイナリ
をその場で置き換えます。

## アンインストール

インストール先（`/usr/local/bin/gg` / `$HOME/bin/gg` / Windows の
インストールディレクトリ）からバイナリを削除するだけです。インストーラ
が書き込むファイルはそれだけ。実行時には PNG 出力用に sharp のネイティブ
モジュールが `~/.cache/gridgram/` にキャッシュされるので、容量を空け
たい場合はこのディレクトリも削除してください。
