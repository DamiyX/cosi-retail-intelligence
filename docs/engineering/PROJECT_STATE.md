# PROJECT_STATE — COSI

Last updated: 2026-09-27  
Current milestone: M9 planning complete in an isolated worktree. M7 independent
audit remains open in the canonical checkout; M8 is deferred by the founder.

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
- M7 Luna Max implementation task: `01a0b7a8-a799-7e42-a762-4f046ff34cfe`
  (initial source handoff complete; coordinator auditing in `COSI-m0`)
- M9 planning worktree: `C:\Users\doyew\Documents\DEV 2\COSI-m9-planning`
  on `plan/m9-price-intelligence`; planning/docs only
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
2026-09-19 the founder explicitly deferred it until this task is switched to
Astra. D-043 allows M9 after M7 acceptance while M8 is deferred because M9 uses
existing Home/Product stack routes and may not alter scanner, camera,
RecognitionService or primary-navigation contracts. M8 remains required before
M12 and beta hardening. Concurrent writers must not edit overlapping shared
catalogue, package-unit, sync or recognition contracts.

## M7 planning checkpoint

`M7_OFFLINE_SYNC_PLAN.md` and the M7 workflow define eight sequential vertical
tickets. They cover every canonical M2–M6 outbox operation, authenticated
store/device enrolment, PostgreSQL idempotency/revisions, push/pull, durable
conflicts, M5 batch/reconciliation/attention behavior, M6 money-out facts and a
consistent second-device bootstrap. Implementation task
`01a0b7a8-a799-7e42-a762-4f046ff34cfe` now owns the canonical checkout; this
planning branch does not claim its completion.

The M7 source audit found blocking bootstrap-reconstruction and app-integration
gaps; see `docs/engineering/M7_INDEPENDENT_AUDIT.md` in the canonical checkout.
Docker Desktop is installed but its engine does not start. The founder deferred
further Docker troubleshooting. M7 has not received source or PostgreSQL
integration acceptance; mocks remain supporting evidence only.

## M9 planning checkpoint

`M9_PERSONAL_PRICE_INTELLIGENCE_PLAN.md`, M9-01 through M9-04 and D-043 are
prepared in the isolated M9 worktree. Inspection confirms M4 already stores the
immutable exact price observations required, so no new business write, outbox
operation or schema migration is planned. Only `VALID` observations produce
exact change claims; estimated/unavailable rows remain in raw history. M9 is
unimplemented and its M7 observation/pull dependency must be revalidated
against the final M7 baseline before production edits.

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

Keep M7 open for the source findings and deferred PostgreSQL gate. Present the
completed M9 plan to the founder before creating an M9 implementation task;
they will choose whether to resume Docker or proceed with M9. If M9 proceeds,
revalidate its M7 dependency against the then-current baseline. Do not start
M8 or M9 implementation from this planning checkpoint.

A continuing agent must first read `AGENTS.md`, this file,
`MULTI_AGENT_WORKFLOW.md`, `IMPLEMENTATION_AUDIT_WORKFLOW.md`, the workflow
index, active workflow, `tickets.md`, the active milestone plan, `DESIGN.md`,
`BUILD_PLAN.md`, relevant architecture documents and decisions. Inspect branch,
HEAD, status and diff before editing.
