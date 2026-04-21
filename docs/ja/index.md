---
layout: page
title: Gridgram
landing:
  hero:
    name: Gridgram
    text: Mermaid ライクなテキスト記法で、いい感じに描ける AI 時代の関係図ジェネレータ。
    primary:
      text: はじめる
      link: /ja/guide/
    secondary:
      text: GitHub で見る
      link: https://github.com/ideamans/gridgram

  features:
    items:
      - icon: robot
        title: シンプルな DSL
        body: 人間にも AI にも優しい、覚えやすい小さな文法。
      - icon: brand-typescript
        title: TypeScript ライブラリ
        body: Web アプリ、ビルドスクリプト、サーバーなど JS が動く場所に組み込める。
      - icon: palette
        title: 5,500+ アイコン
        body: Tabler アイコンを同梱 — 膨大な数の中から即座に利用できます。
        link:
          href: https://tabler.io/icons
          text: tabler.io/icons
      - icon: photo
        title: SVG / PNG 出力
        body: Web、ドキュメント、スライド、印刷まで — 一つのレンダラであらゆるメディアに。

  demo:
    title: グリッドにアイコンを配置
    intro: 基本の使い方は、ノードを @A1 / @B1 のような座標に置いて接続するだけ。同じ図を DSL と TypeScript の 2 通りで書けます。
    name: landing-grid
    ggLabel: .gg (DSL)
    tsLabel: TypeScript

  architecture:
    title: しくみ
    intro: 2 つの入力パス（gg CLI が読む .gg ファイル / gridgram npm パッケージが受け取る DiagramDef）が、同じレンダリングパイプラインに合流します。どちらのパスでも同一の SVG を生成し、PNG は CLI からのみ、sharp / libvips を初回実行時に取得して変換します。
    name: gridgram-flow

  acknowledgments:
    title: オープンソースへの感謝
    intro: Gridgram は以下の OSS プロジェクトの上に成り立っています。全文は THIRD_PARTY_LICENSES.md および gg --license で確認できます。

  finalCta:
    title: 試してみませんか
    text: サインアップ不要・API キー不要。すべてローカルで動きます。
    primary:
      text: ガイドを読む
      link: /ja/guide/
    secondary:
      text: GitHub
      link: https://github.com/ideamans/gridgram
---

<Landing />
