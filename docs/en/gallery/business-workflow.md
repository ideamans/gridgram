# Business workflow

Approvals, document flows, tickets — processes that span people and
systems.

## Purchase approval chain

Three frames walk through each approval tier — hover and use ◀ / ▶
to compare. Frame 1 is a small request the manager auto-approves;
frame 2 escalates to finance; frame 3 pulls in exec sign-off for a
six-figure line item.

<Example name="frame-gallery-approval" framing="1-3" layout="single" />

## Invoice processing

From receipt to payment. The OCR step extracts line items; a human
reviews exceptions before the ERP posts the transaction.

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

## Support ticket lifecycle

Triage → assignment → resolution. The "escalated" branch routes to
a specialist queue when the first-tier agent can't resolve.

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

## Document approval

Draft → review → sign. Versioned at each transition; the "changes
requested" loop sends it back for revision.

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
