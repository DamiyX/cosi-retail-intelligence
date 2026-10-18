# M9 current-application independent coordinator audit

Date:2026-10-03. Reviewer:main coordinator01a098ef-d830-7531-bca7-2d66b0a5b587.
Decision:source integration ACCEPTED after independent C1 repair verification.
Earlier provisional acceptance/withholding is superseded by this final repair review.
M9 is not a physical-device or external-release acceptance.

## Scope and actual comparison

Stopped implementer01a0ff85-c793-7b63-8b59-cc06431dbed8. Destination:
COSI-m8-planning, plan/m8-unified-scanner at66ea3fc. Reviewed its29 allowed
changed/new files against the recorded dirty baseline, with HEAD comparisons
for previously clean application files. Existing M8/Track B documentation,
root tooling and recognition files are outside the implementation delta.
No feature source was changed by the coordinator audit.

## Specification findings

Finding C1 is resolved:account INACTIVE/SUSPENDED now denies M9 reads even
while OWNER membership remains ACTIVE. See the correction and repair review. Current Home/Product/list
routes use the audited exact personal comparison. Existing scanner entry,
private photos, unfinished-product presentation and discount summary survive.
SellScreen delta removes only the obsolete purchase-history stub method.

The actual current M7 pull/materialization test uses file-backed SQLite,
distinct device identities and accepted reference context. Remote and pending
local purchases remain visible; stale cursor rejection is atomic; replay and
acknowledgement echoes do not duplicate observations. Pending outbox becomes
SYNCED on echo. Reopening schema26 preserves history and one Home/list signal.
Whole-table/total_changes assertions establish these reads create no writes.

## Standards findings

Authorization finding C1 is resolved by requiring a present ACTIVE account.
Active OWNER membership is
rechecked per read, direct foreign product IDs return null, cross-store/STAFF/
demoted/inactive/suspended memberships are denied, and generic
catalogue raw history access is removed. SQL is parameterized; immutable names,
package conversions, quantities and prices remain snapshots. Same-package/
currency preference and normalized fallback use exact BigInt rational logic.

This is local access evidence, not a live Auth/RLS security certification.
PersonalPriceChanges refresh/remount uses current route focus; later staff/
account switching needs M11 lifecycle evidence. No architecture/dependency/
migration/business sync contract changed. Source dates are merchant records,
not independently verified market freshness.

## Evidence actually checked

- Fresh coordinator mobile M9/sync/Home/photo/populated-catalogue checks:
 44 tests/seven suites, exit0,36.901s.
- Fresh coordinator exact-domain checks:7 tests/one suite, exit0,4.145s.
- Fresh coordinator navigation/shell checks:17 tests/two suites, exit0,40.227s.
 Total fresh selected tests:68. Counts are distinct across these commands.
- Independently rehashed all519 protected file rows in the stopped handoff:
 zero mismatches. Includes116 pre-existing untracked lab source files.
- Inspected full validation log and command evidence:1,183 passed/17 skipped
 (contracts12,domain157,mobile504,lab510). Types/zero-warning lint passed.
 The broad suite was not repeated: no code changed and fresh focused checks
 address the new boundary. Existing live PostgreSQL skips8 and host-specific
 file-symlink skips9 remain unpassed; component act notices remain visible.
- Builder Doctor21/21, dependency check and Android export passed (1,627
 modules,5.3MB); preserved manifests prove no stale reference patches imported.
 Source export is not APK/device evidence. Existing Expo exclusion retained.

Ignored dependency/build/run caches and secret files were outside baseline
hash coverage. Full lab tests generated ignored disposable fixtures; no claim
is made that all ignored files remained unchanged. History/branch preserved;
integration remains uncommitted. No phone, Metro, Docker, hosted effect,
spending, deployment, commit/push/merge or real recognition execution occurred.

## Remaining gates and next action

Physical/offline/native/accessibility, live Auth/Edge/PostgreSQL, second-laptop
and release gates stay pending wherever unrun. M8 photo/focus/slider/provider
and Track B real-data/model/quality gates remain separate and unchanged.
M9 software source is accepted after main-coordinator C1 repair verification.
M10 planning is prepared and source implementation may be delegated. Neither
planning nor source tests authorize backend activation or data sharing.

Additional coordinator diagnostic:2 expected failing account-status tests,
exit1,9.311s; existing membership tests did not cover this state. Temporary
probe removed after execution; source/output preserved in TEMP as documented
in M9_INTEGRATION_CORRECTIONS.md. No production edits by coordinator.
Correction-packet checks: M9/M10 workflow and index validate against Ajv2020
with formats; gate dependencies and artifact paths pass. Protected recheck
513 files match after excluding six explicitly edited coordinator planning
files (workflow index, domain/offline/decisions/design/build-plan documents).
The earlier 519 comparison remains the stopped builder baseline evidence.
Git diff --check exits0; existing LF/CRLF normalization notices remain.

## Final C1 independent repair verification

2026-10-03T03:28:10.198Z. Central guard joins users account and requires ACTIVE, preserving
ACTIVE store/OWNER membership and existing error semantics. Independently
compared client-before.ts:the production delta is exactly that parameterized
query. Actual populated regressions cover all four reads, constructor/context,
ACTIVE restoration, valid M7 SUSPENDED context application, local INACTIVE,
restart and safe error UI with whole-table/total_changes no-write assertions.

Fresh coordinator command: npm run test --workspace @retail/mobile --
--runInBand --runTestsByPath __tests__/m9PersonalPriceClient.test.ts
__tests__/m9SyncIntegration.test.tsx __tests__/m9PersonalPriceChanges.test.tsx.
Result:16 passed/three suites,zero skips,22.142s,exit0. This overlaps earlier
68 focused tests; do not sum those counts as distinct fresh coverage.
Independently rehashed546 protected files:zero mismatches. Fresh correction
baseline553 files/seven allowed edits; no unexpected non-ignored source.
Reviewed builder final30 tests/five suites plus all four workspace typechecks/
zero-warning lint logs. Full1183/17 and Doctor/export are historical, not fresh
repair execution. No dependency/native/schema change warrants repeating them.

C1 accepted. No unresolved blocking finding in the bounded M9 integration.
Sibling finance/purchase/inventory account-guard omissions are source observations,
not independently runtime-validated findings. Preserve for M11 actor/permission
review; do not claim entire-app account suspension is enforced. Whole-app security/
physical/live/release acceptance remains pending. No feature source edited by
coordinator and no external/history effects.
