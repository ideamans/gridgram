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
    ai:
      text: AI エージェントで使う
      link: /ja/ai/
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

  aiReady:
    eyebrow: AI ネイティブ
    title: そのまま LLM エージェントに書かせられる
    intro: 4 つのファーストクラスな連携チャネルから、使っているホストを選ぶだけ。どの経路も同じ `.gg` 文法で動くので、エージェントをまたいでも図は使い回せます。
    items:
      - icon: puzzle
        title: Claude Code プラグイン
        body: マーケットプレイス配布。/gg-install・/gg-icons・/gg-author・/gg-render のスラッシュコマンドで完結。
        link: /ja/ai/claude-plugin
        linkText: チュートリアル →
      - icon: brand-github
        title: gh skill
        body: 同じスキルバンドルを Copilot / Cursor / Gemini CLI / Codex に `gh` コマンド一発でインストール。
        link: /ja/ai/gh-skill
        linkText: チュートリアル →
      - icon: plug-connected
        title: context7（MCP）
        body: インストール不要のドキュメント取得。MCP 対応エージェントから gridgram の全リファレンスを参照可能。
        link: /ja/ai/context7
        linkText: チュートリアル →
      - icon: file-text
        title: llms.txt
        body: ドキュメントサイトのルートに公開。curl で取れるインデックスと約 230 KB のフルバンドル。
        link: /ja/ai/llms-txt
        linkText: リファレンス →

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
    ai:
      text: AI エージェントで使う
      link: /ja/ai/
    secondary:
      text: GitHub
      link: https://github.com/ideamans/gridgram
---

<Landing />
