# PROJECT_STATE — COSI

Last updated: 2026-09-18  
Current milestone: M5 batch-aware inventory/reconciliation planning package
prepared under D-039/D-040. M5 implementation and delegation have not started.  
Completed engineering milestones: M0; M1 (explicit device waiver); M2 after
independent audit; M3 and M4 source/automated scope after independent audit,
with physical/release readiness gates carried.

## Active checkout and ownership

- Checkout: C:\Users\doyew\Documents\DEV 2\COSI-m0
- Canonical remote: https://github.com/DamiyX/cosi-retail-intelligence
- Branch: feat/m4-restocking-costing. Reviewed source HEAD:
  9700ee32dc6fe6db05ddafed65a4ce170db54f31. Later documentation-only audit
  commits do not change this source checkpoint; inspect Git for current HEAD.
- Accepted M3 checkpoint: 66cc64d; approved M4 plan/contract checkpoint: db5a835.
- Coordinator task 01a098ef-d830-7531-bca7-2d66b0a5b587 owns product review,
  plans, tickets, workflow registration and independent acceptance. Separate
  Luna max task 01a0b1a5-4512-79f0-ae55-58d39559944d implemented M4 and
  assigned fixes, then stopped. Implementation and independent audit run
  sequentially. No M5 assignment has been issued. Active workflow is
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

Current stock is a product-level event ledger, with no lot/batch expiry balances.
Founder resolved minimal batch capture and automatic assumed FEFO without
normal sale batch confirmation, with unknown stock and truthful coverage.
D-039/D-040, PRD, domain/technical/offline sources and DESIGN now record approved
behavior. Coordinator prepared M5_INVENTORY_RECONCILIATION_PLAN and seven
unstarted rolling tickets; accepted M4 ledger is archived unchanged in
engineering/tickets/M4_RESTOCKING_COSTING.md. Expected new migrations 7–11
are a plan only; schema/source still ends at v6. No M4 reopening or M5 code.

Planning schema/dependency/artifact checks and unchanged M4 archive passed;
no runtime/configuration diff. Planning documentation checkpoint is discoverable
in Git history once committed. Next: create the task branch and a NEW separate
implementation task after review. Current approved model
default is Luna max; coordinator recommends Terra max for M5 complexity, but
no model change or dispatch is assumed. Implementer stops after M5-07 for
coordinator independent audit. No M6 yet. Live Home remains proposed M6,
global Scan navigation M8, real price signals M9/M10 and staff review M11.

## Carried readiness gates

- Actual Galaxy M3/M4 offline sale/restock, force-stop/relaunch, history,
  cost-availability, dirty header/hardware exits and large-text checks remain
  unperformed. adb is available but was not used during this review.
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
