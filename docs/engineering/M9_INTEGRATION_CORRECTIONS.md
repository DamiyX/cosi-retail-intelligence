# M9 integration correction C1 — account-status authorization

Date:2026-10-03. Main coordinator finding P2; M9 source acceptance withheld.

## Reproduced defect

apps/mobile/src/priceIntelligence/client.ts assertActiveOwner validates store
and OWNER membership but never the referenced users.status. An account marked
INACTIVE or SUSPENDED with ACTIVE OWNER membership passes both constructors
and all four private-cost read guards. Current M7 resolvePilotOwner checks the
user status; pulled reference context can independently change users.status.

Coordinator ran a temporary real migrated file-backed SQLite/Jest diagnostic
using openCatalogueFixture. For both INACTIVE and SUSPENDED account states,
all six probes were admitted instead of rejected. Two tests failed as expected,
exit1,9.311s. They demonstrate missing denial (not a live remote exploit).
The coordinator's temporary test was removed; no production source changed.
Probe source and output remain in Windows TEMP/cosi-m9-current-integration-20261003/
coordinator-user-status-probe-source.ts and coordinator-user-status-probe.log.
Earlier68 focused passing tests cover membership status, not account status.

## Required bounded correction

- Require a present ACTIVE user in the centralized M9 authorization guard,
  at creation and each of the four reads. Retain ACTIVE store/OWNER membership,
  explicit-device STAFF denial, parameterized SQL and foreign-store isolation.
- Add durable regression tests with actual price observations: create an ACTIVE
  owner client, then change only users.status to INACTIVE/SUSPENDED (membership
  remains ACTIVE). All four reads and fresh constructors/context resolution
  must deny; positive ACTIVE paths remain correct and reads make no writes.
- Prove the same denial after accepted M7 reference-context materialization and
  database restart; no business sync/protocol/schema change is required.
- Inspect sibling authorization for the same pattern. Report pre-existing
  occurrences separately; do not expand into M6/M11 protected code.
- Run focused M9 client/current SQLite sync/UI tests plus all documented
  typechecks/zero-warning lint. Broaden only if new changes/failures warrant it.
- Preserve scanner/recognition/lab/M7 facts/migrations/dependencies and all
  prepared coordinator M10 documents. Record a fresh current protected baseline
  before editing; older519 hash evidence predates coordinator M10 doc changes.

Allowed production file:apps/mobile/src/priceIntelligence/client.ts. Allowed
regression files:m9PersonalPriceClient.test.ts and m9SyncIntegration.test.tsx,
plus existing M9 UI tests only if needed for failure-safe denial. Update M9
handoff/ticket/workflow evidence and the M9 PROJECT_STATE paragraph; leave
M10 plan/workflow/decisions untouched. No commits/stash/reset/push/merge, Docker,
Metro/phone, spending/cloud build, hosted effect or new milestone.

Sole implementer remains01a0ff85-c793-7b63-8b59-cc06431dbed8, GPT-6.1 Sol HIGH.
Stop all commands/edits before report-back to coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587. The coordinator alone accepts the repair;
M10 source implementation waits for that acceptance. Physical/live gates pending.

## Disposition

2026-10-03T03:28:10.198Z:C1 independently verified and accepted by main coordinator. Fresh16
regressions pass/three suites/22.142s/zero skips;546 protected hashes match.
See M9_INTEGRATION_AUDIT.md final review. Original diagnostic/requirements above
remain the issue record, not a current blocker. Sibling source observations
remain for separately bounded M11 actor/permission review.
