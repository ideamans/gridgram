# API design

Request lifecycles, middleware, versioning strategies.

## Request lifecycle

From the browser to the handler and back. Each hop adds something
(auth, rate limit, logging) that a handler shouldn't re-implement
per endpoint.

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

## Middleware chain

Cross-cutting concerns compose as a chain. Order matters — e.g.
rate-limiting must come after auth when the limit is per-user.

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

## API versioning (path-based)

Multiple versions coexist; clients pin to one. Old versions fade
out after a deprecation window.

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

## GraphQL + resolvers

One endpoint, many data sources. Each resolver pulls from the
store most natural for its field.

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
