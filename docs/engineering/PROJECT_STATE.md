# PROJECT_STATE — COSI

Last updated: 2026-09-28 15:52 UTC  
Current milestone: M7 local source accepted; M8 planning is next at the founder's renewed request. M9 integration remains a separate isolated task.

## Where we are

M0–M6 source and automated scope is independently accepted, with carried physical-device and second-laptop release checks. M7 implementation commits `66507e6` through `e9ef793`, initial audit commit `1b2b100`, and reviewed audit handoff commit `9c230f1d641edc4b8aae5dc05a7f54977fec4edc` are on `feat/m7-offline-sync` in `C:\Users\doyew\Documents\DEV 2\COSI-m0`. There are no staged or unstaged changes. Generated root `app.json` remains untracked and excluded from the handoff.

D-044 rejects cross-device stale physical reconciliations. D-045 restores server-authoritative store, user, member and device references before fresh-device replay and during later pull. The source corrections now cover operation-history pagination, missing historical actors, revoked-device attribution, new-device pull, local cost-order collisions and M5 semantics. Bootstrap and pull stage reference updates with facts in one SQLite transaction, temporarily satisfying legacy ACTIVE insert triggers and restoring authoritative statuses before commit. This preserves same-store provenance without permitting a revoked device to start a new local command; server push and the reference-context endpoint require active membership/device authorization. See `M7_INDEPENDENT_AUDIT.md` for review evidence and limits.

## Verified evidence

- Coordinator reran `npm run validate`: environment, strict typecheck, zero-warning lint, 10 contract tests, 150 domain tests and 355 mobile tests passed (515 tests, 57 suites).
- Coordinator reran `npm run test:sync:local`: local Auth → Edge Function → PostgreSQL checks passed, including reference-context denial for revoked/cross-store devices, nonmembers and unauthenticated callers, plus two-device bootstrap, sale and purchase.
- Coordinator reran `npx supabase test db`: 92 pgTAP assertions across 10 files passed. Luna also reported local database lint and security advisors passing after the D-045 correction.
- Earlier M7 source evidence includes Expo Doctor 21/21, dependency check and Android export. The added D-045 code has no new native dependency. The local Supabase CI job is configured but has not run on GitHub.
- A Galaxy A15 development build enrolled with local Supabase; an offline restock survived a cold start and synchronized after connectivity returned. No physical sale or two-phone convergence was tested. The user later reported that the installed app no longer opens; this requires diagnosis before any fresh phone-pass claim.

## Current boundaries and next action

M7 local source acceptance is complete after the independent review of committed handoff `9c230f1d641edc4b8aae5dc05a7f54977fec4edc` and docs commit `c696dd1f0d6e2d3f0a1fc41f496e06503fe7afe6`. The working tree has no staged or unstaged changes, with only generated root `app.json` untracked. Remote GitHub CI has not run. Physical M3–M7 workflows, two-phone checks, the app-opening issue and second-laptop reproduction remain release-readiness gates rather than passing evidence. No production Supabase project or remote service was modified. The extra blank line at EOF in `apps/mobile/__tests__/m7Pilot.test.ts` was removed in the committed source correction.

Start Astra-led M8 scanner planning from the approved recognition documents and final M7 contracts. Keep its implementation isolated from the M9 branch and coordinate any shared catalogue/package/sync contract edits. M9 branch `plan/m9-price-intelligence` in `C:\Users\doyew\Documents\DEV 2\COSI-m9-planning` still needs reconciliation against final M7, then M9 pull/echo and M9-04 audit. M9 completion is not a prerequisite for M8 planning.

Read `AGENTS.md`, `MULTI_AGENT_WORKFLOW.md`, `tickets.md`, `.agents/workflows/m7-offline-sync.json`, the M7 plan and audit, relevant architecture/decisions, and Git status/diff before editing this checkout.
