# クイックスタート (.gg)

## `gg` バイナリのインストール

```sh
# プリビルドバイナリ（近日公開）
curl -L https://github.com/ideamans/gridgram/releases/latest/download/gg -o gg
chmod +x gg

# または、ソースから実行
bun install
bun run src/cli/gg.ts
```

## 最初の図

`hello.gg` を作成：

```gg
icon :user tabler/user     "User"
icon :web  tabler/world    "Web"
icon :api  tabler/server   "API"
icon :db   tabler/database "DB"

user --> web "HTTPS"
web  <-> api "REST"
api  <-> db  "SQL"
```

各行はコマンドキーワード（`icon` / `region` / `note` / `doc`）で始まる
のが基本 — 例外はコネクタで、Mermaid 風に `<id> <arrow> <id>` と書きます。
`:user` は ID（`:` サジル）、`src=…` はアイコンアセット、`"…"` はラベル。
**引数は順不同** で、接頭記号でトークンの役割が決まります。

`tabler/<名前>` が組込アイコン名前空間で、5,500+ の Tabler outline
アイコンが使えます。filled は `tabler/filled/<名前>`。
プレフィックス無しの bare name（`logo`, `my-widget` など）は、
`doc { icons: … }` またはプロジェクト設定で別名登録したときだけ
解決されます。

レンダリング：

```sh
gg hello.gg -o hello.svg
gg hello.gg -o hello.png   # PNG (sharp 経由)
```

結果：

<Example name="quickstart-01-no-coords" />

アイコンに `@col,row` がないことに注目。位置を省略すると、宣言順に
自動配置されます — col が row 0 上で増加していくので、**横一列の
単純なフロー図は座標指定が一切不要** です。

## 構造を持たせる（座標指定）

1 行を超えたら、各アイコンにグリッド座標を付けます。Gridgram は
**Excel 風の A1 記法**（推奨）と **数字の `@col,row`** のどちらも受理
します。いずれも 1-based なので、`@A1` == `@A1` == 左上：

```gg
icon :cdn @A1 tabler/cloud "CDN"    # A1 形式（推奨）
icon :api @A2 tabler/server "API"  # 数字形式、意味は同じ
```

`doc { … }` ステートメントで図全体の設定を書きます。リージョンで
関連セルをグループ化、コネクタで繋ぎます。

<Example name="quickstart-02-grid-3x3" coords cols="3" rows="3" />

この例で使われている要素：

- `doc { cols: 3, rows: 3, theme: { … } }` — 図全体の設定
- `region @A1-C1 "Public" color=accent/12` — 横方向 1 行のリージョン
- `color=accent/12` — テーマキーワード + アルファ指定（`/12` 構文）
- `<->`（`session`）— 双方向矢印 + ラベル

`.gg` と等価な TypeScript `DiagramDef` はバイト単位で同一の SVG を
出力します。TypeScript 側も `pos: [col, row]` のタプル省略形を受け
付けるため、`.gg` の `@col,row` 記法と 1:1 で対応します。

## 次のステップ

- **[ドキュメント](./document/)** — `doc { … }`・マージ規則・コマンド一覧
- **[アイコン](./icon/)** — Tabler / 外部パス / エイリアス / カスタム
- **[バッジ](./icon/badge)** — preset によるセマンティックマーキング
- **[CLI リファレンス](./cli)** — 全フラグ、終了コード
