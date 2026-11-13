# P2-03 graphics-entry investigation and next experiment

2026-10-29, Africa/Lagos. Founder selected Astra review and replied **Switched**.
Status: investigation complete; focused experiment proposed, NOT implemented or
executed. Sol 6.1 High implementation follows the founder's switch/continuation.
No phone, build, installation, capture, screenshot, export or Git action occurred
during this review. Existing implementer is stopped, lease null.

## Finding

The current blocker is a native graphics crash, not a confirmed photo-save fault.
The precise initiating defect remains **unverified**. Do not describe another
capture, export, timer or metadata patch as a graphics fix.

| Inspected observation | What it establishes |
| --- | --- |
| Latest APK `0e2ae8...`, source index773 `8f0127...`: entry input at 19:17:09 Lagos; native abort timestamp 19:17:56; exit recorded 19:17:58 | Failure during the entry sequence, before any host READY, shutter or screenshot. About 47 seconds from entry intent to abort is wall-clock context, not a measured renderer duration. |
| PID7462 / RenderThread / SIGABRT / `EGL_BAD_ALLOC` / `EglManager::swapBuffers` | Android's hardware rendering path aborted. This is not an observed Java heap exception or Android low-memory kill. |
| Earlier PID20349 at 13:00:58 has the same BAD_ALLOC/swapBuffers signature; PID9130 at 05:49:07 has BAD_ACCESS/damageFrame | Three observed graphics crashes, two matching signatures. Their common root cause is not proved. |
| Earlier native APK `5fa7de...` reached SETTLED with an actual `SurfaceView`, then a lifecycle interruption about 1,194 seconds later in the same process | Native preview has worked. This was not a successful capture, continuous trace, or proof that the current build is stable. |
| Latest UI samples show React controls, then no own UI/process; no native marker was captured | We cannot tell whether the new Activity or preview briefly started between samples. Missing observation is not proof it never started. |

Khronos defines BAD_ALLOC as failure to allocate resources for an EGL operation;
that alone does not establish full phone storage, damaged hardware, or a specific
driver bug. RSS110MB is not a complete measurement of GPU/system allocations.
[EGL error definitions](https://www.khronos.org/files/egl-1-4-quick-reference-card.pdf).
AOSP's renderer treats this class of swap failure as fatal; application-level
Kotlin exception handlers cannot make this SIGABRT recoverable. The referenced
AOSP source explains the mechanism, not the exact Samsung vendor implementation.
[EglManager source](https://android.googlesource.com/platform/frameworks/base/+/a319bd3c2329/libs/hwui/renderthread/EglManager.cpp).

## Source trace and hypotheses

Actual path: React button -> bridge worker -> retained-metadata validation /
CameraX CLOSED check / exclusive reservation / durable setup owner ->
`startActivity` -> native layout -> Preview + ImageCapture lifecycle binding.
Only later can READY and shutter execute. The native Activity still shares the
React application's process. It is not an independent native application.

The current `mark()` publishes accessible UI state only after admission and
layout creation. There are no durable per-stage observations covering the entire
bridge-to-first-frame interval. That is the confirmed diagnostic gap.

| Hypothesis | Evidence and next discriminator |
| --- | --- |
| Activity/window transition or shared-process rendering interaction | Still plausible because React remains in the process and the crash occurred on entry. Run the same native Activity/theme first with no preview object and no camera binding. |
| Preview surface or camera-session graphics/resource interaction | Plausible given all three graphics traces. Attach an idle PreviewView separately, then bind the original Preview + ImageCapture combination with shutter unreachable. Record the actual child backend and stream sizes. Earlier SurfaceView success argues against declaring SurfaceView universally broken. |
| Device/system graphics resource pressure or vendor behavior | Plausible, unproved. Collect bounded own-process memory, available-memory and camera-state observations around the stages. One device and one pass cannot establish a vendor defect. |
| Photo processing, save callback, host screenshot or short capture deadline initiated the latest crash | Not supported for this occurrence: those actions had not been invoked. Earlier capture crashes still need their own causal evidence. |

Default PreviewView normally selects SurfaceView but may fall back to TextureView.
COMPATIBLE explicitly selects TextureView and changes rendering behavior; it is
not a proven remedy here. Keep the current policy for the first experiment and
record the actual backend. No global graphics flag, acceleration disable,
renderer switch, camera-library upgrade or device-setting change in this plan.
[Android preview modes](https://developer.android.com/media/camera/camerax/preview).

## Recommended implementation: one observation-only entry mode

Use the existing isolated package, same process, native Activity, theme, hardware
acceleration and camera configuration. Add a build-bound **graphics-entry probe**
mode, routed before the existing capture-session admission. Preserve the original
capture path disabled and unchanged in this candidate. No new package, process,
permission, dependency, generalized harness or whole-app rewrite.

The probe has no READY, shutter, JPEG save, decode, model or export action. Native
dispatch must reject all legacy capture/export/processing endpoints in this mode;
disabling UI buttons alone is insufficient. Retain the global exclusive-owner
guard. Keep the same guide/preview bounds and control-row dimensions where
possible; record differences rather than claiming an identical A/B comparison.

Stages are monotonic, explicit and at most once, within one entry attempt:

1. **Entry preparation:** record bridge receipt and each completed admission step,
   then the intent to start the Activity. Preserve metadata validation, source/APK
   identity, current focus, no old Expo camera view and actual CameraX CLOSED.
2. **Native shell:** inflate ordinary native controls/guide with an empty preview
   container. No PreviewView or camera binding yet. Observe focus/resume/layout,
   window attachment and a rendered-frame submission; hold for 10 seconds.
3. **Idle preview view:** explicitly attach the same PreviewView, without a surface
   provider or camera binding. Observe it for 10 seconds.
4. **Camera binding:** explicitly bind the same rear-camera Preview + ImageCapture
   use cases, target rotation, resolution request, flash and zero zoom. ImageCapture
   exists only to retain the same session configuration; `takePicture` is
   unreachable. Record actual resolution/backend, camera OPEN and STREAMING;
   observe for 30 seconds from STREAMING, then unbind, detach and observe CLOSED.

Main advances stages after fresh own-app observations; no automatic resume,
relaunch, fallback or second entry after crash/refusal. Allow at most 30 seconds
for a stage's readiness, and 10 seconds for closure. A missing callback produces
an unresolved result, not a fabricated pass or extended deadline. These are new
preview-only observation bounds, not changes to the existing photo deadlines.
Stage4 may run only with the founder aware the camera preview will open; no chart
or precise positioning is needed. No photos or screenshots in this experiment.

## Small, recoverable evidence record

Add a fixed, create-once metadata root `p203-graphics-entry-20261029-a1` with a
**65,536-byte maximum logical reservation**, including all files/partial records.
No images or general private-file access. At most32 bounded records include
sequence, stage intent/completion, monotonic time, source/APK, process/PID,
Activity identity/focus, window acceleration, actual view class/dimensions,
camera state/use cases, and coarse resource counters. Emit the same sanitized
events to a package/PID-scoped live host collector. No unfiltered device logs.

Record an intent durably before a stage's effect; carry out file IO on a worker,
then recheck foreground/process/window before returning to the main thread.
Render callbacks must enqueue records, never block the renderer on filesystem IO.
Missing or torn final records stay UNKNOWN. Frame-commit observation means a frame
was submitted, not necessarily visible to the user; do not call it a screenshot.
[Android frame-commit contract](https://developer.android.com/reference/android/view/ViewTreeObserver#registerFrameCommitCallback(java.lang.Runnable)).

Integrate one bounded read-only metadata view for the exact old B1 e01..e03 roots
and the new probe record in this same candidate; no separate collector APK loop.
Old B1 files remain immutable. Inspect owner/ready/event metadata and file
descriptors only, never old JPEG pixels. Identify old owners by their original
source/APK, not the new executable. Report empty, partial, owner-only or other
observed shape honestly; no inferred pre-ready-closed receipt or old-root adoption.
Unknown historical outcomes remain quarantined and charged, not erased to proceed.
Require no live previous process/operation, present process exclusivity, and
actual current CameraX CLOSED before the distinct no-shutter probe. Invalid file
type/identity, capacity excess or active owner stops admission.

Retain **253,471,012 bytes** of previous claims in full, including all three B1
allowances. With the proposed65,536-byte metadata allowance: **253,536,548 bytes**,
leaving **14,898,908** below268,435,456. No refunds. This logical disk accounting
does not bound CameraX buffers, GPU memory or total application RAM.

## Scope, checks and return contract for Sol 6.1 High

Likely files: `CameraCaptureDiagnosticActivity.kt`, its binding, a small probe
controller/metadata reader in the same native module, `RecognitionExperimentModule.kt`,
`CameraOrientationPanel.tsx`/`nativeAdapter.ts`, and isolated build/plugin routing.
Reuse existing exclusive-file/identity primitives. Do not refactor the legacy
capture, setup recovery, export, model or business modules to fit the probe.
New build mode must be included in the existing source/variant Metro cache key;
verify the actual transformed route and packaged mode, not only environment vars.

Use focused checks for: no shutter/export route; ordered one-shot stages;
duplicate/background/stale-process/late-callback refusal; bounded/torn records;
no old-root mutation and full retained claims; default-build exclusion. Compile
the real Android module. Do not repeat unrelated suites or create hundreds of
mirrored assertions. Builder self-checks package/signer/permissions/dependency
graph, compiled mode and source identity before a stopped handoff. Keep the
founder's test-first workflow: no new exhaustive coordinator preinstall audit.

This review authorizes no build/install/device effect by itself. After founder
continuation, one coherent implementation/build/device packet should cover this
single no-photo experiment, rather than requesting each routine observation.
Current writer `01a17d25-9d2c-7e81-9680-9e04af83d0e9` may be reused at Sol6.1 High;
main retains physical execution. Implementer stops/releases lease and reports
the exact artifact, checks and limitations directly to main. No dispatch yet.

## Interpretation and exit

- Failure before camera binding narrows the search to preparation/window/shared
  graphics state; changing JPEG/save code would not address that experiment.
- Shell and idle-view success followed by binding failure focuses investigation
  on the camera/surface interaction. Only then propose a separately bounded
  backend/resource discriminator using the recorded actual configuration.
- All stages passing means **one preview-only experiment passed**. It is not a
  graphics fix, root-cause proof, photo-save pass or P2-03 acceptance. Main decides
  the next single photo packet using fresh READY and the untouched allowance;
  capture is never enabled automatically in this probe.
- Any crash ends this run. Save own exit/log evidence, do not restart. A later
  metadata-only retrieval must not resume the camera stages. Reassess from the
  last durable/live phase before proposing another change.

Unchanged photo accounting: total10Capture/20screens; consumed3/5; current unused
1/2; deferred6/12. Existing photo deadlines120s/30s/20s/10s remain unchanged.
All consumed intents, original artifacts and data survive. P2-03 remains open;
P2-04, CI repair and Git publication remain held. Reversal means leave probe
disabled and retain its evidence, not reinstall an old APK or reset data.

## Local evidence inspected

- `apps/recognition-lab/runs/phone-experiment/p203-native-setup-bound-recovery-device-20261029-a1/`: MAIN_ENTRY_CRASH_REPORT.md, own native crash/exit evidence, entry intent and own UI observations.
- `apps/recognition-lab/runs/phone-experiment/p203-native-capture-bound-device-20261029-a1/`: native-settled-status.json, lifecycle-safe-close-status.json and PRE_READY_LIFECYCLE_STOP.md.
- `apps/recognition-lab/runs/phone-experiment/p203-native-setup-bound-recovery-c1-20261029-a1/`: stopped HANDOFF, BUILD_RESULT, source-index and disabled host preparation.
- Actual native Activity, Binding, EpochIO, SetupSnapshot, Reservation, bridge,
  manifest, Gradle dependencies and React panel. All seven inspected primary
  Activity/binding/epoch/bridge/panel/snapshot/reservation files match their
  frozen773 source-index hashes.

No new runtime test was executed in this planning review. This plan addresses the
current evidence gap; it does not claim a repair has already been found.
