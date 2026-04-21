# 業務フロー

承認、書類のやり取り、チケット ── 人とシステムをまたぐプロセス。

## 購入承認フロー

金額に応じた承認ルーティング。少額購入はマネージャー承認で通過、
大きな金額はエスカレーションされます。リージョンで承認階層を
グルーピングし、ノートで SLA を示します。

```gg-diagram gallery
doc { cols: 5, rows: 2 }

region @B1:B2 "Line"       color=primary/14
region @C1:D2 "Finance gate" color=accent/14

icon :req  @A1 tabler/user          "Requester"
icon :mgr  @B1 tabler/user-check    "Manager"
icon :fin  @C1 tabler/building-bank "Finance"
icon :exec @D1 tabler/briefcase     "Exec"
icon :buy  @E1 tabler/shopping-cart "Buy"

req  --> mgr  "submit"
mgr  --> buy  "< $1k"
mgr  --> fin  ">= $1k"
fin  --> exec ">= $10k"
exec --> buy
fin  --> buy

note @C2 (fin) "Finance SLA:\n2 biz days"
```

## 請求書処理

受領から支払いまで。OCR 工程で明細を抽出し、例外は人がレビューして
から ERP が取引を計上します。

```gg-diagram gallery
doc { cols: 5 }

icon :inv    tabler/file-invoice "Invoice"
icon :ocr    tabler/scan         "OCR"
icon :review tabler/eye          "Review"
icon :erp    tabler/database     "ERP"
icon :pay    tabler/credit-card  "Pay"

inv    --> ocr
ocr    --> review
review --> erp
erp    --> pay
```

## サポートチケットのライフサイクル

トリアージ → 割り当て → 解決。一次担当で解決できない場合は
「エスカレーション」分岐で専門キューへ回ります。

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :cust  @A1 tabler/user           "Customer"
icon :ti    @B1 tabler/ticket         "Ticket"
icon :tri   @C1 tabler/filter         "Triage"
icon :t1    @D1 tabler/headset        "Tier 1"
icon :t2    @D2 tabler/headset        "Tier 2"

cust --> ti
ti   --> tri
tri  --> t1
tri  --> t2   "escalate"
```

## ドキュメント承認

ドラフト → レビュー → 署名。遷移ごとにバージョン管理され、
「変更依頼」のループで修正のために差し戻されます。

```gg-diagram gallery
doc { cols: 4 }

icon :draft   tabler/pencil          "Draft"
icon :review  tabler/eye             "Review"
icon :revise  tabler/arrow-back      "Revise"
icon :sign    tabler/signature       "Sign"

draft  --> review
review --> sign   "approve"
review --> revise "changes"
revise --> draft dash="4 4"
```
