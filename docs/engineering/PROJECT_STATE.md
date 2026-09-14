# PROJECT_STATE — COSI

Last updated: 2026-09-14
Current milestone: M1 Domain + Local Database — implemented on `feat/m1-domain-local-database`, pending independent audit.
Completed engineering milestones: M0 Project Foundation; M1-01 through M1-04; M1-05 automated evidence.

## Morning reminder due 2026-09-15

Ask the user to plug in the Galaxy A15 5G with USB debugging authorized, then
run the deferred M1 device check: build/install a development APK from
`feat/m1-domain-local-database`, force-stop/relaunch, confirm the migrated
database opens. A new build is required because the installed M0 APKs predate
the expo-sqlite native module.

## Active checkout

- Canonical remote: https://github.com/DamiyX/cosi-retail-intelligence
- Task branch: `feat/m1-domain-local-database` (local; created from M0 baseline `a50cce9`; NOT pushed)
- Local checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m0`
- M1 commits: `a7b5c18` (M1-01 domain), `2d303e9` (M1-02 database),
  `adac3b4` (M1-03 store context), `e0d4464` (M1-04 atomic unit),
  `ebd0b86` (M1-05 startup boundary). No push, merge, or deploy performed.
- The M0 pull request (#1) is still open; `main` remains at `a393498`.
  Rebase the M1 branch onto `main` after that PR is accepted.
- The original sibling `COSI` documentation folder remains untouched.

## Current implementation

M1 adds a pure `@retail/domain` package (UUIDs, integer-minor-unit money,
exact package conversion), an expo-sqlite boundary with transactional
migrations (schema version 1: stores, users, store members, devices), typed
parameterized repositories, an atomic store-context provisioning operation,
and a startup initializer with ready/failed shell states. No catalogue,
sales, inventory, sync, auth, recognition, or product design is implemented.

Local evidence on 2026-09-14: clean `npm ci` with unchanged lockfile, full
validate (typecheck, zero-warning lint, 80 domain + 30 mobile tests) green,
Expo Doctor 21/21, `expo install --check` clean, Android export succeeds,
no committed secret or generated database/build artifact.

## Verification and open acceptance blockers

- Galaxy A15 5G was unavailable on 2026-09-14 (`adb devices` empty), so the
  M1-05 force-stop/relaunch check is explicitly deferred, not passed. See the
  morning reminder above and the blocked `m1-device-verification` gate in
  `.agents/workflows/m1-domain-local-database.json`.
- Second-laptop reproduction remains deferred (M0 carryover, required before
  external beta, not before audit).
- npm audit still reports the M0-baseline 21 moderate + 1 low upstream
  findings; expo-sqlite 57.0.3 added no new findings.
- Hand-rolled repository validation is used in M1; Zod remains the locked
  boundary-validation choice and should be adopted in M2 when sync
  DTO/catalogue schemas arrive.

## Next action

Independent audit of M1-01 through M1-05 per
`docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md`, then the deferred
morning device check. Do not start M2 until the audit passes. Notify the
user before commit/push or other utility/external actions.

## Continuity

Read `AGENTS.md`, `.agents/contexts/project-context.md`,
`.agents/workflows/index.json`, the active task record, and
`MULTI_AGENT_WORKFLOW.md`. Read `tickets.md` and
`docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md` before implementation. Inspect Git
status/history/diff and continue this task branch. The repository documents and Git
history are the project memory.
