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
