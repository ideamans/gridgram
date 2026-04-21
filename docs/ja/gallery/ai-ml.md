# AI / ML

モデル学習、検索拡張生成、エージェントループ、サービング
トポロジ。紫のテーマが ML 領域を示し、中央のエージェント / モデルが
派手な sizeScale を持ちます。

## 学習パイプライン

データ → 特徴 → 学習 → 評価 → レジストリ。テーマ上書きで
パイプライン全体を領域に相応しいパレットに寄せ、学習ステージが
視覚的な重みを担います。

<Example name="frame-gallery-training-gate" framing="1-3" layout="single" />

## RAG: 検索拡張生成

モデルの回答はベクトルストアから取得したドキュメントに
基づきます。LLM を中央に置いて重みを担わせ、ストア / ドキュメントは
リージョンとしてそこへフィードします。

```gg-diagram gallery
doc {
  cols: 4, rows: 2,
  theme: { primary: '#6d28d9', accent: '#db2777' },
}

region @B1:C2 "Retrieve" color=primary/24

icon :q     @A1 tabler/search   "Query"
icon :embed @B1 tabler/brain    "Embed"
icon :vec   @C1 tabler/database "Vector DB" sizeScale=1.2
icon :docs  @C2 tabler/files    "Docs"
icon :llm   @D1 tabler/sparkles "LLM" sizeScale=1.6
icon :ans   @D2 tabler/message  "Answer"

q     --> embed
embed --> vec
vec   --> docs  "top-k"
docs  --> llm   "context" width=2
llm   --> ans
```

## エージェント + ツール（MCP 風）

中央に巨大なエージェント、その周りにコンパクトなツール衛星を
配します。サイズの差で「オーケストレータ vs 能力」の関係が
はっきり読み取れます。

```gg-diagram gallery
doc {
  cols: 3, rows: 3,
  theme: { primary: '#6d28d9', accent: '#db2777' },
}

icon :user  @A2 tabler/user    "User"
icon :agent @B2 tabler/robot   "Agent" sizeScale=2.0
icon :t1    @C1 tabler/search  "Search"
icon :t2    @C2 tabler/code    "Code"
icon :t3    @C3 tabler/database "DB"

user  --> agent
agent <-> t1  "call"
agent <-> t2  "call"
agent <-> t3  "call"
```

## キャッシュ付きオンラインサービング

キャッシュの前段に推論サービスを置きます。コールドなクエリは
モデルまで落ち、結果はキャッシュへ書き戻されます。

```gg-diagram gallery
doc {
  cols: 4,
  theme: { primary: '#6d28d9', accent: '#db2777' },
}

region @A1:A1 "Client"  color=accent/24
region @B1:C1 "Serve"   color=primary/24
region @D1:D1 "Response" color=accent/32

icon :req   @A1 tabler/device-mobile "Request"
icon :cache @B1 tabler/bolt          "Cache"
icon :model @C1 tabler/brain         "Model" sizeScale=1.4
icon :resp  @D1 tabler/check         "Response"

req   --> cache
cache --> resp  "hit"  width=2
cache --> model "miss" dash="2 4"
model --> cache "store" dash="2 4"
model --> resp
```
