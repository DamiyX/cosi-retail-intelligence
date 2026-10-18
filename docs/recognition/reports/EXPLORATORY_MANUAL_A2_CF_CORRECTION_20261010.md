# Manual a2 CF-01..03 correction handoff — 2026-10-10

Scoped utility correction by the existing GPT-6.1 Sol HIGH writer. Implementation
self-checks pass; **independent acceptance and operational publication remain
withheld**. Original review findings remain in
`EXPLORATORY_MANUAL_A2_INDEPENDENT_REVIEW_20261010.md`, unchanged.

## Exact corrected package

New root:
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a2-corrected-20261010`.
Future ID remains `offline-manual-20261010-a2`: no operational a2 attempt exists.
Checkout/branch/HEAD remain `COSI-m8-planning` / `plan/m8-unified-scanner` /
`66ea3fc22595a48d7355d1729bb879496cc98896`.

Corrected `Invoke-ManualExperiment.ps1` SHA-256:
`485905beec51e8dfbb2257b23d760ab476bb4fcc6b13c635c7a95aec2572b604`.
Original reviewed runner remains
`0bf571889dfaac121e6d4b52b2a1b08bf0779bb8b972d8cfbe3c84f96e3db78c`;
original frozen handoff remains
`7a035f8ef90d78d754592bebd7786e77b1adcd62812f18893411537ac61f8b6a`.
All 845 original indexed artifacts, original handoff/report and coordinator
probes/failure evidence are preserved separately from repaired bytes.

Only the main utility's fixed root and entry/result/recovery plumbing changed.
`runner-correction.patch` records the exact normalized source delta. These six
copied files are byte-identical to the reviewed package: `Support-ReadOnly.ps1`,
`Native.cs`, `Preflight.py`, `runtime-offline.json`,
`network-binding.private.json`, `COSI-Manual-Photo-Experiment.cmd`.
Seven native/query/preflight/child functions in the main script also remain
unchanged. No original private argv, 930000/60000 ms child limits, study/model/
recipe/software/source fingerprint, recognition tests/configuration or query
denominator 20 changed. No protected delta needed approval.

## Corrections

**CF-01:** Both operational entry routes validate the full supported result
schema, scalar types, completion/receipt requirements and supported status
combinations. Complete processing returns 0; incomplete processing returns 2.
Failures and malformed/null/unknown outcomes return nonzero. Start explicitly
labels complete/incomplete processing as pending coordinator review. Helper
returns its structured result and preserves the same exit status. Exit 0 does
not approve results or native gates.

**CF-02:** Start and Helper now always read exact final publication before
package/session/helper effects. A supplied approval digest must equal that
publication; it cannot replace it. Helper independently checks the session's
authorization against publication. Separate E04/package/session/root/hash and
fresh-attempt/output checks remain intact. No approval/publication files were
authored during correction.

**CF-03:** Private work retains the original 1500-second session deadline and
strict work-message window. Once jobs are confirmed empty, the current live
owner may create one immutable **stopped recovery** phase, bound to the original
session/nonce/helper PID/start ticks. It has a separate 240-second UTC and
monotonic bound. Starting that phase permanently fences private execution;
re-entry cannot reset its clock. Its fresh empty-job receipt binds the phase SHA.
Only current owner empty proof, a live helper, exact receipt and unexpired
recovery phase can authorize ON. A stop receipt older than 10 seconds cannot
authorize that prompt. Work expiry, parent loss or cancel never grants authority
by elapsed time alone.

The work deadline allows at most 30 seconds for stopping/proof acquisition;
receipt creation after work expiry is accepted only within that finite window.
Restoration observation remains bounded to 180 seconds within the recovery
phase. Controller waiting follows the same recovery bound, with only 10 seconds
for terminal result delivery. Terminal validation may read stopped evidence
after recovery expiry; it grants no reconnection authority. Worst-case bounds
are 1500 seconds work + 30 stop/proof + 240 recovery + 10 terminal delivery.
Native guard polling limitations remain unchanged. Unknown children, dead
helper, stale/copied/malformed evidence, expired phases and missing proof remain
conservative failures. Recovery expiry reports manual assistance rather than
restoration success or a claim that ON was never prompted when it already was.

## Checks actually run

Final corrected runner: **63 passing checks**:

- `Test-Entry.ps1`: 30 actual-entry-block checks with explicit generated
  package/controller/helper/publication substitutes. Complete/incomplete/
  failure/malformed results and missing/mismatched publication cover both routes.
- `Test-Recovery.ps1`: 15 checks. Actual generated Windows jobs containing a
  parent/descendant cross the real work deadline or stop after actual generated
  parent-process loss/bound cancellation. Owned PIDs are absent and job counts
  are drained before recovery. Native state/private work/restoration remain
  explicit substitutes. Unknown children and missing/malformed/copied/stale
  receipts deny authority; recovery expiry is bounded.
- `Test-Clocks.ps1`: 8 actual-clock/phase tests using generated near-expiry
  records. Recovery/controller survive work expiry only with current stopped
  proof; recovery expiry rejects further authority; terminal grace is finite;
  duplicate phase creation cannot reset its timer; private work cannot resume.
- `Test-BlockedOperationalEntry.ps1`: 4 invocations of the actual script's
  Start/Helper routes, with and without an explicit digest. Absent publication
  rejects all four before attempt/package/helper/private effects.
- Adapted coordinator probes: 4 exact-entry and 2 recovery expectations pass in
  `adapted-probes-485905beec51`. Adaptation changes only exact root/hash and the
  canonical generated result fixture for the now-strict result schema. Original
  probes and their three reproduced failures are unchanged.

Final permanent evidence directories are indexed by the corrected
`frozen-handoff.json`; final command logs are `entry-verified.log`,
`recovery-verified.log`, `clock-stable-final.log`, `blocked-verified.log`,
`adapted-entry-verified.log`, `adapted-recovery-verified.log`.
All commands used the fixed bundled PowerShell executable with
`-NoLogo -NoProfile -File <script>`. No external helper/native WLAN operation was
launched. Preview was also checked. PowerShell parsing, native compilation,
Python preflight parsing, runtime/source fingerprint and unchanged protected
support/function comparisons pass. Exact source checks/delta are external.

Failed/intermediate runs are retained: the first entry harness stopped before
case execution because StrictMode rejected a missing optional dictionary key;
the harness was corrected. Two near-expiry tests with only one second remaining
failed under parallel load because source correctly rejected the expired phase
before the test's expected pre-expiry ON/receipt step. Their result/phase clocks
and failed JSON/logs remain. Generated fixtures now leave five seconds before
the real clock crossing, retaining production's unchanged 240-second bound.
Final checks above pass; these fixture corrections are not native proof or a
production deadline extension. Earlier intermediate passing suites/probe
adaptations are also retained with their runner hashes.

## Preservation and stopped boundary

Fresh baseline includes 652 source and 65172 protected entries, current
coordinator review/state truth, all 845 original package artifacts, all fourteen
a1 failed/package digests, 49 private originals and the existing Desktop
launcher. Final preservation checks cover that baseline and unchanged Git
branch/HEAD. Only the permitted current workflow/state fields and this new
handoff change in the repository; all original reports remain unchanged.
See corrected `preservation.json`, `allowed-state-delta.patch` and
`frozen-handoff.json` for exact counts, hashes, latest passing evidence and
released lease. The writer stops after the direct completion report.

## Remaining gates and next action

Coordinator independently reviews these stopped corrected bytes, exact delta,
all three original failure expectations and both preserved intermediate failures
before any acceptance/publication. New exact authorization must bind the new
root and runner hash. No staged setup/E04/network approval/publication, real a2
attempt/output, Desktop replacement, WiFi/global-setting effect, private photo
decode/inference, dependency/service/elevation, phone/hosted/Git publication,
new model or milestone occurred. Native/query/preflight/support were not altered.

Actual manual OFF adapter/radio compatibility, independent visible-helper
launch/close/crash/recovery, native restoration and E05 remain **PENDING**.
Polling race, hostile broker/OS, power/helper failure and association-versus-
internet-reachability limitations remain. No recognition quality or M12 result
is claimed. Keep WiFi ON and do not launch old or unreviewed utilities.
