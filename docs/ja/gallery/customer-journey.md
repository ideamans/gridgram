# カスタマージャーニー

ユーザーがプロダクトやブランドをたどる経路。色付きの帯で段階を
区切ると、一目でファネルのように読めます。

## AARRR（海賊指標）

獲得 → アクティベーション → リテンション → リファラル → 収益。
テーマを 1 つ上書きするだけで全体がブランドのオレンジに染まり、
各段階はアクセントの帯に収まります。

```gg-diagram gallery
doc {
  cols: 5,
  theme: { primary: '#b45309', secondary: '#d97706', accent: '#f59e0b' },
}

region @A1:A1 "Acquire"  color=primary/28
region @B1:B1 "Activate" color=primary/28
region @C1:C1 "Retain"   color=primary/28
region @D1:D1 "Refer"    color=primary/28
region @E1:E1 "Revenue"  color=accent/32

icon :acq  @A1 tabler/target       "Top-of-funnel"
icon :act  @B1 tabler/bolt         "First value"
icon :ret  @C1 tabler/refresh      "Habit"
icon :ref  @D1 tabler/share        "Refer"
icon :rev  @E1 tabler/coin         "Paid"   sizeScale=1.3

acq --> act "signup"
act --> ret "day-7"
ret --> ref "NPS ≥ 9"
ref --> rev "conv"

note @C2 (ret) "Cohort retention\nweek 4: 30%"
```

## EC の購入フロー

コンバージョンファネル。各ステップは独立したリージョンに配置し、
最終ステップ（発送）はサイズを大きくして「獲得」を強調します。

```gg-diagram gallery
doc { cols: 5 }

region @A1:A1 "Land"     color=secondary/24
region @B1:B1 "Browse"   color=secondary/24
region @C1:C1 "Cart"     color=primary/28
region @D1:D1 "Pay"      color=primary/28
region @E1:E1 "Ship"     color=accent/32

icon :land   @A1 tabler/world         "Landing"
icon :browse @B1 tabler/search        "Browse"
icon :cart   @C1 tabler/shopping-cart "Cart"
icon :pay    @D1 tabler/credit-card   "Pay"
icon :ship   @E1 tabler/truck-delivery "Ship" sizeScale=1.3

land   --> browse
browse --> cart
cart   --> pay
pay    --> ship

note @C2 (cart) "Abandon rate\n~68%"
```

## オンボーディングフロー

初回セットアップ。コンパクトな 5 ステップを 1 行に配置し、
ダッシュボードを到達すべきゴールとして強調します。

```gg-diagram gallery
doc { cols: 5 }

region @A1:B1 "Account"       color=primary/24
region @C1:D1 "Setup"         color=secondary/24
region @E1:E1 "Ready"         color=accent/32

icon :signup  @A1 tabler/user-plus       "Sign up"
icon :verify  @B1 tabler/mail-check      "Verify"
icon :profile @C1 tabler/user-circle     "Profile"
icon :connect @D1 tabler/plug            "Connect"
icon :dash    @E1 tabler/layout-dashboard "Dashboard" sizeScale=1.4

signup  --> verify
verify  --> profile
profile --> connect
connect --> dash
```

## サポートジャーニー

ユーザーは可能な限りセルフサービスで解決し、無理ならエスカレート
します。ドキュメントリージョンには色を付け ── ドキュメントを
読んでもらえばチケットを減らせます。

```gg-diagram gallery
doc { cols: 4 }

region @A1:A1 "User"  color=accent/24
region @B1:B1 "FAQ"   color=primary/24
region @C1:C1 "Ticket" color=secondary/24
region @D1:D1 "Agent" color=primary/28
region @B2:B2 "Docs"  color=accent/28

icon :user   @A1 tabler/user     "User"
icon :faq    @B1 tabler/book     "FAQ"
icon :ticket @C1 tabler/ticket   "Ticket"
icon :agent  @D1 tabler/headset  "Agent"
icon :docs   @B2 tabler/file-text "Docs" sizeScale=1.2

user   --> faq
faq    --> docs   "read"  dash="2 4"
faq    --> ticket "file"
ticket --> agent
```
