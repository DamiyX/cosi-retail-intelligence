# M5 Inventory, Batch Awareness and Reconciliation

**Status:** Coordinator-prepared implementation plan; not implemented or delegated.  
**Date:** 2026-09-18.  
**Baseline:** `feat/m4-restocking-costing`, documentation HEAD `c1753b6`, independently
accepted M4 source `9700ee3`. Inspect Git again before assignment.  
**Approval:** Founder approved minimal batch awareness, automatic FEFO without
ordinary batch selection, pilot expiry, blind checks/attention and conservative
discrepancy costing. Technical ticket sizing/design judgment is delegated to the
coordinator. D-039/D-040 and the existing domain/design sources govern this plan.

## Verified repository and smallest approach

Migrations 1–6 exist in `apps/mobile/src/db/migrations.ts`. M1 supplies local
store/device/member context and transaction adapters; M2 supplies immutable
package conversion and private catalogue/reorder settings. M3 completes sales
with negative inventory events and immutable lines. M4 `recordPurchase` creates
UUID purchase lines, positive events, exact cost movements/state, private price
observations and one outbox envelope in one transaction. `completeSale` applies
cost movements/snapshots in its transaction. Inventory is derived from signed
events, including genuine negative stock; event rows are immutable. There are
no batch, expiry, check, assignment or snooze tables. M4 cost movements currently
allow only PURCHASE/SALE through a SQLite CHECK and source triggers.

Extend those services and receipt UI in M5. Do not reopen the accepted M4
milestone, edit committed migrations, rebuild old receipts or introduce lot
costing. One new receipt line per expiry group uses the existing repeated-product
multiline model and exact TOTAL/UNIT cost rules. This is smaller than distributing
one financial receipt line's cost over arbitrarily split groups. The UI says
“Add another expiry group”; its cost/quantity is entered as another line. Show
one aggregate product stock total in ordinary catalogue/inventory views.

Unknown legacy stock can be the residual of the product event ledger minus
named-group balances. No historical purchase-to-batch backfill or invented
opening stock event is needed. Record it as unknown coverage, including signed
deficits; date UNKNOWN on a newly received group is also valid. These are
different facts: a known receipt group may have an unknown date.

## Bounded external sanity check

Official Odoo documentation describes lot-level dates, automatic allocation
across groups in earliest-date order, and count differences posted as inventory
movements. Its FEFO can use a separate removal date; COSI needs only recorded
expiry ordering initially, with alert lead time separate from depletion order.
Do not import locations, transfers, manufacturing or mandatory lot entry.
GS1 distinguishes product identity, batch/lot and expiration/best-before data;
do not treat an ordinary product barcode as a physical batch verification.

- [Odoo FEFO](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/shipping_receiving/removal_strategies/fefo.html)
- [Odoo expiry dates](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/expiration_dates.html)
- [Odoo inventory adjustments](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/count_products.html)
- [GS1 identifiers](https://ref.gs1.org/ai/)

Verification used official indexed documentation extracts and the readable GS1
identifier description on 2026-09-18. Full Odoo page fetches timed out; do not
claim a full vendor implementation review. Sources corroborate the pattern,
not COSI's exact unknown-stock, date-precision or costing policies.

## Contract and boundaries

Detailed persistent facts/invariants belong in DOMAIN_DATA_MODEL section 10.5
and costing section 11; user states belong in DESIGN's M5 section. This plan
sets implementation sequencing and evidence, not another competing schema.

- Receipt completion automatically creates one group per new receipt line,
  including undated groups. Internal UUID is independent of optional supplier
  batch text; matching dates/numbers never silently merge groups.
- Normal sales automatically consume positive dated groups by earliest date,
  then undated stock; stable local creation order/UUID breaks ties. No batch
  picker or confirmation in ordinary checkout. Each depletion records ASSUMED_FEFO
  and policy version. A physical check verifies a quantity at a time; later
  inferred sales do not become physically verified because the group was checked.
- Unknown residual and oversold quantities remain possible. When a receipt
  follows negative stock, allocation first offsets that unallocated deficit;
  only its positive remainder becomes recorded remaining group stock. Original
  received quantity remains immutable. Never retain five positive dated units
  beside a hidden minus-three deficit and advertise five as available.
- FEFO is ordering, not proof of shelf picking or a safety certification.
  An elapsed recorded date raises a visible warning/review action; no automatic
  stock subtraction, automatic date extension or new hard checkout block is
  introduced. Genuine sales, including negative/unknown stock, remain recordable.
  Pilot review must examine elapsed-date warnings; strict traceability/sale
  restrictions are a separate future product decision.
- Preserve exact DAY / MONTH / UNKNOWN date precision and optional printed
  date meaning (expiry, best-before, unspecified). A month-only October label
  cannot truthfully become “21 days”. Use store-local calendar dates, conservative
  attention from that month, and “recorded date has passed” after its interval;
  do not invent a manufacturer's day or claim goods are safe/unsafe from a label.
- Physical reclassification is an explicit net-zero batch operation. It can
  assign unknown stock to inspected date groups or correct recorded allocations
  without changing product stock, historical purchases, COGS or price observations.
- A total-only shortage does not identify a missing batch. For products with
  grouped stock, conservatively move the unverified current breakdown to unknown
  through recorded net-zero entries before applying the total correction; retain
  the old dated evidence and show coverage/review attention. An explicit complete
  group count can instead reconcile group quantities. No FEFO guess for shrinkage.
- Matching blind counts finish with a durable check fact, without a zero-delta
  inventory event (migration 3 rejects zero). Inventory and batch watermarks are
  captured at first entry and revalidated inside finalization; any new movement,
  even offsetting moves with unchanged total, requires refresh/recount.
- Shortages/removals of fully covered positive stock consume exact proportional
  moving-average value. Nonpositive remainder has no usable cost. Unknown coverage
  stays unknown; unexplained additions invalidate current aggregate coverage,
  retaining original immutable cost evidence. Classification-only operations
  leave financial cost unchanged. No guessed/zero valuation or automatic cost
  recovery from a later date inspection.
- OWNER inventory management only initially, enforced through resolved
  active membership at the command boundary; deny ADMIN/STAFF adjustments/settings/
  check finalization. Existing active-member sale/restock behavior is preserved.
  M11 will define actual staff assignment/review/permissions; do not infer ADMIN
  privileges for new M5 management commands. Existing sale/restock membership
  permissions are preserved.
- One existing-format outbox envelope per completed business command includes
  full related batch/check/adjustment facts atomically. Add a batch extension
  marker and snapshots under entities; preserve old payloads/version/replay.
  Replays compare explicit expiry/group inputs as well as existing inputs and
  return original allocations, never run FEFO again against current stock.
  M7 validates server consumption and concurrent-device allocation/reconciliation;
  M5 local order is not a global ordering mechanism.

Date/attention defaults: lead time 30 calendar days, configurable as a nonnegative
integer. DAY countdown uses store-local dates, reaching the printed day then
passing it on the next local day. MONTH has no exact-day countdown: alert against
the interval start conservatively, show the printed month, and mark the recorded
interval passed only at the next month. These are operational reminder rules,
not manufacturer-date reinterpretation or safety claims.

## Likely implementation surface

Extend existing `src/purchases/recordPurchase.ts`, `src/sales/completeSale.ts`,
their clients/contexts/screens, typed DB repositories, `src/db/migrations.ts`
and canonical outbox entity unions/builder. New cohesive `src/inventory/`,
`src/screens/inventory/`, thin inventory/check/attention routes and repositories
own the approved commands/read models. Reuse `packages/domain` for exact batch,
count and adjustment-cost rules and shared UI formatting/guards. Domain tests,
real SQLite integration and routed/component tests accompany each slice.
No new workspace package/dependency or broad existing-feature refactor is needed.

Security/evidence scope: resolved local actor/store/device/member owns each
command; arbitrary group/event IDs must not access another store, nor ADMIN/
STAFF invoke new OWNER management by changing caller fields or bypassing UI.
Test allowed/denied real command paths and DB relationships. This is an offline
local management contract, not proof of cloud authorization or resistance to
a compromised device; M7 enforces server membership independently. Independent
coordinator audit must challenge this boundary after implementation stops.

## Migration strategy and compatibility

Expected append-only registry sequence, if HEAD still has six migrations:

1. **7 — batch inventory:** group, operation/header and signed entry tables,
   store/source relationships, immutable-finalized safeguards and indexes.
   Classification header retains observed input/watermarks/evidence so M5-02
   needs no separate inspection table. Legacy ledger totals remain untouched
   and appear as unknown residual; no
   business-history backfill. Existing M1/M2 stores without events remain zero.
2. **8 — adjustments and cost extension:** sourced adjustment aggregate/lines;
   widen cost movement vocabulary for ADJUSTMENT, preserving existing rows,
   IDs, order, exact values, methods, indexes and source/immutability triggers.
   SQLite cannot ALTER the old CHECK directly: a transactional table replacement
   in this NEW migration is permitted, with copy/integrity/foreign-key checks
   and rollback tests. This is not rewriting migration 4 or historical costs.
3. **9 — durable checks:** sessions, first/recount submissions, expected hidden
   snapshots/watermarks and immutable finalization evidence.
4. **10 — guided-check settings/assignments/replacements**, actor and policy
   provenance, due windows and pause/target configuration.
5. **11 — attention/snooze settings**, per-condition suppression and expiry
   warning lead time. Derive alerts from real inventory; no financial Home here.

Numbers are expected implementation assignments, not SQL files created in this
planning pass. Before each append inspect actual max version; explain any
different decomposition. Do not renumber, squash or edit migrations 1–6.
Node real SQLite tests rehearse fresh install, populated-v6 upgrade, failure
rollback and reopen. No hosted Supabase schema or data changes in M5.

Consumer compatibility: new local app services deploy together. Old omitted
expiry input means UNKNOWN; existing financial semantics/tender/package
contracts remain unchanged. Normalize omitted/new null expiry to UNKNOWN. New request fingerprints bind
that normalized value; losing a known expiry field on retry cannot silently
replace it. Old-operation replay accepts its historical unknown input, never
adds date metadata through replay. Historical outbox graphs with no batch extension
are valid and replay without creating companions. Tests relying on migration
count or exact new graph shape need deliberate updates, not weakening monetary,
store, replay or historical assertions. Old binaries detect a newer schema and
must refuse downgrade/reset, consistent with the current migration runner.
Recovery is backup/restore or forward migration, not uninstalling/deleting data.

## Evidence matrix

| Claim | Required evidence |
| --- | --- |
| Multiple groups, one product | Receive 20 October 2026 + 30 January 2027; product total 50; two separate group facts; mixed packages normalize exactly |
| FEFO | Sell 5 -> earlier group 15, later 30, total 45; split sale across groups; equal-date stable order; unknown dates; no checkout batch prompt |
| Truthful expiry | Group drained to zero disappears; MONTH no day countdown; DAY store-local boundary/lead time; inferred wording; unknown/unresolved coverage; passed-date warning without stock removal |
| Legacy/negative stock | Positive/zero/negative populated-v6 data stays unchanged; sell without dates; -3 plus receipt 5 -> residual debt cleared, positive group remainder 2; no invented receipts/dates |
| Arithmetic/rebuild | Safe integer input quantities; BigInt aggregate/residual arithmetic including existing M3 overflow edge; canonical JSON strings where needed; product and batch projections agree before/after rebuild |
| Correction | Inspect/reclassify unknown 40 into 10/30 groups net zero; total-only mismatch makes breakdown unknown; full group count corrects groups; matching count no zero event; partial inspection cannot prove full coverage |
| Costing | FEFO group choice changes no MWA formula; exact rational shortage/expired loss; unknown surplus; zero/negative remainder; no historical COGS mutation; cost-state rebuild equals live state |
| Atomicity/replay | Inject failure at every new write for purchase, sale, classification, removal and count completion; all rows/projections/outbox roll back; same op returns same graph; changed date/precision/group/reason/quantity rejects |
| Scope/security | Actual store/device/member/role read-write matrix; deny cross-store batch/event/assignment references and inactive/wrong-role management; raw SQLite constraint attempts |
| Counting while trading | Capture first count blind; retain recount history; later sale/restock/net-zero classification invalidates watermark even if total unchanged; no overwrite or blocking genuine sales |
| Guided checks | Default 3 configurable/paused; store-local windows; rotation/exclusions/no candidates; reasoned replacements retained; no automatic accusation; restart retains due work |
| Attention | Low/zero/negative/discrepancy/expiry conditions; See All; contextual Restock; snooze persistence/expiry/resolution; worsening severity resurfaces; expired removal creates real event |
| UI/device | Loading/empty/error/retry; dirty header/Android Back/Cancel guards; accessible labels/touch/text scale; actual offline/force-stop evidence distinct from mocked UI |

Run focused domain/repository/UI tests, typecheck and zero-warning lint after
each ticket, then `npm run validate`, `npm run mobile:doctor`, Expo dependency
check from mobile, `npm run mobile:export`, active workflow schema/date-time/
dependency/artifact checks and `git diff --check`. No M5 runtime tests are
claimed in this planning pass. Physical gates remain carried until performed.

## Ticket sequencing and explicit non-goals

Published tickets are M5-01 receipt/sale groups, M5-02 physical classification,
M5-03 sourced adjustments/expired removal/costing, M5-04 blind reconciliation,
M5-05 guided checks, M5-06 attention/snooze, M5-07 evidence/handoff. True
dependency edges are in tickets.md and mirrored in the workflow; execution
is sequential regardless of independent edges. Each functional slice includes
its smallest migration, domain/service, user path and tests.

No M6 live dashboard, reports aggregates, financial summary, global Scan/tab
redesign, GS1 parsing, OCR, visual-recognition runtime, warehouse location,
reservation, manufacturing, strict pharmacy traceability, staff assignment,
remote sync or automatic date-based stock removal. M5 supplies a real expiry
attention surface under More; M6 promotes it to Home before pilot.

## Delegation plan — prepared, not dispatched

After reviewing this package, use a NEW user-owned Codex task on the same saved
project checkout, Luna max (`gpt-5.6-luna`, `max`) under the current approval, implementation only.
Coordinator recommends Terra max for M5's cross-boundary complexity; change
the task model only if the founder explicitly chooses it. First
commit the accepted M5 planning baseline separately through an authorized
utility step, preserve M4 history, then create task branch
`feat/m5-inventory-reconciliation`. Do not create another clone. Do not allow
simultaneous writers; coordinator begins independent audit only after handoff.

Assignment prompt:

> Use C:\Users\doyew\Documents\DEV 2\COSI-m0 only. Read AGENTS, PROJECT_STATE,
> MULTI_AGENT_WORKFLOW, IMPLEMENTATION_AUDIT_WORKFLOW, TICKETING, tickets.md,
> workflow index/m5 record, M5_INVENTORY_RECONCILIATION_PLAN, DESIGN, relevant
> PRD/domain/technical/offline sources and D-013/D-034/D-036–D-040. Inspect Git
> and preserve all accepted M1–M4 work. Reconcile and report any material
> discrepancy before implementation. Implement only M5-01 through M5-07 in
> dependency order, with one recoverable commit per ticket and actual passing
> focused/full evidence. Preserve exact sale arithmetic, moving-average costing,
> immutable history, product-event stock truth, automatic assumed FEFO, unknown
> stock, atomic business/batch/cost/outbox writes, actor/store isolation and replay.
> Never ask for ordinary sale batch confirmation. Do not choose a model, start
> M6, push/merge/deploy/change cloud services or claim unperformed phone evidence.
> You own implementation and assigned fixes, not planning or independent audit.
> Update the ledger/state/workflow, send a structured completion report to
> coordinator task 01a098ef-d830-7531-bca7-2d66b0a5b587 using
> send_message_to_thread, then stop editing. Corrections return to this same task.

Planning verification: active M4/M5 workflow JSON Schema/date-time formats,
gate and ticket dependency review, registered artifact existence, seven unstarted
three-criterion tickets and byte-identical M4 ledger archive passed local checks.
Tracked runtime/configuration diff is empty and git diff --check passed. Only
M5 is unfinished/unarchived; historical completed M2 remains unarchived with
its previously documented schema limitation and is not rewritten. These
are documentation checks, not M5 behavior/migration or physical-device evidence.

No remaining founder question blocks this documentation/delegation plan.
The existing physical/release/accounting gates remain mandatory for their
respective claims and are not passed by approving the batch direction.
