# PROJECT_STATE — COSI

Last updated: 2026-09-19  
Current milestone: M6 expenses, withdrawals and business summary planning.

## Current status

M0–M5 source and automated scope is independently accepted. M1 acceptance uses
an explicit device waiver. Physical/release-readiness checks carried from M3–M5
remain pending and are not implied by source acceptance.

M5 closed after the implementation task returned A08-R3 at `d9a222a`. The
coordinator independently verified it and made the founder-authorized final
correction directly: additive migration 15 stores immutable reorder-threshold
history outside the sync outbox lifecycle. See
`docs/engineering/M5_AUDIT_CORRECTIONS.md` and the archived M5 workflow.

## Active checkout and ownership

- Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m0`
- Canonical remote: `https://github.com/DamiyX/cosi-retail-intelligence`
- Current branch while this record is authored: `feat/m5-inventory-reconciliation`
- Canonical implementation sequence: M0 through M13 in `BUILD_PLAN.md`
- Coordinator task: `01a098ef-d830-7531-bca7-2d66b0a5b587`
- M5 implementation task: `01a0b525-289e-7b40-8f4b-2701fe541ad9` (stopped)
- M5 workflow: `.agents/workflows/m5-inventory-reconciliation.json` (archived)
- No push, merge, rebase, deployment, remote-service or cloud-build action was
  performed during M5 acceptance. Do not rewrite history.

## M5 accepted outcome

M5 adds minimal batch-aware inventory while retaining the product inventory
ledger as the stock source of truth:

- automatic assumed FEFO allocation with unknown residual stock;
- immutable receipt groups and progressive stock classification;
- sourced adjustments and real expired-stock removal;
- blind reconciliation with optional recount and immutable evidence;
- guided owner checks and auditable replacement attempts;
- current-truth attention, expiry precision and durable snooze behavior;
- exact store-scoped reorder thresholds; and
- immutable migration-15 reorder-threshold history independent of outbox
  retention.

The correction history includes A01–A11, A05-R, A07-R, A08-R, A08-R2 and
A08-R3. The final coordinator correction does not reopen M4 transaction or
costing invariants and does not add M6 runtime behavior.

Independent final evidence:

- `npm run validate`: PASS — strict typecheck, zero-warning lint, 150 domain
  tests and 299 mobile tests (449 total, 42 suites).
- Focused M5 migration/attention/reorder/adjustment/batch/sales suites: PASS —
  63/63 tests.
- Populated-v14-to-v15 real SQLite migration/backfill probe: PASS.
- `npm run mobile:doctor`: PASS — 21/21.
- `npm exec --workspace @retail/mobile -- expo install --check`: PASS.
- `npm run mobile:export`: PASS — 1,383 Android modules, 3.5 MB Hermes bundle;
  generated output remains ignored.
- Workflow/index JSON Schema and date-time validation, gate dependency graph,
  artifact existence, contiguous migration registry 1..15 and
  `git diff --check`: PASS.

## M6 planning boundary

M6 is limited to owner-only offline expense and withdrawal records, truthful
store-local daily business summaries, and the calm Home/Today operating surface
approved in D-041. It includes real M5 attention and a stable optional
most-frequently-sold product fact.

M6 must not call sales value profit, combine owner withdrawals with expenses,
include speculative price intelligence, redesign global scan navigation, begin
sync, or start M7. Price movement remains M9/M10; unified Scan remains M8; staff
accountability remains M11.

The coordinator owns M6 plan, design contract, tickets, workflow registration
and independent audit. A separate Luna Max task will own M6 implementation in
this checkout after the planning checkpoint is committed.

## Carried readiness gates

- Actual Galaxy M3–M5 offline sale/restock, attention/expiry, force-stop/relaunch,
  dirty exits, history, cost availability and large-text checks remain pending.
- Founder explicitly deferred phone checks on 2026-09-19. Source continuation is
  allowed; these checks remain required before pilot/beta/native-release claims.
- Existing Galaxy evidence proves M1/M2 only: Galaxy A15 5G SM-A156E, Android 16,
  preview APK installed and verified offline/restart at that earlier scope.
- Development-client/Metro verification remains open.
- Second-laptop clean reproduction is explicitly deferred and remains required
  before external beta.
- Professional accounting review precedes formal accounting claims. M7 must
  review concurrent-device reconciliation, costing and batch allocation.

## Next action

Commit the final M5 correction and acceptance record, create
`feat/m6-expenses-business-summary`, publish the M6 plan/design/tickets/workflow,
then start one separate Luna Max implementation task. That task implements only
M6-01 through M6-05 sequentially and stops for coordinator audit before M7.

A continuing agent must first read `AGENTS.md`, this file,
`MULTI_AGENT_WORKFLOW.md`, `IMPLEMENTATION_AUDIT_WORKFLOW.md`, the workflow
index, active workflow, `tickets.md`, the active milestone plan, `DESIGN.md`,
`BUILD_PLAN.md`, relevant architecture documents and decisions. Inspect branch,
HEAD, status and diff before editing.
