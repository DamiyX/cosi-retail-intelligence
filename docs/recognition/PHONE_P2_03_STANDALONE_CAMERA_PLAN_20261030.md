# P2-03 standalone camera component and early integration

2026-10-30, Africa/Lagos. **PROPOSAL / PLANNING ONLY.** Sole planning output;
no implementation, build, installation, phone operation or photograph authorized.
Workspace: `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD `374286d`; preserve all existing dirty work.
Coordinator owns PROJECT_STATE/workflow/decisions and independent acceptance.

## Recommendation and independence

Build a small native Android application, provisionally **Camera Component Probe**,
package `com.damiyx.retailintelligence.cameracomponentprobe`, with one launcher
Activity and a reusable Android library. Use cached CameraX 1.6.0, SDK36/JDK17
and the reviewed offline Gradle toolchain. Native views suffice; no React, Expo,
Metro, model, barcode, business database, enrollment or old-record validators.

Keep it as an independent reference. The retail app already supplies catalogue,
sales and inventory; Recognition Generated Probe is its separate experimental
variant, but still starts React through `recognition-entry.js`. Another Expo
variant would not satisfy this request. A second native Activity inside the old
package also would not isolate its process/startup/private storage.

Prove separation through merged manifest/DEX/dependency inspection: unique
application ID, native Application/launcher, no shared UID, old providers,
React/Expo libraries or historical admission calls. Later verify installed
package/signer/APK hash, distinct UID/PID and own canonical private directory.
Never try reading the old sandbox to demonstrate isolation. Android's
[application sandbox](https://source.android.com/docs/security/app-sandbox)
provides the intended process/data boundary; Android, camera hardware and graphics
driver remain shared. Separation is not a proven graphics repair.

Alternative: defer the mini-app and repair legacy admission first. That could
identify the old validation failure but would retain the startup coupling and
would not deliver the requested independent reference. Recommend the native app.

## Evidence checked and comparison

- Read P2 plan/tickets, existing P2-04 plan, M8/state/recovery policy, D-046 and
  D-054–059; current workflow explicitly assigns this chat planning only.
- A6 independent review accepts one capture/save, not geometry. S4/S5 recovered
  eight JPEGs from twelve attempts: six rotated configurations failed severely;
  crop arithmetic alone passed. Prior interruption controls mostly occurred after
  SDK settlement; they do not prove in-flight hardware preemption.
- Recovered actual matrix-build source under
  `C:/Users/doyew/.cache/cosi-p203-matrix-main-build-20261023-a1/app/`.
  `src/recognitionExperiment/CameraProofPanel.tsx` SHA256
  `9ebf3cdbc20559f6b5e897aab7386db406ac2be400d0f2b445ca1ff7d6f2ebd5`
  and native `CameraProofFrame.java`
  `d572f411748e28fb16a24b9c9998f566d56408417c6677e68402c49b6c7fe153`
  match the matrix publication build's source index, associated with APK
  `b83a2b2d6cc744345c46106c3d76c9c1a52eddddeecb7c2535394230f3512674`.
  The UI uses Expo `takePictureAsync(skipProcessing:true)`; crop math maps
  EXIF-upright dimensions to preview without relative-rotation evidence. This is
  recovered relevant source, not a reconstruction of every historical build input.
- V2 source adds display/use-case rotation, generation, JPEG/hash/EXIF consistency
  and requested-versus-actual-size distinction. Its C1 independent review accepts
  source/generated checks only. Reuse these invariants, not an assumed physical pass.
- Latest C2 `MAIN_RESULT.md`, `READ_ONLY_TRACE_HANDOFF.md`, actual metadata, five
  live events and own native crash were inspected. APK
  `d74fc6540d980b0fdde9e3be022e4425b255e1bd8613d386be56cea25a74d9fd`,
  source784 `dca55281039a10e8dd299863226579f1958a5da59b7351984515c4f54e32dbe0`:
  PID29198 RenderThread SIGABRT/EGL_BAD_ALLOC/swapBuffers. Identity passed; refusal
  occurred at LEGACY_METADATA before provider/admission journal/Activity launch.
  Current `GraphicsEntryProbe.kt` and `GraphicsAdmissionTrace.java` hashes match
  that frozen source index. Their unnamed hash check and error mapping hide
  collector exceptions versus returned-refusal/hash failures. Same-process metadata
  succeeded earlier. Exact validation failure and initiating GPU cause remain
  unproved; neither shutter, storage-full nor inadequate hardware is established.

Evidence roots are under `apps/recognition-lab/runs/phone-experiment/`:
`p203-matrix-publication-build-20261023-a1/writer`,
`p203-graphics-entry-c2-main-20261030-a1`, sibling C2 device/source-build roots.
Controlling reviews: `reports/PHONE_RETAKE_C8_A6_INDEPENDENT_REVIEW_20261023.md`,
`reports/PHONE_P2_03_S4_S5_INDEPENDENT_DISPOSITION_20261024.md`,
`reports/PHONE_P2_03_ORIENTATION_V2_C1_INDEPENDENT_REVIEW_20261024.md`.
The October26 graphics/evidence plan supplies unchanged physical tolerances.

## Component, state and data ownership

Proposed build root: `apps/recognition-lab/camera-mini/android/`, with `app/` and
`camera-component/` Gradle modules. App owns permission UI, fixed experiment registry,
budget and evidence export. Library owns preview, capture, geometry, proxy lifetime
and durable single-attempt records. No dependency back into the recognition app.

Use a small session interface: open a validated fixed configuration, explicitly
capture once with current readiness, close/cancel; expose typed status/results.
States: CLOSED → PREVIEW → READY → CAPTURING → SAVED/REFUSED/INTERRUPTED;
cancellation can remain DRAINING. One executor/job owns work until actual drain.
Every callback binds job and lifecycle/geometry generation. Background, permission
loss and layout changes invalidate readiness; restart inspects records without
recapture. Unknown effects consume the slot. Never equate unbind with hardware drain.

Persist intent before shutter; retain original JPEG, geometry and terminal receipt
with hashes. Use bounded no-follow/no-replace publication, file/directory sync and
readback. Extract only necessary checked publication primitives, not the old store
or its historical allowlists. Torn state remains evidence, never auto-repaired.
Reject oversize before decode; close every ImageProxy exactly once, including
exceptions/executor rejection. Keep original bytes immutable; derive crop separately.

Rear camera, zero zoom, flash off; initially preserve locked portrait display and
matrix A=2:1/B=4:3 preview layouts. Bind both use-case targets to actual display
rotation; record native buffer/crop/rotation, preview transform/bounds and EXIF.
Apply EXIF once, never test-pose corrections. Initially reject unsupported non-full
buffer crops/mirroring rather than silently extending V2. Validate actual dimensions
independently of requested resolution. CameraX distinguishes buffer and transform
information ([official documentation](https://developer.android.com/media/camera/camerax/transform-output));
matching rotations alone does not prove matching fields of view.

Preserve centered 80% guide and 5%-of-guide padding, not the diagnostic Activity's
different decorative rectangle. Retain <=2 physical-preview-pixel annotation
uncertainty, <=1% upright width/height registration including uncertainty,
<=1 source-pixel crop rounding, readable border/eight markers spanning >=80% of
guide on both axes, and independently measured pre/post/original evidence.

## Early integration is mandatory

Immediately after standalone preview/capture/save/reopen and one upright geometry
pass, include the **same library source revision** in Recognition Generated Probe.
Add a thin native adapter plus a React launch/result panel. Bridge passes fixed
request identity, never arbitrary file paths; native result owns bytes/provenance.
The existing app's operation owner must serialize this session with its other
camera/model/export work. Old preview must be absent before launch.

Likely integration edits: isolated plugin/Gradle inclusion and manifest,
`RecognitionExperimentModule.kt`, `nativeAdapter.ts`, `ExperimentRoot.tsx`, a new
small panel and focused tests. New root `camera-component-integration-v1` stores
only new records. Historical roots remain untouched; new entry must not depend
on validating their entire accumulated history. This requires explicit review of
the narrow admission/accounting amendment, not disabling existing legacy guards.
No business schema or RecognitionService change.

Integrated upright check must exercise normal React entry → native component →
saved result → existing reviewed crop/CPU recipe adapter → UI return → reopen.
Check single ownership, provenance and geometry, not recognition accuracy. A new
camera-only bridge path must not pretend to be old Expo URI provenance. Preserve
model/recipe math; version the new acquisition binding explicitly. Do not complete
the remaining matrix or start P2-04 before this integrated gate passes.

## Bounded execution and diagnostics

1. **Source/build:** generated tests cover rotations/crop edges, stale callbacks,
   proxy closure, cancellation/drain, denied permission, torn publication and quota
   refusal. Reuse old failed geometry fixtures. Audit exact dependency closure,
   manifest, signed APK and source hashes before installation. CAMERA only, plus
   exact AndroidX signature receiver guard if merged; no INTERNET/media/audio.
   Cached artifacts are candidates, not proof the new offline graph resolves.
2. **S00 standalone:** one upright A capture, pre/post screenshots, one bounded
   local evidence export, close preview, reopen saved record without recapture.
   Native launch and available-space/permission observations precede human READY.
3. **I00 integration:** same upright evidence sequence in the existing recognition
   package, after stopped source/artifact review. Keep standalone installed.
4. **Only after I00 acceptance:** proposed fixed continuation I01–I07 covers A90,
   A180,A270,B000,B90,B180,B270. IC01 covers one explicitly timed background
   interruption/reopen; generated tests cover other invalidations. Review changed
   boundaries against prior controls before dispatch; uncovered physical gates
   remain open rather than assuming one interruption proves them all.

If standalone fails, stop at the observed stage: launch/render, bind/preview,
capture, save or geometry. Retain scoped diagnostics; no identical retry or
speculative renderer/resolution switch. If standalone passes but integration
fails, investigate bridge/admission, competing owners, React lifecycle or receipt
adaptation; do not spend remaining standalone matrix slots. If both pass, they
establish bounded feasibility only, not long-session GPU reliability.

Use named stages and bounded allowlisted exception class/code, expected/observed
hashes and validation labels; no raw exception messages, private paths or pixels
in logs. Distinguish live events from durable records and validation refusal from
native crash. Sample own-process/aggregate memory before preview, when ready and
after close; unsupported GPU counters remain unknown. No broad bugreport.

Prepare all tooling before READY; show exact chart, orientation and framing
instructions. Fresh human READY starts the existing 120-second shutter window;
never capture late or while founder is absent. Save post evidence before scrolling
or diagnostics; use the October26 bounded tail and explicit close after settlement.
Pause idle preview after120s; settled-preview watchdog30s. Missing evidence stays
missing. No automatic replacement photo, screenshot, Save or uncertain effect replay.

## Resource proposal and decisions

Early registry is **S00+I00 only: two captures/four screenshots, one local export
per app**. Later proposal adds eight attempts (seven geometry/one interruption)
and at most16 screenshots; none is presently authorized. Old limits10/20,
consumed3/5, unused1/2 and deferred6/12 remain separate and unchanged.

Propose **64MiB new logical allowance per app for the early gate**: 10MiB original,
10MiB staging/residue, 2MiB derivatives, 2MiB metadata, 16MiB archive staging,
16MiB selected output, 8MiB reserve. SDK files/graphics/total RAM remain separately
measured and not hard-capped. Admission <=10MiB JPEG and <=4MP; unknown/oversized
SDK production stops work without automatic deletion. Reserve before capture and
check actual available space before install/capture/export; propose a further
256MiB free-space floor, explicitly a conservative stop threshold, not sufficiency
proof. Measure installed APK/code separately. Host evidence cap256MiB, excluding
separately inventoried build tooling/artifacts; stop instead of truncating evidence.

Old253602084 logical claims remain fully retained. Both new allowances together
make387819812 bytes logical exposure, excluding SDK/build/install overhead.
The integrated allowance exceeds old D-054 aggregate256MiB: founder must explicitly
approve this additive namespace allowance before source admission changes. Do not
silently use old headroom or refund claims. Later matrix capacity needs a separate
concrete budget before dispatch;64MiB is not a promise all remaining rows fit.

Founder selections: approve native package/module boundary and reviewed cached
dependencies; approve additive storage/export allowances; later authorize exact
installation/physical registry and provide fresh READY. No new provider versions,
downloads, network settings, reset, deletion, Git or CI implied.

## Same-chat handoffs

Coordinator reviews this stopped plan, then switches **this chat** to Sol6.1 High.
Bounded slices: A component/app source and generated checks; B offline build/static
audit then separately authorized S00; C early integration source/build and I00;
D reviewed remaining checks and final evidence disposition. Stop at source/artifact
and physical handoffs for independent review; no new chat/agent or self-escalation.
Own routine scoped diagnosis and one bounded repair; escalate failed repairs,
material defects or scope changes. Ask founder directly about ordinary phone setup.

P2-03 overall and P2-04 remain unaccepted until integrated physical evidence closes
their actual gates. P2-04's existing guided-enrollment plan is retained; P2-05
planning stays later. Historical passes retain only their original scope.
