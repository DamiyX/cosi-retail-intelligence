# P2-03 readiness and diagnostic recovery plan

2026-10-27. Planning only. Main coordinator implements after the founder switches
back to Sol 6.1 High; Track B authors/runs verification and returns a stopped
handoff. No phone action, build, capture, budget increase or P2-04 acceptance is
performed or authorized by writing this document.

## Decision

Correct the three connected defects together before another chart photo:

1. Host execution must obtain and age-check a newly issued native readiness
   token after the final human READY, including after preview restoration.
2. The app must retain the capture error separately from refreshed status.
3. The host must preserve a diagnostic post image on a safely observable UNKNOWN
   result without calling it a completed capture or closing unresolved work.

Use the existing camera, model, image recipe, geometry mathematics and thresholds.
Do not investigate a speculative graphics leak or replace the camera library in
this correction. The observed token expiry is not a camera-quality failure.

The timing correction alone can be host-only. Reliable retention of the original
exception cannot: the installed UI overwrites it. Therefore the complete solution
includes a small UI correction and a reviewed replacement APK. Do not run another
physical experiment between these two fixes simply to see whether timing helps.

## Evidence and uncertainty

Main independently checked all 46 R2 records and replayed the actual compiled
native Readiness class. See the compact input:
`apps/recognition-lab/runs/phone-experiment/p203-evidence-r2-admission-review-20261027-a1/RECOVERY_PLANNING_HANDOFF.md`
and adjacent independent-review/compiled-readiness-replay receipts.

- Native Inspect issued the token during host interval 921410.359–921410.515.
  Preview paused and was restored; a second READY began at 921497.0. The old token
  remained in use. Capture intent was 921542.593: native token age at least
  132.078 seconds, exceeding its independent 120-second lifetime.
- Human READY age 45.593 seconds and pre-image age 16.906 seconds passed. The
  previous host ordering correction worked; do not undo ACK-before-pre.
- The compiled native replay rejects that expired token. Expiry is confirmed
  and strongly supports the early-refusal explanation. The actual thrown error
  was overwritten, so another request/admission error cannot be excluded.
- One host Capture tap returned; native count remained zero, with no confirmed
  new photo, post image or prefix-1 export. This is not proof of SDK invocation
  and not permission to replay a dispatched command.
- Same process remained alive. This attempt provides no new EGL/low-memory crash
  evidence and does not establish a graphics fix or a geometry pass.

## A. Prepared host protocol

Create a new versioned helper beside the preserved V1/V2 helpers. Do not edit
historical controllers, sessions, packets, journals or evidence indexes. Reuse
reviewed parsing/transport where appropriate; add only a fixed own-app Inspect
action, not an arbitrary shell or generic action facility.

Before asking READY, prepare connection, device/APK/sandbox proof, chart, output
directory and controls. Human setup remains untimed. Once the final READY arrives:

1. Journal one Inspect intent and monotonic start, dispatch the fixed Inspect
   control, and observe its completed new nonce/status. Require a changed nonce,
   correct next case/job, idle state, generated gate, same process/lifecycle/view,
   mounted ready preview and unchanged viewport. Record the issuance bracket
   from before dispatch through first verified new-nonce observation. If the
   refresh is uncertain, stop; do not silently refresh again in that attempt.
2. Bind the receipt to this READY generation, helper/packet and host monotonic
   clock instance. Old observations, a persisted timestamp from another host
   process, or merely matching opaque nonce text are insufficient. A preview
   restore, lifecycle/view/process change or second READY invalidates the receipt.
3. Complete ACK, acquire one pre image and qualify its exact hash. Retain the
   existing minimum 15-second positioning interval and 120-second human window.
4. Immediately before actual input dispatch, check all clocks independently:
   human READY <=120 seconds; qualified pre <=30 seconds; conservative native
   age measured from the issuance bracket's START <=120 seconds. Require a
   finite remaining dispatch budget; the input timeout must not extend past the
   earliest applicable deadline. A timeout means unknown/consumed, not replay.
   Host checks cannot promise Android scheduling latency; native consumption
   remains the final authority and its limit must not be enlarged.
5. Keep redundant observations, status scrolling, memory diagnostics and chat
   round trips out of the qualified-pre-to-shutter interval. Preserve one intent
   and one dispatch per attempt. Any failed freshness check stops before input.

Inspect clears ACK and issues a token: treat it as a recorded stateful setup
action, not a generic read. A status refresh after capture must never be mistaken
for the token used to admit that capture. Store the admission binding separately.

## B. Retained error and honest outcome

Scope: CameraOrientationPanel.tsx, cameraOrientationEvidence.ts, their focused
tests, and cameraOrientationProof.ts only if required for a typed error boundary.

- Add a bounded structured capture-error record, separate from the status text:
  sanitized existing error code, case/job, process/lifecycle/view and attempt
  stage. Do not retain arbitrary exception payloads, paths or image data.
- Latch the original failure. finally/update, a later Inspect failure and preview
  messages cannot overwrite it. Expose it in the fixed machine-readable marker
  and a short visible message without scrolling or resizing the chart viewport.
  Preserve existing viewport sizing; verify it in UI tests.
- Report a secondary inspection error separately. Absence of an error is not a
  success signal. Stale async completion must not attach an old error to another
  lifecycle, process or case. On process death, host evidence may remain; do not
  claim that an in-memory UI latch survives death.
- Keep native PUBLISHED/REFUSED derived only from the existing native terminal.
  An early JS/native admission error with no terminal remains UNKNOWN, with its
  error attached. No automatic capture retry, case reset or UNKNOWN preview-close
  permission is introduced.

Host observation must recognize same-binding UNKNOWN: save one post image and
the marker/error as UNCONFIRMED, then stop. It is diagnostic evidence, never a
geometry-acceptance pair. Do not wait unnecessarily for a terminal after a
definitive unknown observation. Keep the existing 20-second observation and
10-second settled-close bounds. Capture a post only while package focus,
process, lifecycle and actual viewport still match; otherwise record it missing,
without photographing Settings or an unrelated screen. A failed post save is
consumed; no automatic second screenshot. Only confirmed native idle settlement
plus a safely saved post permits the existing close action.

## C. Source binding, preservation and build

The installed 9b1fbf3e APK/source 7dd7a58b and its generated-export gate are
historical passed evidence. Preserve them and all R1/R2 records unchanged.
The native store binds source/APK; a changed UI must not impersonate that owner.

For the replacement build, assign one new fixed run/root/job namespace and freeze
its exact identities and source index before building. Extend the existing
retained-evidence validation narrowly for the old evidence-v2 run: exact source,
APK, owner/registry, zero native capture count, no active/pending work and the
completed generated-export receipt. Verify actual state before relying on this
shape; a mismatch stops for reconciliation. Preserve old command history even
though its native capture count is zero. Carry all retained bytes/claims into
the unchanged 256 MiB accounting. No deletion, data clearing, migration, resetting
the old run or permission/dependency/model changes.

Allowlist the necessary identity/binding changes in the existing orientation
plan, proof, retention and native selector files, derived source binding and
build helpers; enumerate the exact files in the implementation handoff. Audit
every native selector together to avoid the earlier partial namespace change.
No geometry/encoder/rotation/backend changes are included. Keep old frozen
documents/indexes immutable; the new plan and new freeze form separate artifacts.

One reviewed offline release and in-place install follow source verification.
Verify signer/package/permissions, actual packaged JS/native bindings and
sandbox continuity. Existing old generated export is not repeated. The NEW
source-bound run needs its own generated prefix-0 export/readback gate; state
this limited extra check clearly, rather than presenting the old pass as proof
for the changed APK. No repeat of the four completed interruption checks,
product photographs, boxes or label annotations.

## D. Verification and handoff

Main implements and self-checks; then stops edits. Existing Track B authors/runs
tests at High and returns a concise stopped handoff. Main independently reviews
that evidence before Track B's Medium physical execution. No parallel writers.

Required regression evidence, with no phone for the source checks:

- Reproduce R2's old native age 132.078 seconds alongside fresh READY/pre. Reject
  before input. Fresh Inspect after final READY succeeds in a fake transport.
- Boundary/expiry, restore and second-READY invalidation; changed nonce/process/
  lifecycle/view; uncertain refresh; ACK ordering; stale pre; expired human
  READY; transport delay/timeout; consumed journal cannot replay. Test actual
  controller/adapter paths, not a separate arithmetic-only model.
- Original capture error survives successful update and failed update; current
  error appears in the fixed marker; stale callbacks cannot contaminate another
  view. Existing terminal provenance and no-repeat guards remain intact.
- UNKNOWN saves exactly one diagnostic post with matching view, never closes or
  passes; lost view/process saves no unrelated screenshot; post/close failures
  retain their evidence and cannot authorize another shutter.
- Existing focused UI/readiness/geometry tests, typecheck/lint and affected
  native identity/retention checks. Preserve unresolved historical stress-test
  timeouts as limitations; do not silently extend their deadlines.

Run a complete fake end-to-end rehearsal including slow setup, pause/restore,
final READY, refreshed Inspect, ACK, pre qualification, capture, terminal/post
and close. Demonstrate error retention with an injected stale-token rejection
without spending a physical photo. Reuse the actual compiled native-clock replay
as supporting evidence, not as a substitute for host/UI regression coverage.

## E. Next physical packet and limits

Before asking for physical readiness, prepare the exact reviewed artifact/packet
and reconcile the separate counters. Current recovery allowance has consumed
TWO pre images and ONE dispatched host Capture command, with zero confirmed new
SDK photographs and zero complete geometry pairs. Native count zero cannot
refund that command or retrospectively prove no SDK action beyond the evidence.

Proposed amendment, NOT yet approved: eight future chart rows, at most eight
future host Capture commands and sixteen future pre/post images. Across the
current recovery this means a cumulative ceiling of NINE host Capture commands
and EIGHTEEN screenshots, preserving the consumed one/two respectively. Count
any diagnostic post within its row's two-image allocation. No automatic extra
replacement slots. SDK admission/photos, host dispatch and screenshot counters
must be recorded separately; clarify these numbers in one user request after
the concrete packet is reviewable. Renew authority if evidence changes the ledger.

Track B obtains fresh READY per row and stops rather than taking a late photo.
First complete only M00, close preview, export its original evidence and obtain
main's independent first-row review. If acceptable, continue the seven remaining
rows within the approved packet; stop on any unresolved outcome. Finally export
and audit the complete matrix against the existing geometry criteria. No new
physical failure injection is part of this recovery.

P2-03 remains incomplete until the physical matrix and required evidence pass.
P2-04 then proceeds from its separate approved plan. This document does not
promise the remaining poses will pass, prove a GPU fix, waive missing evidence
or reopen deferred Git/CI work. After planning, pause for the founder's model
switch; do not dispatch implementation or phone testing in this turn.
