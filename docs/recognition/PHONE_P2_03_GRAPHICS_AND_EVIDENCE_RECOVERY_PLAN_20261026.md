# P2-03 graphics/evidence recovery — Astra plan

2026-10-26. Planning complete; proposed implementation, not implemented or
device-authorized by this document. Founder requested Astra planning followed
by a switch to Sol6.1 High for the existing Track B implementation agent.

**Founder ownership amendment, October26:** the coordinator now implements the
source/host changes directly. Track B receives testing/test-authoring work only,
then returns a stopped handoff; implementation repairs stay with the coordinator.
This overrides the implementer assignment below, without changing technical scope
or authorizing a physical attempt. Latest implementation/test status is in
PROJECT_STATE.md and the coordinator's implementation handoff.

## Decision and evidence

Preserve recovered M00 as a successful save/export and an INCONCLUSIVE geometry
attempt. Fix the evidence-execution path and bound idle preview exposure before
another physical geometry session. Do not patch the image algorithm, reduce
resolution or switch rendering backends on an unproven graphics-leak theory.

Evidence already independently checked:

- APK6112b1a6/source7099ca177d3; exact M00 raw JPEG, native geometry, PUBLISHED
  terminal and673055-byte prefix1 ZIP are intact. Main reviewed219 indexed files
  and266 integrity assertions plus original/processed/pre-capture images.
- Capture tap00:14:07 Lagos; app-observed request-to-receipt7065ms. Native fatal
 00:15:26.816: PID3340 RenderThread SIGABRT/EGL_BAD_ALLOC12291 in libhwui.
  SurfaceView1440x1080 buffer allocation failures corroborate that mechanism.
  Upstream pressure, resource retention and driver fault remain unseparated.
- PID9605 later died LOW_MEMORY after onUserLeaveHint/onHostPause. It is not
  evidence that the read-only Inspect action caused a second native crash.
- The post screenshot was never requested successfully: host execution searched
  for status outside the visible ScrollView, then scrolled and lost the process.
  CameraOrientationPanel leaves preview enabled after capture; it closes on
  background/export but not ordinary capture completion. This exposed evidence
  collection to a much longer live session than the actual saved capture needed.
- Reviewed patched callback uses cosiReadAndClose with finally/image.close.
  That does not prove absence of every leak; it defeats an unsupported claim
  that the successful path simply forgot to close its ImageProxy.
- Source also makes update() select the NEXT case's layout immediately. At
  M03-A270 -> M04-B000 this changes A to B before the current row's post-preview
  can be collected. This is a confirmed source-level evidence risk, not the
  cause of the M00 crash; correct it in the same evidence-lifecycle slice.

The missing screenshot is a confirmed test-procedure defect. Long-lived preview
is an observed exposure; shortening it is mitigation, NOT a proven GPU fix.
No storage-full cause is established. No phone reboot, uninstall, cache clearing,
deleting user files or killing other apps is part of this plan.

## Implementation slice — same Track B, Sol6.1 High

Own the four linked changes below as one coherent slice; self-check then stop
with one handoff. Coordinator independently reviews before build/device effects.
Keep model, CPU recipe, same-frame camera patch, rotation/EXIF/ROI arithmetic,
permissions, dependencies, app identity and acceptance thresholds unchanged.

### 1. A visible, finite capture status and explicit preview release

In CameraOrientationPanel.tsx/cameraOrientationProof.ts and their focused tests:

- Put a compact machine-readable status in a fixed visible region outside the
  scrolling controls. Bind it to run, case, job, source, process and current
  foreground lifecycle generation. Distinguish preparing/capturing/terminal
  published/terminal refused/unknown; do not equate a settled tap with completion.
  Derive terminal status from the existing validated native result/inspection.
  Keep full diagnostic JSON available separately, not on the time-critical path.
- Pin the captured row's layout/viewport through its post-preview phase. Keep
  native next-case information separate; apply the next layout only during
  explicit next-row setup after the previous preview is closed. Do not remount
  or resize the old preview when terminal inspection advances native next.
- Retain the camera through the required post-preview observation. Add an explicit
  close-preview action enabled only after the native operation is idle and the
  JS owner is settled. Closing it is not acceptance, deletion or finalization.
  Host invokes it after the post PNG is safely written and hashed.
- Add a best-effort30-second terminal-preview watchdog: if the host disappears,
  close the preview after a settled terminal outcome rather than leave it live
  indefinitely. Display that it closed and that missing evidence remains missing.
  Never automatically close an unresolved active capture or claim hardware drain.
- For idle setup waits, visibly pause preview after120seconds; keep the user's
  setup question pending. Explicit resume prepares a new readiness generation,
  not a shutter. No silent capture, hidden retry or reset of consumed cases.
- Background/foreground invalidates stale status/ACK; normal read-only refresh
  stays routine executor work. No state from a previous process is current proof.

Do not alter the camera's physical frame, recipe or patch merely to add this UI.
If source inspection establishes a separate concrete resource-ownership defect,
document its causal evidence and focused correction; otherwise leave native
camera resource handling unchanged and label the crash cause unresolved.

### 2. Prepared host execution owns the short capture tail

Implement a reusable bounded controller alongside the reviewed phone helpers,
with pure fake-transport tests. Do not invent an arbitrary ADB command runner.
Whitelist the existing own-app actions/read-only diagnostics and fixed paths.

Prepare connection, exact APK/device/sandbox guards, target, controls and output
paths before requesting READY. Human positioning has no response deadline.
Fresh READY still starts the existing120-second shutter window; no late capture.
After READY obtain and qualify the pre image before shutter; reject stale or
unqualified pre evidence without consuming a case. Prepare everything before
launching the critical tail, which contains no model/chat/manual review pauses:

1. Revalidate current own control, nonce/lifecycle and READY deadline; journal
   intent, issue one ACK/shutter sequence only, record monotonic times.
2. Observe the fixed compact terminal marker with bounded own-UI reads. Save one
   full post-preview PNG immediately when terminal is observed, before scrolling,
   exporting, memory diagnostics or coordinator messages. Preserve physical
   viewport, lifecycle/process/row binding and timestamps; fsync/hash the PNG.
3. Cap this observation at20seconds after shutter. If completion is not observed,
   save the one post image at that deadline as explicitly UNCONFIRMED if available,
   then stop the row. Do not label it a confirmed post-settlement observation or
   issue another image automatically. An output-cap/transport failure cannot
   turn into a second shutter/screenshot. Keep unknown native work untouched.
4. For confirmed idle settlement and saved post evidence, close preview through
   the reviewed own action. Tell the founder promptly that the chart can be left.
   Native published-image/export verification follows with preview closed.

These are execution bounds, not claims that every camera must finish within20s.
Measure actual intervals; if the platform cannot meet the observation budget,
stop for a concrete adjustment rather than silently enlarge it or retry.
Keep immutable intent/result journals and treat dispatched-but-unknown effects
as consumed. Resume read-only evidence gathering after interruption, not effects.

### 3. Preserve old data; give new verification a distinct fixed identity

The current run binds its owner to source/APK and has consumed M00. A changed APK
must not adopt that owner or reset M00. Use one new fixed run/camera root and
derived job IDs for the eight-case verification; keep recipe/model unchanged.
Freeze exact new identities in the source handoff before building.

Extend the existing retained-evidence gate narrowly for the exact old UI run:
p203-orientation-20261025-ui-v2, source9ca177d32ec39d7b66c97252979d641bb7058e5a338619fc4c1b42764f20e2ff,
APK6112b1a6d6b2640253c939c5fcc4c26844409bf8e879aafa2e2abc26c6462369.
Validate its exact owner/registry, published M00 profile/digests, absence of M01–M07
intents, and settled generated/prefix1 export chains with released grants. Reject
unexpected/torn/pending state. Do not delete, migrate, relabel or append old files.
The new packet retires only the old run's seven UNSTARTED photo slots and unused
future export allowance; it cannot make the old M00 a pass. Carry actual retained
bytes/claims and outstanding allocations into the unchanged256MiB accounting.
If safe headroom is insufficient, report it; never waive caps or evict evidence.
Preserve existing C2/v1 readers and already established completed-export recovery.

Why a fresh fixed run: prevents mixing changed test UI/source with old bound
receipts. It adds ONE upright capture to the seven still-needed poses; it does
not repeat seven completed new-run photos. All old control/product/annotation
results remain as scoped evidence. No new generic reset/export API is needed.

### 4. Collect a small memory discriminator, not a broad phone dump

Prepare package-scoped diagnostics for later device execution: own PID/process
exit records, own bounded logs, own meminfo summary and aggregate available-memory
figures only. No other app names, contents, heap dumps or broad bugreport.
On the first planned physical row, sample before preview, once after preview is
ready (before fresh READY), and after successful close; one delayed60-second
closed-preview sample is enough. Keep diagnostics out of the capture/post tail.
Use finite deadlines/output caps; unsupported fields are unavailable, not zero.

Interpretation: pressure with low aggregate available RAM supports environment
pressure; growth/retention within the own process supports a resource investigation;
allocation failure without discriminating evidence remains a driver/surface or
pressure hypothesis. A few samples do not establish causality or a leak. A clean
short run supports bounded-test feasibility, not long-session camera reliability.
If EGL failure repeats, STOP the batch. Preserve completed rows and scoped logs;
do not iterate photos or switch SurfaceView/TextureView speculatively.

## Required checks and delivery sequence

1. Host regressions: delayed/hidden status, foreground invalidation, native refusal,
   lost process/transport, failure after shutter, post write/hash failure, exact
   once-only resumption, expired READY, no close while active, terminal watchdog,
   and no screenshot/export admission before proper state. Prove the old sequence
   loses post evidence in a simulated late crash while the prepared tail preserves
   it. Test A-to-B next-case advancement cannot resize/remount the captured row
   before post evidence, and explicit next setup adopts B afterwards. Fake tests
   prove control flow, not real device/GPU behavior.
2. Retained-state tests: exact published-old-M00 accepted read-only; altered owner,
   extra old intent, unfinished export, torn marker and over-cap state refuse.
   Keep old files byte-identical. Run affected existing UI/ownership/export tests;
   do not rerun unrelated full-project suites or claim previous timed-out suites.
3. One stopped source handoff and independent audit. Reuse the accepted camera-
   enabled staging/manifest approach; one reviewed signed build/static check and
   normal update-in-place packet. No recovery-only manifest overlay, uninstall,
   dependency upgrade or model download. Record actual new source/APK bindings.
4. One new generated metadata export check for new fixed identities before photos.
   Retain prior completed-restart evidence; repeat a restart only if changed source
   affects that path and reviewer identifies the exact uncovered behavior.
5. Physical proposal: EIGHT chart captures/16 pre-post screenshots in the new run.
   Compared with the earlier authorization this is ONE extra M00 capture and TWO
   extra screenshots overall (previous one capture/two screenshots stay counted).
   Obtain explicit amended physical authority before execution; planning/model
   switch alone does not authorize an extra capture. Fresh READY for each row.
6. First new upright row: verify pre/post/original numerical registration and
   scene, native bindings and prefix1 export, then proceed to the seven remaining
   positions only after early review passes. No repeat of four interruption tests
   or product photos/boxing/labels unless a specific changed boundary requires it.

Acceptance stays <=2 physical-preview-pixel annotation uncertainty, <=1% upright
image width/height registration including uncertainty, <=1 source-pixel crop
rounding, whole readable chart/border/eight markers spanning>=80% guide both axes,
and required pre/post scene proof. Measure original and previews independently
before correspondence. Laptop bands are disclosed, never automatically waived;
if they defeat readable markers/thresholds, improve the display setup before a
shutter. No claim that the laptop display caused the phone graphics crash.

P2-03 closes only after independent physical acceptance. P2-04's existing plan is
then usable; do not replan it here. P2-05/Astra and GitHub CI remain deferred.
Ordinary agent self-repair and October26 founder-first effort-change workflow
remain in force. One source handoff, one build handoff, one early-device review;
routine status/connection/file reconciliation must not become micro-approval loops.

## Research basis and limits

Android documents package-scoped RAM diagnostics through dumpsys; use measured
graphics/native/managed memory rather than infer a leak from one RSS reading:
https://developer.android.com/tools/dumpsys . Android can reclaim background
processes under memory pressure: https://developer.android.com/topic/performance/memory-overview .
PreviewView PERFORMANCE/SurfaceView and COMPATIBLE/TextureView differ in rendering
and cost, so a backend swap needs its own evidence and geometry verification:
https://developer.android.com/media/camera/camerax/preview . These references do
not diagnose this Samsung crash. Existing device traces remain the primary evidence.

## Handoff now

Pause for founder's switch back to Sol6.1 High. Next assignment is source/host
implementation of sections1–4, with one stopped handoff. Phone presence is not
needed for that implementation. No physical attempt or application source change
was performed during this Astra planning turn.
