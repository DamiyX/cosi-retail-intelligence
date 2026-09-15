# M3 Sales — Reviewable Planning Gate

**Status:** Approved planning source; D-036 and D-037 approved by the founder  
**Prepared:** 2026-09-14

## Outcome

M3 will let a retailer build and complete a sale in airplane mode, immediately
see the inventory effect and sale history, restart the app, and still find the
same completed transaction. The sale aggregate and its outbox envelope commit
once or not at all.

## Source Contracts

- `BUILD_PLAN.md` M3 and `PRD_MVP.md` section 11 define the sale journey and
  offline acceptance.
- `DOMAIN_DATA_MODEL.md` sections 7, 10, 17, 19, and 21 define Sale, SaleItem,
  Payment, InventoryEvent, immutability, invariants, and snapshots.
- `OFFLINE_SYNC.md` sections 7–8 require one atomic local aggregate operation
  and one `COMPLETED_SALE_CREATED` outbox envelope.
- D-013 preserves concurrent real offline sales even when stock becomes
  negative. D-034 supplies exact fixed-scale quantities.
- D-036 and D-037 resolve the remaining arithmetic, credit, draft, and
  correction semantics.

## Approved Sell Experience

1. **Find items:** Sell opens with offline catalogue search and browse. Barcode
   and recognition remain later scanner milestones. No match links to Quick Add
   and returns the new product to the sale.
2. **Configure a line:** choose an active sellable package, enter positive exact
   quantity, accept or change its package selling price, and optionally enter an
   absolute discount. Show the line total before adding.
3. **Review cart:** show every line, quantity/package, unit price, discount, and
   total. Lines can be edited or removed before completion. Leaving a dirty cart
   requires confirmation.
4. **Choose payment:** one of Cash, Transfer, POS/card, or Credit. Credit asks
   for a customer name, requires explicit selection or creation rather than
   name-only auto-merge, and clearly states the amount owed.
5. **Complete locally:** disable duplicate submission while one SQLite
   transaction commits Sale, SaleItems, Payment, optional credit records,
   InventoryEvents, and one PENDING aggregate outbox envelope.
6. **Confirm and review:** show the total, payment method, locally saved state,
   and entry to recent sales. History/detail use stored snapshots and survive
   force-stop/relaunch.

Failure before commit keeps the cart and says the sale was not recorded. The UI
must never show success from partial rows or from an outbox-only write. Negative
derived stock is shown honestly and does not invalidate a real sale.

## Approved Ticket Frontier

### M3-01 — Complete one cash sale offline

Deliver one searchable product → one sale line → cash completion → inventory
effect → confirmation/history vertical slice. Add only the Sale, SaleItem,
Payment, InventoryEvent, and aggregate outbox persistence required by this
slice. Prove exact snapshots, actor/device/store ownership, operation replay,
failure rollback at every write boundary, restart survival, and no network use.

**Blocked by:** accepted M2 baseline and the M3 task branch.

### M3-02 — Build and edit an exact multi-line cart

Add package choice, positive exact quantity, package-specific/default/manual
price, absolute line discount, multiple lines, line edit/remove, calculated
totals, Quick Add return, and guarded dirty-cart exit. Prove exact-or-reject
arithmetic and that inactive/non-sellable or cross-store records cannot enter a
completed sale.

**Blocked by:** M3-01.

### M3-03 — Record every approved payment method and credit truthfully

Add transfer and POS/card tender selection and the approved credit path with a
required customer name, explicit CustomerAccount selection/creation, and OPEN Receivable. Complete all
related rows and the sale envelope atomically. Prove non-credit tender equals
the sale total, credit is excluded from cash received, and partial/duplicate
credit records cannot survive failure or replay.

**Blocked by:** M3-02.

### M3-04 — Recover and review completed sales

Add recent-sale history and snapshot-based detail, restart/force-stop recovery,
empty/loading/local-failure states, accessible focus/labels/48dp controls,
scrolling at large text, and clear locally-saved/pending-sync language. Completed
sales expose no destructive edit/delete action; reversal stays deferred.

**Blocked by:** M3-01 and M3-03.

### M3-05 — Prove the M3 offline transaction milestone

Run clean validation, migration upgrades from a populated M2 database, injected
rollback/replay/ownership tests, Expo checks, Android export, and the combined
Galaxy airplane-mode flow. Record actual evidence, update tickets/workflow/
PROJECT_STATE, and stop before M4 for independent audit.

**Blocked by:** M3-01 through M3-04.

## Non-goals

Network synchronization, scanner/camera, cost calculation, purchase/restock,
inventory reconciliation, split tender, partial credit settlement, receipts or
printing, returns, void/reversal, tax, order-level/percentage discounts, and M4+
summary UI are outside M3.

## Approval Record

The founder approved D-036 and D-037 on 2026-09-14. The approval activates the
M3 design baseline and ticket set. It does not authorize Git push, merge,
deployment, or M4.
