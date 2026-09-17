# M4 Restocking + Costing — Approved Implementation Plan

**Status:** APPROVED for M4 implementation by the founder on 2026-09-18. Costing remains provisional under D-027; source acceptance and release readiness require later evidence.  
**Baseline:** accepted M3 checkpoint `66cc64d`; `feat/m4-restocking-costing`.  
**Owner:** coordinating planning/audit task. Updated 2026-09-18.

## Outcome and sources

Record purchases without internet, increase stock through explicit inventory
events, preserve original package-basis prices, show private purchase history,
and supply an explicitly provisional cost basis for subsequent sales. Extend
the existing domain, SQLite, catalogue, local membership, outbox and theme.
No new framework, native dependency, cloud schema or sync transport is proposed.

Sources: BUILD_PLAN M4; PRD restocking/costing; DOMAIN_DATA_MODEL sections 6, 9,
11 and 13; TECHNICAL_ARCHITECTURE costing/restock flows; OFFLINE_SYNC; D-013,
D-027, D-028, D-034, D-036 and D-037. This proposal does not supersede them.

Reconciliation, business summaries, network transport, trend analytics, shared
contributions, purchase credit/payables, returns, voids, taxes, landed-cost
allocation and recognition remain outside M4.

## Intake findings resolved by the approved contract

- D-027 permits moving weighted-average as an engineering candidate, with
  professional review required before finalized accounting claims.
- Purchase input and immutable package-price history are specified. Average
  precision, COGS rounding and unknown/negative-stock behavior are not.
- M3 sale-cost fields accept integer minor units and are nullable. Twenty units
  at NGN 300 plus forty at NGN 350 have an exact average of 100000/3 kobo per
  unit. That cannot fit an integer unit-cost field. Rounding it on receipt
  silently changes later costs; rejecting normal purchases would be impractical.
- Pre-M4 stock may be negative or uncosted. Missing cost must never become zero
  or be backfilled into immutable completed sales.
- M3 checks active membership and records the acting user/device. Purchases
  must retain those checks and snapshot the resolved membership ID required by
  the Purchase model. Replay must preserve original attribution.
- App flow specifies restocking capability; detailed M4 screens/states still
  need review. Existing DESIGN tokens remain authoritative.

## Approved engineering costing contract — D-038

The founder approved this contract and the screen baseline on 2026-09-18.
D-038 records the engineering precision, coverage and rounding rules; D-027
remains provisional pending professional review before accounting claims.

1. Accept positive D-034 package quantities and exact conversion to safe integer
   base micro-units. Merchant input is either total line cost or per-package
   unit cost in nonnegative integer minor units. Preserve the input mode/value,
   quantity, names, package conversion, currency and exact normalized ratio.
   Unit-cost mode must produce an exact integer total or show a field error.
   Total-cost mode may derive fractional package/base prices without inventing
   a rounded input. Explicit zero cost is valid; missing cost is not zero.
2. Represent normalized and average costs as reduced nonnegative rational minor
   units per whole base unit. Use BigInt internally and canonical decimal
   strings at persistence/JSON boundaries; never JSON-serialize BigInt or use
   floating point as authoritative cost arithmetic.
3. For fully costed positive stock, the new average is exact remaining value
   plus receipt total divided by new remaining quantity. Sales consume exact
   proportional value, not the rounded COGS display. Repeated-product lines
   process in stable aggregate order.
4. Snapshot the exact basis when the whole sale line has validated coverage.
   Compute provisional COGS from base micro-units and round half up ONCE per
   line to minor units, preserving exact basis and method/version. D-036 sale
   prices, discounts, tenders and totals remain exact-or-reject. An integer
   unit-cost column must not pretend a fractional basis is integral.
5. Conservatively keep average/COGS unavailable for positive stock with unknown
   prior coverage. Purchases still save and expose their own prices. When prior
   balance is zero/negative and a receipt makes it positive, initialize the
   positive remainder at that receipt's exact unit cost; never cost the earlier
   deficit retroactively. If balance stays nonpositive, no costed stock remains.
   A sale exceeding coverage keeps the entire line's COGS unavailable, consumes
   remaining coverage and preserves the genuine sale/negative stock under
   D-013. Nonpositive stock has zero costed quantity and no usable average.
6. Never rewrite old sale snapshots. New immutable companion snapshots may
   hold fractional basis for NEW sale items inside the sale transaction.
   Existing integer columns remain compatible and null when unavailable.
   Cost state is a store-private projection reconstructable from immutable
   purchase/sale cost movements with explicit local application order, not
   timestamps alone. This is not a global sync protocol; M7 reviews concurrent
   devices and M5 reviews adjustment costing before extending those contracts.
7. Label estimated weighted-average cost and unavailable coverage honestly.
   No finalized accounting, full profit/P&L, or inferred supplier-payment claim.
   Personal observations are private, linked to purchase lines, and default
   contribution consent to false.

Verification examples:

- Five cartons of forty units for NGN 60000 => 200 units at 30000 kobo/unit.
- Twenty units at 30000 kobo then forty at 35000 => 100000/3 kobo/unit.
  One-unit sale COGS => 33333 kobo; three-unit line => 100000 kobo.
- Half-kobo COGS => one kobo; integral values remain exact.
- Five uncosted units plus five purchased units => current average unavailable;
  receipt price remains visible and checkout remains usable.
- Balance -2 then purchase five at 100 kobo/unit => positive remainder three
  costed units at 100 kobo/unit; no earlier sale receives invented cost.

Smallest alternatives: round average unit cost before storing it (smaller
schema but compounds error and loses exact basis), or keep all sale COGS
unavailable throughout M4 (simpler but postpones the specified sale integration).
Recommend exact rational basis with explicit provisional per-line rounding.

## Approved M4 experience

Add a minimal Restock/Purchase history entry under the approved More destination;
do not build other More capabilities. Flow: product search/Quick Add -> active
purchase package -> quantity and Total cost/Unit cost -> optional supplier ->
review -> local completion -> immutable receipt/history detail.

Keep the draft in memory. Guard every dirty exit, including header Back,
hardware Back, tabs and Cancel. Quick Add preserves the draft and recovers from
refresh/read failure. Show exact converted quantity and merchant-entered cost;
label derived price display and never write it back as authoritative input.
Supplier selection/creation is explicit; duplicate names do not auto-merge.

Lock duplicate submission and retain the operation ID for retry. Failed save
retains the draft; replay returns the original purchase. Only a durable commit
is success. History provides offline empty/loading/error/retry states, original
package prices and existing human-readable saved-on-device/sync status.
Reuse DESIGN components, accessible labels/errors, 48dp targets, large-text
wrapping, keyboard-safe review and focus-aware Android handlers.

The coordinator has recorded this baseline in DESIGN and app-flow. The
implementer follows it and reports contradictions instead of inventing policy.
No DESIGN JSON is needed without a real consuming tool.

## Likely modules and migrations

- Domain purchase normalization, exact ratios and cost transitions.
- Append SQLite migration 4 for purchases/items, suppliers, private observations,
  cost projection and immutable movement/sale-basis companions; typed store-scoped
  repositories and exports. Add later migrations for later persisted contracts.
- Record-purchase application aggregate, cost-aware completeSale, minimal
  More/restock/history UI, client/context and focused tests.
- Approved decision/domain/architecture representation, design/app-flow,
  ticket/workflow evidence and PROJECT_STATE.

Never change committed migrations 1–3, reset data, disable immutable triggers
or backfill fictional history. Populated-M3 upgrade preserves catalogue,
sales/credit, inventory, outbox and null historical costs.

Completion validates store, active member/device, currency and package/product
ownership. Purchase/items, positive PURCHASE events, cost movements/state,
observations and one completed-purchase outbox aggregate commit atomically.
Optional supplier creation during completion shares that transaction. Replay
is actor/store-scoped; conflicting immutable ID/payload reuse is rejected.

## Checks and boundaries

Focused domain, SQLite failure-injection/replay/isolation and component tests
accompany each ticket, followed by typecheck and zero-warning lint. Final checks:
`npm run validate`, `npm run mobile:doctor`, Expo dependency check in mobile,
`npm run mobile:export`, workflow schema/date-time/dependency validation and
`git diff --check`. Installed AJV suffices; no validation dependency is proposed.

Independent audit reviews every criterion and correction before M5 planning.
Galaxy airplane-mode restock, force-stop/relaunch receipt retention, price
history, cost availability, dirty exits and large text remain physical gates.
The existing waiver permits SOURCE continuation only. Development-client/Metro
and second-laptop checks remain mandatory before external beta/native release.

Coordinator owns planning/tickets/workflow, assignment, audit and acceptance.
Luna max implements approved M4 tickets and assigned corrections only, reports
to the coordinator and waits. Corrections return to the existing M4 task; M5
gets a new task after acceptance and its own coordinator-created plan/tickets.
