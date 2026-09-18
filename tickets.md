# Tickets: M4 Offline Restocking + Provisional Costing

**Status:** Implementation complete for source/automated scope; independent audit pending. Founder approved the M4 costing and
screen/state contract on 2026-09-18; D-038 and DESIGN record the approved rules.
Coordinator verified ticket granularity/dependencies under delegated judgment.
**Branch:** feat/m4-restocking-costing. **Accepted baseline:** 66cc64d.
Accepted M3 tickets/evidence are archived in the engineering M3_SALES ledger.

## Execution contract

Coordinator owns planning, dependencies, decisions, workflow registration and
independent audit. Luna max implements approved tickets and assigned fixes,
returning completion for audit. Founder delegated sizing/dependency judgment.

Shared sources: BUILD_PLAN M4, PRD restocking/costing, DOMAIN_DATA_MODEL,
TECHNICAL_ARCHITECTURE, OFFLINE_SYNC, DESIGN, M4_RESTOCKING_COSTING_PLAN and
D-013/D-027/D-028/D-034/D-036/D-037/D-038. Cost/design approval is recorded;
follow these contracts and report contradictions rather than changing them.

Per ticket: relevant domain/repository/component tests, typecheck and
zero-warning lint must pass. Commit separately with ticket ID; record commands,
results, commits and deferred checks. No M5, remote schema/transport, purchase
payments/payables, returns, shared contributions, recognition, push, merge or
deployment. Never edit committed migrations 1-3 or fabricate old sale costs.

## M4-01 — Complete and reopen one offline restock

**Status:** Implementation complete; independent audit pending. **Blocked by:** M3 acceptance (met); M4 approval gate (met).
**Outcome:** Save one product/package with quantity and total cost, increase
stock and reopen its immutable receipt.
**Scope/modules:** Purchase domain, additive SQLite repositories/schema,
record-purchase aggregate, minimal More/restock/receipt screens and tests.
No supplier form, unit-cost mode, multiline cart, reconciliation or sale COGS yet.

- [x] Exact package/base quantity and total/currency validation; immutable names,
  conversion, input basis and normalized rational price. Purchase/item, positive
  inventory event, provisional cost state/movement, private non-contributing
  observation and one outbox aggregate commit atomically. Receipt reads stored
  facts and distinguishes estimated/unavailable cost.
- [x] Populated-M3 upgrade retains all prior rows/history/null costs; rollback
  injection at every aggregate write proves no partial effects. Actor-scoped
  replay returns the original graph without duplicate stock/observation/outbox;
  cross-store/device/member/product/package/currency misuse and conflicting
  operation reuse are rejected without writes.
- [x] UI covers valid save/reopen, exact input errors, retained failed draft,
  retry with same operation ID, duplicate-submit prevention and dirty exits.
  Domain tests cover fractional normalization, zero/negative/unknown-stock
  transitions and overflow. Ticket tests, typecheck and zero-warning lint pass.

**Risks/manual checks:** Native restart/offline proof needs the device gate;
Node/component tests do not provide physical evidence.
**Completion evidence:** Commits `3c4eef9` and `c810f5b` add the offline
purchase aggregate, additive migration 4, atomic inventory/cost/observation/
outbox writes, receipt/history routes, replay protection, conflict rejection,
per-write rollback matrices, populated-M3 upgrade retention, exact costing edge
cases and cold-reopen projection evidence. `npm run validate` passed with 150
domain tests in 5 suites and 206 mobile tests in 23 suites (356 tests / 28
suites), strict typecheck and zero-warning lint. Physical offline/restart,
large-text and independent source acceptance remain pending.

## M4-02 — Restock multiple packages and optionally identify a supplier

**Status:** Implementation complete; independent audit pending. **Blocked by:** M4-01.
**Outcome:** Review/save several lines using total or per-package unit cost,
with optional explicitly selected/created supplier.
**Scope/modules:** Restock cart/normalization, supplier repository, aggregate,
client and tests. Append a migration for new persisted contracts if necessary.
No tender/credit, supplier auto-merge, contacts import or landed costs.

The record-purchase aggregate and Restock screen accept multiple lines,
TOTAL/UNIT normalization and explicit supplier attribution. Supplier names are
store-private and duplicate names remain separate rows.

- [x] Add/edit/remove lines with exact running totals; unit-cost mode rejects
  fractional minor-unit totals while total-cost mode retains fractional derived
  prices. Mixed packages/repeated products process in stable line order using
  transaction-time active-package ownership checks.
- [x] Supplier is store-private and explicit; duplicate names do not merge.
  Receipt attribution survives later supplier/product/package changes. New
  supplier and all purchase effects/envelope commit or roll back together;
  tests inject failure at every multiline write, replay and isolate stores,
  including repeated-product cost updates and safe arithmetic bounds.
- [x] Component tests cover no-match/Quick Add return with retained draft,
  supplier modes, line edits, read retry, package deactivation, overflow and
  dirty header/hardware/tab/Cancel exits. No unhandled initial/follow-up reads;
  ticket tests, typecheck and zero-warning lint pass.

**Risks/manual checks:** Keyboard, dirty exits and large text need device checks.
**Completion evidence:** Commit `b12ff0c` completes the multiline Restock
cart, edit/remove flow, TOTAL/UNIT choice, exact running totals, supplier
selection/creation, retained failed drafts, retry and Quick Add states. Commit
`c810f5b` covers repeated-product/mixed-package rollback and store isolation;
`9ec9075` covers the safe-total overflow state. Focused Restock component
tests pass (8 tests). Physical keyboard/large-text/dirty-exit checks remain
deferred to the carried device gate; independent audit is pending.

## M4-03 — Snapshot available provisional cost on subsequent sales

**Status:** Implementation complete; independent audit pending. **Blocked by:** M4-01.
**Outcome:** Preserve validated receipt-derived basis/estimated COGS on new sales
without changing old sales or blocking unknown-cost checkout.
**Scope/modules:** Cost domain/projection, complete-sale aggregate, additive
immutable sale-basis persistence, receipt/detail display and tests.
No backfill, full profit, alternative costing method or M5 adjustment. M4-02 is
not a logical dependency; this shared-checkout assignment remains sequential.

- [x] Resolve cost inside the sale/items/inventory/outbox transaction; exact
  rational basis/method version and approved per-line rounded COGS are immutable.
  Do not misrepresent a fractional basis in an integer unit-cost field. New
  restocks never change prior snapshots; D-036 arithmetic/tender/credit and
  D-013 genuine overselling remain intact.
- [x] Tests cover remaining-value/average transitions, one-versus-three-unit
  rational examples, half-kobo rounding, zero cost, unknown coverage, overselling
  and replenishment through nonpositive stock. Pre-M4 costs remain null; failure
  and replay cannot partially consume or duplicate stock/cost movements; enforce
  store/device/member isolation and safe bounds.
- [x] Sale detail labels estimated/unavailable cost. Integration tests exercise
  purchase -> sale -> changed-price purchase -> sale, then cold reopen and
  projection rebuild from immutable local movement order with identical basis
  and snapshots. Ticket tests, typecheck and zero-warning lint pass.

**Risks/manual checks:** Professional accounting review and M7 concurrent-device
costing remain separate gates; the method stays provisional.
**Completion evidence:** Commits `3c4eef9` and `c810f5b` add exact rational
weighted-average transitions, immutable sale cost companions, unavailable-cost
handling, conflicting replay rejection, full sale-cost rollback coverage,
rebuild coverage and sale-detail labels. Domain costing tests cover fractional
averages, half-up rounding, zero cost, unknown coverage, overselling,
replenishment and overflow. The full workspace validation passed; M3
historical sale costs remain unchanged/null. Accounting review and independent
audit are still pending.

## M4-04 — Inspect private purchase and original price history offline

**Status:** Implementation complete; independent audit pending. **Blocked by:** M4-02, M4-03.
**Outcome:** Reopen receipts/product purchase-price history with original
package facts, supplier attribution and truthful local sync status.
**Scope/modules:** Store-scoped queries, history/detail/product price UI,
projection verification and tests. No trend charts, market signals or sharing.

- [x] Reads show saved names, quantities, conversion, currency and entered
  total/unit basis plus labelled normalization, supplier and cost availability.
  Later catalogue/supplier changes do not rewrite history; consent stays false.
- [x] Cold-reopen/upgrade tests retain receipts, observations, movements and
  operation IDs. History never substitutes current prices or leaks another
  store's observations. Local ordered projection rebuild matches state without
  treating device timestamps as sole ordering authority.
- [x] Empty/loading/error/retry and detail refresh states are tested; tabs/header/hardware
  Back preserve draft guards and large-text components remain usable. No future
  More action appears implemented. Ticket tests, typecheck and lint pass.

**Risks/manual checks:** Physical offline/history/text-scaling gate remains open.
**Completion evidence:** Commit `b12ff0c` integrates store-scoped original
purchase-price history into ProductDetail with saved package/conversion,
supplier, basis, normalized cost, current cost-availability and contribution
state; error/retry and detail refresh paths are covered by ProductDetail tests.
Commit `c810f5b` proves cold-reopen history/projection preservation and store
isolation. Physical offline/history/text-scale proof and independent audit
remain pending.

## M4-05 — Demonstrate the restock-to-sale workflow and return for audit

**Status:** Automated implementation evidence complete; independent audit and physical evidence pending. **Blocked by:** M4-01, M4-02, M4-03, M4-04.
**Outcome:** Prove the complete workflow and hand back a reproducible source
milestone. This cross-flow verification slice does not substitute independent audit.
**Scope/modules:** Regression/integration evidence, developer/device procedures
and execution ledgers. No new feature scope or readiness waiver.

- [x] Full documented validation passes: domain/mobile tests, typecheck,
  zero-warning lint, Doctor, dependency compatibility, Android export, workflow
  schema/date-time/dependency checks and diff hygiene. Report exact commands,
  results, commits, migrations and unavailable checks.
- [x] Cross-flow tests prove multiline restock -> sale -> changed-price restock
  -> history/projection after reopen; failure/replay produces no partial or
  duplicate effects. Document Galaxy airplane-mode/force-stop/large-text/dirty
  exit procedure; record only physical checks actually performed and preserve
  unpassed carried readiness gates.
- [x] Tickets, PROJECT_STATE and workflow contain actual evidence/deferred risks;
  completed commits leave a clean checkout. Notify coordinating task, mark
  independent audit pending and STOP. Do not self-accept M4 or start M5.

**Risks/manual checks:** Source acceptance and external release readiness are
separate. Only coordinator records independent acceptance.
**Completion evidence:** Commits `b12ff0c`, `c810f5b` and `9ec9075` complete
the source scope. `npm run validate` passed (150 domain tests / 206 mobile
tests; 356 tests / 28 suites), `npm run mobile:doctor` passed 21/21,
`npx expo install --check` passed after the authorized patch updates,
`npm run mobile:export` passed (1,357 Android modules; 3.2 MB Hermes bundle),
the active M3/M4 workflow JSON Schema/date-time/dependency/artifact check
passed, and `git diff --check` passed. The Galaxy M4 offline/restart/history/
large-text/dirty-exit session, development-client/Metro check and second-laptop
reproduction remain unperformed; no device, cloud, push, merge or release
action was performed. The independent audit remains pending; do not self-accept
M4 or begin M5.

**Deferred Galaxy procedure:** On the Galaxy A15 5G (`SM-A156E`), install a
current authorized build, provision a test store/product, record a multiline
restock with supplier, complete a sale, change the purchase price, reopen
history after force-stop and airplane-mode relaunch, exercise Cancel/header/
hardware-Back dirty guards, and repeat at 1.3 text scale. Restore airplane
mode and the original text scale; record build/device IDs and observations.
