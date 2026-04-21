# Warehouse

Physical zone layouts and pick routes. Regions carve out the
functional areas; waypoints thread pick paths around the shelves.

## Warehouse zones

Receiving / storage / picking / shipping laid out in a grid, each
in its own coloured region. The diagram doubles as a map.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

region @A1:A3 "Receive"  color=primary/14
region @B1:C2 "Storage"  color=secondary/14
region @B3:C3 "Picking"  color=accent/14
region @D1:D3 "Ship"     color=primary/14

icon :dock1 @A1 tabler/truck-loading "Dock 1"
icon :dock2 @A3 tabler/truck-loading "Dock 2"
icon :a1   @B1 tabler/stack-2  "Aisle A"
icon :a2   @C1 tabler/stack-2  "Aisle B"
icon :a3   @B2 tabler/stack-2  "Aisle C"
icon :a4   @C2 tabler/stack-2  "Aisle D"
icon :pick1 @B3 tabler/package "Pick 1"
icon :pick2 @C3 tabler/package "Pick 2"
icon :out1 @D1 tabler/truck-delivery "Out 1"
icon :out2 @D3 tabler/truck-delivery "Out 2"
```

## Pick path with waypoints

A single pick tour visits four aisles on a fixed route. Waypoints
force the path instead of letting the router pick shortcuts.

```gg-diagram gallery
doc { cols: 5, rows: 4 }

icon :start @A1 tabler/map-pin "Start"
icon :a1 @B1 tabler/stack-2 "A1"
icon :b1 @C1 tabler/stack-2 "B1"
icon :a3 @B3 tabler/stack-2 "A3"
icon :b3 @C3 tabler/stack-2 "B3"
icon :ship @E4 tabler/truck-delivery "Ship"

start --> ship "route" {
  waypoints: [
    { col: 2, row: 1 }, { col: 3, row: 1 },
    { col: 3, row: 3 }, { col: 2, row: 3 },
    { col: 5, row: 3 },
  ]
}
```

## Pick-and-pack flow

Orders land; WMS breaks them into picks; a packer consolidates
each order before it leaves. Note calls out the target throughput.

```gg-diagram gallery
doc { cols: 5 }

icon :order  tabler/shopping-cart "Orders"
icon :wms    tabler/device-desktop "WMS"
icon :picker tabler/user-check     "Picker"
icon :pack   tabler/package        "Pack"
icon :out    tabler/truck-delivery "Out"

order  --> wms
wms    --> picker "drop"
picker --> pack
pack   --> out
```

## Cycle count & audit

A scheduled inventory audit runs in the background. Discrepancies
branch off to investigation; the audit log feeds both compliance
and a continuous-improvement loop.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :sched  @A2 tabler/calendar         "Schedule"
icon :count  @B2 tabler/barcode          "Count"
icon :match  @C2 tabler/equal            "Match"
icon :invest @D1 tabler/search           "Investigate"
icon :log    @D3 tabler/clipboard-list   "Log"

sched  --> count
count  --> match
match  --> log
match  --> invest "delta > 2%" dash="4 4" color=accent
invest --> log
```
