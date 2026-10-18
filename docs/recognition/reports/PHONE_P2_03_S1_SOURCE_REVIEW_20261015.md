# P2-03-S1 independent source review

2026-10-15. Main coordinator decision: **CHANGES REQUIRED; G2 not accepted**.
Scope is the S1 dispatch's five existing deltas and17 new source/test/tool files,
compared to the coordinator's917-file pre-dispatch baseline and the stopped
writer's22 source copies. Unrelated dirty branch work is excluded, not reverted.
G0/D-054 and frozen P1 G1 remain accepted for their stated scope. No build,
installation, phone/camera/private-image access or model inference ran here.

## Evidence and preserved ownership

The exact handoff/STOP/inventory hashes match the direct completion message.
All4167 inventory entries were checked (regular-file hashes, reparse target
separately without traversal),917 baseline paths have only the five permitted
deltas,17 prior freeze markers and28 G0 snapshot/result files remain exact.
Windows long paths and the recorded junction require extended paths/no-follow
handling; initial generic checks failed on that representation, then the exact
bytes/target checks succeeded. No artifact mismatch was found.

Evidence lives in
`apps/recognition-lab/runs/phone-experiment/p2-camera-source-review-20261015-a1/`.
Fresh javac succeeds against the actual pure production classes; unchanged
generated geometry300, private-state37 and offline-policy108 assertions pass.
Two warnings in unchanged legacy Java remain recorded. This does not compile
Kotlin or execute Android IO/Bitmap/CameraX.

The writer's full177/8 filesystem stress evidence was reviewed. The coordinator
stopped its redundant full replay after discovering its historical17-minute
duration, retained partial fixtures and recorded STOPPED_NOT_PASSED. It is not
counted as a new pass. Focused material counterexamples below replaced that
replay. An initial custom Jest preset-path error and a host cp1252 console-print
error are retained; the corrected harness then exercised the actual React UI.
No production source, original test or timeout was changed for the audit.

## Specification findings

### CP-S1-C1 — high: acknowledged cancellation reopens as readable numerical output

`CameraProofLifecycle.cancel` acknowledges cancellation in memory only.
`CameraProofAndroid.finish:62-65` writes durable invalidation later, after
`process:99` has already committed a `.done` profile. `CameraProofStore.readNumerical`
accepts that committed profile after restart without a durable publication/drain
resolution. A process death between cancellation ACK and later finish therefore
loses a known cancellation and presents its numerical candidate as readable.

Fresh `cancel-focused.json` / `CancellationRestartProbe.java` uses the actual
production Store/Lifecycle plus the existing generated host IO. It commits a
complete generated profile, acknowledges cancel, simulates process death before
finish, reopens with another process ID and attempts numerical read. Actual:
`cancelAcknowledged=true cancelledNumericalReadableAfterRestart=true`; the required
refusal assertion fails. No physical power-loss or Android claim is made.

Correct the durable lifecycle/publication boundary. A cancellation acknowledgement
must not leave a prior candidate eligible after restart. Do not depend only on
best-effort deferred invalidation: unresolved finalization/publication must remain
unready, including cancellation-write failure and a kill before its first byte.
Keep immediate logical invalidation independent of slow storage; retain ownership
on unknown drain and keep all residue charged. State the exact acknowledgement /
commit semantics and limits. Test cancel after candidate commit, before final
publication, during persistence failure, restart and stale callbacks. Do not
introduce automatic deletion, acceptance or recapture.

### CP-S1-C2 — high: Cancel can be followed by a new SDK capture

`CameraProofPanel:50-52` awaits `Camera.getCameraPermissionsAsync()` after acquiring
the native ticket. Cancel while that Promise is pending invalidates the run, but
the continuation checks permission/view/foreground only, then calls
`takePictureAsync` anyway. No SDK capture was in flight when Cancel was pressed.

Fresh `camera-ui-counterexamples-a2.json` uses the real panel with its existing
mocked native/camera seams. Delay the permission observation, start one request,
press Cancel, resolve permission true. Expected zero `takePictureAsync` calls;
actual one with raw capture options. The test fails on that exact observation.

Guard the actual SDK invocation with current request/generation/invalidation
authority after every awaited pre-capture operation. Cancellation before SDK
invocation must record NOT_STARTED and settle only that request, without confusing
it with a genuinely outstanding capture/drain. Test user cancel, background,
unmount and permission loss at that boundary and protect newer jobs.

### CP-S1-C4 — medium: reselecting the current layout permanently disables capture

`CameraProofPanel:63` always clears readiness. Pressing already-selected Layout A
(or B) leaves the CameraView key/props unchanged, so no fresh `onCameraReady` is
owed by the SDK. Capture stays disabled until an unrelated remount.

The same focused UI receipt asserts ready -> press Layout A -> remains usable;
actual disabled becomes true. Treat reselection as a no-op or deliberately renew
the readiness generation; retain fresh readiness for genuine size/layout changes.
The UI harness has five existing tests passing and the two above failing.

## Standards finding

### CP-S1-C3 — high: finalization failure escapes the native executor

Source inspection: `RecognitionExperimentModule.kt:170,195` calls
`cameraProof.finish(ticket)` in an unguarded `finally`. Its implementation can
throw IOException/IllegalArgumentException while persisting invalidation or
validating the store. The same unchecked finalization exists on executor-rejection
paths. An exception from finally bypasses the surrounding work catches and exits
the Runnable passed to Executor.execute; the promised retained/blocked outcome
can instead become an uncaught worker exception (and potentially app termination).
This is a source-supported failure path, not an executed Android crash claim.

Contain finalization failure at the actual native-wrapper seam, preserve primary
failure plus cleanup/finalization status, settle a Promise at most once, and do not
publish success before required durable finalization. Keep uncertain ownership
blocked; do not mask failure by releasing busy or deleting residue. Add an injected
failure check through the actual finalization helper used by the wrapper, covering
success, rejection, cancellation and worker scheduling failure. Kotlin compilation
and device exception behavior still belong to G3/G4, not a fake host PASS.

## Acceptance and next action

The implementation includes substantial bounded admission, explicit recipe,
generated geometry and quota work, but the four findings prevent G2 acceptance.
The writer's cold UI timing failures, uncompiled Kotlin, exact native/barcode
closure, SDK drain/raw metadata, Android fsync/descriptor/bitmap and physical FOV
remain limitations. The SDK producer cap/total-memory gap is explicitly approved
experimental exposure under D-054; it is not a newly discovered waiver or proof.

Dispatch these four corrections to the SAME existing writer with a fresh finite
lease and exclusive C1 evidence root. Preserve this review and original writer
root. Writer stops with a new handoff before coordinator re-audit. No build,
phone action, model execution, P2-04 or architecture/dependency expansion.
