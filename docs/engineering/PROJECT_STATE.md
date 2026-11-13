# PROJECT_STATE — COSI

Last updated: 2026-09-28  
Current milestone: M7 independent audit. Local PostgreSQL and endpoint checks
pass, including the stale-reconciliation correction; native-device acceptance remains open.
M8 scanner work remains deferred.

## Current status

M0–M6 source and automated scope is independently accepted. M1 acceptance uses
an explicit device waiver. Physical/release-readiness checks carried from M3–M6
remain pending and are not implied by source acceptance.

M7 initial source work is in commits `66507e6` through `e9ef793` (M7-01
through M7-08). Independent audit found two blocking source gaps; see
`M7_INDEPENDENT_AUDIT.md`. Operation-history bootstrap and pilot app integration
now have local source corrections and passing local server tests. The later
stale-reconciliation finding and native checks keep M7 acceptance open.

## Current verification checkpoint — 2026-09-28

Docker-backed local Supabase is running. Clean reset applied all M7 migrations,
including additive corrections for pgcrypto resolution, revoked-device
re-enrolment and authenticated money-out actor checks. pgTAP passed 81 assertions
across 9 files; scoped database lint and security advisors passed. The live
local Auth → Edge Function → PostgreSQL test passed enrolment, store denial,
idempotent push, pull, bootstrap, stale mutable conflict and sale/purchase graph
replay. Root `npm run validate` passed 503 tests across 52 suites, strict
typecheck and zero-warning lint. Expo Doctor passed 21/21, dependency check
and Android export passed. No hosted service was modified.

The audit reproduced a stale physical count being accepted after a sale on
another device. D-044 and an additive migration now compare a server revision
plus verified same-device predecessors under the store lock. The expanded live
test passes the stale, forged, legacy, valid-predecessor and replay cases; see
`M7_INDEPENDENT_AUDIT.md`. The connected Galaxy A15 has not
been used to claim M7 native acceptance. The M9 isolated implementation now
exists at `plan/m9-price-intelligence`/`1c8de0d`, but final M7 pull/echo
integration and M9-04 remain open. M8 remains deferred.

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

M8 product planning is complex and remains coordinator/Astra-owned. The founder
continues to defer M8. D-043 permits route-local M9 work after M7 acceptance
while M8 is deferred, provided M9 does not alter scanner/navigation contracts.
Recognition Track B research may run in parallel
behind stable contracts and feature flags only after it is deliberately started.
Concurrent writers must not edit shared catalogue, package-unit, sync or
recognition contracts.

## M7 implementation handoff (historical)

`M7_OFFLINE_SYNC_PLAN.md` and `tickets.md` define eight sequential vertical
tickets. Initial source covers the M2–M6 operation families and server
protocol, but its fresh-device bootstrap and app integration do not yet meet
the milestone contract. See `M7_INDEPENDENT_AUDIT.md`.

Initial handoff evidence was 51 suites/484 tests, typecheck, lint, Expo Doctor,
dependency check and Android export. After audit corrections, `npm run
validate` passed typecheck, zero-warning lint and 492 tests across 51 suites;
the focused M7 sync suite passed 14/14. These checks do not close the source
findings or prove PostgreSQL behavior.

Expo Doctor initially found two patch-version mismatches; after aligning
`expo-linking` and `expo-router`, it passed 21/21. Post-update typecheck,
zero-warning lint, focused navigation/startup/sync tests (23/23), and Android
export passed.

Supabase CLI 2.117.0 and Docker Desktop are installed. BIOS virtualization is
enabled and WSL is updated to 2.7.13, but Docker Desktop fails during startup
with stale Unix socket rename errors; `docker info` cannot connect to the
engine. The founder deferred further Docker troubleshooting on 2026-09-27.
No database/RLS/function acceptance is claimed. The two source findings and
their corrections are documented in `M7_INDEPENDENT_AUDIT.md`.

## M7 source correction checkpoint — 2026-09-27 (historical)

- SQLite migration 20 stages ordered bootstrap operations; migration 21 retains
  the exact server revision for conflict review. A new additive Supabase
  migration pages `sync_change_log` to a fixed snapshot revision. No existing
  migrations were rewritten.
- More → Cloud sync now provides pilot owner sign-in/enrolment, foreground runs,
  waiting-work status, manual retry and explicit mutable-conflict choices.
  Supabase Auth sessions use `expo-secure-store`; public project URL/key are
  supplied only through ignored build environment files.
- Focused contract, bootstrap, pilot and navigation tests pass. `npm run
  validate` passed Node/npm/Git checks, strict typecheck, zero-warning lint and
  503 tests across 52 suites (7 contracts, 150 domain, 346 mobile). Expo
  dependency check and Android export passed. A new native build is still required for SecureStore.
- Pull and bootstrap now keep an unresolved local edit intact when further cloud
  changes arrive; focused regression tests cover both paths. Missing cloud
  session and account-check failures also persist a visible sync status.
- The new `supabase/tests/m7_bootstrap_history.sql` pgTAP test is written but
  unrun. Docker remains on hold by founder direction. No real Supabase sign-in,
  Edge Function, migration, two-device or Galaxy test has been performed.

At the 2026-09-27 checkpoint, M9 planning was complete separately at `plan/m9-price-intelligence` commit
`1b37996` in `C:\Users\doyew\Documents\DEV 2\COSI-m9-planning`. Four tickets
and the decision/UX/data boundaries are recorded there. Its plan requires M7
acceptance and revalidation of the final purchase-observation pull contract
before implementation. No M9 agent or production edit has started.

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

Rebuild the Android client for
SecureStore and perform the native-device sync/offline checks. Reconcile the
isolated M9 branch onto accepted M7, then verify M9 pull/echo and M9-04 before
claiming M9 acceptance. Do not start M8.

A continuing agent must first read `AGENTS.md`, this file,
`MULTI_AGENT_WORKFLOW.md`, `IMPLEMENTATION_AUDIT_WORKFLOW.md`, the workflow
index, active workflow, `tickets.md`, the active milestone plan, `DESIGN.md`,
`BUILD_PLAN.md`, relevant architecture documents and decisions. Inspect branch,
HEAD, status and diff before editing.
