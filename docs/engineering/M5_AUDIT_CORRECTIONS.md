# M5 Independent Audit Corrections

Date: 2026-09-18. Coordinator: task
`01a098ef-d830-7531-bca7-2d66b0a5b587`.

## Review boundary and decision

Reviewed `feat/m5-inventory-reconciliation` at
`0a0ea9477acbc158e48d2648d2bbf0b8a77b634e` against the committed M5 planning
baseline `646b3e6`. The implementer stopped before this review. Comparison covers
M5 implementation only; accepted M1–M4 code is reviewed where extended.
Generated Android export output is ignored and excluded. No native-device,
cloud, release or accounting acceptance is claimed.

**Decision: changes required. M5 is not independently accepted. No M6.**

The existing suite passes, but the following approved behavior and integrity
contracts are missing or contradicted. Correct these in the same implementation
task/branch. Add regression evidence that fails against this reviewed baseline.
Do not rewrite migrations 1–11 or historical transactions; any persistent
correction uses new append-only migrations with populated-v11 upgrade tests.

## Standards findings

### A01 — High: completed batch graphs remain open to insertion

`src/db/migrations.ts` v7 and `src/db/repositories/batchTracking.ts` protect
UPDATE/DELETE, but have no finalization boundary preventing new entries being
attached to an already committed operation. The watermark considers the latest
operation header only. A real SQLite probe appended a +1 entry at order 99 to a
completed receipt operation: the group balance changed while its batch watermark
remained identical. This also defeats count stale-state protection and makes the
existing outbox graph disagree with local history.

Add the smallest durable finalization/sealing boundary, sum/source validation at
completion, rejection of subsequent entry inserts, and coverage of all purchase,
sale, classification, adjustment and reconciliation writers. Reject incomplete
completion/envelope claims at the strongest practical boundary. Validate event
kind/source/delta and receipt group quantity against their immutable parents,
not merely matching store/product IDs. Keep sums overflow-safe. Retain original
classification input/evidence and both watermarks with its durable inspection
fact; currently the original request exists only in the outbox, not the header.
Include the approved additive `entities.batchTrackingVersion: 1` marker on new
commands carrying batch facts; do not bump canonical envelope version 1.

Prove post-commit raw/typed append rejection, incomplete/wrong-source graphs,
unchanged valid historical rows, populated-v11 upgrade, migration rollback and
all affected write-boundary rollback. Do not silently fabricate missing old facts.

### A09 — Medium: replay depends on new clock/settings/projection state

`attention.ts:snoozeAttention` resolves relative due times before replay lookup.
A probe retried the same Later today operation at 08:01 after its 08:00 commit;
it failed as a different request because the due minute changed. Chosen-time
replays can also fail because their already-recorded time is now in the past.
`guidedChecks.ts:generateGuidedChecks` fingerprints the current clock/date and
settings before replay, so an ordinary same-ID retry after elapsed time or a
settings change is unstable. Adjustment/reconciliation replay graphs read current
cost states instead of the original committed snapshots.

Separate explicit request intent from derived clock/settings values. Authorize
first, then return original durable facts for the same operation, even after
elapsed time/restart/settings changes. Changed explicit intent must still reject.
Replay immutable cost snapshots from the original graph. Preserve operation IDs
across recoverable UI finalization/action retries rather than generating new IDs
on each press. Test omitted-clock retries, midnight, past chosen-time replay,
changed explicit inputs, later cost movements, and no duplicate rows/envelopes.

## Specification findings

### A02 — High: newer undated receipts precede legacy unknown stock

`batchAllocation.ts:recordSaleBatchAllocation` consumes all named groups before
the unknown residual. A probe with opening unknown stock 40, a newer undated
receipt 20, then sale 5 consumed the receipt group, leaving it 15. Approved domain
10.5 requires older legacy unknown stock before newer undated receipts.

Preserve dated FEFO priority, then the approved stable oldest-origin order for
undated groups/positive unknown stock. Test mixed dated, legacy unknown, newer
undated, equal-date ties, negative oversell, restart and original-allocation replay.

### A03 — High: unallocated manual shortages leave contradictory dated remainder

`adjustInventory.ts` sends a no-group negative delta directly to unknown residual
without invalidating unresolved named composition. A probe received dated 10 and
recorded unallocated MISSING -15: product total became -5, named remainder stayed
10 and unknown residual became -15. Expiry attention still advertised about 10
remaining. Even a smaller shortage can retain named stock exceeding total stock.

For a total-only discrepancy, use the approved recorded net-zero move of unresolved
named composition to unknown before the actual adjustment, or obtain a complete
physical group count. Do not guess shrinkage through FEFO. A genuinely identified
group removal must retain its precise group effect. Enforce meaningful event
directions: EXPIRED/DAMAGED/MISSING/PERSONAL_USE/SUPPLIER_RETURN must not become
positive additions just because the UI toggles Add; CORRECTION can remain signed.
Test smaller/excessive/negative-stock shortages, selected groups, actual expiry
removal, invalid directions, costing/rebuild, and atomic rollback. Preserve
genuine negative-stock sale behavior.

### A04 — High: complete counts silently ignore physically rediscovered zero groups

`reconcileInventory.ts` validates submitted references but builds corrections
only for groups whose current recorded balance is positive. A probe received 2,
sold 2, then submitted a complete physical count of 1 for that existing group:
completion accepted the evidence, but group remained 0 and unknown became 1.

Apply every valid explicitly observed group, including an existing zero-balance
group, while requiring coverage of every current positive group and relevant
unknown remainder. Reject invalid/cross-store references and incomplete totals.
Test zero-group rediscovery, same-total redistribution, mixed unknown/groups,
stale watermarks, exact positive-surplus cost unavailability and replay/rebuild.

### A05 — High: blind UI never presents comparison before changing stock

`ReconciliationScreen.tsx` renders only first/recount input and a generic Finalize
button. Its draft read model exposes no saved recorded/physical/difference values.
The expected quantity remains hidden even after submission. There is no discrepancy
review/confirmation or reason selection; finalization defaults to CORRECTION.
Direct Cancel also bypasses the specified destructive-input confirmation.

Keep the first entry blind in visible/accessibility/prefill content, then show the
saved recorded versus physical comparison/difference, Recount and explicit
confirm/reason before committing a discrepancy. Show Matched versus Reconciled
truthfully. Confirm destructive cancellation when appropriate. Keep failure input
and saved evidence, and preserve stale-state Refresh/recount protection. Test the
real component/routed sequence, match, shortage, surplus, confirmation refusal,
reason, cancellation, retry and no pre-count accessibility leakage.

### A06 — High: durable counts have no restart recovery or complete-group user path

ReconciliationRoute accepts product/assignment parameters only; its screen always
initializes with no session. No client/UI lists or resumes an existing open check.
The service persists submissions but the retailer cannot recover that check after
restart; restarting a guided check creates another session. Complete group counts
and supported package quantity entry also have no corresponding user control.

Provide a minimal discoverable resume path for durable open sessions, including
guided linkage and prior submissions, without revealing expectations before a
first submission. Make the approved optional complete group-count path and exact
supported package/base entry usable; display quantity units. Keep total-only
counting simple and offer Review groups when its breakdown becomes unknown.
Test a cold reopen followed by actual UI recovery, retained first/recount facts,
no duplicated session/finalization, group mode, supported conversion, dirty exits
and failures. Do not build a general warehouse UI.

### A07 — High: month-only expiry becomes passed during its own month

`attention.ts:expiryCandidate` compares MONTH to YYYY-MM-01 for both warning and
passed status. The SQLite probe on 2026-10-15 reported October 2026 as PASSED,
contradicting the approved interval rule. This is independent of FEFO ordering.

Use interval start for conservative warning/order only, keep the month reached
through its interval and mark it passed at the next month. Preserve DAY store-local
boundaries and printed EXPIRY/BEST_BEFORE/UNSPECIFIED meaning. Test first/middle/
last day, next month/year/leap boundaries and lead-time zero; no invented exact
day countdown or stock mutation.

### A08 — High: attention misstates resolved discrepancies and omits undated coverage

`latestDiscrepancy` queries COMPLETED reconciliations and labels their nonzero
historical differences UNRESOLVED. A probe finalized a shortage and its atomic
correction, yet attention still requested another reconciliation for an
"unresolved count difference". Positive receipt groups with UNKNOWN date and
zero residual produce no unknown-date coverage condition; a probe returned an
empty attention list for two undated received units. Static condition keys also
allow an old snooze to hide a newly recurring condition after it resolved.

Derive actionable unresolved checks correctly; distinguish corrected historical
discrepancies from current unresolved work. Surface genuinely missing date/group
coverage truthfully, with review/classification actions that can improve it.
Expiry detail must offer review as well as real removal, without calling all
BEST_BEFORE/UNSPECIFIED dates expired. Resolution must clear current suppression;
a later episode must not inherit stale suppression solely through the same key.
Test open/submitted/finalized/matched checks, undated received groups, depletion,
classification, resolve-then-recur snooze behavior and action routing.

### A10 — Medium: first-open/resume refresh and guided completion claims are incorrect

AttentionScreen's initial-focus effect returns before installing its minute timer;
until refocused, expiry/snooze values never automatically refresh. Neither this
surface nor GuidedChecksScreen handles AppState resume/date/window rollover.
Guided `completedInitialCount` counts INITIAL assignments regardless of status;
three newly generated PENDING assignments are displayed as 3/3 checks, and an
exhausted replacement pool can be described as a completed target without counts.

Install/clean up refresh from the first focused mount and handle foreground
resume/store-local transitions without discarding dirty settings or spinning
unnecessary background work. Keep generated/assigned/completed/replaced/exhausted
counts distinct and describe target status truthfully, including replacement
chain completions. Test initial mount, time advance, pause/resume, midnight,
all-pending versus actually completed and exhausted-pool copy.

### A11 — Medium: low-stock thresholds cannot be set through the product

M5-06 explicitly includes reorder control, but no catalogue/inventory screen or
client command sets `reorderLevelBaseMicros`. The alert test uses direct SQL UPDATE
to seed it. Normal pilot users therefore cannot configure low-stock attention.

Provide the smallest owner/store-scoped set/clear reorder-threshold control with
exact unit-aware quantities, validated durable mutation and canonical atomic
outbox/version handling. No default guesses or second settings source. Test the
actual UI/service set/clear, zero/invalid/overflow values, isolation, replay,
rollback/reopen and resulting real low-stock condition.

## Independent evidence at the reviewed HEAD

- `npm run validate`: PASS; strict typecheck, zero-warning lint, domain 150 tests
  / 5 suites and mobile 260 tests / 34 suites: 410 total. Navigation warnings
  reported at the previous slice were absent in this run.
- `npm run mobile:doctor`: PASS, 21/21.
- `npm exec --workspace @retail/mobile -- expo install --check`: PASS;
  existing expo exclusion remains explicitly reported by the tool.
- `npm run mobile:export`: PASS, 1,381 modules and 3.5 MB Android Hermes bundle.
- Node/TypeScript registry comparison: migrations 1–6 exactly match the M5
  planning baseline; registry is contiguous 1–11.
- AJV draft-2020 plus date-time formats: active M5 workflow and index schema PASS;
  every registered artifact exists. `git diff --check` PASS; initial tree clean.
- Independent in-memory-fixture probes used the actual migrated Node SQLite
  adapter and production services, deterministic test IDs and Node randomness
  in place of Expo crypto. They reproduced A01, A02, A03, A04, A07, A08 and A09
  as described above. Each isolated database was closed/deleted by its fixture.
  A05/A06/A10/A11 are source/user-path findings, not claimed physical UI tests.

No M5 physical-device, force-stop/airplane-mode, native-exit, large-text,
development-client/Metro, second-laptop or professional accounting evidence was
performed. Existing carried readiness gates remain open. Passing automation
does not establish pilot/beta readiness.

## Return contract

Implementer commits this audit record separately from corrections. Correct
findings in recoverable commits carrying A IDs, update ticket/workflow evidence
truthfully (uncheck any grouped claim not yet satisfied), and report each finding's
fix/commit/regression command/result. Run focused checks, typecheck and zero-warning
lint as changes land, then the documented final validation/schema/export suite.
Return a clean branch/full HEAD/status and stop for coordinator re-audit. Do not
self-accept or begin M6. Only escalate if a correction truly changes an approved
durable product/architecture contract; fixing these documented behaviors is
already authorized.

## Coordinator re-audit — 2026-09-19

Reviewed stopped correction handoff `a6f4153c5d751f54de5367d22422ac30a5919038`
on the same branch. Implementer task was confirmed completed through the task
status tool; implementation is finished, but independent acceptance remains
blocked by the findings below. Original A01–A11 fixes are not collectively
accepted merely because the reported 437 tests pass.

### Specification: A05-R — High: unsaved recount can finalize older evidence

`ReconciliationScreen.tsx` marks edits to physical quantity, quantity mode,
complete-group mode and group quantities dirty, but `finalize` and its button
check only that a saved submission exists. Finalization sends no current count
values. `finalizeInventoryReconciliation` correctly consumes the latest saved
submission. Consequently, save 35 against recorded 40, edit the field to 36,
then press Confirm discrepancy: the screen can finalize 35 while displaying 36.
Unsaved group edits can likewise be ignored. This is a source/user-path finding,
not claimed physical-device evidence.

Prevent finalization while count evidence differs from its saved submission;
require saving/reviewing the recount or explicitly restoring the saved evidence.
Keep reason/note handling deliberate and preserve inputs on failure. Reset or
bind retained finalization operation IDs appropriately when explicit finalization
intent changes, while retaining the ID for an unchanged recoverable retry.
Add real component regressions for quantity edits, package/base changes, group
mode/group counts and failed saves. Prove no inventory/finalization/outbox write
occurs from unsaved or invalid count evidence, then prove the saved recount
finalizes the newly reviewed value.

### Specification: A08-R — Medium: normal movements cancel active snoozes

`attention.ts:conditionKey` incorporates every inventory/batch watermark and
the attention settings version. This solves recurrence by also invalidating a
snooze on any routine stock movement. Independent real SQLite production-service
probe: receive 4, set reorder threshold 5, snooze LOW_STOCK until tomorrow,
sell 1, query 30 minutes later. LOW_STOCK returns at balance 3 with unchanged
severity, before its due time. The same product-level key pattern affects expiry
and coverage conditions, including unrelated group movements/settings changes.

Preserve suppression for the same active condition until due or genuine
worsening; clear it when that condition resolves, so a later episode does not
inherit an old snooze. Use the smallest durable/rebuildable episode mechanism
consistent with the existing event history; do not equate every watermark change
with resolution. Include low-stock and expiry same-severity movements, unrelated
group/settings changes, resolution followed by recurrence without an intervening
overview read, worsening, due time, restart and original-operation replay tests.

### Specification: A07-R — Medium: current-month copy invents an exact day

The interval severity correction works: October MONTH expiry on October 15 is
REACHED. However the same independent probe returns detail saying the recorded
date "reaches today". Month precision cannot establish that October 15 is the
actual expiry day. Use interval-aware text throughout the current month, retaining
the next-month PASSED boundary and DAY-specific today wording. Add first/middle/
last-day and printed meaning copy assertions; do not introduce a day countdown
for MONTH or mutate inventory merely because the interval advances.

### Re-audit disposition and return

Independent checks at this handoff: `npm run validate` PASS (strict typecheck,
zero-warning lint, 150 domain tests / 5 suites and 287 mobile tests / 37 suites;
437 total). Active workflow/index AJV draft-2020/date-time validation and
`git diff --check` PASS. The SQLite probe used the real migrated fixture,
production purchase/sale/reorder/attention services and isolated synthetic data;
its database was closed/deleted afterwards. Doctor and Android export were not
rerun in this correction pass; their latest success is implementer-reported.

Changes required; return A05-R/A08-R/A07-R to the existing Luna max M5 task,
not a new milestone/task. Commit this checkpoint separately before corrections.
Do not rewrite historical migrations or completed business transactions. Report
focused regression results and the final full validation, branch/full HEAD/status,
then stop and notify the coordinator for independent re-audit. No M6 yet.

Founder explicitly defers physical Galaxy verification. Carry it as pending
before pilot/beta/native-release readiness; it does not prevent source acceptance
or later M6 source continuation once the independent M5 gate is actually met.
No phone actions or physical evidence were performed in this review.

## Coordinator final re-audit follow-up — 2026-09-19

Reviewed stopped return `9104c49c1d0918866dfd2ecdc15cd6dd0e7755a8`.
Focused independent execution passed: `m5Attention.test.ts` and
`m5ReconciliationCorrections.test.tsx`, 18/18 tests. A05-R count-evidence
blocking and A07-R month-precision copy now satisfy their reproduced cases.
A08-R still has one material recurrence gap.

### Specification: A08-R2 — Medium: threshold-based recurrence inherits an old snooze

The new stock episode token is reconstructed only from `InventoryEvent` history.
The low-stock predicate also depends on the mutable reorder threshold, so a
condition can resolve and recur without an inventory event. Independent real
SQLite production-service probe: stock 4, threshold 5, snooze LOW_STOCK until
tomorrow; change threshold to 3 (condition resolves); change it back to 5
(condition recurs). At 08:20 the recurring condition remained suppressed with
the original condition key and `suppressedCount: 1`.

Preserve an active snooze through ordinary same-episode movements and unrelated
settings changes, but ensure a genuine threshold-driven resolution followed by
recurrence receives a new durable/rebuildable episode. Do not solve this by
invalidating snoozes for every harmless threshold edit or catalogue edit: the
approved rule remains suppression until due, real worsening, or resolution.
Cover restart and recurrence without requiring an overview read during the
resolved interval. Include unchanged operation replay and store isolation.

**Decision: changes required.** Return A08-R2 to the existing M5 task. Commit
this follow-up checkpoint separately before correction, run focused regressions
and the full documented final checks, then stop for independent re-audit. A05-R
and A07-R require no further correction from this pass. No M6 or phone action.

## Coordinator A08-R2 re-audit follow-up — 2026-09-19

Reviewed stopped return `a2e60a7ca4b8546c300e4fc7456f563e6c53ca6c`.
Independent focused execution passed: `m5Attention.test.ts` and
`m5ReorderThreshold.test.tsx`, 17/17 tests. The exact threshold-only 5→3→5
reproduction is corrected, but interleaved inventory and threshold history
reveals one remaining ordering defect.

### Specification: A08-R3 — Medium: interleaved recurrence loses its episode

`stockEpisodeToken` independently replays every inventory event using the
current threshold, then combines that result with a separately replayed threshold
token. Independent real SQLite production-service probe: stock 4, threshold 5,
snooze LOW_STOCK until tomorrow; threshold 3 resolves; sell 2 while threshold 3
recreates LOW_STOCK; threshold 5 remains active; query at 08:20 without any
overview read during the resolved/recreated interval. Current stock is 2, but
LOW_STOCK remains hidden with `suppressedCount: 1` and the original key.

Reconstruct one truthful episode across the actual interleaving of threshold and
inventory mutations. A resolution followed by either kind of mutation recreating
the condition must receive a new durable token, even if later same-active changes
occur before the next overview read or after restart. Preserve same-episode
snoozes and replay/store isolation. Do not depend on device timestamps as the
sole ordering mechanism or combine two independently replayed histories that can
erase their intervening transition. A durable snapshot/cursor carried by the
existing atomic writers is acceptable; keep the solution bounded to low-stock
episode identity.

Add the exact failing-before regression above plus its inverse ordering (an
inventory resolution followed by threshold recurrence), restart, no-intermediate-
overview and unchanged replay. Run focused and full final checks. Commit this
checkpoint separately, return a clean branch and stop for independent acceptance.
No M6 or phone action.

## Final independent acceptance — 2026-09-19

The coordinator reviewed stopped A08-R3 return `d9a222a` and independently ran
the focused attention/reorder suites. The interleaved state machine corrected
the reproduced functional sequence. One standards issue remained: condition
episode reconstruction used outbox rows as permanent business history, while
`OFFLINE_SYNC.md` defines the outbox as unacknowledged transport work and permits
post-acknowledgement lifecycle handling. M7 cleanup could therefore change an
active condition key and invalidate a legitimate snooze.

Under the founder's instruction to end correction ping-pong, the coordinator
implemented the bounded correction directly. Additive migration 15 introduces
immutable `store_product_reorder_level_history`, backfills valid version-14
threshold envelopes, and records future threshold/balance/inventory-watermark
facts atomically with the product mutation and outbox. Attention reads the
domain history; outbox parsing remains only a compatibility fallback when no
durable history exists. A regression deletes threshold outbox transport rows
and proves the snooze/key survives, while immutable-history deletion is rejected.
A populated-v14 probe upgrades to v15 and retains the original threshold facts.

**Decision: M5 source/automated scope accepted.** A01–A11,
A05-R/A07-R/A08-R/A08-R2/A08-R3 and the outbox-lifecycle standards correction
have no remaining blocking finding in the reviewed scope. Exact focused suites,
strict typecheck, zero-warning lint and full validation evidence are recorded in
PROJECT_STATE and the archived workflow. Physical Galaxy, development-client/
Metro, second-laptop, cloud/deployment, M7 concurrency and professional
accounting checks remain explicitly carried; this is not pilot/beta/release
acceptance. The founder deferred phone verification and authorized source
continuation into M6.

## Correction return — 2026-09-19

The coordinator checkpoint was preserved separately in `7ccf672` before any
source correction. The three findings were then corrected on the same branch;
independent acceptance remains the coordinator's decision.

### A05-R — corrected in `985478c`

`ReconciliationScreen.tsx` now compares the current normalized physical/base
evidence, package/base mode and complete-group values with the latest saved
submission before allowing finalization. Unsaved or invalid evidence cannot
write a `RECONCILIATION_FINALIZED` outbox operation. Successful saves clear the
old finalization operation ID; edits create a new intent ID, while an unchanged
recoverable retry keeps its original ID. Existing note/reason retention and
failed-save input retention remain in place.

Baseline against the reviewed source: `m5ReconciliationCorrections.test.tsx`
had 5 new regressions failing and 5 existing tests passing. After the fix, the
focused suite passes 10/10, covering quantity, package/base, complete-group and
group-count edits, failed saves, no-write protection, changed-intent IDs and
saved recount finalization.

### A08-R — corrected in `de5cb2c`

Attention condition keys no longer use inventory/batch watermarks or attention
settings versions. Stock episodes are rebuilt from product inventory events in
durable ledger order; named batch/unknown episodes are rebuilt from their batch
entry history. Same-severity movement, unrelated group movement and settings
changes therefore preserve the active episode. Resolution changes the episode
token, so recurrence resurfaces without requiring an intervening overview read;
severity changes still resurface through the existing severity-rank guard. No
new migration was needed.

Baseline against the reviewed source: the two new SQLite regressions for stock
and expiry snooze episodes failed while the six existing attention tests passed.
After the fix, `m5Attention.test.ts` passes 8/8, including same-severity stock
and expiry movement, unrelated groups/settings, due time, worsening, restart,
replay and resolution/recurrence without an overview read.

### A07-R — corrected in `de5cb2c`

MONTH records reached during their represented interval now print `is within
this month`; the next-month PASSED boundary remains unchanged. DAY records still
print `reaches today`. The focused attention regressions cover the first, middle
and last day of October, expiry versus best-before printed meaning, the DAY
wording, no day countdown and unchanged stock projection.

### Final local verification

- `npm run validate`: PASS — 5 domain suites/150 tests and 37 mobile suites/294
  tests, 444 total; strict typecheck and zero-warning lint.
- `npm run mobile:doctor`: PASS — 21/21 after one transient `exp.host:443`
  timeout on the first attempt.
- `npm exec --workspace @retail/mobile -- expo install --check`: PASS;
  dependencies are up to date.
- `npm run mobile:export`: PASS — 1,382 Android modules and a 3.5 MB Hermes
  bundle; generated `apps/mobile/dist` remains ignored/untracked.
- Active workflow/index AJV draft-2020/date-time validation, gate dependency
  DAG, registered-artifact existence, contiguous migration registry 1..14 and
  `git diff --check`: PASS.

The branch is returned for coordinator re-audit; this record does not grant
independent acceptance. Physical/device, development-client/Metro, second-
laptop, cloud/deployment and professional accounting checks remain pending.
No M6 work, phone action, push, merge or deployment was performed.

## A08-R3 correction return — 2026-09-19

The coordinator checkpoint was preserved separately in `4c0b82b`. A08-R3 is
corrected in `aebc6f2` on the same M5 branch; A05-R, A07-R and the A08-R2
threshold-only behavior were not reopened.

The reorder-threshold writer now captures the latest product inventory ledger
watermark (`rowid:id`) in the same SQLite transaction as the threshold update
and outbox snapshot. Attention rebuilds LOW_STOCK episodes as one interleaved
state machine: it replays inventory events up to each captured watermark, then
applies that threshold transition before continuing. This prevents a later
same-active edit from erasing an inventory-driven recurrence. The cursor is
durable local application order, not device time; no migration or completed
transaction was rewritten, and no separate inventory writer protocol was
introduced.

Against the pre-fix source, the exact production-service SQLite regression
failed: the interleaved threshold 5 → 3 resolution, two-unit sale recurrence,
threshold 5 same-active edit and restart returned no LOW_STOCK item, leaving
the original snooze suppressed. The inverse inventory-resolution → threshold-
recurrence regression passed only incidentally under the old independent
history combination. After the correction, `m5Attention.test.ts` passes 11/11
and `m5ReorderThreshold.test.tsx` passes 8/8 (19/19 combined), including the
exact interleaving, inverse ordering, no-overview read, restart, unchanged
replay, owner/store isolation, worsening and due-time coverage.

Final local verification after A08-R3:

- `npm run validate`: PASS — 5 domain suites/150 tests and 37 mobile suites/297
  tests, 447 total; strict typecheck and zero-warning lint.
- `npm run mobile:doctor`: PASS — 21/21.
- `npm exec --workspace @retail/mobile -- expo install --check`: PASS;
  dependencies are up to date.
- `npm run mobile:export`: PASS — 1,382 Android modules and a 3.5 MB Hermes
  bundle; generated `apps/mobile/dist` remains ignored/untracked.
- Active workflow/index AJV draft-2020/date-time validation, gate dependency
  DAG, registered-artifact existence, contiguous migration registry 1..14 and
  `git diff --check`: PASS.

The branch is returned for coordinator re-audit; this record does not grant
independent acceptance. Physical/device, development-client/Metro, second-
laptop, cloud/deployment and professional accounting checks remain pending.
No M6 work, phone action, push, merge or deployment was performed.

## A08-R2 correction return — 2026-09-19

The coordinator follow-up checkpoint was preserved separately in `2feea7a`.
A08-R2 is corrected in `248250c` on the same M5 branch; A05-R and A07-R were
not changed in this follow-up.

The reorder-threshold mutation now records its prior threshold and the durable
inventory balance at the mutation point in the existing outbox snapshot.
Attention rebuilds threshold-driven LOW_STOCK episode transitions from those
durable local records in SQLite application order. A same-active threshold edit
does not change the episode token; a threshold-driven resolution followed by
recurrence receives the new threshold operation token. Replays do not append a
second history row. No migration was necessary and no prior migration or
completed transaction was rewritten.

Baseline against the reviewed `9104c49` source: the new exact probe regression
failed while the eight existing attention tests passed. The original failure
returned only the unrelated coverage item after threshold 5→3→5 because the
LOW_STOCK item remained suppressed. After the fix, `m5Attention.test.ts` passes
9/9, including same-active threshold movement, threshold-operation replay with
no duplicate outbox write, owner isolation, no overview read during resolution,
restart and recurring condition-key identity. Existing reorder-threshold
service tests pass 8/8, including store isolation and replay.

Final local verification after A08-R2:

- `npm run validate`: PASS — 5 domain suites/150 tests and 37 mobile suites/295
  tests, 445 total; strict typecheck and zero-warning lint.
- `npm run mobile:doctor`: PASS — 21/21 after one transient `exp.host:443`
  timeout on the first attempt.
- `npm exec --workspace @retail/mobile -- expo install --check`: PASS;
  dependencies are up to date.
- `npm run mobile:export`: PASS — 1,382 Android modules and a 3.5 MB Hermes
  bundle; generated `apps/mobile/dist` remains ignored/untracked.
- Active workflow/index AJV draft-2020/date-time validation, gate dependency
  DAG, registered-artifact existence, contiguous migration registry 1..14 and
  `git diff --check`: PASS.

The branch is returned for coordinator re-audit; independent acceptance remains
unresolved and is not claimed. Physical/device, development-client/Metro,
second-laptop, cloud/deployment and professional accounting checks remain
pending. No M6 work, phone action, push, merge or deployment was performed.
