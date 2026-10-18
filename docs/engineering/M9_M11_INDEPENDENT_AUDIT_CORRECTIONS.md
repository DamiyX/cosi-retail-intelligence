# M9–M11 independent audit reconciliation

Date: 2026-10-03. Coordinator disposition: **C1–C5 REPAIRS VERIFIED; ADDITIONAL INDEPENDENT REVIEW PENDING**.
This is a source repair assignment, not milestone, staff activation or release acceptance.

## Reviewed state and independent evidence

Both founder-authorized GPT-6.1 Sol HIGH reviewers have stopped. They independently
reviewed the same 598-file source state in `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`,
branch `plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
Common fingerprint: `6e7de3285cc20b828208be2c7b58d25dea3d839da6d8b6936b642f7df888929c`.
They did not share findings, edit source or contact the implementer.

- Review A: `01a101c4-85d2-7d61-91fb-251d521699be`.
- Review B: `01a101c4-90d4-7811-a432-dca79a6d4b76`.
- Reports and original probes: `C:\Users\doyew\AppData\Local\Temp\cosi-m9-m11-dual-audit-20261003\review-a\REVIEW_A.md`
  and sibling `review-b\INDEPENDENT_REVIEW_B.md`.
- Main coordinator independently traced the source and replayed the decisive
  probes against unchanged source. Evidence is under the same folder's
  `coordinator` directory, not written over either independent report.

Coordinator fresh commands used installed pinned Node 24.21.0 and Jest,
`--runInBand`, external cache/log/output and disposable file-backed SQLite:

1. Review A `authority-boundary.test.ts`: exit 1, five expected-denial failures,
   28.487 s. All five commands returned without the required rejection.
2. Review B `independent-probes.test.ts`, `--testNamePattern 'timestamps accepted'`:
   exit 1, three failures, eight unrelated filtered cases, 27.837 s. Those eight
   skips are not verification evidence.

Logs/results: `authority.log`, `authority-results.json`, `timestamp.log`,
`timestamp-results.json`. Coordinator `freeze-before-repairs.json` matched all
598 files and path inventory, with no source drift. These failures reproduce
defects; they are not passing tests. Before-BEGIN reference changes model the
local transaction boundary, not a demonstrated live/physical exploit.

Historical builder validation10 reported 1,373 passing tests and 17 opt-in skips.
Reviewer A's fresh existing-test run had 33 passes and one unchanged M9 INACTIVE
restart case exceeding its already approved 15-second limit. Its cause remains
unresolved; historical green evidence does not replace that failure.

## Required corrections

### C1 — High: reconciliation transaction-entry access loss

Both reviewers reproduced this; coordinator confirmed it. In
`apps/mobile/src/inventory/reconcileInventory.ts`, start/cancel/submit callbacks
(reviewed lines 471/537/558) mutate after the account becomes SUSPENDED before
BEGIN. Start creates the session/line, submit saves count evidence, cancel changes
the session. These probes do not establish new outbox or finalized inventory writes.

Capture the exact validated actor/member context and recheck it before the first
write in each existing callback. Preserve first/recount/cancel/finalization rules,
watermarks, costing, immutable history and transaction placement. Permanent tests
must include valid positive controls and denied full business/outbox snapshots.

### C2 — Medium: retained finance client adopts a new membership

Review A and coordinator reproduced it. `finance/client.ts` drops captured member
context when calling `recordExpense`; `recordExpense.ts` re-resolves membership
at callback entry (reviewed line 177). A retained client writes an expense and
outbox with a replacement ACTIVE OWNER membership of the same account.

Carry the original captured identity through an internal client/command seam and
compare it at the existing transaction boundary. Direct commands must also retain
their entry member. Do not silently re-resolve or change business payloads.

### C3 — Medium: in-flight sale loses implicit enrollment identity

Review A and coordinator reproduced it. `sales/client.ts` drops captured local
enrollment before `completeSale.ts` checks callback authority. Changing local
enrollment before BEGIN still commits a sale on the previous device.

Carry and check captured implicit enrollment at the existing transaction boundary.
Preserve the established policy for explicitly supplied device identities.
Inspect the already affected purchase/catalogue/finance/inventory command seams
for the same C2/C3 defect; repair confirmed instances and record their evidence.
Do not rewrite transactions, sync envelopes or history to carry local guard context.

### C4 — Medium: M9 loses accepted timestamp precision

Review B and coordinator reproduced it. Domain `personalPriceChanges.ts` uses
`Date.parse` (reviewed lines 84/87), and the mobile change list repeats this
millisecond comparison. Accepted `.000001Z` and `.000002Z` observations become an
ID tie: a real cost increase from 100 to 200 is displayed as a decrease from 200
to 100, -50% instead of +100%.

Compare instants at all precision accepted by the existing timestamp contract,
including offsets, using consistent domain/current-app ordering. Preserve
observed/created/ID ties, exact money and immutable timestamp strings. Do not
round stored history or narrow/change the M7 protocol. Add microsecond, accepted
higher-precision, offset-equivalent/different-instant and deterministic-tie tests.

### C5 — Medium: activity pagination rejects its own valid cursors

Review B and coordinator reproduced it. `staff/client.ts` validates emitted
history cursors using a three-fraction-digit UTC-only filter validator (reviewed
lines 32/91/106/114). Accepted microsecond/offset purchase history yields a cursor
which the next page rejects.

Separate UI date input from history cursor validation. Ensure activity and check
review readers accept every supported cursor they emit. Ordering, keyset
comparison and half-open date filters must use consistent exact instant semantics
with stable kind/ID ties, without unbounded full-history reads. Preserve stored
facts, authorization and bounded page sizes. No persistent schema/protocol change
is preapproved: explain a genuine need before adding one.

## Bounded investigation and validation limit

Guided replacement (`guidedChecks.ts`, reviewed callback line 553) statically has
the same missing callback-entry check. Review B's positive and negative cases
failed fixture setup, so the runtime claim remains **UNVERIFIED**. Build a stocked,
eligible assignment positive control, reproduce the boundary, then apply the
same minimal guard repair if confirmed. Inspect existing guided/inventory owner
callbacks for captured identity loss, without expanding staff permissions.

Investigate the existing M9 INACTIVE restart timeout with retained evidence and
one bounded focused diagnosis. No additional timeout/config/assertion increases,
test deletion or repeated full-suite-until-green loop are authorized. Keep any
unresolved failure explicitly pending at handoff.

## Implementation ownership and return

Resume only implementer `01a100e8-66eb-77f2-a3bd-26100a36f8de`, GPT-6.1 Sol HIGH,
after this coordinator repair package. Both independent auditors remain stopped.
Make a new byte baseline before repairs, preserving the original audited freeze
and every independent log/report. This document and coordinator state updates
postdate that freeze; they are intentional documentation changes, not audited
runtime changes. Do not describe repaired bytes as the original audit state.

Add permanent meaningful regression coverage, retaining failing-before and
passing-after evidence and legitimate completion/replay tests. New focused tests
and guard/timestamp read fixes are authorized; previous protected test exceptions
remain exact. Do not weaken existing tests or introduce another schema version,
dependency, service, SQL execution or business contract without separate review.

Update this correction ledger, M11 tickets/workflow and current project state
with actual results. Run affected types/lint and focused tests, then the documented
final checks justified by these changes. Stop commands, release lease and report
directly to the coordinator for independent correction verification.

M10 remains OFF/provisional; no additional material M10 source finding was
established in these bounded reviews. Whole M11 remains OPEN. Real staff sessions,
least-privilege feed/bootstrap/visibility, blind assignee submissions, SQL/Auth/RLS/
concurrency/privacy/native/physical/accessibility/multiple-device/release gates
remain pending. No M12, Git mutation, hosted effect, cloud spending or phone task.

## Implementer correction return — 2026-10-03

Status: **SOURCE_CORRECTED_SELF_CHECKED; COORDINATOR_VERIFICATION_PENDING**.
The original reports/failures and 598-file audited freeze above remain historical
evidence. The repaired source has a new baseline/freeze and is not those audited bytes.

- C1: start/cancel/submit capture the exact entry OWNER/member and recheck first in
  the existing callbacks. New account/store/member/device/role loss cases reject
  with complete business/outbox snapshots unchanged; valid controls complete.
- C2/C3: internal command options preserve captured member/enrollment across
  clients and commands. Confirmed purchase/catalogue/withdrawal/inventory/guided/
  attention siblings receive the same guard. Direct finance entry-member cases
  reject replacement; explicit device identity policy remains valid. Context is
  not serialized into business inputs/outbox/protocol.
- Guided replacement is now runtime-confirmed with a stocked eligible positive
  control; the pre-repair expected-denial case failed, then passed after repair.
  Snooze also has a retained positive control and isolated before-guard failure.
- C4: shared pure instant comparison retains arbitrary accepted fraction digits
  and offsets; M9 domain/latest-product ordering uses it. Exact money and original
  timestamp strings remain unchanged. Microseconds now give 100→200, +100%.
- C5: UI UTC-ms filter validation remains separate from history cursors. Bounded
  activity/check-review SQL uses exact seconds/fraction/kind/ID keys for sorting,
  keyset paging and half-open filters. No full-history JS materialization,
  persistent schema/index/adapter or M7 protocol change.

Permanent new coverage:70 authority cases,3 migrated SQLite timestamp/pagination
cases and5 domain cases. Before repair:29 expected-denial failures/21 valid
controls; all5 domain and3 mobile timestamp cases failed. After repair:143 mobile
tests/11 suites and200 domain tests/8 suites pass. Original immutable A probes5/5
and B timestamp probes3/3 pass using new external cache/log/output directories;
B's eight filtered cases are not passing verification.

Final repository validation passed (environment/source-only, four-workspace types, zero-warning lint, tests).

| Workspace | Tests | Suites | Time |
| --- | --- | --- | --- |
| contracts | 38 passed, 38 total | 4 passed, 4 total | 7.164 s |
| domain | 200 passed, 200 total | 8 passed, 8 total | 8.274 s, estimated 10 s |
| mobile | 8 skipped, 703 passed, 711 total | 2 skipped, 91 passed, 91 of 93 total | 500.098 s, estimated 584 s |
| recognition-lab | 9 skipped, 510 passed, 519 total | 23 passed, 23 total | 494.813 s |

The ONE bounded M9 INACTIVE diagnosis still failed:20557ms target against the
existing15000ms limit,55.272s suite,305MB heap. No open-handle diagnostic was
reported. Cause is unresolved; diagnostic overhead is a possible contributor,
not demonstrated root cause. Any final-run pass does not explain this failure.
No tests/assertions/timeouts/configs were relaxed.

Evidence: `C:/Users/doyew/AppData/Local/Temp/cosi-m9-m11-corrections-20261003`;
see [M9_M11_CORRECTION_HANDOFF.md](M9_M11_CORRECTION_HANDOFF.md) for paths and
limitations. Final source checks and all M11 acceptance remain coordinator-owned.

## Coordinator correction closure — 2026-10-03

C1–C5 and confirmed guided/snooze siblings passed fresh coordinator verification on the corrected freeze. Original failures remain historical; 93 focused test executions passed. See [M9_M11_CORRECTION_VERIFICATION.md](M9_M11_CORRECTION_VERIFICATION.md) for exact source identity, evidence and timing/live/staff limits. Founder requested another independent GPT-6.1 Sol MAX source review; final acceptance remains pending.

## Independent MAX audit reconciliation — 2026-10-03

Disposition: **CHANGES REQUIRED: F1–F4 coordinator-confirmed.** C1–C5 scoped repairs remain verified; this is a new review of remaining consumers, not a claim that prior fixes regressed. Reviewer chat 01a10291-c19f-7373-8211-c4e1dfa9a94e completed and STOPPED; no source lease/mutations. Review source: 605 paths, fingerprint 7700e38e41516cfcfa9b88a5af44137af7205b1a33c44aa775c5f4217e68eab0, same branch/HEAD.

Report: C:/Users/doyew/AppData/Local/Temp/cosi-m9-m11-max-audit-20261003/review-max/REVIEW_MAX.md, SHA256 620a65bc8fd189c397a0035f47355bec51f7ae9822676ba67f561514399877ea. Coordinator independently traced the actual sources and reran unchanged original probes with installed Jest --runInBand, external TEMP/cache/results. Four expected behavior assertions fail; one canonical positive control passes; three rejected timestamp hypotheses filtered, not passing evidence. Exit1 across two suites. Exact command, results, logs and before/after 605-path preservation are in the sibling coordinator directory.

### F1 — Medium: remaining full purchase-history order

apps/mobile/src/db/repositories/priceObservations.ts:279 and300 order accepted timestamp text rather than exact instants; priceIntelligence/client.ts returns that order unchanged. Valid older 11:00+01:00 sorts before newer 10:30Z. Fix the two full purchase-history read paths using approved exact timestamp semantics, preserving fractional precision, offset-equivalent instants, created-time and ID ties, tenant isolation and immutable facts. No schema/history normalization, financial calculation or M7 acceptance change. Add consumer/repository tests with valid M7 envelopes and cross-store controls. Other generic history functions are not blanket scope.

### F2 — Medium: shared photo replacement callback authority

apps/mobile/src/media/productPhotos.ts:107 writes detached/attached assets after account suspension at BEGIN. Invocation proxy guards are insufficient. Coordinator explicitly permits a narrow protected M8 source exception ONLY for captured actor validation in this shared photo service and its catalogue/sales construction plumbing. Preserve owner/member roles already accepted by each caller, exact member/enrollment binding, thumbnail limits, file staging/recovery/grace/rollback and reported-after-commit retries. Inspect stage/discard/recovery mutation boundaries; reproduce before repairing additional seams. Keep historical sync attachment/materialization separate and preserve low-level recovery rules. Do not redesign photos/scanner/native dependencies, change persistence/media payloads or tests broadly. Add active positive/denied snapshots and same member/device/enrollment regression coverage, with fake files plus real SQLite; physical behavior remains untested.

### F3 — Medium: market cache callback authority

apps/mobile/src/market/client.ts:178 writes cache after suspension at BEGIN. The post-transport guard at168 is too early; the read subsequently denies correctly. Narrow current-authority rechecks before first mutation inside refresh and analogous existing control/cache callbacks are permitted. Inspect error/unknown-outcome and invalidation/expiry write paths too; retain immutable pending bodies, uncertain-outcome reconciliation, epoch/generation/revision/mapping/tombstone/expiry fences, 100-row capacity, exact cache numerics and OFF transport. Reproduce siblings with positive controls before claims. No consent architecture, server/protocol/schema/live activation change; no new privileges. New tests must capture full cache/control and unrelated business/outbox state under access loss.

### F4 — Medium: older pending staff request hidden from retry

apps/mobile/src/screens/staff/StaffControlsPanel.tsx:13 filters member AFTER global20 limit from staff/control.ts:60. After20 newer other-member requests, an older PENDING intent disappears; a new same-target request correctly fails uniqueness. Fix bounded member-scoped/pending retrieval before limits and provide reachable same-operation retry where needed; preserve owner/store/device scope, immutable operation/body, terminal receipts and unique-pending-target protection. Raising global limit or deleting/replacing intent is not a repair. No migration, Auth/role/invite/management activation. Add real client plus UI regression for more than20 other-member requests, same-member backlog/pending coverage, explicit safe page bounds, isolation and original-ID retry. The original F4 probe models the OLD panel expression; if its API is superseded, preserve it as historical evidence and verify the corrected actual panel/new query instead of altering old audit files or changing global list semantics merely to turn that probe green.

### Timing and evidence limits

MAX existing focused run: mobile219/221 (two timeouts), domain50/50, contracts26/26; relevant types/lint pass. M9 INACTIVE25.182s exceeds existing15s and remote/local replay/echo/restart5.888s exceeds existing5s. Cause unresolved. One bounded causal diagnosis with ORIGINAL limits and external instrumentation is authorized; do not increase timeouts, weaken assertions/configuration or retry-until-green. Any proposed protected test-adapter/config correction needs concrete evidence and coordinator review before edit. Previously rejected compact-offset/no-seconds probes are not M7 defects. Foreground expiry probe timed out before assertion; expiry/query-scale/SQL-parity concerns remain unverified follow-ups, not added reproduced findings.

### Sole writer, exact repair ceiling and stopped return

Existing implementer01a100e8-66eb-77f2-a3bd-26100a36f8de, GPT-6.1 Sol HIGH, same checkout/branch/HEAD. Authorized runtime edits ONLY: priceObservations.ts two purchase-history reads; media/productPhotos.ts and catalogue/client.ts plus sales/client.ts for narrow captured photo guard plumbing; market/client.ts current callback guards; staff/control.ts and screens/staff/StaffControlsPanel.tsx bounded pending query/UI recovery. Additional runtime paths require concrete proposal, not blanket permission. Add NEW regression test files; ALL pre-existing tests/configs/thresholds protected. Preserve migrations1–28, contracts/domain/server/dependencies/business graphs and all other M8/TrackB/M9/M10/M11 work. Documentation limited to this ledger, M11 tickets/workflow, current PROJECT_STATE work line/M11 section and one new MAX correction handoff; original handoffs/reports/probes/logs preserved.

Before edits writer must claim lease and capture a new exact repair baseline AFTER these coordinator documentation updates, distinguishing old605 audit freeze. Run meaningful focused tests/types/zero-warning lint and ONE documented final validation after repairs; record failures/limits as well as passes. Do not claim physical/live/disabled gates passed. STOP all commands/edits, release lease and report completed handoff directly to coordinator. Coordinator performs no source work while writer active. No new reviewer/model escalation/milestone/services/hosted/Git/phone/build/spending effects. Final acceptance stays pending independent coordinator verification. M10 OFF/provisional; whole M11 and real staff/live/physical/release gates OPEN.

## MAX implementer repair return — 2026-10-03

**SOURCE_REPAIRED_SELF_CHECKED; COORDINATOR_VERIFICATION_PENDING.** F1–F4 and
reproduced photo/market siblings repaired within the seven allowed runtime paths;
34 new permanent cases, preserved original tests/evidence. Initial23 failures/
5 controls; affected168/16 pass, final photo30/2 pass; originalF1–F3 plus canonical
positive4/2 pass (four filtered cases not evidence). F4 actual client/panel recovery
passes with bounded member/pending pages and original-ID retry.
ONE final npm run validate passed: source-only environment, four-workspace types/zero-warning lint and all workspace tests.
The one original-limit timing diagnosis still failed INACTIVE15626ms>15000ms;
rational1635ms passed. Approximately789ms measured SQL calls does not explain
the first-case delay; root cause unresolved, original MAX/earlier failures retained.
No test/limit/config relaxation or repeat-full-validation loop. Lease returned;
writer STOPPED. Whole M11, M10OFF/provisional and staff/live/physical gates unchanged.
See [M9_M11_MAX_CORRECTION_HANDOFF.md](M9_M11_MAX_CORRECTION_HANDOFF.md) for source
identity, exact results/commands/failures, immutable evidence and next action.

## MAX repair coordinator closure — 2026-10-03

F1–F4 and confirmed photo/market siblings VERIFIED on the returned611-path freeze: fresh coordinator49 executions/seven suites pass;130 original test/helper and194 historical evidence hashes preserved. See [M9_M11_MAX_CORRECTION_VERIFICATION.md](M9_M11_MAX_CORRECTION_VERIFICATION.md). All nine confirmed findings across the independent reviews are repaired within their recorded scope. Unexplained original-limit M9 timing failures still prevent final source acceptance; later full-suite pass does not explain them. Whole M11/staff/live gates OPEN. All chats stopped; automation pauses, no new milestone or unattended retry loop.
