# PROJECT_STATE — COSI

Last updated: 2026-09-28 15:37 UTC  
Current milestone: M7 independent audit and recoverable Git handoff. M8 remains deferred by founder direction; isolated M9 work must not be integrated before M7 acceptance.

## Where we are

M0–M6 source and automated scope is independently accepted, with carried physical-device and second-laptop release checks. M7 implementation commits `66507e6` through `e9ef793` and initial audit commit `1b2b100` are on `feat/m7-offline-sync` in `C:\Users\doyew\Documents\DEV 2\COSI-m0`. The working tree contains reviewed, uncommitted M7 corrections. Generated root `app.json` is untracked and must not enter the handoff.

D-044 rejects cross-device stale physical reconciliations. D-045 restores server-authoritative store, user, member and device references before fresh-device replay and during later pull. The source corrections now cover operation-history pagination, missing historical actors, revoked-device attribution, new-device pull, local cost-order collisions and M5 semantics. Bootstrap and pull stage reference updates with facts in one SQLite transaction, temporarily satisfying legacy ACTIVE insert triggers and restoring authoritative statuses before commit. This preserves same-store provenance without permitting a revoked device to start a new local command; server push and the reference-context endpoint require active membership/device authorization. See `M7_INDEPENDENT_AUDIT.md` for review evidence and limits.

## Verified evidence

- Coordinator reran `npm run validate`: environment, strict typecheck, zero-warning lint, 10 contract tests, 150 domain tests and 355 mobile tests passed (515 tests, 57 suites).
- Coordinator reran `npm run test:sync:local`: local Auth → Edge Function → PostgreSQL checks passed, including reference-context denial for revoked/cross-store devices, nonmembers and unauthenticated callers, plus two-device bootstrap, sale and purchase.
- Coordinator reran `npx supabase test db`: 92 pgTAP assertions across 10 files passed. Luna also reported local database lint and security advisors passing after the D-045 correction.
- Earlier M7 source evidence includes Expo Doctor 21/21, dependency check and Android export. The added D-045 code has no new native dependency. The local Supabase CI job is configured but has not run on GitHub.
- A Galaxy A15 development build enrolled with local Supabase; an offline restock survived a cold start and synchronized after connectivity returned. No physical sale or two-phone convergence was tested. The user later reported that the installed app no longer opens; this requires diagnosis before any fresh phone-pass claim.

## Current boundaries and next action

M7-07 source restore and pull checks pass. M7 is **not yet closed**: finish the M7-08 scenario/acceptance ledger, commit the reviewed corrections on the task branch with generated `app.json` excluded, and verify a clean handoff. Remote GitHub CI has not run. Physical M3–M7 workflows, two-phone checks, the app-opening issue and second-laptop reproduction remain release-readiness gates rather than passing evidence. No production Supabase project or remote service was modified.

After M7 source acceptance, reconcile isolated M9 branch `plan/m9-price-intelligence` in `C:\Users\doyew\Documents\DEV 2\COSI-m9-planning` against the final M7 contracts, then audit M9 pull/echo and M9-04. Do not start M8 until the founder resumes its Astra-led planning.

Read `AGENTS.md`, `MULTI_AGENT_WORKFLOW.md`, `tickets.md`, `.agents/workflows/m7-offline-sync.json`, the M7 plan and audit, relevant architecture/decisions, and Git status/diff before editing this checkout.
