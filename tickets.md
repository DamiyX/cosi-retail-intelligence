# Tickets: M5 Inventory, Batch Awareness and Reconciliation

**Status:** Published by coordinator under founder-delegated ticket/design judgment;
not started. Batch direction explicitly approved 2026-09-18. Implementation has
not been delegated. No acceptance box below is implementation evidence yet.
**Baseline:** accepted M4 source 9700ee3; M5 planning authored from c1753b6 on
feat/m4-restocking-costing. Intended task branch: feat/m5-inventory-reconciliation.
Accepted M4 ledger is archived in docs/engineering/tickets/M4_RESTOCKING_COSTING.md.

## Shared execution contract

Read AGENTS, M5_INVENTORY_RECONCILIATION_PLAN, DESIGN, PRD, domain/technical/
offline sources and D-013/D-034/D-036–D-040. Coordinator owns planning, ticket
changes, workflow registration and independent acceptance. Luna max implements
these tickets and assigned fixes only, sequentially with no overlapping writers.

Each functional ticket includes its minimum domain/repository/service/UI/tests.
Keep typecheck and zero-warning lint green; run focused actual SQLite and user
behavior tests and commit separately with the ticket ID. Update actual evidence
in this ledger/workflow, never infer unperformed physical checks. Relevant cases
are defined in the plan evidence matrix, which complements the binary criteria.
Scope: M5 only. No M6/dashboard, scanner/nav redesign, GS1/OCR/recognition model,
warehouse, staff assignments, cloud sync, push, merge or deployment.

## M5-01 — Receive expiry groups and sell automatically

**Status:** Implemented; awaiting independent audit. **Blocked by:** coordinator audit gate.
**Delivers:** retailer can receive different dates of one product, see one total,
and complete an ordinary sale without choosing a batch.
**Scope:** smallest batch migration (expected 7), exact domain/projection logic,
existing receipt/sale completion and replay, restock expiry fields/repeated group
lines, inventory/group inspection entry and immutable receipt/sale detail.

- [x] Receive 20 October + 30 January (explicit years), sell 5: earlier group
  15, later 30, product 45; multi-group/equal-date/undated FEFO tests pass with
  no ordinary picker/confirmation. DAY/MONTH/UNKNOWN and optional printed number
  persist; display is estimated, with no invented day countdown.
- [x] Populated-v6 positive/zero/negative/legacy-overflow cases survive migration
  and sale/restart; unknown residual stays sellable. -3 + receipt 5 leaves
  two positive group units. Batch projection agrees with product ledger/rebuild;
  new receipt quantities/conversions and original financial snapshots stay exact.
- [x] Every new sale/purchase event has complete atomic batch/cost/outbox effects;
  all-write failure injection, same-op stable replay, receipt metadata conflict
  checks and violating SQLite writes pass. Existing sale/restock regressions pass;
  old payload compatibility remains guarded for unknown legacy requests.

**Implementation evidence (awaiting independent audit):**

- Added schema v7 immutable receipt groups, event allocation operations/entries,
  ownership/source guards, exact BigInt projections and canonical batch payload
  fields. Existing migrations v1-v6 remain unchanged.
- `apps/mobile/__tests__/m5Batch.test.ts`: 7 passing tests covering dated/month/
  unknown receipt groups, equal-date and undated ordering, negative deficit offset,
  v6 upgrade with zero/negative/overflow ledger cases, restart/replay, immutable
  writes and every purchase/sale write boundary.
- `apps/mobile/__tests__/restock.test.tsx`: 13 passing tests, including printed
  month/meaning/batch-number capture; existing purchases/sales suites: 36 passing
  tests in the focused run. Typecheck and zero-warning lint were run after the
  implementation changes. Physical Android and independent audit evidence remain
  outstanding.

## M5-02 — Inspect and classify existing expiry stock

**Status:** Not started. **Blocked by:** M5-01.
**Delivers:** unknown stock becomes usefully dated through optional physical review
without recreating purchases or changing total stock/cost.
**Scope:** durable inspection facts and net-zero group classification, correction
history, product group-review UI with retained input/retry and actual watermark.

- [ ] Classify existing 40 as 10/30 dated groups without product InventoryEvent,
  duplicate opening stock, cost movement, receipt/observation/COGS mutation;
  partial review retains unknown remainder and time-specific evidence.
- [ ] Correcting date/breakdown appends classification history; group totals,
  unknown residual and immutability survive rebuild/reopen. Changed movement/
  classification watermark rejects stale review even if total is unchanged.
- [ ] Same operation replays original result; changed count/date/group input,
  invalid totals, wrong store/device/inactive member or STAFF management fail
  without side effects. All-write rollback and dirty exit/read-retry UI pass.

## M5-03 — Record stock adjustments and actual expired removal

**Status:** Not started. **Blocked by:** M5-01.
**Delivers:** real loss/addition/expiry removal is recorded, with truthful cost
availability, rather than silently overwriting stock or dismissing an alert.
**Scope:** sourced adjustment/line migration and cost vocabulary extension
(expected 8), exact adjustment cost/rebuild, shared transaction writer and manual
adjustment/group removal UI; historical dates/costs remain immutable.

- [ ] Supported nonzero reasoned adjustments create sourced aggregate/line,
  InventoryEvent, matching batch effects, exact cost movement/projection and one
  outbox atomically; removing selected expired stock decreases its actual recorded
  remainder. Date passage/dismissal alone never changes inventory.
- [ ] Fully covered shortages consume proportional exact MWA value; unknown/
  excessive shortages, nonpositive remainder and unexplained additions have
  truthful unavailable coverage. Classification changes no cost. Live and rebuilt
  cost states agree; original M4 rows/IDs/order/values/COGS remain unchanged through
  the transactional cost-table CHECK extension and populated upgrade.
- [ ] All-write rollback, raw relationship/immutability constraints, ownership/
  OWNER versus ADMIN/STAFF, stale selected-group removal, same/conflicting replay,
  cold reopen and retained UI failure paths pass alongside existing M1–M4 tests.

## M5-04 — Blind count and reconcile recorded differences

**Status:** Not started. **Blocked by:** M5-02, M5-03.
**Delivers:** a truthful physical count can match or correct stock, retaining
first/recount evidence instead of forcing agreement with the database.
**Scope:** durable check/submission migration (expected 9), blind UI, compare/
recount/reason/finalization and complete group-count or unknown-breakdown handling.

- [ ] First expected quantity is hidden from text/accessibility/prefill; first
  and recount submissions persist. Match creates a check with no zero event;
  positive/negative discrepancies create real sourced corrections. Total-only
  discrepancy leaves unresolved group composition unknown; complete group count
  can correct groups without FEFO shrinkage guessing.
- [ ] Finalization transaction revalidates event AND batch watermarks; intervening
  sale/restock, offsetting moves or net-zero classification requires refresh/recount,
  retaining prior input/evidence and never blocking genuine sales.
- [ ] Check finalization, adjustment, batch/cost effects and one envelope succeed
  or roll back together at every write. Same/conflicting op replay, store/actor/
  role isolation, package exactness, restart, dirty header/hardware/Cancel and
  recoverable UI failures pass; no full-report accuracy claim or history rewrite.

## M5-05 — Guided owner stock checks and auditable replacements

**Status:** Not started. **Blocked by:** M5-04.
**Delivers:** configurable due checks encourage a manageable daily stock routine.
**Scope:** settings/assignment/attempt/replacement migration (expected 10),
versioned selector, owner due-work/settings UI; no staff dispatch/auth UX.

- [ ] Default target 3 is configurable/pausable with store-local foreground windows;
  due/unfinished work survives restart/day rollover. Selector rotates using
  quick-count/activity/last-check inputs, excludes ordinary nonpositive/inactive/
  non-countable candidates and handles no candidates without fake assignments.
- [ ] Replacement needs a reason, retains original assignment/attempt history and
  avoids immediate repetition; exhausted pool is truthful. Physical zero for
  recorded-positive stock follows discrepancy flow. Repeated replacements do not
  allege theft or imply all inventory is verified.
- [ ] Settings/assignment/replacement operations preserve owner authorization,
  actual actor/device, atomic outbox/replay and store isolation; deterministic
  time/selection, rollback, cold-reopen and accessible retained-error UI tests pass.

## M5-06 — Local attention, remaining-stock expiry and snooze

**Status:** Not started. **Blocked by:** M5-03, M5-04.
**Delivers:** one calm Needs attention list supports real restock/review/removal
and reminders from actual recorded remaining inventory.
**Scope:** condition queries/reorder control, durable snooze/lead-time settings
(expected migration 11), More attention/See All/detail/actions; Home waits M6.

- [ ] Low/zero/negative/discrepancy/remaining expiry and unknown coverage states are
  store-scoped and truthful. Depleted/resolved groups disappear; DAY store-local
  countdown/lead boundaries, MONTH labels, printed meaning and estimated quantity
  tests pass. Current elapsed dates warn without automatic stock removal.
- [ ] Restock routes to actual purchase, Reconcile to checks and Mark expired/removed
  to real adjustment. Later today/Tomorrow/Choose time snooze persists separately
  from inventory, expires when due, and worsening low->zero/negative or date
  severity resurfaces despite earlier suppression. No simulated price alerts.
- [ ] Complete range/projection queries avoid paged-history totals; reads refresh
  after durable writes/focus/resume/date rollover. Settings/snooze action history,
  same/conflicting replay, role/store isolation, rollback/restart and loading/
  empty/error/large-text component paths pass without new financial Home cards.

## M5-07 — Complete evidence and stop for independent audit

**Status:** Not started. **Blocked by:** M5-02, M5-03, M5-04, M5-05, M5-06.
**Delivers:** another agent/laptop can recover the implemented milestone and
review what actually passed. No feature scope expansion.

- [ ] Complete documented validation, Expo Doctor/dependency compatibility and
  Android export pass; fresh/populated-v6 upgrade, migration rollback/row retention,
  rebuilt projections and existing M1–M4 regression suite have recorded commands
  and results. Active workflow schema/date-time/dependencies/artifacts and diff
  checks pass; no secrets/generated builds are committed.
- [ ] Ledger, PROJECT_STATE and M5 workflow record ticket commits, migrations,
  evidence and unresolved risks accurately; physical Galaxy/offline/restart/text/
  native exits, Metro, second-laptop and accounting gates are either actually
  performed with evidence or explicitly carried, never claimed from mocks.
- [ ] Return clean task branch/HEAD/status and structured handoff to coordinator,
  then stop editing. Independent-audit gate remains pending until coordinator
  reviews and accepts; do not start M6, push/merge/deploy or self-accept.

## Evidence log

Planning validation only. No M5 code/tests/migrations/device session performed.
Implementation evidence must be appended per ticket with actual commit and checks.
