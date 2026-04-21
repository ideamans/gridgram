# Gallery

Collected `.gg` diagrams organised by application domain. Every
example is a live render — each fenced `gg-diagram` block below is
parsed, resolved, and drawn at build time.

The goal is to show the range: Gridgram's DSL works well beyond the
"boxes and arrows in a cloud architecture" case it was originally
sketched for. Examples collectively exercise every feature —
regions, notes, badges, dashed lines, theme overrides, waypoints,
`sizeScale`, `labelScale` — so the category read-through doubles as
a feature tour.

## Domains

### Technology & engineering
- **[Infrastructure](./infrastructure)** — cloud topology, zones, failover
- **[Microservices](./microservices)** — service mesh, API gateway, saga
- **[Software architecture](./software-architecture)** — layered, hexagonal, plugin
- **[Database](./database)** — replicas, shards, CDC, caching
- **[API design](./api-design)** — request lifecycle, versioning, middleware
- **[Event-driven](./event-driven)** — pub/sub, event sourcing, CQRS
- **[CI / CD](./ci-cd)** — build pipelines, multi-env, feature previews
- **[Testing](./testing)** — test pyramid, matrix, environments
- **[Release & roadmap](./release-roadmap)** — rollout, deprecation, train
- **[Security & auth](./security-auth)** — OAuth2, mTLS, zero trust
- **[AI / ML](./ai-ml)** — training, RAG, agent topology, serving
- **[Data pipelines](./data-pipelines)** — ETL, streaming, lambda, warehouse
- **[IoT / hardware](./iot-hardware)** — sensors, gateways, edge inference

### Business & people
- **[Business workflow](./business-workflow)** — approvals, invoices, tickets
- **[Customer journey](./customer-journey)** — AARRR, onboarding, support
- **[Org chart](./org-chart)** — reporting, matrix, squads
- **[Project planning](./project-planning)** — dependencies, sprint, milestones
- **[Sales funnel](./sales-funnel)** — pirate metrics, B2B stages, segmentation

### Operations & logistics
- **[Supply chain](./supply-chain)** — upstream / production / downstream, returns
- **[Warehouse](./warehouse)** — zone layout, pick-and-pack route
- **[Manufacturing](./manufacturing)** — line stages, quality gates
- **[Delivery](./delivery)** — hub-and-spoke, last mile, returns

### Knowledge & communication
- **[Education](./education)** — concept maps, biology, history
- **[Knowledge graph](./knowledge-graph)** — taxonomy, ontology, relations

## How the gallery is rendered

Each page uses the **`gg-diagram`** fenced code block. The
`docs/.vitepress/plugins/gg-diagram.ts` plugin parses every fence
at build time and inlines the resulting SVG, so the gallery never
ships raw `.gg` text to the browser — you see the rendered diagram
directly.

Only Tabler built-ins and inline raw SVG are available in this
mode; `@alias/` paths, URLs, and file references are skipped
(they'd need the async loader that markdown-it can't await). If
you want those in a custom page, add an `examples/<name>/` entry
and use the `<Example>` component instead.
