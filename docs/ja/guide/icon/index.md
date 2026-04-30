# アイコンノード

Gridgram のノードは `icon` コマンドで宣言します。ノードの役割（サーバー・
ユーザー・メッセージバスなど）を、小さなモノクロ・グリフで一目に伝える
要素です。

コマンド名こそ `icon` ですが、必ずしもグリフを載せる必要はありません。
円の中に短いテキストを置く（`text=`）こともできますし、何も置かずに
構造のためのプレースホルダーとして使うこともできます。

## 3 つの種類

```gg
icon :front @A1 tabler/user           "Front"    # 1. Tabler outline（組込）
icon :star  @B1 tabler/filled/star    "Star"     # 2. Tabler filled（組込）
icon :my    @C1 @assets/my-widget.svg "Custom"   # 3. 外部ファイル / エイリアス / URL
```

| 種類                  | アセット参照                          | 備考 |
|-----------------------|-------------------------------------|------|
| Tabler outline        | `tabler/<name>`                      | 5,500 本以上。既定の選択肢 |
| Tabler filled         | `tabler/filled/<name>`               | outline に対応する塗りつぶし版 |
| 外部ファイル / URL    | `./x.svg` / `@alias/x.svg` / `https://…` | ローダーが事前解決 |
| 登録済みの bare name  | `<name>` のみ                        | `doc { icons: … }` や config での登録が必要 |

ここでいう「bare name」は、名前空間プレフィックスのない単独識別子
（`logo` など）のこと。Gridgram は厳密に扱い、自動解決しないので
Tabler のアイコン名と衝突する心配がありません。

## bare word = `src` のショートハンド

`:id` と `@pos` に続く非修飾の単語は、アセット参照の `src` と解釈
されます。以下の 3 行はすべて同じ図になります：

```gg
icon :server @A1 tabler/server "Server"                  # bare 形式（推奨）
icon :server @A1 src=tabler/server "Server"              # 明示 attr
icon :server @A1 "Server" { src: "tabler/server" }       # ボディ形式
```

読みやすい方を選んでください。bare が一番短く見通しが良いです。
`src=` や body 形式は、`.gg` を自動生成する場合や `src` を他の多数の
属性と組み合わせるときに向きます。

## 最小例

<Example name="basic-01-hello" />

アイコンはノードの円形クリップの内側に描かれます。色はノードの
`currentColor` を継承するため、Tabler のモノクロアイコンは自動的に
ノード色に合わせて描画されます（リングとアイコンの色合わせが不要）。

## アイコン未解決のとき

リゾルバが解決できない `src=` 値を指定した場合、そのノードは
`iconError: true` として扱われ、**赤いリングのみでグリフなし** で
描画されます。ビルドを壊さず、壊れた画像プレースホルダーも出さず、
出力を見ただけで問題箇所が分かる設計です。

```gg
icon :front @A1 tabler/userr "typo"   # Tabler に userr は存在しない → 赤リング
```

エラーになるのは「**アセット名を指定したのに解決できなかった**」場合です。
アセット参照が **そもそも書かれていない** `icon` 宣言はエラーにならず、
ノードは色付きのリングだけで描画されます（下書きや `text=` と組み合わせる
ときに便利）。

## アイコンの代わりにテキスト

ピクトグラムよりも短いラベルの方が適している場面があります。ステップ番号
（`"1"` `"2"`）、ステータス（`"OK"`）、1 文字の漢字など。`text=` 属性を
使い、アセット参照は省略します：

```gg
icon :step1 @A1 text="1" "提出"
icon :step2 @B1 text="2" "確認"
icon :step3 @C1 text="OK\nGO" "承認"
```

サイズ決定ルール — Gridgram は次の制約をすべて満たす **最大の font-size**
を選びます：

- テキストのアスペクト比（最長行の文字数 / 行数）を保ったうえで、
  円に内接する最大の長方形を求めます（横長の 1 行ラベルはアイコン領域の
  左右をはみ出して、円の丸みの分まで横幅を活用できます）。
- その長方形の **高さがアイコン領域の高さを超える場合** は、高さを
  アイコン領域の高さに揃え、幅もアスペクト比を保ったまま縮めます
  （高さは決してグリフの位置からはみ出しません）。
- 各行の `<tspan>` には `textLength` が設定されるので、フォントごとの
  実際のグリフ幅にかかわらず、計算した幅にぴったり収まります。

複数行は `\n` で区切ります。`size=` でノードを大きく/小さくしても、
テキストはノードに合わせて自動的にスケールします。

<Example name="icon-text" />

右下のセルは `src=` も `text=` も無い空のケース — 意図的なプレース
ホルダーであり、エラーではありません。

`src=` と `text=` を同じノードに併記した場合は `text=` が勝ち、アイコンは
描画されません。慣例としてはどちらか一方だけを使ってください。

## `iconTheme`: theme / native

モノクロの Tabler アイコンは `currentColor` を使うため、ノード色を
そのまま取り込みます。ブランドロゴや国旗のような **多色アイコン** を
指定すると、自動的な `currentColor` カスケードが色を潰してしまいます。
この場合は `iconTheme=native` を指定して、アイコンそのものの塗りを
保持します：

<Example name="icon-native" />

左のアイコンは `color=accent`（オレンジ）を既定で適用 — `currentColor`
がアセットの塗りを上書きして、多色グリフがオレンジ一色に潰れます。
右は `iconTheme=native` を加えて `currentColor` カスケードを **外し**、
SVG 本来の色を残します。用途はブランドロゴ・国旗・写真系グリフ
（ラスタを使うときは `clip=circle` と組み合わせてアバター風に）。

```gg
icon @A1 @brand/aws.svg      "AWS"
icon @B1 @brand/aws.svg      "AWS" iconTheme=native
```

ノードの **リング** は両方とも `color` を使います。`iconTheme` が
効くのはアイコンの内側のみ。

## 引数は順不同

`icon` コマンドと末尾の `{ … }` ボディ以外は、引数の順序は自由です。
各引数は接頭記号で役割が決まります（`:` ID、`@` 座標、`src=` / `color=`
などの属性、`"…"` ラベル）。以下 4 行はすべて同じ意味：

```gg
icon :a @A1 tabler/user "A"
icon "A" @A1 tabler/user :a
icon tabler/user :a "A" @A1
icon :a tabler/user { label: "A", pos: [1, 1] }
```

人間が書くときは一貫した順序にしたほうが読みやすいですが、自動生成
時には自由さが利きます。

## 次に読む

- **[バッジ](./badge)** — 隅に付くマーカー（check / alert / lock …）
- **[サイズ](./size)** — `size` と `sizeScale`、ラベルのスケーリング
- **[カスタム](./custom)** — 独自アイコンの登録方法
