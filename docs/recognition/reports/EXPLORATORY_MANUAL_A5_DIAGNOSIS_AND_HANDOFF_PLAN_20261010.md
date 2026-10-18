# A5 diagnosis and handoff plan — October 10, 2026

Status: diagnosis/planning only. No implementation, launcher publication, private
pixel decoding, new inference, network changes or agent dispatch performed.
Founder requested diagnosis before switching back to Sol6.1 for any execution.

## Finding: this attempt completed

The apparent second identical failure is not supported by the saved evidence.
A4 was INCOMPLETE, exit2,40 DECODE_ERROR/no vectors/20 unscored queries. A5 is
COMPLETE_PROCESSING_COORDINATOR_REVIEW_PENDING, exit0, no failure,40 vectors and
20 scored queries. The previous bounded JPEG-container correction addressed the
observed A4 input failure. There is no justified further decoder/runtime repair
based on this A5 outcome.

Exact run: `offline-manual-20261010-a5`.
Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Attempt root: `C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a5-20261010`.
Runner SHA256: `dbe7abae4f931d7f75890a4b470521aea7dfedd1826cb81064d9223198401a67`.

Evidence read and independently checked:

- Actual result: Failure=null, PrivateExitCode=0, original WLAN/route restored.
- Session, result, stop receipt and recovery-phase hash bindings agree; native
  offline marker exists. Three owned jobs created/drained, zero active reported.
  This verifies the recorded ordinary run, not all crash/power/hostile-OS cases.
- Published runner/runtime/setup/approval/document/Desktop hashes match the
  coordinator's final preparation record. All40 original photo hashes match.
- Bundle has40 distinct, finite, nonzero1024-dimensional vectors and matching
  study/model/recipe/source/setup/software and input preservation bindings.
- All40 producer/report thumbnail hashes agree with the bundle, without opening
  or decoding private images during diagnosis.
- Report has20 distinct scored query rows, no load/run failure or incomplete
  gallery. Independent arithmetic over saved vectors reproduces120 candidate
  scores/identities/nearest references: three primary and three withheld-identity
  proxy candidates for each of20 queries. No model execution was repeated.
- Independently recounted results:10/20 first choice;19/20 within first three.
  Thus10 first choices are wrong and one query misses the top three. Processing
  success must not be presented as recognition readiness or a pass threshold.
- Same ten physical products/correlated views; this is exploratory evidence,
  not an independent dataset, calibrated confidence or unknown-rejection test.

116 current attempt/output/package/Desktop hashes and compact diagnostic evidence:
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-a5-diagnosis-planning-20261010\diagnosis-and-preservation.json`.
Original evidence remains in place. No rerun is needed to inspect these results.

## Confirmed cause of the confusing presentation

1. The immutable A5 runner's `Invoke-ManualHelper`, line360, unconditionally prints
   `Stopped. Failure=$failure; restoration=$restoration. No automatic retry.`
   in its finally block. On success, null becomes an empty string, producing
   `Stopped. Failure=; ...`. This is exactly the screenshot and actual null result.
   The same wording is used for successful and unsuccessful termination.
2. Lines441–442 correctly classify exit0 as COMPLETE but expose an uppercase
   internal status and an empty Failure field. They do not explain plainly that
   processing finished and result interpretation is the next step.
3. The Desktop wrapper prints a numeric exit code, generic final-status advice
   and a pause. It has no clear success summary or pointer to the saved report.
4. `apps/recognition-lab/src/exploratoryCli.ts:37` emits processing counts/timings;
   the readable accuracy summary is already written by
   `apps/recognition-lab/src/exploratoryReport.ts:43` into `report/summary.txt`.
   The launcher does not surface that report to the founder.

`WAIT_ON: ORIGINAL_ASSOCIATION_ROUTE_NOT_PRESENT` is a transient observation while
the founder reconnects. The final result confirms the route returned. It is not
the final failure status. Likewise, denominator20 means20 query photos, not20
distinct products. `COORDINATOR_REVIEW_PENDING` is an intentional review boundary.

The message branch does not distinguish success in human-readable language;
the recorded processing/exit classification does. This is a confirmed usability
defect, not evidence of another recognition execution failure.

## Plan for Sol6.1 HIGH after the founder switches

### P1 — Close the actual-result review before any new attempt

Read this packet and the immutable A5 evidence. Verify the current bytes against
the116-file manifest before extending the review. Complete the E05 result handoff
and update current project/workflow state from the stale pre-launch statement to
"A5 processing completed; exploratory results and founder identity review pending."
Keep actual execution completion separate from formal recognition acceptance.
Do not rerun A5, clear its claim, rewrite old reports or publish A6 merely to
improve the wording. No additional photo capture is required for this review.

The existing private report is:
`apps/recognition-lab/runs/exploratory/private-manual-offline-offline-manual-20261010-a5/report/report.html`.
Guide the founder through its contact sheet and wrong matches using local-only
viewing when available. Confirm that stored identities match the intended items.
Do not upload images, embeddings or reports or use a hosted viewer.

### P2 — Optional bounded launcher presentation repair for future use

If proceeding with the requested correction, use the same stopped implementation
chat `01a1051f-0777-7573-ad09-0e550a4bd56a`, Sol6.1 HIGH, then a stopped coordinator
audit. This packet has NOT been sent. Work on a new preparation copy only; the
consumed A5 runner/Desktop/package and all earlier attempts remain immutable.

Scope: helper/controller terminal presentation and future Desktop wrapper text.
Prefer a small pure formatter around the existing validated outcome. Preserve
Get-ResultExitCode, result schema, hashes, exit semantics, OFF/ON prompts, owned-job
proof, deadlines, one-attempt policy and all networking/private-data guards.
No producer/model/preprocessing/ranking/dependency changes are justified here.

Required messages:

- Valid complete processing + restored route: "Photo processing finished.
  Results are saved. Return to the coordinator to review recognition results."
  Show "No processing error" rather than an empty Failure field.
- Incomplete processing: "Processing finished with missing or failed images.
  Keep this result and return for review. Do not rerun."
- Failure, missing stop proof, unconfirmed restoration or malformed result:
  retain the correct existing instructions and exact diagnostic reason. Never
  produce a success banner merely because the helper stopped or a report exists.
- Keep reconnection waits visibly labelled "Waiting for Wi-Fi to reconnect";
  retain the diagnostic symbol in logs. Do not imply verified internet access.
- Explain that20 is the number of test photos. Provide a fixed local results
  location after valid completion; no arbitrary shell/browser command from data.

A concise processing-success banner is sufficient. If adding recognition totals
to it, use an already validated, run-bound report with fixed denominator and mark
them exploratory; do not fabricate totals, infer accuracy from exit0 or weaken
the report schema. Prefer leaving detailed accuracy in the existing report to
avoid adding a new parsing/security boundary for a wording repair.

### P3 — Generated verification and independent audit, no private rerun

Use fixtures covering: complete exit0/restored, incomplete exit2/restored,
failure/nonzero, null private result, malformed result, missing stop proof,
unconfirmed restoration and transitional WAIT_ON followed by restoration.
Assert both text and unchanged exit classification. Include the actual A5-shaped
null-Failure case that currently prints the confusing message. Verify no success
banner appears for incomplete/failed/unconfirmed cases and no ON prompt is moved
ahead of the owned-jobs-empty proof. Test the wrapper's exit-code preservation.

The implementer stops with exact diff, fixture evidence and unchanged consumed
artifact hashes. Coordinator independently audits before any future publication.
These generated message checks need no Wi-Fi toggle, private photos or inference.
Improved output must not be treated as another successful physical run.

## Recognition quality is a separate evidence question

The observed10/20 top-choice result is modest;19/20 within three suggests review
of candidate presentation may be informative. Neither proves production utility.
The cause of individual wrong matches is UNDETERMINED here. Background, viewing
angle, object similarity, labels and encoder suitability are hypotheses, not
established bugs. Do not promise a model or preprocessing change will fix them.
First inspect the existing wrong-match contact sheet and verify identities.
Any later model/crop/OCR/enrollment comparison requires a distinct reviewed plan,
fixed evaluation conditions and honest separation from this baseline. Do not
tune on these20 images and then present the same images as independent validation.

End condition for this request: founder receives the diagnosis and this plan,
then switches model. No agent message, implementation or new experiment started.
