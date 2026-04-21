# ノート

**ノート** はグリッドの 1 セルに貼る小さな注釈ボックスで、任意で
**リーダーライン**（引き出し線）を 1 つまたは複数のノード／コネクタに
伸ばせます。ラベルに収まらない注釈 — 前提条件、注意点、ランブックへの
リンク、セクションの見出しなど — を書くための仕組みです。

ノードと同様にセルを 1 つ占有しますが、円形クリップではなくソフトな
背景の上にテキストを表示します。

## 基本例

<Example name="note-basic" />

この例では 4 つのノートがフローの異なる箇所を注釈しています：

- **Stateless / auto-scaled** → `api` ノード
- **SQL with join** → `query` コネクタ（コネクタの `"query"` ラベルが
  点線リーダーを避けて下側に退避するのが見える）
- **Session token** → `login` コネクタ
- **Read replica** → `db` ノード（色付き）

## 構文

```
note @<pos> [<target-list>] "<text>" [attr=value ...] [{ body }]
```

- `@<pos>` は単一セル（`@A1` または `@col,row`）。必須。
- `[a, b, c]` は引き出し線の宛先 ID のリスト（任意）。省略すると
  スタンドアロンの吹き出しに。
- `"<text>"` は本文。必須。
- 末尾の `attr=value` または `{ … }` ボディで `bg` / `color` /
  `labelScale` を上書き。

```gg
note @B1 [api]     "Stateless\nauto-scaled"
note @A3 [login]   "Session token carried as Bearer JWT"
note @C3 [db, api] "Multi-target note" color=#b45309
note @D4           "Standalone — no leader line"
```

## スタンドアロン・複数ターゲット・太字

<Example name="note-advanced" />

上の図では 3 つのパターンが混在しています。いずれも同じ `note`
ステートメントで、文法の任意パーツを使い分けているだけ。

**スタンドアロン**（`[…]` なし）— 見出しや単なる解説を空きセルに
置きたいときに便利：

```gg
note @A1 "**Public** edge"   color=#0369a1
note @C1 "**Async** path"    color=#7c3aed
```

**複数ターゲット** — 1 つのノートが複数の ID を指します。リーダーが
本体から扇状に出て、それぞれのターゲットの手前で止まります：

```gg
note @D3 [queue, store] "Both **read** after\nthe request completes"
```

ノードとコネクタを混ぜられます。重複 ID は 1 本にまとめられます。

**太字** — `**…**` で段落内の強調。ノートが解釈する唯一のインライン
書式で、イタリック・リンク・フル Markdown はサポートしません：

```gg
note @B3 [req, api] "Rate-limited"  color=#b45309
```

本文中の `\n` は明示的な改行、長い行はセル幅で自動折り返し
（CJK の禁則処理あり — 行頭・行末に句読点が単独で残らない）。

## `targets`: 引き出し線の指す先

`[…]` 内の各 ID は、以下のどちらかと照合されます：

- **ノード ID**（DSL の `icon :name`、または JSON の `{ id: 'name' }`）
- **コネクタ ID**（DSL の `id=<name>`、JSON の `id: '<name>'` で付与）

未解決の ID は整合性エラーになります（コネクタの `from` / `to` と
同じ扱い）。誤参照が silently 失敗することはありません。

リーダーは `stroke-dasharray="1 3"` の点線でノートの色を継承
（透明度少し下げ）。衝突判定の対象に含まれるため、ノード／コネクタ／
リージョンのラベルが自動でリーダーを避けて配置されます。

## スタイリング

| フィールド   | 既定値        | 効果 |
|--------------|---------------|------|
| `bg`         | `#ffffff`     | ノート本体の背景色 |
| `color`      | `theme.text`  | 枠線・文字・リーダー色 |
| `labelScale` | `1`           | フォントサイズの倍率 |

`color=#b45309` のように 1 つ指定すると、枠線・文字・リーダー線が
連動して色替わりするので、色テーマを揃えやすい設計です。暗いテーマ
（`theme.bg: '#0f172a'` など）で本体の白ベースを変えたい場合は
`bg` を併用。
