# CI / CD

開発者のコミットから本番稼働までの継続的インテグレーションと
継続的デリバリーの流れ。

## ゲート付き段階的プロモーションのパイプライン

リージョン帯（色分けされた 3 段）+ 成功バッジ + 太線でマークした
手動ゲート。コントロールコンソールのような雰囲気に仕上がります。

<Example name="frame-gallery-cicd-pipeline" framing="1-3" layout="single" />

## マトリクスビルド

1 回のコミットが 5 つのワーカーに並列でファンアウトします。
図はあえて素朴に — テーマカラーは 1 つ、リージョンなし — 前後の
リッチな例との対比を意識しています。

```gg-diagram gallery
doc { cols: 3, rows: 3 }

icon :src   @A2 tabler/git-commit  "Commit"
icon :n18   @B1 tabler/server      "18/linux"
icon :n20   @B2 tabler/server      "20/linux"
icon :n22   @B3 tabler/server      "22/linux"
icon :merge @C2 tabler/check       "Merge"   sizeScale=1.3

src --> n18
src --> n20
src --> n22
n18 --> merge
n20 --> merge
n22 --> merge
```

## フィーチャーブランチプレビュー

ピアレビュー向けに破線の「プレビュー」デプロイ、実線は main への
マージ用です。ノートで判断点にアンカーを付け、何が自動処理の
トリガーかをレビュアに伝えます。

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :pr      @A1 tabler/git-pull-request "PR"
icon :preview @B1 tabler/world             "Preview"
icon :merge   @C1 tabler/git-merge         "merge"
icon :main    @D1 tabler/server            "staging"

pr      --> preview "deploy" dash="2 4"
pr      --> merge
merge   --> main    "promote" width=2

note @B2 (preview) "URL posted\nback to the PR"
```

## デプロイトポロジ

CI の最終ステップ。1 つのアーティファクト、1 つのバイナリ、
多くのランタイム。中央のハブが `sizeScale` で視覚的な重みを
担います。

```gg-diagram gallery
doc { cols: 3, rows: 2 }

region @A1:C1 "Artefact" color=primary/28
region @A2:C2 "Runtimes" color=secondary/24

icon :art @B1 tabler/package "Artefact" sizeScale=1.5
icon :r1  @A2 tabler/brand-ubuntu   "Linux"
icon :r2  @B2 tabler/brand-apple    "macOS"
icon :r3  @C2 tabler/brand-windows  "Windows"

art --> r1
art --> r2
art --> r3
```
