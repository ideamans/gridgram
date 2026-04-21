# Gridgram とは

Gridgram は **グリッドベースの図版生成器** です。コマンド先頭型の
`.gg` ファイル、または TypeScript の `DiagramDef` で図を記述すると、
SVG または PNG にレンダリングします。

想定利用者は 2 種類：

- **ライター** — Wiki やドキュメントに図を書きたく、描画アプリより
  プレーンテキストを好む人。`.gg` ファイルと `gg` CLI を使う。
- **開発者** — 自分のパイプライン（静的サイトジェネレータ、MCP
  サーバ、ビルドスクリプト）に Gridgram を組み込みたい人。
  TypeScript API を使う。

両方とも同じレンダリングパイプラインを通るため、出力は**同一**です。

## 最小の例

<Example name="basic-01-hello" />

単一アイコンの図です — `@pos` を省略していることに注目。Gridgram は
アイコンを宣言順に row 0 上で自動配置するので、横一列の単純なフロー
図は座標指定が一切不要です。

### 2 つのショートハンド

ほぼすべての行で登場するので先に押さえておくと読みやすくなります：

- **`"…"` または `'…'` — ラベル。** `icon` / `region` / `note` /
  コネクタに付くクォート文字列は表示ラベルです。どちらのクォートでも
  同じ。テキスト内のエスケープが楽なほうを選んでください。
- **`:user` — ID。** 先頭の `:` はノードに名前を付ける記号で、他の
  ステートメントから参照できるようにします。ID が必要なのは **コネクタ**
  （`user --> api`）や **ノートのターゲット**（`note [user] "…"`）から
  参照されるときだけ。参照されないノードは `:id` を省略でき、内部で
  自動 ID が割り振られます。

```gg
icon :user tabler/user   "User"    # :user は ID、"User" はラベル
icon :api  tabler/server "API"
user --> api "login"               # コネクタが :id で参照
```

## 組込アイコン（Tabler）

上の例で使っている `tabler/user` は組込アイコン集から来ています。
Gridgram は **[Tabler アイコン](https://tabler.io/icons)** を同梱
しており、5,500 以上の outline アイコンと多数の filled 亜種が使えます。
参照は `tabler/` 名前空間経由：

```gg
icon @A1 tabler/world        "Front"   # outline
icon @B1 tabler/filled/star  "Hot"     # filled
```

<Example name="icon-tabler" />

<https://tabler.io/icons> で全アイコンを検索・ブラウズできます。
カタログ上の名前（`arrow-right`、`cloud-upload`、`database` など）は
すべて `tabler/` プレフィックス付きで使えます。

指定した名前に filled 亜種がない場合、リゾルバはそのノードを
`iconError` として扱い、**赤いリング** で描画します。これにより参照
切れが一目で分かります（Tabler の outline は filled よりずっと
網羅的）。

独自アセット（URL / ファイルパス / dataURL）は `doc { icons: … }`
または `gridgram.config.ts` で登録します。詳細は
[アイコン](./icon/) を参照。

## 自動配置の横フロー

<Example name="basic-02-multi-node" />

最小例と同じ原理：アイコンは自動配置され、row 0 上で col が増加します。
コネクタは `<id> <arrow> <id>` の形でノード間を繋ぎます。

### 行の折り返し

`doc` で `cols` を指定しつつ `@pos` を省略した場合、自動配置された
アイコンは列数に達した時点で **次の行に折り返し** ます：

<Example name="auto-wrap" />

```gg
doc { cols: 4 }

icon tabler/user     "user"
icon tabler/world    "web"
icon tabler/server   "api"
icon tabler/database "db"
icon tabler/bolt     "queue"
icon tabler/cloud    "cdn"
icon tabler/lock     "auth"
icon tabler/file     "audit"
```

8 個のアイコン × 4 列 → 2 行。明示的な `@pos` と暗黙の配置は自由に
混在でき、明示配置は auto カウンタを進めません。

## グリッドに配置する

1 行に収まらなくなったら、各アイコンに `@col,row` を書きます。グリッド
は Excel 風の **(列, 行)** 順 — 表計算ソフトの `A1` と同じ配置規則
です。**`cols` / `rows` は書いた `@col` / `@row` の最大値から自動推論**
されるため、2×2 のレイアウトには `doc { }` ブロックすら不要：

<Example name="basic-03-grid-2x2" coords cols="2" rows="2" />

```gg
icon :front @A1 tabler/world    "Frontend"
icon :api   @B1 tabler/server   "API"
icon :cache @A2 tabler/database "Cache"
icon :db    @B2 tabler/database "DB"
```

明示的にグリッドを固定したい場合（末尾の空セルを残す、推論値を
曖昧にしたくない等）は `doc { cols: N, rows: M }` を追加します。
リージョン・テーマ・明示グリッドが揃った例は
[クイックスタート (.gg)](./quickstart-gg) を参照。

## ラベルは Unicode（CJK OK）

ラベルはすべて UTF-8 テキストとして扱われるので、日本語・中国語・
韓国語などの非ラテン文字もラテン文字と同じように描画されます。
フォント設定もエスケープも不要：

<Example name="label-cjk" />

コネクタのラベル、ノートの本文、リージョンのタイトルも同様です。
混在スクリプト（`"API 伺服器"` など）は Gridgram が SVG の `<text>` に
そのまま渡し、ブラウザやラスタライザがグリフを選びます。

## 次に読む

- [クイックスタート (.gg)](./quickstart-gg) — CLI インストールと描画
- [ドキュメント](./document/) — `doc { }` / コマンド / マージ規則
- [アイコン](./icon/) — Tabler / パス / エイリアス / フォールバック
