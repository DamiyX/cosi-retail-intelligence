# M11 staff/accountability tickets

Coordinator-approved granularity under founder delegation. Current plan/D-052
define the source ceiling; full staff activation/assignment gates remain open.
One writer, sequential tickets, no Git effects. Checkmarks require actual evidence.

## M11-01 — Record actions under the correct currently authorized person

Status:SOURCE_IMPLEMENTED_SELF_CHECKED; INDEPENDENT_ACCEPTANCE_PENDING. Blocked by:M9/M10 source accepted (met).
Delivers:an inactive account, revoked device or wrong person cannot keep using
an old owner/client to read private data or create a falsely attributed action.

- [x] Reproduce relevant source observations; centralize minimal current actor
 resolution/rechecks across affected sales/purchase/inventory/finance clients and
 direct commands. Require ACTIVE account/store/member/device, exact store/user
 relation; preserve existing role boundaries and legitimate single-owner setup.
 No first-member/owner fallback when device/request identity is mismatched or
 ambiguous. Old client methods recheck after revocation/status change.
- [x] Actual migrated SQLite tests cover constructor and subsequent reads/writes,
 INACTIVE/SUSPENDED users, inactive membership/store/device, cross-store and
 mismatched actor/device, missing identity, denial/no business-outbox writes,
 positive current owner and unchanged historical inactive-actor replay/restart.
 No new staff access or rewritten historical identities/transactions.
- [x] Focused regression/compatibility/types/zero-warning lint pass; exact touched
 paths and narrowing reported. Existing M9/M10, scanner and calculation behavior
 preserved; coordinator review required before changing durable/server semantics.

## M11-02 — Let the owner see who performed important store actions

Status:SOURCE_IMPLEMENTED_SELF_CHECKED; INDEPENDENT_ACCEPTANCE_PENDING. Blocked by:M11-01.
Delivers:one compact owner-only activity/member view, with filters and a bounded
See more path, including sales/restocks/money-out/reconciliations/check attempts.

- [x] Derive activity from existing immutable facts; display real actor, action,
 recorded time/status and source/device where useful, with safe missing/inactive
 historical label. No fabricated role-at-time, profit/fraud claim or second ledger.
 Member/date/action filters are store-scoped and pagination is stable/bounded.
- [x] Owner can review check completion/discrepancy/replacement reasons and repeated
 attempts using existing evidence; no expected-stock leak to a new staff flow,
 automatic suspicion, changed reconciliation/FEFO/costing or new notifications.
 Unauthorized STAFF/ADMIN/inactive/foreign access fails at data client as well as UI.
- [x] Query/SQLite/UI tests verify attribution, ties/pagination/filter boundaries,
 member removal/name change/history preservation and access loss; types/lint pass.
 Preserve historical sync replay and current route/scanner/draft behavior.

## M11-03 — Manage existing member/device status without offline privilege grants

Status:SOURCE_IMPLEMENTED_SELF_CHECKED; INDEPENDENT_ACCEPTANCE_PENDING. Blocked by:M11-01 and M11-02.
Delivers:owner sees saved member/device state and honest unavailable/pending/
confirmed controls in a disabled-by-default source prototype.

- [x] Owner-only bounded status requests target existing same-store non-OWNER
 members (suspend/reactivate membership) or revoke their devices. No account creation,
 role/ownership change, self/last-owner change or revoked-device reenrollment.
 Shipped live transport OFF; fixtures explicitly synthetic. Offline pending state
 never changes authority; stable operation/body/version binding survives restart.
- [x] Add only necessary local durable control schema28 and new server migration
 source. RPC source derives authenticated subject and ACTIVE owner/store/device
 authority; transaction/concurrency/idempotence/target checks and private review
 trail. RLS/grants restrictive. Confirmed same-store references may apply atomically;
 stale/foreign replies cannot grant/revive access or overwrite historical facts.
 No M7 business-envelope change, persistent migration or live account effect.
- [x] Contract/disposable SQLite/UI/source-server cases cover positive owner,
 STAFF/ADMIN/foreign rejection, timeout/duplicate/conflict/late response/restart,
 offline denial, suspension safety and protected owner/revoked device. Types/lint
 pass. SQL/Auth/RLS/concurrency not run is reported pending, never a mock pass.

## M11-04 — Return a reproducible source handoff and truthful remaining staff gates

Status:SOURCE_IMPLEMENTED_SELF_CHECKED; INDEPENDENT_ACCEPTANCE_PENDING. Blocked by:M11-01 through M11-03.
Delivers:another agent/founder sees exactly what source works and what prevents
real staff enrollment, limited visibility and different-staff stock assignments.

- [x] Run final documented validation/types/zero-warning lint and supported Doctor/
 dependency/Android export; retain failures/skips/logs. Populated schema27 upgrade,
 existing M7 provenance/pending/replay and M8/M9/M10 compatibility covered. Protected
 fresh-baseline hashes compared with explicit authorized exceptions, not vague claims.
- [x] Record live Auth/SQL/privacy/staff-visible feed/permission/assignment/native/
 accessibility/offline/multiple-device/release gates as pending unless executed.
 Provide concrete M11 extension needs for assignee/blind submissions and real
 staff session; do not declare whole M11 complete from this source foundation.
 No M12/recognition/checkout redesign, service/build/spend/hosted/Git effect.
- [x] Update M11 tickets/workflow, M11 PROJECT_STATE section and stopped handoff;
 STOP commands/edits, release lease and send directly to main coordinator.
 Main coordinator owns independent audit; no audit agent or self-acceptance.

Frontier:STOPPED corrected source return -> coordinator independent correction verification. M11-01..04 source self-checks are recorded; these checkmarks are implementation evidence, not independent acceptance.
Real staff activation/assignee extensions remain explicit M11 gates afterwards.

## Executed source return — 2026-10-03

1373 tests/123 suites pass; 17 tests/2 suites skipped. All workspace types/zero-warning lint, Doctor21/21, dependency check and final Android source export pass. Full log: `m11-final-validate10.log`; exact changed paths, approved old-test exceptions, original failures, byte preservation and remaining scope: [M11_IMPLEMENTATION_HANDOFF.md](M11_IMPLEMENTATION_HANDOFF.md). SQL/Auth/privacy/native checks unrun. All coordinator-owned M11 acceptance gates remain pending, real staff/least-privilege delivery/different-staff blind assignments remain OPEN; shipped management transport OFF. No M12.

## C1–C5 correction return — 2026-10-03

C1/C2/C3 and confirmed guard siblings in M11-01; C5 exact cursor/query semantics in
M11-02; C4 M9 comparison ordering corrected. New regression controls and denied
snapshots pass; unchanged original probes now pass. Final repository validation passed (environment/source-only, four-workspace types, zero-warning lint, tests).
The original return above remains historical. No fresh Doctor/dependency/export
check was needed or run. Existing M9 restart timeout remains unresolved; source
acceptance and all staff/live/physical gates remain pending. No test timeout,
assertion, schema, protocol, role or dependency expansion. Implementation detail,
failures and logs: [M9_M11_CORRECTION_HANDOFF.md](M9_M11_CORRECTION_HANDOFF.md).

## Coordinator verification and additional review — 2026-10-03

C1–C5 scoped repairs verified: 93 focused test executions pass, corrected bytes preserved. Source acceptance remains pending founder-requested independent Sol MAX review. See [M9_M11_CORRECTION_VERIFICATION.md](M9_M11_CORRECTION_VERIFICATION.md). Existing timing and real staff/live gates remain open.

## Subsequent MAX review — changes required

Coordinator confirmed F1–F4; sole implementer assigned bounded source repairs. Prior C1–C5 verification remains valid within its scope. See correction ledger for exact shared-photo exception, original-test protection, new regressions and two unresolved M9 timing observations. Final source acceptance and staff/live gates remain pending.

## MAX F1–F4 correction return — 2026-10-03

F1 full private purchase history, F2 captured photo mutation context, F3 market
callback guards and F4 reachable bounded same-ID pending retry implemented/self-
checked. Existing role/schema/protocol and old tests preserved. ONE final npm run validate passed: source-only environment, four-workspace types/zero-warning lint and all workspace tests.
Both original timing observations remain unexplained; diagnostic INACTIVE failed
under its original15s limit. Independent source acceptance and all staff/live/
physical gates remain pending. Writer STOPPED, lease returned; coordinator verifies
[M9_M11_MAX_CORRECTION_HANDOFF.md](M9_M11_MAX_CORRECTION_HANDOFF.md).

## MAX correction verification — 2026-10-03

Main coordinator verified F1–F4 and preservation;49 fresh focused executions/seven suites pass. Implementation source evidence is complete for this foundation, but independent final acceptance remains pending unexplained M9 test timing; real staff/live gates remain OPEN. See M9_M11_MAX_CORRECTION_VERIFICATION.md. No active writer or automatic new milestone.
