# 仕様

このページは **リファレンス** です。Gridgram の DSL がそう動く理由
— 文法、不変条件、解決パイプライン — を一箇所にまとめています。
Guide の各ページは「使い方」を例で示し、こちらは「なぜそうなるか」を
形式的に説明します。エッジケースに遭遇した人、`.gg` を自動生成したい
人向け。

## 1. `.gg` 文法

インフォーマル BNF。大文字はトークン（終端記号）、小文字は非終端記号。
`|` は選択、`*` は 0 個以上、`?` は任意、`+` は 1 個以上。

```
file            := statement*
statement       := doc-stmt
                 | icon-stmt
                 | region-stmt
                 | note-stmt
                 | connector-stmt

doc-stmt        := 'doc'    body
icon-stmt       := 'icon'   arg* body?
region-stmt     := 'region' arg* body?
note-stmt       := 'note'   arg* body?
connector-stmt  := IDENT arrow IDENT arg* body?

arg             := id-sigil    |  pos      |  span
                 | target-list |  label    |  attr
                 | word                        # icon 文限定の src ショートハンド

id-sigil        := ':' IDENT
pos             := '@' A1_ADDR | '@' INT ',' INT
span            := '@' A1_ADDR RANGE_SEP A1_ADDR
                 | '@' INT ',' INT RANGE_SEP INT ',' INT
RANGE_SEP       := ':' | '-'                 # ':'（Excel 風）を推奨
label           := DQ_STRING | SQ_STRING
target-list     := '[' IDENT (',' IDENT)* ']'
attr            := IDENT '=' (BARE_WORD | DQ_STRING)
body            := '{' <バランスした JSON5 オブジェクト> '}'
arrow           := '-->' | '->' | '<--' | '<->' | '---'
                 | '..>' | '<..' | '<..>' | '...'

# 終端記号
A1_ADDR         := [A-Za-z]+ [0-9]+          # "A1", "aa100", "AAA9999"
INT             := [0-9]+
IDENT           := [A-Za-z_] [A-Za-z0-9_-]*
BARE_WORD       := 空白 / ';' / '{' / '[' / '"' / "'" 以外の連続
DQ_STRING       := '"' (. | '\\n' | '\\"' | '\\\\' | '\\t')* '"'
SQ_STRING       := "'" (. | '\\n' | '\\'' | '\\\\' | '\\t')* "'"
STMT_END        := '\n'（深度 0）| ';'（深度 0）
```

**ステートメント判別** は 2 トークン先読みで決定：

1. `tokens[1]` が `arrow` なら **コネクタ**。
2. そうでなければ `tokens[0]` は `doc` / `icon` / `region` / `note` の
   いずれか。

このため `icon` / `region` / `note` / `doc` は **行頭キーワード** として
のみ予約。行頭以外（アイコン参照、コネクタのノード ID、ラベル本文、属性値
など）ではそのまま自由に使えます。

**コマンド語以降の引数は順不同**。各引数は接頭記号（`:` / `@` / `"` /
`[` / `=`）を持つので、出現順に関わらずトークナイザが役割を決められます。

## 2. 座標系

Gridgram の公開形式はすべて **1-based**。`A1` = 列 1・行 1 = 左上。
正規化層がレイアウト演算直前に 0-based へシフトします。

| 形式              | 意味 |
|-------------------|------|
| `@A1`             | 単一セル（Excel 風、推奨） |
| `@1,1`            | 単一セル（数値） |
| `@A1:B2`          | 矩形範囲（Excel 風、推奨） |
| `@A1-B2`          | 矩形範囲（旧区切り、互換） |
| `@1,1:2,2`        | 矩形範囲（数値） |
| `@1,1-2,2`        | 矩形範囲（数値、旧区切り） |
| `pos: [1, 1]`     | TS タプル |
| `pos: { col: 1, row: 1 }` | TS オブジェクト |
| `pos: "A1"`       | TS 文字列 |

**A1 列の計算**: A=1 … Z=26、AA=27 … AZ=52、BA=53 … ZZ=702、AAA=703。
小文字も許可（`aa100`）。`col = Σ letter × 26^(n-1-i)`（A-Z → 1-26）。

**バリデーションエラー（パース時 or 正規化時）**:
- `col < 1` または `row < 1` → `"Grid coordinate is 1-based"`
- 不正な A1（`@1A` / `@A0` / 空）→ `"Invalid cell address"`
- `cols` / `rows` の範囲外 → 整合性エラー
- ノードの `col` / `row` が非整数 → エラー（ウェイポイントのみ小数可）

自動配置: `icon` で `@pos` を省略すると、宣言順に座標が付与されます。
`row=1` 上で `col` が増加し、`cols` 指定があれば折り返します。

## 3. 解決パイプライン

```gg-diagram
doc {
  cols: 4, rows: 2,
  theme: { primary: '#1e3a5f', accent: '#e8792f' },
}

icon :src    @A1 tabler/file-text "Source"
icon :tok    @B1 tabler/code      "Tokens"
icon :stmt   @C1 tabler/list      "Statements"
icon :def    @D1 tabler/file-code "DiagramDef"
icon :check  @A2 tabler/check     "Integrity"
icon :fold   @B2 tabler/stack     "foldLayers"
icon :layout @C2 tabler/ruler     "resolveDiagram" color=accent
icon :svg    @D2 tabler/photo     "SVG"            color=accent

src    --> tok    "tokenize"
tok    --> stmt   "parse"
stmt   --> def    "parseGg"
def    --> check  "check"
check  --> fold   "resolve"
fold   --> layout "layout"
layout --> svg    "render"
```

同じパイプラインをテキストで：

```
1. scan + tokenize          → Token[]
2. parseStatements          → 各文の ParseLineResult[]
3. parseGg                  → doc ブロックの deep merge、配列 concat、
                              無名 icon に auto-id 割り当て
4. checkIntegrity           → 参照・範囲・4-連結性
5. foldLayers（描画時）     → 設定の 4 層マージ、座標正規化
                              （1-based → 0-based）、バッジ preset 展開、
                              自動配置
6. resolveDiagram           → レイアウト、コネクタルーティング、
                              ラベル配置
7. render                   → Preact VNode → SVG
```

### 設定マージ（4 層、後勝ち）

```
システム既定
  → プロジェクト設定（gridgram.config.{ts,js,json,json5}、walk-up）
    → ドキュメント `doc { … }` ブロック（出現順に deep-merge）
      → CLI / プログラマチック上書き
```

### 配列マージ（`doc { nodes/connectors/regions/notes: [...] }`）

| 配列          | 重複キー | 衝突時       |
|---------------|----------|--------------|
| `nodes`       | `id`     | **エラー**   |
| `connectors`  | なし     | 連結         |
| `regions`     | なし     | 連結         |
| `notes`       | なし     | 連結         |

`doc { nodes: [...] }` からのノードは、DSL で宣言したノードに追加
されます。ID はファイル全体で一意でなければなりません。

## 4. アイコン（`src=`）解決順序

```
1. doc { icons: { … } } マップ     （ファイル単位の bare name 登録）
2. --icons <dir> CLI フラグ         （実行単位の bare name 登録）
3. パス参照                         （./x.svg、@alias/x.svg、/abs/x.svg、https://…）
4. Tabler 組込                      （tabler/<name>、tabler/filled/<name>）
5. いずれも無し → iconError        （赤リング + `iconError: true`）
```

`doc` マップが最優先なので、共有設定を壊さずに 1 ファイルだけで上書き
できます。

## 5. ラベル配置

ノードラベル・コネクタラベル・リージョンラベルのすべてが同じ配置器を
通過します。各ラベルは候補 `LabelRect` を優先順位順に試し、衝突しない
最初の矩形を採用。全候補が衝突する場合はフォールバック（通常は先頭候補）
を採用し、`error: true` を立てます（`--no-errors` がなければ赤マーカー
として表示）。

### 配置順

```
ノート（@pos で確定）
  → ノードラベル（コネクタ次数の降順）
    → コネクタラベル
      → リージョンラベル
```

先に配置したものが「占有済み」となり、後続はそれを避けます。

### 候補順

| 種類         | 候補（この順に試行） |
|--------------|-----------------------|
| ノード       | top-right、bottom-right、bottom-left、top-left、top-center、bottom-center |
| コネクタ     | 中央セグメントから外側へ（hop 順）、各セグメント内は中央 → inset 位置 |
| リージョン   | top-left、top-right、bottom-right、bottom-left、top-center、bottom-center（union 外のコーナーは除外） |

### 衝突判定

以下のいずれかに該当すると **衝突**：

1. キャンバス境界外（`bounds` 指定時のみ）
2. 配置済みの他ラベル矩形と重なる（約 4 px のパディング）
3. コネクタ線セグメントに交差する（約 6 px のパディング）
4. **いずれかのノードのアイコン円に重なる**（約 4 px のパディング）。
   ただし、そのノード自身のラベルを配置している場合は自身の円を除外

4 番目のルールが、`@D1` の大きなアイコンが隣の `@C1` の小さなアイコンの
ラベルを別コーナーに押し出す仕組みです。他人のグリフの上にラベルは
置かれません。

### ノードラベルのコールアウト幾何

ノード中心 `(x, y)`・半径 `r` のとき、候補コーナー（`top-right` 等）
ごとにラベル矩形を構築し、引き出し線は次の 2 点を結びます：

- **円上の接地点**: 中心 `(x, y)` からラベル矩形のリーダー先コーナーに
  向かうレイと円の交点。これにより、リーダー線を延長するとノード中心
  を通る — 視覚的に「アイコンの中央を指している」ように見えます。
- **ターゲット点**: ラベル矩形の、ノードに最も近い角。

## 6. コネクタルーティング

```
1. 直線ポリラインを計算    （始点中心 → ウェイポイント → 終点中心）
2. 貫通チェック: 他のノードの円を線が通るか？通るなら 3 へ
3. 自動迂回: セル角の交点グラフ上で BFS。衝突ノードの外側の角を経由
   するルートを選択（既存コネクタとの交差が最少になるように重み付け）
4. nodeMargin の引き: 矢印先端を両端から `nodeMargin * radius` だけ
   引いてリングに重ならないように
```

点線矢印（`..>`、`<..` など）は `dash: '6 3'` を自動設定。明示的な
`dash="…"` があればそちらが優先。

## 7. リージョンのブロブ

リージョンは `@pos` / `@span` 項目の union です。

```
1. ラスタライズ: cols × rows の占有マトリクスに spans を塗る
2. 4-連結チェック: ひとつの塗りセルから BFS。未到達の塗りセルが
   残れば飛び地 → 整合性エラー
3. 境界トレース: union の外周を時計回りに辿り、単一 SVG パス化
4. 角丸: 各凸角・凹角に region の半径を適用（隣接辺長の半分に
   clamp して弧同士の交差を防止）
```

リージョンラベル配置は候補コーナーを「代表セルが union 内にあるか」で
絞り込んだ上で、他の要素（他ラベル・線・アイコン円）と衝突ループを
走らせます。

## 8. カラー

すべての要素の `color` は同じ文法で解決されます：

```
primary             # テーマキーワード（素のまま）
accent/60           # テーマキーワード + 2 桁 hex alpha
accent/8            # 1 桁 alpha → 88 に展開
#e8792f             # hex リテラル
#e8792f40           # hex リテラル + alpha
red                 # CSS 名前付き色
rgb(200, 0, 0)      # CSS 関数記法
```

### 自動 tint

- **ノードの内側**: `color` が設定されていれば（形式を問わず）、
  内側の塗りはその色の約 8% 不透明度。`color=` 1 つで「濃いリング +
  薄い塗り」が得られる。
- **bare テーマキーワードのリージョン**: `region … color=accent` は
  約 7% 不透明度で自動描画。`color=accent/30` や `color=#aabbcc` は
  auto-tint を回避し書いた値がそのまま使われる。

### 透過キャンバス

`theme.bg` = `'transparent'` / `'none'` / `''` → 背景矩形は描画
されません。透過時はコネクタラベルのピル背景が白にフォールバック
（任意の背景でも可読性を維持）。

## 9. Z オーダー（背面 → 前面）

```
1. キャンバス背景矩形       （bg が透過の場合は省略）
2. リージョン              （ブロブの塗り）
3. コネクタ               （線 + 矢印 + ラベルのピル）
4. ノード                 （リング + アイコン + バッジ）
5. ノート                 （引き出し線 + 吹き出し + 本文）
6. ラベル                 （ノード／リージョンラベルは所属要素の上）
```

ノートはノードより **上** に乗り、引き出し線がグリッドを跨いで見える
ように。リージョンは **下** に置かれ、背景として機能します。

## 10. 予約語と auto-id

- **行頭キーワード**: `doc`、`icon`、`region`、`note`。キーワードより
  後ろでは通常の単語として使えます。
- **auto-id**: 無名 `icon` ステートメントには `__n1`、`__n2` … が
  parseGg 時に割り当てられます。`__` で始まる識別子は **予約** で、
  ユーザーは避けてください。
- **識別子規則**: `[A-Za-z_][\w-]*`。先頭に数字は不可。

## 11. エラーモデル

エラーは throw されず収集され、（部分的な）DiagramDef と共に返されます。
重要度は 3 クラス：

| `source`   | 発生源                                        |
|------------|-----------------------------------------------|
| `dsl`      | トークナイザ / 各文パーサ（行 N を報告）     |
| `json`     | `doc { … }` の JSON5 パース                  |
| `check`    | 整合性チェック（ID 重複、未知参照 …）        |

CLI 終了コードは 1:1 対応：
- `1` = `dsl` または `json` エラー 1 件以上
- `2` = `check` エラー 1 件以上（パース自体は成功）
- `3` = I/O・描画失敗（ファイル読込、設定読込、PNG ラスタライズ）
- `0` = 成功

## 12. 既定値一覧

| 設定                  | 既定値 |
|-----------------------|--------|
| `cellSize`            | 256 px |
| `padding`             | `2 × max(cellSize × 0.025, 4)` |
| ノード直径の比率      | 0.45 × cell |
| 既定の矢印            | `end`（`-->`）|
| 既定の線幅            | 2 px（`strokeWidth`） |
| 既定の dash           | なし（実線） |
| 既定の nodeMargin     | 0.6 |
| リージョン auto-tint  | 約 0x12（≈ 7%）|
| ノード auto-tint      | 約 0x15（≈ 8%）|
| ラベル padding        | 約 4 px（矩形-矩形）、約 6 px（矩形-線）、約 4 px（矩形-円）|

これらは表に記されたとおり、要素ごとの属性では変更できません（例外は
Guide の各ページ「Icon › サイズ」「Connector › スタイル」「Region ›
スタイリング」「Color › テーマ」を参照）。
