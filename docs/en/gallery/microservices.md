# Microservices

Decomposition patterns for modern service architectures. Size and
colour communicate which node bears the most load / coordination.

## API gateway with downstream services

One gateway sits in front of many services. It's given a dramatic
`sizeScale=1.6` so the "fan-in / fan-out" hierarchy reads at a
glance.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

region @A1:B2 "Edge"     color=accent/28
region @C1:D2 "Services" color=primary/24

icon :client  @A1 tabler/device-laptop "Client"
icon :gw      @A2 tabler/api           "Gateway" sizeScale=1.6
icon :users   @C1 tabler/users         "Users"   { badges: ['check'] }
icon :orders  @D1 tabler/shopping-cart "Orders"  { badges: ['check'] }
icon :notify  @C2 tabler/bell          "Notify"  { badges: ['alert'] }
icon :billing @D2 tabler/credit-card   "Billing" { badges: ['check'] }

client --> gw
gw --> users
gw --> orders
gw --> notify  dash="2 4"
gw --> billing
```

## Service-to-service via queue

Producers keep going if consumers are slow. Badges show the
health-check status of each service; the dashed arrow marks the
async hop.

```gg-diagram gallery
doc { cols: 4 }

icon :orders   @A1 tabler/shopping-cart  "Orders"       { badges: ['check'] }
icon :queue    @B1 tabler/inbox          "Queue"        sizeScale=1.3
icon :fulfill  @C1 tabler/truck-delivery "Fulfill"      { badges: ['check'] }
icon :notify   @D1 tabler/bell           "Notify"       { badges: ['alert'] }

orders  --> queue   "enqueue" width=2
queue   --> fulfill "consume"
queue   --> notify  "consume" dash="4 4"

note @B2 (notify) "Lagging —\ninvestigate"
```

## Saga: distributed transaction

A three-step saga. The compensating refund path is dashed to
distinguish it from the forward flow.

```gg-diagram gallery
doc { cols: 4 }

region @A1:D1 "Forward path" color=primary/24

icon :order   @A1 tabler/shopping-cart "Order"
icon :payment @B1 tabler/credit-card   "Pay"
icon :ship    @C1 tabler/truck-delivery "Ship"
icon :done    @D1 tabler/check         "Done"

order   --> payment "charge"
payment --> ship    "fulfill"
ship    --> done    "confirm"
payment --> order   "refund"  dash="4 4" color=accent

note @B2 (payment) "Compensation\nundoes the charge"
```

## Service mesh sidecar pattern

Every app pod gets a sidecar proxy. The mesh layer owns mTLS,
retries, and telemetry uniformly across languages.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

region @A1:D1 "App containers" color=primary/24
region @A2:D2 "Mesh sidecars"  color=secondary/24

icon :app1 @A1 tabler/server "app-1"
icon :app2 @B1 tabler/server "app-2"
icon :app3 @C1 tabler/server "app-3"
icon :app4 @D1 tabler/server "app-4"
icon :sc1  @A2 tabler/shield "proxy"
icon :sc2  @B2 tabler/shield "proxy"
icon :sc3  @C2 tabler/shield "proxy"
icon :sc4  @D2 tabler/shield "proxy"

app1 --> sc1
app2 --> sc2
app3 --> sc3
app4 --> sc4
sc1  --> sc2 "mTLS" width=2
sc3  --> sc4 "mTLS" width=2
```
