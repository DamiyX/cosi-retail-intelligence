# PROJECT_STATE — COSI

Last updated: 2026-09-19  
Current milestone: M7 offline-sync planning checkpoint complete; implementation
awaits assignment and a real non-production Supabase integration environment.
Founder has deferred M8 scanner planning until this coordinator task is
explicitly switched to Astra.

## Current status

M0–M6 source and automated scope is independently accepted. M1 acceptance uses
an explicit device waiver. Physical/release-readiness checks carried from M3–M6
remain pending and are not implied by source acceptance.

M5 closed at coordinator correction `9ba4801` with additive migration 15 durable
reorder-threshold history. M6 implementation commits are `86e526b`, `1cce732`,
`ef47fab`, `1c9a134` and evidence commit `92949a8`. Independent review found and
corrected three material gaps plus one copy issue in `1d8124c`: owner-only summary
authorization, popular-product display, Home as default entry and user-facing
currency wording. See `M5_AUDIT_CORRECTIONS.md` and `M6_AUDIT_CORRECTIONS.md`.

## Active checkout and ownership

- Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m0`
- Canonical remote: `https://github.com/DamiyX/cosi-retail-intelligence`
- Current branch: `feat/m7-offline-sync`
- Coordinator task: `01a098ef-d830-7531-bca7-2d66b0a5b587`
- M6 Luna Max implementation task: `01a0b72e-5fdf-7022-afc8-2e1796f49b66`
  (completed and stopped)
- M6 workflow: `.agents/workflows/m6-expenses-business-summary.json` (archived)
- No push, merge, rebase, deployment, remote-service or cloud-build action was
  performed during M6 implementation/audit. Do not rewrite history.

## Accepted M5/M6 product-change outcome

The single disposition record is `docs/product/PRODUCT_CHANGE_BACKLOG.md`.

- M5 implements minimal expiry groups, automatic assumed FEFO, unknown legacy
  stock, sourced adjustments, blind reconciliation, guided owner checks,
  auditable replacements and real attention/snooze behavior.
- M6 implements owner-only immutable expenses and withdrawals, exact store-local
  daily summaries, truthful credit/cost-coverage language and the calm Home/Today
  surface with current M5 attention and the optional most-frequently-sold fact.
- M1–M4 were not broadly reopened. M5 extended the accepted M4 receipt/inventory
  model through additive migrations while preserving historical costing.
- Global Scan remains M8; personal and market price signals remain M9/M10; staff
  assignment/accountability remains M11.

## M6 independent evidence

- Failing-before audit regressions reproduced missing Home product/default entry
  and STAFF access to owner financial summary; all pass after `1d8124c`.
- Focused M6/navigation checks: PASS — 8 suites, 30 tests.
- `npm run validate`: PASS — strict typecheck, zero-warning lint, 150 domain and
  322 mobile tests (472 total, 49 suites).
- `npm run mobile:doctor`: PASS — 21/21.
- `npm exec --workspace @retail/mobile -- expo install --check`: PASS.
- `npm run mobile:export`: PASS — 1,402 Android modules, 3.6 MB Hermes bundle;
  generated output remains ignored.
- Active workflow/index schema/date-time, gate DAG, artifacts, unchanged
  migrations 1–15, contiguous registry 1–17 and `git diff --check`: PASS.

## Roadmap gate before M7

The roadmap cross-check is complete. M7 must follow `OFFLINE_SYNC.md` and cover
legacy plus extended sale/purchase envelopes, M5 batch/reconciliation/config
facts and M6 expense/withdrawal transactions without inventing feature-specific
sync protocols. M7 does not implement Scan, staff workflows or price signals.

M8 product planning is complex and remains coordinator/Astra-owned. On
2026-09-19 the founder explicitly deferred that planning until this task is
switched to Astra. Production M8 integration begins after M7 source acceptance;
M9 follows M8 in the core app. Recognition Track B research may run in parallel
behind stable contracts and feature flags only after it is deliberately started.
Concurrent writers must not edit shared catalogue, package-unit, sync or
recognition contracts.

## M7 planning checkpoint

`M7_OFFLINE_SYNC_PLAN.md` and `tickets.md` define eight sequential vertical
tickets. They cover every canonical M2–M6 outbox operation, authenticated
store/device enrolment, PostgreSQL idempotency/revisions, push/pull, durable
conflicts, M5 batch/reconciliation/attention behavior, M6 money-out facts and a
consistent second-device bootstrap. No M7 runtime code exists at this checkpoint.

Supabase CLI 2.117.0 is available, but Docker is not installed and no isolated
hosted development project is linked. M7 may not be independently accepted until
PostgreSQL migrations, RLS, functions and retry/conflict behavior run against a
real disposable non-production Supabase environment. Mocks are supporting
evidence only.

## Carried readiness gates

- Actual Galaxy M3–M6 offline sale/restock, attention/expiry, expense/withdrawal,
  Home refresh, force-stop/relaunch, dirty exits and large-text checks remain
  pending. Founder explicitly deferred phone checks on 2026-09-19.
- Existing Galaxy evidence proves M1/M2 only.
- Development-client/Metro verification remains open.
- Second-laptop reproduction remains deferred and required before external beta.
- Professional accounting review precedes formal accounting claims. M7 must
  review concurrent-device reconciliation, costing and batch allocation.

## Next action

Commit the M7 planning checkpoint. Establish Docker-backed local Supabase or an
explicitly authorized isolated hosted development project, then assign M7-01
through M7-08 to one Luna Max implementation task. Do not resume M8 planning
until the founder switches this coordinator task to Astra. M9 planning may be
prepared separately while M7 runs, but production M9 code remains after accepted
M8 because both milestones touch navigation/catalogue selection contracts.

A continuing agent must first read `AGENTS.md`, this file,
`MULTI_AGENT_WORKFLOW.md`, `IMPLEMENTATION_AUDIT_WORKFLOW.md`, the workflow
index, active workflow, `tickets.md`, the active milestone plan, `DESIGN.md`,
`BUILD_PLAN.md`, relevant architecture documents and decisions. Inspect branch,
HEAD, status and diff before editing.
