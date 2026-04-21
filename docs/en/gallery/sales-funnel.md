# Sales funnel

Prospect-to-customer flows and conversion stages.

## Classic marketing funnel

Awareness → interest → consideration → purchase. Each stage loses
users; the widths of the real funnel reflect conversion rates.

```gg-diagram gallery
doc { cols: 5 }

icon :aware    tabler/eye          "Aware"
icon :interest tabler/heart        "Interest"
icon :consider tabler/scale        "Consider"
icon :buy      tabler/credit-card  "Buy"
icon :loyal    tabler/star         "Loyal"

aware    --> interest
interest --> consider
consider --> buy
buy      --> loyal
```

## B2B sales pipeline

From lead qualification through contract. Each stage has its own
playbook; gates prevent premature promotion.

```gg-diagram gallery
doc { cols: 5 }

icon :lead   tabler/user-plus       "Lead"
icon :qual   tabler/filter          "Qualify"
icon :demo   tabler/presentation    "Demo"
icon :pilot  tabler/flask           "Pilot"
icon :close  tabler/signature       "Close"

lead --> qual
qual --> demo
demo --> pilot
pilot --> close
```

## Customer segmentation

Leads route to different playbooks based on company size. Each
segment has its own sales motion.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :leads @A2 tabler/users           "Leads"
icon :smb   @C1 tabler/building-store  "SMB"
icon :mid   @C2 tabler/building        "Mid-market"
icon :ent   @C3 tabler/building-skyscraper "Enterprise"
icon :close @D2 tabler/signature       "Close"

leads --> smb
leads --> mid
leads --> ent
smb --> close
mid --> close
ent --> close
```

## Campaign attribution

Multiple channels lead to the same conversion. Attribution models
decide which channel "gets credit" — last-touch, first-touch,
linear, time-decay.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :paid   @A1 tabler/ad       "Paid"
icon :organic @A2 tabler/world     "Organic"
icon :social @A3 tabler/brand-x    "Social"
icon :visit  @C2 tabler/user       "Visit"
icon :conv   @D2 tabler/coin       "Convert"

paid    --> visit
organic --> visit
social  --> visit
visit   --> conv
```
