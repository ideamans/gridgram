# Security & auth

Authentication flows, trust boundaries, secret handling.

## OAuth 2 authorization code

The browser-assisted flow for third-party login. The client never
sees the resource owner's password.

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

## JWT verification

Tokens flow through the gateway. Downstream services trust the
token because the gateway verified it against the auth service.

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

## mTLS between services

Both sides present certificates. The mesh / sidecar rotates them
automatically so app code never sees them. The trust boundary is
made visible as a region.

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

## Zero trust network access

Every request is verified regardless of network origin. There's no
"inside" vs "outside" the firewall.

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
