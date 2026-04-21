---
title: エディタ
aside: false
outline: false
---

# エディタ

ライブで動く `.gg` プレイグラウンドです。左側にタイプすれば、右側の
SVG がリアルタイムで更新されます。パースエラーやアイコン解決の
警告は、下部に表示されます。

`.gg` の全構文に対応しています — `doc { }` ブロック、アイコン、
リージョン、コネクタ、ノート。ブラウザ上で解決できるのは **Tabler
組込アイコン** （`tabler/name` / `tabler/filled/name`）のみで、外部
アイコンファイル（`./x.svg` / `@alias/x.svg`）はここでは使えません。
それらを使う場合は `gg` CLI を利用してください。

<ClientOnly>
  <Editor />
</ClientOnly>

## Tips

- `icon :id @A1 tabler/user "Label"` — ID・位置・アイコン・ラベルを持つノード。
- `a --> b "label"` — ノード `a` からノード `b` へ、ラベル付きコネクタ。
- `doc { cols: 4, rows: 3 }` — グリッドを固定。省略時は `@pos` から自動推論。
- `doc { theme: { primary: "#e8792f", accent: "#1e3a5f" } }` — テーマの変更。
- 完全なリファレンスは [ユーザーガイド](./guide/) を参照してください。
