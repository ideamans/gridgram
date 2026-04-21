# ナレッジグラフ

概念階層、分類体系、関係ネットワーク。

## 分類体系（タクソノミー）

厳密なツリー構造で、どのノードにも親は 1 つだけ。ファイル
システム、カテゴリブラウジング、生物学的分類などに向きます。

```gg-diagram gallery
doc { cols: 3, rows: 3 }

icon :anim @B1 tabler/paw        "Animal" sizeScale=1.3
icon :mam  @A2 tabler/paw        "Mammal"
icon :bir  @C2 tabler/feather    "Bird"
icon :cat  @A3 tabler/cat        "Cat"
icon :dog  @B3 tabler/dog        "Dog"
icon :eag  @C3 tabler/feather    "Eagle"

anim --> mam
anim --> bir
mam  --> cat
mam  --> dog
bir  --> eag
```

## ファセットタグ

アイテムを複数の独立した軸でカテゴライズします。横断的に関連付ける
モデル ── もう厳密な階層にはなりません。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :item @B2 tabler/box       "Item"
icon :col  @A1 tabler/palette   "Color"
icon :siz  @C1 tabler/ruler     "Size"
icon :use  @D1 tabler/tag       "Use"
icon :mat  @A3 tabler/stack     "Material"

item <-> col
item <-> siz
item <-> use
item <-> mat
```

## 概念間の関係

名詞を名前付きのエッジで結ぶ ── 小さなオントロジーの骨格です。
RDF や Wikidata のグラフは、語彙を増やすとこのような形になります。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :author @A2 tabler/user      "Author"
icon :book   @B2 tabler/book      "Book"
icon :topic  @D1 tabler/tag       "Topic"
icon :pub    @D2 tabler/building  "Publisher"
icon :year   @D3 tabler/calendar  "Year"

author --> book  "wrote"
book   --> topic "about"
book   --> pub   "by"
book   --> year  "in"
```

## エージェント向けのナレッジグラフ

LLM に検索用のナレッジグラフを渡したときに「見える」もの。
各エッジはエージェントがたどれる型付きの関係です。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :q    @A2 tabler/search     "Query"
icon :ent  @B2 tabler/box        "Entity"
icon :rel1 @C1 tabler/link       "relatedTo"
icon :rel2 @C3 tabler/link       "partOf"
icon :res  @D2 tabler/bulb       "Answer"

q    --> ent
ent  --> rel1
ent  --> rel2
rel1 --> res
rel2 --> res
```
