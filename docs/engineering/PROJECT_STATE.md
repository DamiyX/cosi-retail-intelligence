# PROJECT_STATE — COSI

Last updated: 2026-09-19  
Current milestone: M5 batch-aware inventory/reconciliation implementation
under D-039/D-040; M5-01 through M5-07 and the requested A01-A11 correction set
are implemented on the same branch. The coordinator completed the first
independent pass at 0a0ea94; coordinator re-audit is still required before any
acceptance claim. Coordinator re-audit of stopped handoff a6f4153 found
A05-R/A08-R/A07-R: unsaved recount finalization, premature snooze resurfacing
and month-precision wording. The checkpoint and all three corrections are now
recorded on the same M5 task. Final re-audit at 9104c49 accepts A05-R/A07-R but
finds A08-R2: a low-stock condition resolved and recreated solely by reorder-
threshold changes inherits its old snooze. Source acceptance remains blocked
pending the same-task correction and coordinator verification. See
M5_AUDIT_CORRECTIONS.md.
Completed engineering milestones: M0; M1 (explicit device waiver); M2 after
independent audit; M3 and M4 source/automated scope after independent audit,
with physical/release readiness gates carried.

## Active checkout and ownership

- Checkout: C:\Users\doyew\Documents\DEV 2\COSI-m0
- Canonical remote: https://github.com/DamiyX/cosi-retail-intelligence
- Branch: feat/m5-inventory-reconciliation. Documentation checkpoint before
  corrections: ff7cc33. M5-01 implementation commit: f453b0a. M5-02 implementation commits:
  ea8bfbd, 79a9c23, 5bd7b2d and ca3cc99. M5-03 implementation commits:
  1fe9f91 and 8f35238. M5-04 implementation commit: f347d99. M5-05
  implementation commit: 8142700. M5-06 implementation commit: f8d63d7.
  M5-07 route/schema harness correction: af475c2. Audit correction commits:
  A01 0d76093, A02 272b144, A03 0665504, A04 d326ec4, A05 86c8644, A06
  b9a12fa, A07 3c81bc9, A08 9dd032d, A09 0db8846, A10 86de529, A01 receipt
  snapshot follow-up 629b027, and A11 4e8e81c. Coordinator re-audit checkpoint:
  7ccf672. A05-R correction: 985478c. A08-R/A07-R corrections: de5cb2c.
  Final ledger/workflow evidence is recorded in the correction return
  documentation commit.
- Accepted M3 checkpoint: 66cc64d; approved M4 plan/contract checkpoint: db5a835.
- Coordinator task 01a098ef-d830-7531-bca7-2d66b0a5b587 owns product review,
  plans, tickets, workflow registration and independent acceptance. M5
  implementation task 01a0b525-289e-7b40-8f4b-2701fe541ad9 owns implementation
  and assigned audit corrections on this branch and must stop now for
  coordinator re-audit. Implementation and independent audit run sequentially.
  Active workflow is
  .agents/workflows/m5-inventory-reconciliation.json; M4 workflow is archived.
- M0 PR #1 remains open; main is at a393498 and milestone branches are stacked.
  No push, merge, rebase, deployment, remote-service or cloud-build action was
  performed during M4 implementation/audit. Do not rewrite history.

## M4 accepted source outcome

M4 delivers durable offline multiline purchases/restocking, supplier inputs,
immutable receipt/conversion/cost snapshots, private price observations,
provisional moving-average costing and historical sale-cost companions.
Purchase, inventory, cost and outbox effects commit atomically and replay
idempotently. Receipt history and product purchase-price history are available.

The coordinator accepted source/automated scope at 9700ee3 on 2026-09-18 after
A1–A6 and A4-R/A3-R/A6-R correction cycles. Final corrections: c30d3f7
(parent sale-cost consistency), 9535451 (contextual Quick Add retry) and
c91d16a (exact merchant-readable large-value estimates). Migrations 4, 5 and 6
are additive; migrations 1–5 registry entries remain unchanged by migration 6.
Historical receipts/COGS are not rewritten. D-038 records approved engineering
precision/coverage; D-027 remains provisional for financial interpretation.

Independent checks at 9700ee3:

- npm run validate: PASS — strict typecheck, zero-warning lint, 150 domain
  tests / 5 suites and 217 mobile tests / 23 suites (367 tests total).
- npm run mobile:doctor: PASS — 21/21.
- npm run mobile:export: PASS — 1,357 Android modules, 3.2 MB Hermes bundle;
  generated dist is ignored.
- Real SQLite populated-M3-to-v6 reproduction: typed/raw contradictory
  AVAILABLE cost companions rejected; original NULL historical COGS retained.
- Routed Quick Add retry and exact display boundaries verified. See
  docs/engineering/M4_AUDIT_CORRECTIONS.md for comparisons and evidence.

The implementation also reports Expo dependency compatibility and active
workflow validation; distinguish those runs from independent auditor runs.
The active workflow records the source acceptance and carried readiness gate.
The historical M2 workflow has its previously recorded tests-and-review schema
limitation; do not silently rewrite closed milestone evidence.

## Product change review and next gate

The single change record is docs/product/PRODUCT_CHANGE_BACKLOG.md. Founder
approved expanded M5 blind-first owner stock checks, configurable default
three/day, auditable replacements, local attention/snooze, changed-stock recount
protection and conservative shortage/unexplained-surplus costing. Founder
requires expiry alerts in the first real-shop pilot/MVP/prototype.

Current stock is a product-level event ledger; M5 is adding rebuildable
lot/expiry explanations without creating a second stock truth.
Founder resolved minimal batch capture and automatic assumed FEFO without
normal sale batch confirmation, with unknown stock and truthful coverage.
D-039/D-040, PRD, domain/technical/offline sources and DESIGN now record approved
behavior. Coordinator prepared M5_INVENTORY_RECONCILIATION_PLAN and seven
rolling tickets; M5-01 landed migration 7 and the accepted M4 ledger remains
archived unchanged in engineering/tickets/M4_RESTOCKING_COSTING.md. M5-02 adds
owner-only unknown-stock classification, immutable correction history, watermark
protection and the retained-input review route without inventory or cost
mutation. M5-03 landed migration 8, sourced adjustments, exact cost/batch/outbox
effects, multi-product atomicity and populated-v7 cost-row retention. M5-04
landed migration 9, blind first/recount evidence, dual-watermark finalization,
complete group counts and sourced reconciliation corrections. M5-05 landed
migration 10, owner-only guided-check settings/assignments/attempts/replacements,
deterministic due work, auditable replacement history and atomic reconciliation
completion. M5-06 landed migration 11, store-scoped attention conditions,
remaining DAY/MONTH expiry warnings, owner settings and immutable snooze history
with durable local-time replay/outbox behavior; More -> Needs attention routes
to existing purchase, check and adjustment flows. The A01-A10 correction set
then sealed completed batch graphs, corrected FEFO/unknown allocation and
reclassification, completed reconciliation review/resume and expiry/attention/
replay refresh contracts; 629b027 binds multiline receipt validation to package
snapshots; and 4e8e81c adds migration 14 plus the owner/store-scoped exact-unit
reorder-threshold set/clear path with atomic versioned outbox handling. No M4
reopening or M6 work.

Planning schema/dependency/artifact checks and unchanged M4 archive passed;
the documentation checkpoint is committed separately before correction work.
M5-01 now has schema, service, UI, restart/replay and focused SQLite
evidence; M5-02 now has classification/correction service, UI, replay,
watermark, authorization and write-boundary evidence. M5-03 now has sourced
adjustment, cost, batch, outbox, migration-retention, multi-product and UI
evidence. M5-04 now has blind UI, first/recount, dual-watermark, group-count,
reconciliation-cost, replay and rollback evidence. M5-05 now has guided-check
settings/assignment/replacement, reconciliation handoff, replay and rollback
evidence. M5-06 now has attention derivation, expiry precision, snooze/settings
replay, ownership, rollback/restart, accessible action routing and retained
input evidence. M5-07 completed full validation, Expo Doctor, dependency
compatibility, Android export, workflow/schema/artifact checks and the route-map
warning correction. Coordinator independent audit at 0a0ea94 reproduced material
contract failures despite 410 passing tests, Doctor 21/21 and Android export.
The coordinator checkpoint was committed separately before the three return
corrections. A05-R now blocks unsaved or invalid recount evidence from
finalization and preserves deliberate retry IDs; A08-R now rebuilds stable
attention episodes from durable event/batch history; A07-R now uses interval-
aware MONTH wording while preserving DAY wording. Focused regressions pass:
10/10 reconciliation-correction tests and 8/8 attention tests. Latest full
validation passes with 5 domain suites/150 tests and 37 mobile suites/294 tests
(444 total), strict typecheck, zero-warning lint, Doctor 21/21, dependency
compatibility, Android export and active workflow/index/migration checks. See
M5_AUDIT_CORRECTIONS.md for the original findings and return evidence.
Independent acceptance remains blocked and implementation evidence remains
pending coordinator review; this task does not self-accept. Next: coordinator
re-audit A01-A11 and A05-R/A08-R/A07-R on this same task/branch.
No M6 yet. Live Home remains proposed M6,
global Scan navigation M8, real price signals M9/M10 and staff review M11.

## Carried readiness gates

- Actual Galaxy M3/M4/M5 offline sale/restock, attention/expiry, force-stop/
  relaunch, history, cost-availability, dirty header/hardware exits and
  large-text checks remain unperformed. adb is available but was not used during
  this implementation handoff.
- Founder explicitly deferred phone checks on 2026-09-19. Keep these pending
  before pilot/beta/native-release readiness; M6 source work can follow M5
  independent acceptance and M6 planning without claiming device readiness.
- M1/M2 evidence only: Galaxy A15 5G SM-A156E, Android 16, 1080×2340; preview
  90c3fd47-e9be-49cb-bdbc-f9ab649f3c34, version 0.0.1/code 1, APK SHA-256
  687F787730E437DEEE1CAC4353192C2B7A44313EF2EBE92FDFC41261A4FEDA7C.
  Test store/product survived force-stop and airplane-mode relaunch and rendered
  at 1.3 text scale. Connectivity and original scale were restored; no real
  retailer/production data was used. This is not M3/M4 proof.
- EAS development build 1110cf51-6cfb-4b11-99af-c63e356bf9e4 completed, but an
  interrupted local APK download was corrupted and rejected before installation.
  Development-client/Metro verification remains open.
- Second-laptop clean reproduction is explicitly deferred, still required before
  external beta. Existing dependency audit baseline remains recorded separately.
- Professional accounting review precedes formal accounting claims. M7 must
  review concurrent-device reconciliation, costing and batch allocation.
- First pilot requires the approved expiry capability; source acceptance does
  not waive that new product requirement.

Source continuation is allowed under the existing waiver. These gates are not
passed and external beta/native-release readiness is not approved.

## Continuity

Read AGENTS.md, workflow index and active M5 record, project-context, tickets.md,
M5_INVENTORY_RECONCILIATION_PLAN.md, DESIGN, M4_AUDIT_CORRECTIONS.md, the product
change record, BUILD_PLAN and D-039/D-040 plus relevant prior decisions.
Accepted M3 tickets are archived in docs/engineering/tickets/M3_SALES.md.
Inspect branch, HEAD, status and diff before editing. Git and repository records
must remain sufficient without prior chat history.
