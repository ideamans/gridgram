# Delivery

Parcel and freight flows between hubs and final destinations.

## Hub-and-spoke

Parcels consolidate at regional hubs, move between hubs by trunk,
then fan out to local delivery. Common for national postal /
logistics networks.

```gg-diagram gallery
doc { cols: 5, rows: 3 }

region @A1:A3 "Regional" color=primary/14
region @E1:E3 "Regional" color=primary/14

icon :sw @A1 tabler/building "SW depot"
icon :sc @A2 tabler/building "SC depot"
icon :se @A3 tabler/building "SE depot"
icon :hub1 @B2 tabler/building-warehouse "Hub W"
icon :hub2 @D2 tabler/building-warehouse "Hub E"
icon :ne @E1 tabler/building "NE depot"
icon :nc @E2 tabler/building "NC depot"
icon :nw @E3 tabler/building "NW depot"

sw --> hub1
sc --> hub1
se --> hub1
hub1 --> hub2  "trunk" width=3
hub2 --> ne
hub2 --> nc
hub2 --> nw
```

## Last-mile with returns

A local depot dispatches drivers to customers. Failed deliveries
and returns loop back via a dashed path.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :depot @A2 tabler/building-warehouse "Depot"
icon :drv   @B2 tabler/truck-delivery     "Driver"
icon :cust1 @D1 tabler/user "Customer 1"
icon :cust2 @D2 tabler/user "Customer 2"
icon :cust3 @D3 tabler/user "Customer 3"

depot --> drv "load"
drv   --> cust1
drv   --> cust2
drv   --> cust3
cust2 --> depot "returned" dash="4 4" color=accent
```

## Route optimisation (before → after)

Naive sequential route vs optimised. Note calls out the savings.

```gg-diagram gallery
doc { cols: 5, rows: 3 }

icon :a1 @A1 tabler/map-pin "A"
icon :b1 @B1 tabler/map-pin "B"
icon :c1 @C1 tabler/map-pin "C"
icon :d1 @D1 tabler/map-pin "D"
icon :e1 @E1 tabler/map-pin "E"

a1 --> b1
b1 --> c1
c1 --> d1
d1 --> e1

icon :a2 @A3 tabler/map-pin "A"
icon :c2 @B3 tabler/map-pin "C"
icon :e2 @C3 tabler/map-pin "E"
icon :d2 @D3 tabler/map-pin "D"
icon :b2 @E3 tabler/map-pin "B"

a2 --> c2
c2 --> e2
e2 --> d2
d2 --> b2

note @C2 "Optimised saves\n18% distance"
```

## Package tracking states

A parcel's lifecycle as a state machine. Each transition is an
event captured by the tracking API.

```gg-diagram gallery
doc { cols: 5 }

icon :created tabler/package         "Created"
icon :transit tabler/truck           "Transit"
icon :out     tabler/truck-delivery  "Out"
icon :deliv   tabler/home            "Delivered"
icon :failed  tabler/alert-triangle  "Failed"

created --> transit
transit --> out
out     --> deliv
out     --> failed "no recipient" dash="4 4" color=accent
failed  --> out    "retry"
```
