# マージ

`.gg` ファイルは **複数の `doc` ブロック** を持つことができ、DSL
ステートメント（`icon` / `region` / `note` / コネクタ）と `doc` 内の
JSON5 配列を自由に混在できます。Gridgram はそれらを決定的な規則に
従って 1 つの `DiagramDef` に合成します。

## スカラー / オブジェクト: ディープマージ

`cellSize`、`padding`、`cols` / `rows`、`theme`、`icons` は **ファイル
出現順** に合成され、後勝ち。オブジェクトは **ディープマージ** なので、
指定しなかった下位キーは以前の値を保ちます：

```gg
doc { theme: { primary: '#065f46' } }
doc { theme: { accent:  '#d97706' } }
```

最終テーマ:
```
{ primary: '#065f46', accent: '#d97706', ... (残りは既定) }
```

`icons` マップはキー単位で後勝ちですが、マップ全体は **加算的**：

```gg
doc { icons: { logo: './v1.svg' } }
doc { icons: { logo: './v2.svg', hero: './hero.svg' } }
```

最終: `{ logo: './v2.svg', hero: './hero.svg' }`。

## 配列: concat + ID 重複チェック

`nodes` / `connectors` / `regions` / `notes` は **concat** です。
`doc { }` ボディで書いた内容は DSL で書いた分に **追加** されます：

| 配列          | 重複キー   | 衝突時の挙動        |
|---------------|------------|---------------------|
| `nodes`       | `id`       | **エラー**          |
| `connectors`  | なし       | そのまま連結        |
| `regions`     | なし       | そのまま連結        |
| `notes`       | なし       | そのまま連結        |

ID による一意制約があるのは `nodes` のみ。DSL と JSON を跨いでの
重複も検出されます。それ以外の配列には ID 相当がないので、同じ内容を
誤って両方に書かないよう注意してください。

## DSL と JSON の使い分け

どちらの記法も同じ `DiagramDef` になります。状況に応じて読みやすい方を
選んでください：

- **DSL は密度が高い** — グリッド上の 10 ノードなら `icon` 1 行 /
  ノード。JSON なら 1 ノード 4〜5 行。
- **JSON は属性が多いとき読みやすい** — ラベル + 3 つのウェイポイント +
  線幅 + dash を持つコネクタは、オブジェクト形式のほうが見通しが良い。
- **テーマと icons マップは DSL で表現不可** — 常に `doc { … }`。

### インライン `{ … }`: 中間形式

すべての DSL ステートメント（`icon` / `region` / `note` / コネクタ）は、
末尾に JSON5 ボディを付けられます：

```gg
icon :ok @A1 tabler/server "ok" { badges: ['check'], color: 'accent/60' }
a --> b "routed"                    { waypoints: [{ col: 2.5, row: 1 }], strokeWidth: 3 }
region @A1:C1 "Top"               { color: 'accent/12', borderRadius: 8 }
```

DSL の「逃げ道」として機能します。アイコンのバッジ、コネクタの
ウェイポイント列、ネストしたオブジェクトなど、`key=value` の列で
書くと煩雑になるものをオブジェクトとして渡せます。`name=value` と
`{ … }` は同じ行に共存でき、キー衝突時は後勝ちです。

よくある進化の道のり：

1. **純粋な DSL** — シンプルな要素はこのまま。
2. **DSL + インライン `{ … }`** — 1 つの属性が構造を必要とするとき
   （バッジ、ウェイポイント、ネスト）。
3. **`doc { connectors: … }` / `doc { notes: … }` など** — 属性が
   多く、オブジェクト全体で複数行に書いたほうが読みやすいとき。

## 参照整合性チェック

マージ後、Gridgram は統合された `DiagramDef` に対して参照検証を
行います：

- ノード ID の重複 → エラー（両方の宣言箇所を表示）
- コネクタの `from` / `to` が未知のノード ID → エラー
- ノートの `targets` が未知のノード／コネクタ ID → エラー
- リージョンの spans が `cols × rows` の範囲外 → エラー
- リージョンの spans が 4 近傍で連結していない（飛び地）→ エラー

これらは **マージ後** に走るので、DSL と JSON をまたがる競合でも
両方の出典をエラーメッセージに含められます。

## 配置のコツ

`doc` ブロックはファイル先頭にある必要はありません。出現順に効くので、
関連する DSL とグルーピングしたほうが読みやすいときはそうして構いません：

```gg
# --- グローバル設定 ---
doc { theme: { primary: '#065f46' } }

# --- 公開層 ---
icon :front @A1 tabler/world  "Front"
icon :edge  @B1 tabler/server "Edge"

# --- 属性が多いコネクタは JSON で ---
doc {
  connectors: [
    {
      from: 'front', to: 'edge', arrow: 'end',
      label: 'GET /\n(CDN-cached)',
      labelScale: 1.1,
      waypoints: [{ col: 1.5, row: 1 }],
    },
  ],
}
```
