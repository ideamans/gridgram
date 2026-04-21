# 組織図

人員とレポートライン。Gridgram のグリッドレイアウトは浅い階層に
向いています。深いツリーには専用のツリーレイアウトツールを検討して
ください。

## 実写アバターのチーム

シルエットアイコンを実際の顔写真（プレースホルダは `picsum.photos`）
に差し替えます。`clip=circle` で各写真を円形のアバターに丸め、
`iconTheme=native` でノードのテーマカラーによる色付けを抑え、
元の写真の色を保持します。

<Example name="team-photos" layout="single" />

ラスター画像アセットも、他の場所と同じく Tabler アイコンと同様に
振る舞います ── `pos`、`sizeScale`、リージョン、コネクタは
そのまま動作します。違いは `src=...` に対してアイコンリゾルバが
どのファイルを返すかだけです。


## 小規模組織のレポートライン

CEO が頂点に、機能別レポートが下に並びます。クロスコネクションは
なく、どのレポートもマネージャーは 1 人だけです。

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :ceo @B1 tabler/user-star "CEO"  sizeScale=1.4 { badges: ['star'] }
icon :cto @A2 tabler/user      "CTO"
icon :cpo @C2 tabler/user      "CPO"
icon :cfo @D2 tabler/user      "CFO"

ceo --> cto
ceo --> cpo
ceo --> cfo
```

## エンジニアリングチームの構造

ディレクター配下にライン管理者 2 人、その下にエンジニアが所属。
スクワッドはライン管理者にレポートしつつ、プリンシパルから技術的な
方向付けを受けます。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :dir  @B1 tabler/user-star  "Director"
icon :m1   @A2 tabler/user       "EM A"
icon :m2   @C2 tabler/user       "EM B"
icon :e1   @A3 tabler/users      "team A"
icon :e2   @C3 tabler/users      "team B"
icon :prin @D2 tabler/star       "Principal"

dir --> m1
dir --> m2
m1  --> e1
m2  --> e2
prin --> e1 "tech"
prin --> e2 "tech"
```

## マトリクス組織

メンバーは機能別マネージャー（専門分野）とプロジェクトマネージャー
（プロダクト）の両方にレポートします。「二重帽子」問題を可視化します。

```gg-diagram gallery
doc { cols: 3, rows: 2 }

icon :eng @A1 tabler/users     "Eng"
icon :des @C1 tabler/palette   "Design"
icon :p1  @A2 tabler/briefcase "Prod A"
icon :p2  @C2 tabler/briefcase "Prod B"

eng --> p1
eng --> p2
des --> p1
des --> p2
```

## スクワッド／トライブ構造

Spotify 流モデル。トライブはビジネス領域でスクワッドをまとめる
単位、チャプターはスクワッドをまたいだ専門職の集まり、ギルドは
有志によるコミュニティ・オブ・プラクティスです。

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :tribe @B1 tabler/users-group "Tribe" sizeScale=1.2
icon :s1    @A2 tabler/users "Squad A"
icon :s2    @C2 tabler/users "Squad B"
icon :chap  @D1 tabler/hierarchy "Chapter"
icon :guild @D2 tabler/users "Guild"

tribe --> s1
tribe --> s2
chap  --> s1
chap  --> s2
```
