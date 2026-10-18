# P2-03-S1 — one-shot camera source implementation

2026-10-15. Coordinator dispatch to the existing **Track B real-photo experiment
tool**, thread `01a1051f-0777-7573-ad09-0e550a4bd56a`, Sol6.1 HIGH. Parent/coordinator:
`01a098ef-d830-7531-bca7-2d66b0a5b587`. Work only in
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`. Do not reset the dirty checkout or create a new branch.

## Authority and outcome

Founder explicitly approved the concrete G0 question: “Approve this isolated camera
experiment”. D-054 and `../PHONE_P2_03_G0_DECISION_20261015.md` record choice A:
camera-only isolated source opt-in; hard256MiB experiment-owned storage; separately
measured SDK production/cache with no proven hard allocation/cache/total-memory
cap. P1 G1 is accepted for its frozen packet. Neither approval proves this camera
implementation or authorizes a build, installation, phone operation or inference.

Implement a coherent one-shot source path: explicit permission -> ready bounded
rear-camera request -> native current-job JPEG admission -> observed orientation /
measured geometry -> existing numerical recipe -> durable receipt and human crop
review. One operation only; no enrollment, matching, scanning loop or P2-04.
Injected/generated checks establish code behavior only. Device capture and actual
model execution remain unexecuted until separately reviewed packets.

Read AGENTS.md, PROJECT_STATE.md, MULTI_AGENT_WORKFLOW.md,
IMPLEMENTATION_AUDIT_WORKFLOW.md, the relevant BUILD_PLAN M8 section, current P2
plan/tickets, D-054, G0 decision, October14 camera review packet and October15 C1
clarifications/review. The later approved G0/D-054 supersede the old draft's
all-inclusive storage claim. Inspect actual installed camera source and existing
code before changing it. Preserve unrelated work. You are not alone in this
checkout; the coordinator will refrain from edits/audits while you write.

## Exclusive mutation ceiling

Existing writable source files, additive integration only:

- `apps/mobile/app.config.ts`
- `apps/mobile/plugins/withRecognitionExperiment.js`
- `apps/mobile/src/recognitionExperiment/ExperimentRoot.tsx`
- `apps/mobile/src/recognitionExperiment/nativeAdapter.ts`
- `apps/mobile/recognition-native/recognition-experiment/android/src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt`

New files only within these exact responsibility/name boundaries:

- `apps/mobile/src/recognitionExperiment/CameraProofPanel.tsx`,
  `cameraProof.ts`, and `cameraProof*.ts` helpers if a separate responsibility
  justifies them; avoid unnecessary layers.
- `CameraProof*.java` under the existing CPU runtime's
  `src/main/java/expo/modules/recognitioncpu/` package, for admission, geometry,
  CPU adapter, lifecycle and private durable storage; and focused
  `CameraProof*Checks.java` beside the existing CPU generated checks.
- Camera-focused `apps/mobile/__tests__/recognitionExperimentCameraProof*.test.ts`
  or `.test.tsx` and `tools/scripts/phone-camera-proof*.py` / `.mjs` checks.
- This slice's new handoff:
  `docs/recognition/reports/PHONE_P2_03_S1_SOURCE_HANDOFF_20261015.md`.
- New writer evidence ONLY below
  `apps/recognition-lab/runs/phone-experiment/p2-camera-source-20261015-a1/writer/`.

All other existing files are read-only, including old tests, P0/P1/P2-01/P2-02
source/pins/results, entry, manifests, packages/locks, node_modules, model,
business app/domain/contracts/database/sync/scanner, plans/decisions, PROJECT_STATE
and workflow records. Do not weaken existing tests or rewrite historical evidence.
The coordinator owns status/lease transitions after your stopped handoff. If this
ceiling cannot support a correct implementation, stop with a precise blocker.

No dependency/download/install/service/Gradle/Expo/EAS/APK build, ADB, phone,
camera/private-image access, screenshot, model execution, network/cloud/Git effect,
radio toggle, other chat dispatch or subagent. Pure local TypeScript/Jest/lint and
focused javac/JVM generated checks with existing toolchain are allowed. A source
pin helper must describe new camera provenance, never overwrite an old P1 pin.

## Required implementation invariants

1. Explicit camera-proof environment opt-in requires BOTH existing recognition
   flags. CAMERA is the only additional permission. Preserve ordinary app and
   zero-camera recognition behavior, other exclusions, disabled backup/cleartext,
   ABI/CPU/model settings. Audio and barcode are disabled; remove residual barcode
   metadata. Do not evaluate/import expo-camera in the default zero-camera route.
   Camera mode must not start legacy generated/private recovery on mount.
2. Permission and capture are deliberate UI actions. Denial/readiness failure is a
   retained non-capture outcome, no retry/settings loop. Rear portrait preview,
   zoom0/minimum1x, mirror/flash/torch off; raw skipProcessing, exif true, no base64,
   pictureRef, onPictureSaved/fastMode or processed-JPEG fallback. Freeze a positive
   reported size <=4,000,000 pixels and wait for readiness after its configuration.
3. Native-issued current job ticket plus trusted app camera callback is the
   approved experimental provenance. Directory membership alone is insufficient.
   Accept only canonical regular UUID JPEG under this app's cache/Camera; reject
   foreign/content/http/traversal/symlink/alias/substitution/stale/duplicate input.
   Validate opened-file identity and size around reading; no arbitrary file API.
4. Positive JPEG <=12MiB, bounded header MIME and positive 64-bit W*H <=4,000,000
   BEFORE bitmap allocation/admitted copy. Require observed metadata/EXIF/header
   agreement. Unknown/-1 raw SDK dimensions remain refusal/inconclusive, never
   silently reconstructed. Decode without hidden sampling; verify actual bitmap
   allocation/config <=8 bytes per admitted pixel; recycle in finally.
5. Preserve pinned bundled model, float32 RGB224x224/div255, pixel-centre bilinear,
   grey128 padding, application CPU one thread with no XNNPACK/GPU/NNAPI. Separate
   camera source/recipe bindings; JPEG/effective ROI/tensor/model hashes and raw
   versus normalized vector facts. Missing/nonfinite/wrong-length/zero-norm output
   refuses. Do not call the actual model while implementing/checking this slice.
6. Freeze geometry before phone evidence: centered80% guide with5% padding ONCE,
   oriented half-open integer ROI, floor minima/ceil maxima/clamp. Layout A is
   measured available portrait preview, B a4:3 rectangle inside it. Distinguish
   aspect-fill mapping from FIT_CENTER actual content (bars aren't image pixels).
   Unknown capture/preview FOV/stabilization correspondence stays INCONCLUSIVE.
   Generated asymmetric/EXIF1..8 and rotations0/90/180/270 checks now; later physical
   landmark residual<=1% oriented dimension, annotation uncertainty<=2 physicalpx,
   rounding<=1 sourcepx. Generated math is not physical geometry acceptance.
7. New app-private camera root/journal only, not business SQLite/outbox/P1 stores.
   Reserve before every owned write, bound partial/staged/derivative/retained/
   metadata/export bytes plus unresolved reservations and atomic .new/.bak/failure
   residue under256MiB across restart. Derive exact reservation arithmetic from
   actual layout, including pre-reserved refusal metadata. Never reuse the draft's
   conditional24MiB/19-or20-images capacity calculation. SDK temporary exposure/
   observed peak is separate and unbounded; free-space checks aren't a cap.115 is
   only a future count ceiling. No silent eviction/deletion or reset of capacity.
8. Logical cancel/background/unmount/permission loss immediately forbids result
   publication; one cancellation signal; retain ownership until actual capture /
   native/file drain. Stale callback cleans only its own verified handle once and
   cannot release a later job. Unknown drain blocks a new request. Restart records
   interruption, never recaptures. Commit hash-bound receipt before readiness;
   numerical export excludes JPEG/arbitrary EXIF. Only current owned temporary
   cleanup after verified drain/commit is allowed; old/failed/user evidence stays.

## Verification and return contract

Use generated/injected fixtures, with fake/native-unvalidated evidence clearly
labelled. Exercise positive and one-unit cap boundaries, malformed JPEG/metadata,
EXIF1..8, geometry bars/rounding, URI/path and substitution rejection, stale and
duplicate calls, decode-not-reached on admission refusal, invalid model outputs,
cancel/background/unmount and late callback after another job, drain uncertainty,
partial writes, atomic commit failures, interrupted/corrupt restart and low disk /
reserved bytes including receipts/export. Test actual native admission/store seams
where runnable; distinguish host fakes from Android-verified behavior. Explain any
native compilation gap; do not call source regex checks Android validation.

Run relevant legacy generated/private/session/enrollment regressions plus new
focused tests, mobile typecheck and zero-warning lint with existing tools. Record
commands, exit codes, output and meaningful failures. No timeout/assertion weakening.
Before/after compare coordinator baselines; permit only listed existing deltas and
new files. Verify preserved P1 snapshots/results and prior evidence markers. Keep
source copies flat/indexed to avoid Windows path-length failure.

Work lease is the active workflow's finite lease. Stop before expiry and report
incomplete if necessary; do not renew it yourself. Return implementation, exact
changed/new files and hashes, tests/failures, storage arithmetic, source bindings,
remaining limitations and unimplemented gates. G2 source acceptance is the main
coordinator's decision; G3 build/static and G4 physical proof remain PENDING.

When finished: complete handoff and a final frozen inventory, stop all commands /
edits, and write `writer/writer-stopped.json` LAST (include handoff/inventory hashes,
scope, completion or blocker, and timestamp; inventory excludes its own file and
the later STOP marker). Do not mutate any evidence after that marker. Founder
explicitly requires your direct completion message to the parent chat above,
with the handoff's absolute path and STOP status, after stopping. Send it once;
if delivery fails, report the failure in your final reply. Do not silently wait or
start the next phase. Coordinator verifies stopped handoff, audits independently,
and returns any corrections to this SAME chat.
