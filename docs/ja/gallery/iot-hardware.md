# IoT / ハードウェア

センサネットワーク、エッジコンピューティング、デバイス制御ループ。

## センサ → ゲートウェイ → クラウド

定番の IoT パイプラインです。リソース制約のあるデバイスがローカル
ゲートウェイ経由でクラウドバックエンドへデータを送り、そこで
保管と分析が行われます。

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

## ロボットの制御ループ

センス → プラン → アクト、毎ティック繰り返します。プランの
ステップは ML モデルが入り得る場所で、他は決定的です。

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

## スマートホームのトポロジ

ローカルネットワーク上のハブ & スポーク構成です。ハブがクラウドへ
橋渡しすることで、遠隔操作や音声アシスタントへの接続が可能に
なります。

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

## エッジ + クラウドの推論

低レイテンシが求められる推論はエッジで実行し、集約分析は
クラウドへ送ります。モデルはクラウドで再学習し、定期的に
エッジへプッシュバックします。

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
