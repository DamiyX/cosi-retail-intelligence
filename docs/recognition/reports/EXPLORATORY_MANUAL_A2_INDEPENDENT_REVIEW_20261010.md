# Manual-assisted a2: independent review and required corrections

2026-10-10. Main coordinator independently reviewed the STOPPED preparation.
**Preparation acceptance and operational E04/publication are withheld.**

Reviewed package:
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-offline-20261010`.
Frozen handoff SHA-256:
`7a035f8ef90d78d754592bebd7786e77b1adcd62812f18893411537ac61f8b6a`.
Runner SHA-256:
`0bf571889dfaac121e6d4b52b2a1b08bf0779bb8b972d8cfbe3c84f96e3db78c`.
These are the reviewed PRE-CORRECTION bytes, not future repaired bytes.

## Evidence actually checked

Writer completed/idle and workflow lease null were independently confirmed.
Branch/HEAD match `plan/m8-unified-scanner` /
`66ea3fc22595a48d7355d1729bb879496cc98896`.

Independent hash checks confirm all 845 indexed artifacts and the handoff
document match. All 64,291 protected baseline entries and all fourteen a1
failed/package digests match. Of 650 source-baseline entries, 648 match; the only
two existing deltas are the allowed project current-work line and task workflow.
The baseline includes 49 private originals. No private photo processing,
operational a2 attempt, publication or Wi-Fi mutation occurred in this review.

Read actual controller/helper/session/receipt/guard/deadline/result code, native
helper/radio query wrapper, connected preflight, extracted original support,
the three generated test suites and preservation/finalization procedures. The
original network/private-work arguments remain in the reviewed source. The
native wrapper's read-only opcode and radio data layout were checked against
[Microsoft's query documentation](https://learn.microsoft.com/en-us/windows/win32/api/wlanapi/nf-wlanapi-wlanqueryinterface),
[opcode enumeration](https://learn.microsoft.com/en-us/windows/win32/api/wlanapi/ne-wlanapi-wlan_intf_opcode)
and [radio-state structure](https://learn.microsoft.com/en-us/windows/win32/api/wlanapi/ns-wlanapi-wlan_radio_state).
That source check does not establish actual manual-OFF compatibility.

Builder's eighty passing generated checks are self-check evidence, not an
independent native gate. They were inspected; no duplicate broad run was
performed after finding the blocking omissions below.

New independent evidence is in
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a2-coordinator-20261010`.
Four exact-entry probes and two helper-orchestration probes ran against unchanged
reviewed code: three positive/control expectations passed, and three targeted
expectations failed, reproducing CF-01..03. All network/private-work boundaries
in these probes are explicitly generated substitutes. They create no approval,
publication, real helper session, Wi-Fi effect or photo inference.

## CF-01 — MEDIUM: incomplete work is returned as successful exit

File: `Invoke-ManualExperiment.ps1`, line 280; result boundary at 265–268.
The fixed producer/evaluator path preserves return 2 for incomplete work, but
the Start entry returns 0 whenever Failure is empty and Wi-Fi restoration is
present. It ignores `PrivateExitCode`. An incomplete result with private exit 2
therefore becomes exit 0.

Reproduction: `entry-reproduction.json`, case
`incomplete-must-remain-exit2`: expected 2, actual 0. Canonical private exit 0
returns 0 as the positive control. The probe executes the actual source entry
block with generated controller/package results, not a rewritten exit formula.

Smallest repair: validate the bound result's types and supported combinations;
return/report incomplete as 2, failure or malformed/unknown as nonzero, and
complete processing as 0 with explicit coordinator review still pending.
Null/invalid private result cannot become completion. Preserve twenty-query
accounting and original producer/evaluator behavior. Add permanent entry-level
complete/incomplete/failure/malformed tests, not only comparator tests.

## CF-02 — MEDIUM: explicit digest bypasses final publication gate

File: `Invoke-ManualExperiment.ps1`, line 276; Helper entry at 282–288.
Start calls `Read-Publication` only when `PublishedApproval` is absent. Supplying
a digest skips that mandatory gate and proceeds to package/controller checks.
Thus after E04 files are staged but before final publication, the explicit-CLI
route can proceed on those valid files. The helper entry also does not
independently require final publication. This is a publication-sequencing defect,
not a demonstrated bypass of all E04 package bindings or arbitrary local tamper
protection.

Reproduction: `entry-reproduction.json`. Missing publication without an explicit
digest correctly stops with exit 1 and no controller call. The identical missing
publication scenario with an explicit digest reaches the generated controller
and returns 0. Package/work/native effects are stubbed; no real E04 files were
created.

Smallest repair: require exact current publication on every operational entry,
including Helper. An explicit digest must match that publication or be rejected;
it cannot substitute for publication. Keep independent E04/session/root/hash
checks and fresh single-attempt claims. Test missing/mismatched publication on
both public routes and ensure no attempt/helper/private effects can start.

## CF-03 — MEDIUM: work expiry invalidates safe stopped recovery

File: `Invoke-ManualExperiment.ps1`, line 100, receipt validation at 184–193,
restoration wait at 195–206 and helper finally at 229–243.
All message timestamps are rejected after the private-work/session deadline.
When work expiry stops a job, its fresh empty-job receipt is naturally written
after that deadline. The helper then rejects its own receipt and refuses the ON
prompt, despite its current owner counters being empty and the durable receipt
recording zero active children. The restoration wait and controller watchdog
also share work-deadline limits rather than a distinct stopped-recovery phase.

Reproduction: `deadline-reproduction.json`. Positive recovery emits ON after
the generated owner is empty. A valid session simulated near its deadline then
actually crosses the deadline; private guard rejects, owner remains empty and
stop receipt records it, but ON is suppressed with
`STOP_RECEIPT_OR_CHILD_LIFETIME_UNCONFIRMED_NO_ON_PROMPT`.
This is generated orchestration proof, not a claim that native jobs/radio state
were exercised by this probe.

Smallest repair: keep private execution deadlines strict, while giving only
stopped recovery a separate finite bound. Current live owner empty-job proof,
exact nonce/helper/PID/start-ticks/session/receipt binding and a fresh valid
recovery timestamp remain mandatory; elapsed time grants no reconnect authority.
Controller/helper deadlines and terminal messages must agree during that bounded
recovery phase. No private work may resume or be extended. Unknown children,
stale/copied/malformed receipts and dead helpers remain conservative failures.
Test actual deadline crossing, parent loss/cancel, recovery expiry and unknown
child rejection with positive controls and generated process lifetime evidence.

## Correction ceiling and next action

Same existing GPT-6.1 Sol HIGH writer, sequentially. Prepare corrected utility
in NEW external `cosi-exploratory-manual-a2-corrected-20261010`, preserving all
845 original indexed artifacts, original frozen handoff/report and failed a1
records byte-for-byte. Keep future ID a2 (no operational a2 attempt has run),
but bind a new exact fixed root/source hash; old reviewed and repaired bytes
must remain distinguishable. Do not create E04/publication or replace Desktop.

Change only the utility runtime/entry/recovery/result plumbing needed for these
three findings, new generated regressions, a new correction handoff and allowed
current workflow/state fields. Native/query/preflight/support bytes stay the
same unless a concrete necessary delta is reviewed first. No recognition source,
model/recipe/threshold, original child limits, original tests/evidence, profile/
firewall/adapter/global setting, phone/service/hosted/Git or M12 change.

Writer captures a fresh baseline, works alone, then releases its lease and sends
a STOPPED handoff. Coordinator independently reviews corrected bytes and the
original failure expectations before any new exact publication. Native manual
OFF/standalone helper/recovery and E05 remain pending. For now keep Wi-Fi ON
and do not launch either old or unreviewed utility.
