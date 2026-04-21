# IoT / hardware

Sensor networks, edge computing, device control loops.

## Sensor → gateway → cloud

Classic IoT pipeline. Constrained devices ship data via a local
gateway to a cloud backend that handles storage and analytics.

```gg-diagram gallery
doc { cols: 4 }

icon :sens tabler/temperature "Sensor"
icon :gw   tabler/router      "Gateway"
icon :cld  tabler/cloud       "Cloud"
icon :dash tabler/chart-dots  "Dashboard"

sens --> gw   "Bluetooth"
gw   --> cld  "MQTT"
cld  --> dash
```

## Robotic control loop

Sense → plan → act, repeated every tick. The planning step is
where an ML model might sit; the rest is deterministic.

```gg-diagram gallery
doc { cols: 4 }

icon :world  tabler/leaf     "Environment"
icon :sense  tabler/camera   "Sense"
icon :plan   tabler/brain    "Plan"
icon :act    tabler/engine   "Actuate"

world --> sense
sense --> plan
plan  --> act
act   --> world  "effect"
```

## Smart home topology

Hub-and-spoke over the local network. The hub bridges to the cloud
for off-site control and voice assistants.

```gg-diagram gallery
doc { cols: 3, rows: 3 }

icon :hub    @B2 tabler/home-bolt  "Hub" sizeScale=1.3
icon :lights @A1 tabler/bulb       "Lights"
icon :lock   @C1 tabler/lock       "Lock"
icon :cam    @A3 tabler/camera     "Camera"
icon :therm  @C3 tabler/temperature "Thermo"

hub <-> lights
hub <-> lock
hub <-> cam
hub <-> therm
```

## Edge + cloud inference

Latency-critical inference runs at the edge; aggregate analytics go
to the cloud. Models retrained in the cloud and pushed back to the
edge on a schedule.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :sens   @A2 tabler/camera      "Camera"
icon :edge   @B2 tabler/device-tv   "Edge"
icon :cloud  @D2 tabler/cloud       "Cloud"
icon :model  @D1 tabler/brain       "Retrain"

sens   --> edge "stream"
edge   --> cloud "metrics"
cloud  --> model "new data"
model  --> edge  "deploy"
```
