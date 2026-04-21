# gridgram 設計仕様

グリッド座標ベースの図版描画ライブラリ／CLI。Mermaid ライクな DSL と JSON5 ディレクティブを組み合わせ、Wiki やドキュメント中に書ける構造化テキストから SVG / PNG を生成する。

---

## カラーテーマ

`DiagramTheme` は以下のフィールドで構成：

| キー        | 必須 | 用途 |
|-------------|------|------|
| `primary`   | ✓   | ノードのデフォルト色 |
| `secondary` | ✓   | コネクタのデフォルト色 |
| `accent`    | ✓   | 強調色（キーワードで参照する用途） |
| `text`      | ✓   | Note のデフォルト文字色 |
| `bg`        | 任意 | 背景色。省略または `'transparent'`/`''`/`'none'` でキャンバス透過 |
| `muted`     | 任意 | 補助色（ユーザーが参照する用） |

### 色指定ルール

node / region / connector / note / badge の `color` フィールドは以下を受け付けます：

```
color: 'primary'       → theme.primary に解決
color: 'secondary'     → theme.secondary
color: 'accent'        → theme.accent
color: 'text'          → theme.text
color: 'muted'         → theme.muted

color: 'primary/12'    → theme.primary + '12' (hex アルファ2桁)
color: 'accent/8'      → theme.accent + '88'  (1桁は AA に展開)

color: '#ff8800'       → リテラル hex（そのまま）
color: '#ff880040'     → リテラル hex + alpha（そのまま）
color: 'red', 'black'  → CSS 名前付き色（そのまま）
color: 'rgb(200,0,0)'  → CSS 関数記法（そのまま）
```

### 自動 tint（薄い背景色）

**ノードの内側の塗り**（リングの内側）は、node.color の約 8% 不透明度で自動的に tint されます。ユーザーは 1 色指定するだけで、濃い輪郭 + 薄い塗りが自動で決まります。

**Region の背景** は **バレ theme キーワード** (`color: 'accent'`) の場合のみ約 7% で自動 tint。`'accent/20'` のようにアルファを指定した場合、CSS 名や hex リテラルの場合は、**そのまま表示**されます（ユーザーが明示した色は尊重）：

```
region color: 'accent'       → #e8792f + fill-opacity=0.07（自動 tint）
region color: 'accent/20'    → #e8792f20（明示アルファ）
region color: '#e8792f12'    → そのまま
region color: 'red'          → solid red（自動 tint なし）
```

### 背景透過

`theme.bg` を省略、または `'transparent'` / `'none'` / `''` にすると、SVG 全体の背景矩形を描画しません（透過キャンバス）。コネクタラベルの吹き出し背景は透過時に白へフォールバックします。

---

## 1. 目的とインターフェース

gridgram は2つのインターフェースを持つ:

### 1.1 プログラミング API

既存の `DiagramDef` 型（`src/types.ts`）を React コンポーネント `<Diagram def={...} />` に渡して SSR で SVG 文字列を得る。PNG は `sharp` 経由。アイコンは React 要素として直接指定可能。

```ts
import { Diagram } from 'gridgram'
import { renderToStaticMarkup } from 'react-dom/server'

const svg = renderToStaticMarkup(<Diagram def={myDef} />)
```

### 1.2 CLI（`.gg` ファイル）

Wiki のテキストのように**人間が直接書く**ための簡易記法 `.gg` を受け付ける。アイコンは外部 SVG ファイルとして参照。

```bash
gg diagram.gg -o out.svg
gg diagram.gg -o out.png --width 2048         # 出力幅を指定（高さはアスペクト保持）
gg diagram.gg --cell-size 128 -o out.png      # セルサイズを小さくして出力
gg diagram.gg --icons ./icons/ -o out.svg
gg diagram.gg --format json                   # 正規化済み DiagramDef を出力
```

---

## 2. `.gg` ファイル形式

`.gg` ファイルは**二層構造**:

- **DSL（Mermaid風）** — よくある宣言を簡潔に
- **JSON5 ディレクティブ `%%{...}%%`** — DSL で表現できない詳細指定のエスケープハッチ

`.gg` はあくまで簡易記法であり、表現力は DSL + JSON5 の合成で担保する。

### 2.1 全体構造

```
<JSON5 ディレクティブ、DSL宣言、コメントを自由に混在>
```

要素の出現順は自由。ディレクティブは複数あってもよい。

### 2.2 コメント

```
# 行コメント
// 行コメントも可
```

`%%` は単独行コメントとしては**使わない**（ディレクティブの開始と紛らわしいため）。

---

## 3. JSON5 ディレクティブ

### 3.1 構文

```
%%{ <JSON5 fragment> }%%
```

- 複数行可
- 1ファイル内に複数出現可（出現順に**後勝ちディープマージ**）
- **JSON5** を採用（アンクオートキー、末尾カンマ、`//` コメント許容）
- 厳密 JSON は JSON5 の真部分集合なので、そのまま通る

### 3.2 記述例

```
%%{
  cols: 4,
  rows: 3,
  theme: {
    primary: "#1e3a5f",
    accent:  "#e8792f",
  },
  icons: {
    server: "./icons/server.svg",
    db:     "./icons/db.svg",
  },
}%%
```

### 3.3 ディレクティブで指定可能なキー

DiagramDef のあらゆるフィールドを受け付ける。

| キー           | 用途                                                         | DSL で指定可能か |
|----------------|--------------------------------------------------------------|------------------|
| `cellSize`     | グリッド1セルあたりのピクセルサイズ（デフォルト `256`）     | ✗（JSON 専用）   |
| `padding`      | 内側余白 (px)                                               | ✗                |
| `cols`         | カラム数（省略時はノードから推論）                          | ✗                |
| `rows`         | 行数（省略時はノードから推論）                              | ✗                |
| `theme`        | テーマカラー一式                                            | ✗                |
| `icons`        | アイコン ID → SVG パスのマップ                              | ✗                |
| `nodes[]`      | ノード配列                                                  | ✓（DSL優先推奨） |
| `connectors[]` | コネクタ配列                                                | ✓                |
| `regions[]`    | リージョン配列                                              | ✓                |

**グリッドの大きさ:**

- `cellSize`（1セル = デフォルト 256px）× `cols` でキャンバス幅、`cellSize × rows` で高さ
- `cols`/`rows` を省略した場合、すべてのノードが収まる最小サイズに自動決定
- 正方形に揃える制約はなく、`4×2` なら **4:2 の長方形**がそのまま出力される
- 上限は無し（古い 4×4 制限は撤廃）

**レンダリング幅（出力時オプション、DSL で指定しない）:**

- CLI の `--width <px>` または `renderDiagramSvg(def, { width })` で最終出力幅を指定
- アスペクト比は保持され、高さはそれに応じてスケール
- viewBox は内部座標空間のまま（ジオメトリは動かない）

---

## 4. マージ規則

### 4.1 スカラー / オブジェクト設定

`cellSize`, `padding`, `cols`, `rows`, `theme`, `icons` は**JSON 専用**。
複数ディレクティブにまたがって指定された場合、出現順に**ディープマージ**（後勝ち）。

### 4.2 配列要素（DSL ↔ JSON）

配列要素は**DSL か JSON のどちらか一方**で宣言する。部分的な上書きは行わない。

| 種別        | 重複キー判定       | 重複時の挙動 |
|-------------|--------------------|--------------|
| `nodes`     | `id` の一致        | **エラー**   |
| `connectors`| なし（そのまま concat） | —       |
| `regions`   | なし（そのまま concat） | —       |

ノード ID のみ一意制約あり。コネクタ・リージョンには ID がないため、ユーザーが DSL と JSON の両方で同じ内容を書いてしまっても検出できない（ユーザー責任）。

### 4.3 参照整合性

以下はパース後に検証し、エラーにする:

- ノード ID の重複（DSL同士、JSON同士、DSL↔JSON すべて対象）
- コネクタの `from` / `to` が未知ノード ID
- リージョン `spans` が `cols × rows` の範囲外
- リージョン `spans` が**飛地**（4近傍で連結していない）

エラーメッセージは原則、発生箇所の**行番号**と**由来（DSL/JSON）**を併記する。

```
Error: Duplicate node id "web"
  at diagram.gg:8    (DSL:   web @2,0 server "Web")
  at diagram.gg:15   (JSON:  { id: "web", ... })
```

---

## 5. DSL 構文

### 5.1 ノード宣言

```
<id> @<col>,<row> [<icon>] ["<label>"] [attr=value ...]
```

- `<icon>` は省略可
- `<label>` は二重引用符で囲む（改行は `\n`、`"` は `\"`）
- 属性は空白区切りの `key=value`

**例:**

```
web  @0,0 server    "Web Server"
api  @1,0 lightning "API"             color=#e8792f size=0.5
db   @2,0 database  "Database"
note @3,3           "(no icon)"        color=#888
```

**ノード属性:**

| 属性    | 型    | 例              |
|---------|-------|-----------------|
| `size`  | 0–1   | `size=0.6`      |
| `color` | CSS色 | `color=#f90`    |

**アイコン ID の解決順序:**

1. JSON ディレクティブの `icons.<id>` に登録があればその SVG を使用
2. 組込アイコン（`server`, `database`, `user`, `globe`, `shield`, `gear`, `document`, `cloud`, `lightning`, `lock`）
3. いずれにもなければエラー

### 5.2 リージョン宣言

```
region <span>[; <span>...] ["<label>"] [attr=value ...]
```

- `<span>` は `col1,row1-col2,row2`
- セミコロン区切りで複数スパン（L字・T字など複合形状）
- 複数スパンを指定した場合は**和集合を1本の輪郭**として描く（blob風）
- スパン同士は**4近傍（辺共有）で連結**していなければならない。対角のみ接する構成は飛地扱いでエラー

**例:**

```
region 0,0-2,1 "Infrastructure"          color=#eef8ff
region 0,3-3,3; 3,0-3,2 "DMZ"            color=#fff5eb radius=12
```

**リージョン属性:**

| 属性     | 型     | 例             |
|----------|--------|----------------|
| `color`  | CSS色  | `color=#eef8ff`|
| `radius` | px     | `radius=12`    |

#### 5.2.1 Blob 描画

和集合の外周を単一 SVG path で描画する。アルゴリズム:

1. `cols × rows` のセル占有マトリクスに `spans` を塗る
2. 塗られたセルと空セルの境界辺を収集
3. 辺をつないで時計回りの閉じたポリゴンを得る
4. 各頂点で**凸角・凹角ともに `radius` で丸める**（SVG `A` コマンド）
   - 半径は隣接辺長の半分以下に clamp（円弧同士の交差防止）

#### 5.2.2 飛地の検知

`spans` を塗ったマトリクスに対し、任意の塗られたセルから**4近傍 BFS**で連結成分を展開。塗られたセルに未訪問が残れば飛地 → **構文エラー**。

```
Error: Region spans are disjoint (must form a single connected shape)
  at diagram.gg:22   (region 0,0-1,1; 2,2-3,3 "DMZ")
```

#### 5.2.3 ラベル配置

bbox（`spans` 全体の最小矩形）を基準に、固定順で候補を評価:

```
候補順: [TL, TR, BR, BL, TC, BC]
         ↑ 4隅 → 上辺中央 → 下辺中央
```

1. 候補点が**union 外**（bbox内だがセル占有マトリクスで塗られていない箇所）なら除外
2. 残った候補を順に、他要素（ラベル/コネクタ線/キャンバス境界）との衝突をチェック
3. 衝突なしの最初の候補を採用
4. すべて衝突 → **候補順で最後の union 内候補を赤字エラー表示**で強行（`#e02020`）

### 5.3 コネクタ宣言

```
<from> <arrow> <to> [via <col>,<row>[, <col>,<row>...]] [: "<label>"] [attr=value ...]
```

**矢印の種類:**

| 構文    | 意味                     |
|---------|--------------------------|
| `-->`   | 実線・終点矢印（推奨既定）|
| `->`    | `-->` のエイリアス       |
| `<--`   | 実線・始点矢印           |
| `<->`   | 両端矢印                 |
| `---`   | 実線・矢印なし           |
| `..>`   | 点線・終点矢印           |
| `<..`   | 点線・始点矢印           |
| `<..>`  | 点線・両端               |
| `...`   | 点線・矢印なし           |

**例:**

```
web --> api : "HTTP"
api --> db  : "SQL"                  color=#999 width=2
u   --> web : "requests"
web <-> api : "sync"                 width=2
api --> db  via 1.5,1, 2,0.5 : "cached"
log ...  audit
```

**コネクタ属性:**

| 属性          | 型     | 例               |
|---------------|--------|------------------|
| `width`       | number | `width=2`        |
| `color`       | CSS色  | `color=#999`     |
| `dash`        | 文字列 | `dash="6 3"`     |
| `nodeMargin`  | 0–1    | `nodeMargin=0.8` |

`dash` を明示すれば `..>` でなくとも点線化できる。

### 5.4 ウェイポイント

`via` のあとに `col,row` ペアをカンマ区切りで列挙。小数可。

```
a --> b via 1.5,1
a --> b via 1,1, 1,2, 2,2
```

DSL で書くのが煩雑な場合（複数点＋他属性の組合せ）は JSON ディレクティブで書く方が読みやすい。

### 5.5 ラベル内のエスケープ

- 改行: `\n`
- 引用符: `\"`
- コロンを含むラベル: 引用符必須

```
web --> api : "POST /users\nreturns 201"
```

---

## 6. コンパイルフロー

```
┌─────────────┐        ┌─────────────┐
│ JSON dirs   │        │ DSL lines   │
│ (deep merge)│        │ (compile)   │
└──────┬──────┘        └──────┬──────┘
       │                      │
       ├── size/padding/      │ (DSLは関知しない)
       │   cols/rows/         │
       │   theme/icons        │
       │                      │
       ├── nodes[]  ──────┐   │
       ├── connectors[] ──┤ concat + ID重複チェック
       └── regions[]    ──┤   │
                          └───┘
                               │
                         DiagramDef
                               │
                           <Diagram />
                               │
                           SVG / PNG
```

---

## 7. フル例

```
# gridgram — auth flow

%%{
  cols: 4, rows: 3,
  theme: {
    primary: "#1e3a5f",
    sub:     "#3b5a80",
    accent:  "#e8792f",
  },
  icons: {
    server: "./icons/server.svg",
    db:     "./icons/db.svg",
    user:   "./icons/user.svg",
    lock:   "./icons/lock.svg",
  },
}%%

# --- Nodes ---
u    @0,1 user   "User"
gate @1,1 lock   "Auth"
web  @2,0 server "Web"
api  @2,2 server "API" color=#e8792f
db   @3,1 db     "Postgres"

# --- Regions ---
region 2,0-3,2 "Application" color=#eef8ff

# --- Connectors (simple ones in DSL) ---
u    --> gate : "login"
gate --> web  : "session"
gate --> api  : "token"
web  <-> api  : "RPC" width=2
web  --> db   : "read"

# --- Complex connector in JSON ---
%%{
  connectors: [
    {
      from: "api", to: "db",
      waypoints: [{ col: 2.7, row: 1.5 }],
      strokeWidth: 3,
      nodeMargin: 0.85,
      label: "write",
    }
  ]
}%%
```

---

## 8. CLI 仕様（ドラフト）

```
gridgram <input.gg> [options]

Options:
  -o, --output <path>       出力パス（拡張子 .svg / .png / .json で形式自動判定）
      --format <svg|png|json>
                            出力形式を明示（--format json は DiagramDef を出力）
      --cell-size <px>      1セルあたりのピクセル数を上書き（DiagramDef.cellSize 相当）
      --width <px>          最終レンダリング幅。高さはアスペクト比で自動スケール
      --icons <dir>         <dir>/*.svg をファイル名(拡張子除く)で一括登録
                            ディレクティブの icons 指定が優先
      --scale <n>           さらに最終幅に適用する倍率（既定 1、高DPI 用途）
      --stdout              -o 指定なしで stdout に書き出し
      --no-errors           ラベル衝突・ルーティング失敗・アイコン未解決の赤表示を抑制
      --license             バンドルされたサードパーティライセンスを表示
```

### 8.1 アイコン解決の全体像

```
優先度高 ──────────────────────────────────────────▶ 低
JSON icons ディレクティブ > --icons <dir> > 組込アイコン
```

### 8.2 終了コード

| コード | 意味                     |
|--------|--------------------------|
| 0      | 成功                     |
| 1      | パースエラー             |
| 2      | 整合性エラー（重複IDなど）|
| 3      | I/O エラー               |

---

## 9. 拡張余地（将来検討）

- `!include <path>` による分割
- DSL コメントディレクティブ `# @...` での軽量メタデータ（現状は JSON 一本化）
- テンプレ/クラス（共通属性セット）
- `.gg` シンタックスハイライト定義（VS Code 拡張）

---

## 10. 実装ステータス

- [x] プログラミング API（React SSR → SVG / sharp → PNG）
- [x] 組込サンプル `src/examples/*.tsx`
- [ ] `.gg` パーサ
- [ ] JSON5 ディレクティブ統合
- [ ] CLI (`gridgram` コマンド)
- [ ] 外部 SVG アイコン読込（`--icons` / `icons:` マップ）
- [ ] エラー報告（行番号＋由来）
