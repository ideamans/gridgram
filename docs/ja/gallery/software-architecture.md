# ソフトウェアアーキテクチャ

レイヤリング、境界、そして依存の向き。

## レイヤード（n 層）

プレゼンテーション → アプリケーション → ドメイン → インフラ。
各層は直下の層だけを知っています。

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

## ヘキサゴナル（ポート & アダプタ）

ドメインを中心に据えます。外側のすべて — HTTP・DB・キュー — は
ドメインのポートに差し替え可能なアダプタです。

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

## クリーンアーキテクチャ

依存の矢印がすべて内向き。フレームワークは詳細であり、
エンティティはその存在を知りません。

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

## プラグインアーキテクチャ

ホストアプリケーションがランタイムでプラグインをロードします。
各プラグインはホストのインターフェースを実装し、ホスト側のコードを
触らずに機能を追加します。

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
