# セキュリティ & 認証

認証フロー、信頼境界、シークレットの取り扱い。

## OAuth 2 認可コードフロー

サードパーティログイン用のブラウザ経由のフローです。クライアントが
リソースオーナーのパスワードを見ることは決してありません。

```gg-diagram gallery
doc { cols: 4 }

icon :user     tabler/user          "User"
icon :client   tabler/device-laptop "Client"
icon :auth     tabler/lock          "Authz"
icon :api      tabler/server        "API"

user   --> client "creds"
client <-> auth   "OAuth2"
client --> api    "+token"
```

## JWT 検証

トークンがゲートウェイを通過します。ゲートウェイが認証サービスで
検証してくれるので、下流サービスはそのトークンを信頼できます。

```gg-diagram gallery
icon :client tabler/user-circle "Client"
icon :gw     tabler/api         "Gateway"
icon :authn  tabler/key         "Authn"
icon :svc    tabler/server      "Service"

client --> gw    "JWT"
gw     --> authn "verify"
authn  --> gw    "claims"
gw     --> svc   "+ claims"
```

## サービス間の mTLS

双方が証明書を提示します。メッシュ / サイドカーが自動で
ローテートするので、アプリコードは証明書を一切扱いません。
信頼境界はリージョンとして可視化されます。

```gg-diagram gallery
doc { cols: 4 }

region @A1:D1 "Trust boundary (mesh)" color=primary/14

icon :a    tabler/server        "service A"
icon :certa tabler/certificate  "cert"
icon :certb tabler/certificate  "cert"
icon :b    tabler/server        "service B"

a     --> certa
certa --> certb "mTLS" width=2
certb --> b
```

## ゼロトラストネットワークアクセス

ネットワーク上のどこから来たかによらず、すべてのリクエストが
検証されます。ファイアウォールの「内側」と「外側」という区別は
ありません。

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :user   @A1 tabler/user        "User"
icon :policy @B1 tabler/shield-check "Policy"
icon :trust  @C1 tabler/lock         "Trust"
icon :app    @D1 tabler/server       "App"
icon :device @A2 tabler/device-laptop "Device"
icon :ident  @B2 tabler/fingerprint "Identity"

user   --> policy
device --> ident
ident  --> policy
policy --> trust
trust  --> app
```
