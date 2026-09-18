# Tickets: M5 Inventory, Batch Awareness and Reconciliation

**Status:** M5-01 through M5-07 are implemented on the implementation branch and
await independent audit. The implementation task is stopped at the audit gate.
Batch direction was explicitly approved 2026-09-18. The acceptance boxes below
are implementation evidence only and are not independent acceptance.
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

- Commit: `f453b0a` (`feat(M5-01): add automatic batch-aware receipts and FEFO`).
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

**Status:** Implemented; awaiting independent audit. **Blocked by:** coordinator audit gate.
**Delivers:** unknown stock becomes usefully dated through optional physical review
without recreating purchases or changing total stock/cost.
**Scope:** durable inspection facts and net-zero group classification, correction
history, product group-review UI with retained input/retry and actual watermark.

- [x] Classify existing 40 as 10/30 dated groups without product InventoryEvent,
  duplicate opening stock, cost movement, receipt/observation/COGS mutation;
  partial review retains unknown remainder and time-specific evidence.
- [x] Correcting date/breakdown appends classification history; group totals,
  unknown residual and immutability survive rebuild/reopen. Changed movement/
  classification watermark rejects stale review even if total is unchanged.
- [x] Same operation replays original result; changed count/date/group input,
  invalid totals, wrong store/device/inactive member or STAFF management fail
  without side effects. All-write rollback and dirty exit/read-retry UI pass.

**Implementation evidence (awaiting independent audit):**

- Commits: `ea8bfbd` (`feat(M5-02): add owner batch classification`),
  `79a9c23` (`fix(M5-02): support classification corrections`), `5bd7b2d`
  (`test(M5-02): cover classification authorization boundaries`) and `ca3cc99`
  (`fix(M5-02): authorize classification replays`).
- Added owner-only physical classification and correction commands using schema
  v7 net-zero batch operations. Unknown residual classification and complete
  named-breakdown replacement create immutable inspected groups and signed
  entries without inventory events, cost movements, or receipt rewrites.
  Inventory and batch watermarks reject stale review; same-operation replay
  returns the original graph and conflicting input is rejected.
- Added the More -> Review expiry stock route with product selection, retained
  pending groups on durable failure, dirty-navigation protection, partial
  unknown review, and correction mode that preserves prior group facts.
- `apps/mobile/__tests__/m5Classification.test.ts`: 4 passing service tests
  covering net-zero classification, correction history, stale watermarks,
  owner/store/device/member isolation, replay/conflict and every-write rollback.
  `apps/mobile/__tests__/m5InventoryReview.test.tsx`: 3 passing UI tests for
  partial classification/correction and retained failure input. Mobile
  typecheck, zero-warning lint and `git diff --check` pass. Physical Android,
  independent audit and full M1-M4 regression evidence remain outstanding.

## M5-03 — Record stock adjustments and actual expired removal

**Status:** Implemented; awaiting independent audit. **Blocked by:** coordinator audit gate.
**Delivers:** real loss/addition/expiry removal is recorded, with truthful cost
availability, rather than silently overwriting stock or dismissing an alert.
**Scope:** sourced adjustment/line migration and cost vocabulary extension
(expected 8), exact adjustment cost/rebuild, shared transaction writer and manual
adjustment/group removal UI; historical dates/costs remain immutable.

- [x] Supported nonzero reasoned adjustments create sourced aggregate/line,
  InventoryEvent, matching batch effects, exact cost movement/projection and one
  outbox atomically; removing selected expired stock decreases its actual recorded
  remainder. Date passage/dismissal alone never changes inventory.
- [x] Fully covered shortages consume proportional exact MWA value; unknown/
  excessive shortages, nonpositive remainder and unexplained additions have
  truthful unavailable coverage. Classification changes no cost. Live and rebuilt
  cost states agree; original M4 rows/IDs/order/values/COGS remain unchanged through
  the transactional cost-table CHECK extension and populated upgrade.
- [x] All-write rollback, raw relationship/immutability constraints, ownership/
  OWNER versus ADMIN/STAFF, stale selected-group removal, same/conflicting replay,
  cold reopen and retained UI failure paths pass alongside existing M1–M4 tests.

**Implementation evidence (awaiting independent audit):**

- Commits: `1fe9f91` (`feat(M5-03): add sourced inventory adjustments`) and
  `8f35238` (`fix(M5-03): support multi-product adjustments`).
- Added schema v8 sourced adjustment aggregates/lines and immutable relationship
  guards; migrated the M4 cost movement table transactionally to support
  `ADJUSTMENT` while preserving existing rows. Adjustment commands now write the
  aggregate, line, inventory event, exact batch allocation, cost transition and
  one outbox envelope atomically, with owner authorization, replay conflict
  checks, selected-group watermarks and truthful known/unknown/unavailable cost
  coverage.
- Added More -> Record adjustment with reason, add/remove direction, selected
  group removal, retained input on durable failure, focus refresh and dirty
  navigation protection. Multi-product commands use distinct event allocation
  sources under one outbox operation.
- `apps/mobile/__tests__/m5Adjustments.test.ts`: 5 passing SQLite tests covering
  exact MWA removal, unknown/addition/excessive coverage, multi-product atomic
  envelopes, replay/authorization/stale-group/immutability/rollback/reopen and
  populated-v7 migration retention. `apps/mobile/__tests__/m5AdjustmentScreen.test.tsx`:
  2 passing UI tests. M5 focused suites: 21 passing tests; focused purchase,
  sales and restock regression: 49 passing tests. Mobile typecheck, zero-warning
  lint and `git diff --check` pass. Physical Android, independent audit and
  full-repository validation remain outstanding.

## M5-04 — Blind count and reconcile recorded differences

**Status:** Implemented; awaiting independent audit. **Blocked by:** coordinator audit gate.
**Delivers:** a truthful physical count can match or correct stock, retaining
first/recount evidence instead of forcing agreement with the database.
**Scope:** durable check/submission migration (expected 9), blind UI, compare/
recount/reason/finalization and complete group-count or unknown-breakdown handling.

- [x] First expected quantity is hidden from text/accessibility/prefill; first
  and recount submissions persist. Match creates a check with no zero event;
  positive/negative discrepancies create real sourced corrections. Total-only
  discrepancy leaves unresolved group composition unknown; complete group count
  can correct groups without FEFO shrinkage guessing.
- [x] Finalization transaction revalidates event AND batch watermarks; intervening
  sale/restock, offsetting moves or net-zero classification requires refresh/recount,
  retaining prior input/evidence and never blocking genuine sales.
- [x] Check finalization, adjustment, batch/cost effects and one envelope succeed
  or roll back together at every write. Same/conflicting op replay, store/actor/
  role isolation, package exactness, restart, dirty header/hardware/Cancel and
  recoverable UI failures pass; no full-report accuracy claim or history rewrite.

**Implementation evidence (awaiting independent audit):**

- Commit: `f347d99` (`feat(M5-04): add blind reconciliation checks`).
- Added schema v9 sessions, immutable first/recount submissions and group-count
  evidence, hidden expected snapshots, event/batch watermarks, reconciliation
  finalization references and raw relationship/immutability guards.
- Added owner-only start/count/recount/finalization/cancel services. Matching
  counts complete with no zero event; total-only discrepancies create sourced
  `RECONCILIATION` corrections and move named composition to unknown; complete
  group counts correct recorded groups directly without FEFO shrinkage guessing.
  Finalization revalidates both watermarks, applies exact adjustment cost/batch
  effects and one `RECONCILIATION_FINALIZED` envelope atomically, with replay and
  conflict protection.
- Added More -> Check stock blind UI and route with no expected-quantity render or
  prefill, retained failure input, focus refresh, cancel and dirty navigation
  handling. `apps/mobile/__tests__/m5Reconciliation.test.ts`: 6 passing SQLite
  tests; `m5ReconciliationScreen.test.tsx`: 2 passing UI tests. M5 focused run:
  7 suites, 29 tests. Focused purchase/sales/restock regression: 3 suites, 49
  tests. Typecheck, zero-warning lint and `git diff --check` pass. Physical
  Android, independent audit and full-repository validation remain outstanding.

## M5-05 — Guided owner stock checks and auditable replacements

**Status:** Implemented; awaiting independent audit. **Blocked by:** coordinator audit gate.
**Delivers:** configurable due checks encourage a manageable daily stock routine.
**Scope:** settings/assignment/attempt/replacement migration (expected 10),
versioned selector, owner due-work/settings UI; no staff dispatch/auth UX.

- [x] Default target 3 is configurable/pausable with store-local foreground windows;
  due/unfinished work survives restart/day rollover. Selector rotates using
  quick-count/activity/last-check inputs, excludes ordinary nonpositive/inactive/
  non-countable candidates and handles no candidates without fake assignments.
- [x] Replacement needs a reason, retains original assignment/attempt history and
  avoids immediate repetition; exhausted pool is truthful. Physical zero for
  recorded-positive stock follows discrepancy flow. Repeated replacements do not
  allege theft or imply all inventory is verified.
- [x] Settings/assignment/replacement operations preserve owner authorization,
  actual actor/device, atomic outbox/replay and store isolation; deterministic
  time/selection, rollback, cold-reopen and accessible retained-error UI tests pass.

**Implementation evidence (awaiting independent audit):**

- Commit: `8142700` (`feat(M5-05): add guided owner stock checks`).
- Added schema v10 settings, assignments, attempts and auditable replacement
  history, plus reconciliation linkage and raw relationship/immutability guards.
  The owner-only guided-check service implements deterministic store-local
  selection, default target three, pause/window settings, pending-work rollover,
  replacement reasons, exhausted pools, replay/conflict protection and one
  outbox envelope per durable operation. Physical zero continues through the
  existing blind reconciliation discrepancy path and finalization closes the
  guided assignment/attempt atomically.
- Added More -> Guided checks settings/due-work/replacement UI and the
  reconciliation handoff, with retained settings/replacement failure input,
  dirty-navigation protection and accessible controls. No accuracy or theft
  claim is presented.
- `apps/mobile/__tests__/m5GuidedChecks.test.ts`: 6 passing SQLite tests;
  `m5GuidedChecksScreen.test.tsx`: 2 passing UI tests. M5 focused run: 9 suites,
  37 tests. Focused purchase/sales/restock regression: 3 suites, 49 tests.
  Full `npm run validate` passed at the M5-05 checkpoint: domain 5 suites/150
  tests and mobile 32 suites/255 tests; root typecheck, zero-warning lint and
  `git diff --check` passed. The later M5-07 route-map correction (`af475c2`)
  removes the extraneous-screen warnings from the full navigation harness.
  Physical Android, development-build/Metro, second-laptop, accounting and
  independent-audit evidence remain outstanding.

## M5-06 — Local attention, remaining-stock expiry and snooze

**Status:** Implemented; awaiting independent audit. **Blocked by:** coordinator audit gate.
**Delivers:** one calm Needs attention list supports real restock/review/removal
and reminders from actual recorded remaining inventory.
**Scope:** condition queries/reorder control, durable snooze/lead-time settings
(expected migration 11), More attention/See All/detail/actions; Home waits M6.

- [x] Low/zero/negative/discrepancy/remaining expiry and unknown coverage states are
  store-scoped and truthful. Depleted/resolved groups disappear; DAY store-local
  countdown/lead boundaries, MONTH labels, printed meaning and estimated quantity
  tests pass. Current elapsed dates warn without automatic stock removal.
- [x] Restock routes to actual purchase, Reconcile to checks and Mark expired/removed
  to real adjustment. Later today/Tomorrow/Choose time snooze persists separately
  from inventory, expires when due, and worsening low->zero/negative or date
  severity resurfaces despite earlier suppression. No simulated price alerts.
- [x] Complete range/projection queries avoid paged-history totals; reads refresh
  after durable writes/focus/resume/date rollover. Settings/snooze action history,
  same/conflicting replay, role/store isolation, rollback/restart and loading/
  empty/error/large-text component paths pass without new financial Home cards.

**Implementation evidence (awaiting independent audit):**

- Commit: `f8d63d7` (`feat(M5-06): add local attention and snooze`). Added
  migration 11 attention settings/snooze history with store/device/member and
  immutable-history guards; current-truth attention derivation for stock,
  discrepancy, unknown coverage and DAY/MONTH expiry; owner settings/snooze
  writes with one canonical outbox envelope, replay/conflict protection and
  durable local-time due handling; More -> Needs attention with accessible
  loading/empty/error/retry, retained settings input and actions into existing
  purchase/check/adjustment flows.
- `apps/mobile/__tests__/m5Attention.test.ts`: 3 SQLite tests covering all
  condition kinds, store-local date rollover, no automatic expiry removal,
  snooze due/worsening behavior, settings/snooze replay/conflict, owner/store
  isolation, rollback, restart and migration v11 persistence.
  `m5AttentionScreen.test.tsx`: 2 component tests covering real low-stock
  action routing, snooze feedback and retained settings input after failure.
  M5 focused run: 11 suites, 42 tests; navigation route tests: 12 tests.
- Physical Android, development-build/Metro, second-laptop, accounting and
  independent-audit evidence remain outstanding; no Home/M6 cards were added.

## M5-07 — Complete evidence and stop for independent audit

**Status:** Implemented; awaiting independent audit. **Blocked by:** coordinator audit gate.
**Delivers:** another agent/laptop can recover the implemented milestone and
review what actually passed. No feature scope expansion.

- [x] Complete documented validation, Expo Doctor/dependency compatibility and
  Android export pass; fresh/populated-v6 upgrade, migration rollback/row retention,
  rebuilt projections and existing M1–M4 regression suite have recorded commands
  and results. Active workflow schema/date-time/dependencies/artifacts and diff
  checks pass; no secrets/generated builds are committed.
- [x] Ledger, PROJECT_STATE and M5 workflow record ticket commits, migrations,
  evidence and unresolved risks accurately; physical Galaxy/offline/restart/text/
  native exits, Metro, second-laptop and accounting gates are either actually
  performed with evidence or explicitly carried, never claimed from mocks.
- [x] Return clean task branch/HEAD/status and structured handoff to coordinator,
  then stop editing. Independent-audit gate remains pending until coordinator
  reviews and accepts; do not start M6, push/merge/deploy or self-accept.

**Implementation evidence (awaiting independent audit):**

- Validation commits: `f8d63d7` (M5-06) and `af475c2` (M5-07 route/schema
  harness correction). Migration history is additive through v11: v7 receipt
  groups, v8 adjustments, v9 reconciliation, v10 guided checks, v11 attention.
- `npm run validate` PASS: environment pinned Node 24.21.0/npm 11.19.0/git
  2.55.0 with adb available; domain 5 suites/150 tests; mobile 34 suites/260
  tests; strict typecheck and zero-warning lint. Focused M1-M4 purchase/sales/
  restock regression PASS: 3 suites/49 tests. M5 focused run PASS: 11 suites/
  42 tests. Populated-v6/v7 migration retention, rollback, reopen and rebuilt
  projection/cost evidence is included in the M5 batch/adjustment suites.
- `npm run mobile:doctor` PASS 21/21; `npm exec --workspace @retail/mobile --
  expo install --check` PASS with dependencies up to date; `npm run mobile:export`
  PASS with 1,381 Android modules and a 3.5 MB Hermes bundle. Generated
  `apps/mobile/dist` remains ignored and untracked. Active workflow/index JSON
  validation PASS: schema/date-time, 7-gate dependency graph, 13 registered
  artifacts and contiguous migration registry 1..11; `git diff --check` PASS.
- Physical Galaxy/offline/restart/text-scale/native-exit, development-client/
  Metro, second-laptop, cloud, deployment, push/merge and professional
  accounting checks were not performed and remain carried. Independent audit
  is pending; no M6 work started.

## Evidence log

M5-01 through M5-07 implementation and validation evidence is recorded above.
Physical/device, release, accounting and independent-audit evidence must not be
inferred from local tests.
