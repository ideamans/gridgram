# セールスファネル

見込み客から顧客への流れと、コンバージョン段階。

## 古典的マーケティングファネル

認知 → 関心 → 検討 → 購入。各段階でユーザーが離脱していきます。
実際のファネルの幅はコンバージョン率を表しています。

```gg-diagram gallery
doc { cols: 5 }

icon :aware    tabler/eye          "Aware"
icon :interest tabler/heart        "Interest"
icon :consider tabler/scale        "Consider"
icon :buy      tabler/credit-card  "Buy"
icon :loyal    tabler/star         "Loyal"

aware    --> interest
interest --> consider
consider --> buy
buy      --> loyal
```

## B2B セールスパイプライン

リードの選別から契約まで。各段階には独自のプレイブックがあり、
ゲートで早まった昇格を防ぎます。

```gg-diagram gallery
doc { cols: 5 }

icon :lead   tabler/user-plus       "Lead"
icon :qual   tabler/filter          "Qualify"
icon :demo   tabler/presentation    "Demo"
icon :pilot  tabler/flask           "Pilot"
icon :close  tabler/signature       "Close"

lead --> qual
qual --> demo
demo --> pilot
pilot --> close
```

## 顧客セグメンテーション

リードは企業規模に応じて異なるプレイブックに振り分けられます。
各セグメントには独自のセールス動線があります。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :leads @A2 tabler/users           "Leads"
icon :smb   @C1 tabler/building-store  "SMB"
icon :mid   @C2 tabler/building        "Mid-market"
icon :ent   @C3 tabler/building-skyscraper "Enterprise"
icon :close @D2 tabler/signature       "Close"

leads --> smb
leads --> mid
leads --> ent
smb --> close
mid --> close
ent --> close
```

## キャンペーンのアトリビューション

複数のチャネルが同じコンバージョンに寄与します。どのチャネルを
「功績あり」とみなすかはアトリビューションモデル次第です ──
ラストタッチ、ファーストタッチ、線形、時間減衰など。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :paid   @A1 tabler/ad       "Paid"
icon :organic @A2 tabler/world     "Organic"
icon :social @A3 tabler/brand-x    "Social"
icon :visit  @C2 tabler/user       "Visit"
icon :conv   @D2 tabler/coin       "Convert"

paid    --> visit
organic --> visit
social  --> visit
visit   --> conv
```
