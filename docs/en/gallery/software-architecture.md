# Software architecture

Layering, boundaries, and dependency direction.

## Layered (n-tier)

Presentation → application → domain → infrastructure. Each layer
only knows the one below.

```gg-diagram gallery
doc { cols: 4 }

icon :ui     @A1 tabler/user-circle "UI"
icon :app    @B1 tabler/server      "App"
icon :domain @C1 tabler/atom        "Domain"
icon :infra  @D1 tabler/database    "Infra"

ui     --> app
app    --> domain
domain --> infra
```

## Hexagonal (ports & adapters)

The domain sits at the centre. Everything outside — HTTP, DB,
queues — is an adapter pluggable via the domain's ports.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :http  @A2 tabler/world    "HTTP"
icon :cli   @B1 tabler/terminal "CLI"
icon :core  @C2 tabler/atom     "Domain" sizeScale=1.3
icon :db    @D2 tabler/database "DB"
icon :queue @D3 tabler/inbox    "Queue"

http  --> core
cli   --> core
core  <-> db
core  --> queue
```

## Clean architecture

Dependency arrows all point inwards. The framework is a detail;
entities don't know it exists.

```gg-diagram gallery
doc { cols: 4 }

icon :fw   @A1 tabler/package      "Framework"
icon :ctrl @B1 tabler/settings     "Controller"
icon :uc   @C1 tabler/refresh      "Use case"
icon :ent  @D1 tabler/atom         "Entity"

fw   --> ctrl
ctrl --> uc
uc   --> ent
```

## Plugin architecture

A host application loads plugins at runtime. Each plugin implements
the host's interface and contributes behaviour without touching the
host's code.

```gg-diagram gallery
doc { cols: 3, rows: 3 }

icon :host @A2 tabler/box    "Host" sizeScale=1.5
icon :p1   @C1 tabler/puzzle "Plugin A"
icon :p2   @C2 tabler/puzzle "Plugin B"
icon :p3   @C3 tabler/puzzle "Plugin C"

host <-> p1
host <-> p2
host <-> p3
```
