# API 設計

リクエストライフサイクル、ミドルウェア、バージョニング戦略。

## リクエストライフサイクル

ブラウザからハンドラまで、そして戻りまで。各ホップで認証・レート
リミット・ロギングなどが足されます — ハンドラがエンドポイントごとに
再実装すべきでないものです。

```gg-diagram gallery
doc { cols: 5 }

icon :client tabler/user       "Client"
icon :lb     tabler/equal      "LB"
icon :auth   tabler/lock       "Auth"
icon :rl     tabler/clock      "Rate limit"
icon :h      tabler/server     "Handler"

client --> lb
lb     --> auth
auth   --> rl
rl     --> h
```

## ミドルウェアチェーン

横断的関心事はチェーンとして合成されます。順序が重要 — 例えば
ユーザー単位のレートリミットは認証の後でなければなりません。

```gg-diagram gallery
doc { cols: 5 }

icon :req    tabler/message-circle "Request"
icon :log    tabler/file-text      "Log"
icon :authn  tabler/lock           "Authn"
icon :authz  tabler/shield-check   "Authz"
icon :h      tabler/server         "Handler"

req   --> log
log   --> authn
authn --> authz
authz --> h
```

## API バージョニング（パスベース）

複数バージョンが共存し、クライアントは 1 つにピン留めします。
古いバージョンは廃止期間ののちにフェードアウトします。

```gg-diagram gallery
doc { cols: 4 }

icon :client tabler/device-laptop "Client"
icon :v1     tabler/package       "/v1"
icon :v2     tabler/package       "/v2"
icon :core   tabler/server        "Core"

client --> v1 "legacy"
client --> v2 "current"
v1     --> core
v2     --> core
```

## GraphQL + リゾルバ

1 つのエンドポイントに多くのデータソース。各リゾルバは自身の
フィールドにとって最も自然なストアから取得します。

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :client  @A2 tabler/user         "Client"
icon :gql     @B2 tabler/api          "GraphQL"
icon :users   @D1 tabler/database     "Users DB"
icon :catalog @D2 tabler/database     "Catalog"
icon :search  @D3 tabler/search       "Search"

client --> gql "query"
gql    --> users   "user(id)"
gql    --> catalog "product(id)"
gql    --> search  "search(q)"
```
