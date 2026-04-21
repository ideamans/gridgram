# Event-driven

Patterns where the unit of work is an event, not a function call.

## Pub/sub with regions and theming

Producers emit events via a central bus; consumers subscribe. The
emerald-teal theme plus a regioned fan-out makes the "one-to-many"
shape obvious at a glance.

```gg-diagram gallery
doc {
  cols: 4,
  theme: { primary: '#047857', secondary: '#0d9488', accent: '#f59e0b' },
}

region @A1:A1 "Producer" color=primary/28
region @B1:B1 "Bus"      color=accent/28
region @C1:D2 "Consumers" color=secondary/24

icon :pub  @A1 tabler/broadcast      "Pub"
icon :bus  @B1 tabler/arrows-shuffle "Bus"  sizeScale=1.4
icon :sub1 @C1 tabler/bell           "Email"
icon :sub2 @D1 tabler/device-mobile  "Push"
icon :sub3 @C2 tabler/file-text      "Log"
icon :sub4 @D2 tabler/database       "Warehouse"

pub --> bus "emit" width=2
bus --> sub1 dash="2 4"
bus --> sub2 dash="2 4"
bus --> sub3 dash="2 4"
bus --> sub4 dash="2 4"
```

## Event sourcing

State is a reduction over an append-only log. Compact, plain
styling here — no regions, no badges — lets the next page read as
"and now the complicated version."

```gg-diagram gallery
doc { cols: 4 }

icon :cmd   @A1 tabler/terminal   "Command"
icon :store @B1 tabler/database   "Event store" sizeScale=1.3
icon :proj  @C1 tabler/refresh    "Projector"
icon :view  @D1 tabler/eye        "Read model"

cmd   --> store "append"
store --> proj  "replay"
proj  --> view  "build"
```

## Retries and dead-letter queue

One unhealthy subscriber gradually drives the system toward its
dead-letter branch. Hover to scrub: frame 1 is the steady state,
frame 2 flags sub-2 red, frame 3 routes the failed message into
the DLQ with a retries note.

<Example name="frame-gallery-dlq" framing="1-3" layout="single" />

## Saga state machine

Compact linear flow with one compensating branch. Minimal
styling — a good compact finisher after the three richer ones.

```gg-diagram gallery
doc { cols: 4 }

icon :o @A1 tabler/shopping-cart "Order"
icon :p @B1 tabler/credit-card   "Pay"
icon :s @C1 tabler/truck-delivery "Ship"
icon :d @D1 tabler/check          "Done"

o --> p
p --> s
s --> d
p --> o "refund" dash="4 4"
```
