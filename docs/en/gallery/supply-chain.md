# Supply chain

Material moving from suppliers to end customers, with reverse flow
for returns. Regions group the upstream / production / downstream
bands; dashed lines mark the reverse path.

## Three-stage supply chain with returns

Upstream suppliers feed production; production pushes through
distribution to the customer; a dashed reverse arrow carries
returns back to the DC. Note calls out lead time.

```gg-diagram gallery
doc { cols: 6, rows: 3, theme: { primary: '#1e3a5f', accent: '#e8792f' } }

region @A1:B3 "Upstream"   color=primary/14
region @E1:F3 "Downstream" color=accent/14

icon :sup1 @A1 tabler/building-factory   "Supplier A"
icon :sup2 @A3 tabler/building-factory   "Supplier B"
icon :wh   @B2 tabler/building-warehouse "Raw WH"
icon :prod @C2 tabler/hammer             "Production"  sizeScale=1.3
icon :qa   @D2 tabler/clipboard-check    "QA"
icon :dc   @E2 tabler/building-warehouse "DC"
icon :cust @F2 tabler/user               "Customer"

sup1 --> wh
sup2 --> wh
wh   --> prod
prod --> qa
qa   --> dc
dc   --> cust
cust --> dc "returns" dash="4 4"

note @C1 (prod) "Lead time\n14 days"
```

## Multi-tier suppliers

Tier-2 suppliers feed Tier-1 assemblers, who feed the OEM. Visual
tiers make the dependency depth obvious at a glance.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

region @A1:A3 "Tier 2" color=secondary/14
region @B1:B3 "Tier 1" color=primary/14

icon :t2a @A1 tabler/building-factory "raw mat"
icon :t2b @A2 tabler/building-factory "components"
icon :t2c @A3 tabler/building-factory "packaging"
icon :t1a @B1 tabler/building-factory "assembly"
icon :t1b @B2 tabler/building-factory "assembly"
icon :oem @C2 tabler/building-factory "OEM" sizeScale=1.3
icon :ship @D2 tabler/truck-delivery "Ship"

t2a --> t1a
t2b --> t1a
t2b --> t1b
t2c --> t1b
t1a --> oem
t1b --> oem
oem --> ship
```

## Inventory flow: receive → store → pick

The minimal loop any DC runs. Barcode / QR scans drive every
transition; mismatches route to an exception bin.

```gg-diagram gallery
doc { cols: 5 }

icon :recv  tabler/truck-loading   "Receive"
icon :scan  tabler/barcode         "Scan"
icon :store tabler/stack-2         "Store"
icon :pick  tabler/package         "Pick"
icon :ship  tabler/truck-delivery  "Ship"

recv  --> scan
scan  --> store "match"
scan  --> pick  "mismatch" dash="4 4" color=accent
store --> pick
pick  --> ship
```

## Reverse logistics

Returns flow back through inspection, then branch to refurbish or
recycle. Hover the diagram and scrub — frame 1 is intake and
inspection, frame 2 takes the serviceable-refurb branch, frame 3
takes the damaged-recycle branch.

```gg-diagram gallery framing=1-3
doc { cols: 5, rows: 3 }

icon :cust    @A2 tabler/user               "Customer"
icon :intake  @B2 tabler/truck-return       "Intake"
icon :insp    @C2 tabler/clipboard-list     "Inspect"
icon :refurb  @D1 tabler/tools              "Refurb"
icon :recycle @D3 tabler/recycle            "Recycle"
icon :wh      @E2 tabler/building-warehouse "WH"

cust   --> intake
intake --> insp

# Frame 1: intake + inspection are the active stations.
[1] icon :intake color=accent
[1] icon :insp   color=accent
[1] note @C1 (insp) "Within 30 days\nof purchase"

# Frame 2: serviceable — refurbished back to stock.
[2] insp   --> refurb "serviceable"
[2] refurb --> wh
[2] icon :refurb color=accent { badges: ['check'] }

# Frame 3: damaged — recycled, raw materials returned.
[3] insp    --> recycle "damaged" dash="4 4"
[3] recycle --> wh      "raw"     dash="2 4"
[3] icon :recycle color=#dc2626 { badges: ['alert'] }
```
