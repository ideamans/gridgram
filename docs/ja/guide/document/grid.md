# グリッド

Gridgram は **グリッド前提** の設計です。すべてのノードは整数の
`(列, 行)` 座標上に置かれ、グリッド自体は「セル数」と「ピクセル数」の
2 つで表されます。これを制御する設定は `cols` / `rows` / `cellSize`
の 3 つだけ。通常は 0 〜 1 個書く程度で済みます。

## セル座標 — A1 記法と数字記法

座標はすべて **1-based** です。`A1` = 列 1, 行 1 = 左上のセル。
Gridgram は以下の 3 つの形式を受け付けます（意味はすべて同じ）：

| 形式       | 例               | 説明 |
|------------|-----------------|------|
| A1         | `@A1`, `@AA100` | Excel 風。大文字小文字区別なし（`@aa100` も可）。桁上がり文字（AA, AB…）対応。**推奨**。 |
| 数字       | `@A1`, `@AA100` | 1-based の `@col,row`。上と同じ意味。 |
| TS タプル  | `pos: [1, 1]` / `pos: "A1"` / `pos: { col: 1, row: 1 }` | `NodeDef.pos` はこれら 3 形式のいずれでも可。 |

col や row が `< 1` のアドレス、または不正な A1（`@1A` や `@A0` など）
はパースエラー。0 行目はありません — A1 が原点です。

## サイズの自動推論

<Example name="basic-03-grid-2x2" coords cols="2" rows="2" />

`cols` / `rows` を省略すると、Gridgram は **全ノードが収まる最小の
グリッド** を自動で選びます。書かれた `@col` の最大値 + 1 が `cols`、
`@row` の最大値 + 1 が `rows` になります。

```gg
icon :front @A1 tabler/world    "Frontend"
icon :api   @B1 tabler/server   "API"
icon :cache @A2 tabler/database "Cache"
icon :db    @B2 tabler/database "DB"
```

`doc { }` すら不要で、自動推論で 2×2 グリッドになります。

## 明示的な指定

<Example name="quickstart-02-grid-3x3" coords cols="3" rows="3" />

`cols` / `rows` を明示する理由は、**固定サイズにしたい** とき — 将来
拡張のために空行を残す、読者に意図を明示する、など：

```gg
doc { cols: 3, rows: 3 }
```

`cols` と `columns` はエイリアス。読みやすい方で構いません。出力は
同一です。

## 長方形グリッド

グリッドは **正方形である必要はありません**。`4×2` は幅 4 セル／
高さ 2 セルの長方形として明示でき、出力 SVG もそのアスペクト比に
なります：

```gg
doc { cols: 4, rows: 2 }

icon :a @A1 …   icon :b @B1 …   icon :c @C1 …   icon :d @D1 …
icon :e @A2 …   icon :f @B2 …   icon :g @C2 …   icon :h @D2 …
```

## `cellSize`: ピクセルの基準

`cellSize` は 1 セルの **内部** ピクセルサイズ（既定 `256`）。
`cols` / `rows` と掛け合わせて SVG の intrinsic サイズが決まります：

```
intrinsic 幅 = cellSize × cols
intrinsic 高 = cellSize × rows
```

例えば `cellSize: 128, cols: 4, rows: 2` だと viewBox は 512×256。

アイコン・フォント・ストロークのサイズは `cellSize` を基準に計算
されるため、この値を変えても幾何学的なバランスは保たれます。通常は
変更不要。レンダリング出力の解像度を上げたいとき、あるいは特定の
intrinsic サイズを欲しいときに使います。

## CLI の `--width` / `--cell-size`

CLI 側の出力調整は 2 種類：

- `--cell-size <px>` — `cellSize` を上書き（幾何形状も変わる）
- `--width <px>` — **最終出力の幅**（アスペクト比維持でスケール、
  幾何形状は変わらない）

単に「もっと大きく／小さく出したい」なら `--width`、「アイコン・
線・ラベルのバランスを取り直したい」なら `--cell-size` が向きます。

## `padding`

`padding` はグリッド外側の余白（`cellSize` の単位で指定）。既定は
`cellSize` から自動スケールされます。テンプレート埋込み時に余白を
詰めたい／広げたいときに調整：

```gg
doc { padding: 24 }     // cellSize のピクセル単位
```
