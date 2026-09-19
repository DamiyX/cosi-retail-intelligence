# M6 Expenses, Withdrawals and Business Summary Plan

**Status:** Approved planning baseline; implementation not started.  
**Depends on:** independently accepted M5 source/automated scope.  
**Boundary:** local-first M6 only; no sync transport, market-price signal,
staff-management system, formal accounting claim or scanner navigation change.

## Outcome

An owner can record ordinary operating expenses and owner withdrawals offline,
then open a calm Home surface that answers:

- What happened today?
- What needs attention?
- What should I do next?

The summary reports only durable local records for the store-local calendar day.
Sales value includes credit sales and is not cash received or profit.

## Verified starting point

- Completed sales already preserve exact integer totals, immutable cost snapshots,
  payment/credit facts, actor, device and canonical outbox operations.
- Purchases and inventory already supply cost coverage and real attention items.
- The current `today` tab is a shell; full-range daily queries do not yet exist.
- There are no expense or owner-withdrawal tables, repositories, routes or UI.
- M5 migration 15 preserves low-stock episode history independently of outbox
  lifecycle; M6 starts with new additive migrations.

## Domain decisions

### Expenses and withdrawals

- Expense amount is a positive integer in store currency. Categories are the
  approved fixed initial set: transport, wages, fuel/electricity, rent,
  maintenance, levies/tax and miscellaneous.
- Owner withdrawal is a distinct append-only transaction, never an expense.
- Both preserve optional note, explicit occurred-at time, resolved owner member,
  user, device and creation time. The initial management slice is active OWNER
  only; M11 may add staff permissions without rewriting history.
- Completion, entity row and one canonical version-1 outbox envelope commit in
  one SQLite transaction. Client operation IDs make retries idempotent. Records
  are not edited or silently deleted in M6.
- Payment-account/cashbook allocation, receipts/media, recurring expenses,
  tax treatment and accounting journals are outside M6.

### Summary semantics

- Today uses the store timezone and a half-open UTC instant range for the local
  calendar day. Queries must scan the full range, not paged history.
- `Sales value` is the sum of completed sale totals, including credit sales.
  `Transactions` is the completed sale count.
- `Tracked COGS` and `Tracked gross margin` are shown only with explicit cost
  coverage. Partial/unavailable sale cost never becomes zero cost and never
  supports a whole-day profit claim.
- `Recorded expenses` and `Owner withdrawals` are separate totals. A cautious
  tracked result may subtract recorded expenses from fully covered tracked gross
  margin; withdrawals remain a separate owner-flow fact. Never label this net
  profit, P&L, cash balance or retained capital.
- The optional top product is **Most frequently sold today**: the product present
  in the greatest number of distinct completed sales. Stable tie order is count,
  then earliest qualifying sale/application order, then product ID. Do not add
  unlike package quantities or silently substitute sales value.
- Purchase/replacement-cost movement cards remain M9/M10 under PC-07, despite
  older broad M6 wording. M6 does not simulate a price signal.

## UX contract

### Expense and withdrawal entry

More exposes **Record expense**, **Expenses**, **Record owner withdrawal** and
**Withdrawals**. Entry uses store currency, positive amount, category where
applicable, optional note and date/time. Preserve entered fields and operation ID
after failure; disable duplicate submission; success follows durable commit only.
History has empty/error/retry states and truthful saved-on-device sync language.

### Home / Live Today

The `Today` tab becomes the Home operating surface:

1. **Live today:** sales value and transaction count first; optional most-
   frequently-sold product; recorded expenses and withdrawals; cautious cost/
   margin coverage link rather than a dense accounting dashboard.
2. **Needs attention:** a compact bounded preview from the real M5 attention
   service, ordered by existing severity, with `See all` and contextual routing.
3. **Next action:** familiar links into Sell, Restock, Stock checks and expense.

Refresh after durable writes, tab focus, foreground resume and store-local day
rollover. Do not poll aggressively in the background. Provide loading, zero-day,
partial-cost, error and retry states. Preserve accessible headings, meaningful
labels, 48dp targets, large-text wrapping and restrained card count.

### Summary detail

A summary detail surface explains the selected local-day range, values included,
cost coverage and limitations. It may list the same exact daily facts; it is not
a general analytics/reporting engine. Historical range analytics remain future.

## Schema and integration

- Migration 16: immutable expenses plus store/time indexes.
- Migration 17: immutable owner withdrawals plus store/time indexes.
- Both tables use store/member/user/device foreign keys and integer minor money.
- Add repository commands, client boundaries and canonical outbox operation/entity
  types. M7 later applies append-and-deduplicate sync.
- Add exact read-model queries for a store-local half-open range. Perform safe
  integer aggregation in TypeScript when SQLite SUM could exceed its integer
  boundary. Keep query/store isolation explicit.
- Summary reads existing immutable sale, sale-item cost, expense, withdrawal and
  attention facts. It does not create a second financial or inventory truth.

## Ticket sequence

1. M6-01 Record and review operating expenses.
2. M6-02 Record and review owner withdrawals.
3. M6-03 Build exact daily business summary and coverage semantics.
4. M6-04 Promote Live Today and compact attention to Home.
5. M6-05 Complete recovery, evidence and audit handoff.

M6-01 and M6-02 are sequential because this checkout has one writer, although
their domain concepts remain separate. M6-03 depends on both. M6-04 depends on
M6-03 and accepted M5 attention. M6-05 depends on all prior tickets.

## Verification boundary

Require domain/repository/UI tests for money boundaries, owner/store isolation,
retry conflict, rollback, restart, local-day DST/offset boundaries, credit-sale
wording, partial cost coverage, stable top-product ties, attention routing,
foreground/day refresh and dirty exits. Final checks include strict typecheck,
zero-warning lint, full tests, Expo Doctor, dependency compatibility, Android
export, workflow/schema/artifact/migration checks and clean Git state.

Physical Galaxy checks remain carried and explicitly deferred by the founder.
Source acceptance will not imply pilot, beta or accounting readiness.
