# Manufacturing

Production lines, quality gates, and continuous-improvement loops.
Badges mark pass/fail decisions; regions partition the plant floor.

## Production line with quality gate

Four stages feed a QA gate before packaging. Failed units loop
back to rework. Badge marks the stage that most often catches
defects.

```gg-diagram gallery
doc { cols: 5, rows: 2 }

icon :raw  @A1 tabler/box                    "Raw"
icon :cut  @B1 tabler/scissors               "Cut"
icon :weld @C1 tabler/bolt                   "Weld"
icon :qa   @D1 tabler/clipboard-check        "QA" { badges: ['star'] }
icon :pack @E1 tabler/package                "Pack"
icon :re   @C2 tabler/refresh                "Rework"

raw  --> cut
cut  --> weld
weld --> qa
qa   --> pack "pass"
qa   --> re   "fail" dash="4 4" color=accent
re   --> weld
```

## Plant floor zones

Raw material storage / fab / assembly / shipping as rectangular
regions. The MES (manufacturing execution system) sits outside the
line and talks to every zone.

```gg-diagram gallery
doc { cols: 5, rows: 2 }

region @A1:A2 "Raw"      color=secondary/14
region @B1:C2 "Fab"      color=primary/14
region @D1:D2 "Assembly" color=accent/14
region @E1:E2 "Ship"     color=primary/14

icon :wh    @A2 tabler/building-warehouse "WH"
icon :cnc   @B2 tabler/tools              "CNC"
icon :paint @C2 tabler/brush              "Paint"
icon :asm   @D2 tabler/hammer             "Assemble"
icon :out   @E2 tabler/truck-delivery     "Out"
icon :mes   @C1 tabler/device-desktop     "MES" sizeScale=1.2

wh    --> cnc
cnc   --> paint
paint --> asm
asm   --> out

mes --> cnc   "plan" dash="2 4"
mes --> paint "plan" dash="2 4"
mes --> asm   "plan" dash="2 4"
```

## Kaizen improvement cycle

The PDCA loop. Each cycle picks up metrics from the previous one;
small improvements compound over quarters.

```gg-diagram gallery
doc { cols: 4 }

icon :plan  tabler/pencil       "Plan"
icon :do    tabler/hammer       "Do"
icon :check tabler/clipboard-check "Check"
icon :act   tabler/check        "Act"

plan  --> do
do    --> check
check --> act
act   --> plan "next" dash="4 4"

note @A2 (plan) "1 week\ncadence"
```

## OEE dashboard inputs

Overall Equipment Effectiveness aggregates availability, performance,
and quality. Each machine feeds its own metrics; the dashboard
rolls them up.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :m1 @A1 tabler/tools   "Machine 1"
icon :m2 @A2 tabler/tools   "Machine 2"
icon :m3 @A3 tabler/tools   "Machine 3"
icon :avail @C1 tabler/clock       "Availability"
icon :perf  @C2 tabler/chart-line  "Performance"
icon :qual  @C3 tabler/star        "Quality"
icon :oee   @D2 tabler/chart-bar   "OEE" sizeScale=1.3

m1 --> avail
m2 --> perf
m3 --> qual
avail --> oee
perf  --> oee
qual  --> oee
```
