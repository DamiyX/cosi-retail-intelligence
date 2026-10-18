# P2-03-S1 source handoff — isolated one-shot camera

2026-10-15T18:10:03.136847+00:00. Writer
`01a1051f-0777-7573-ad09-0e550a4bd56a`; coordinator
`01a098ef-d830-7531-bca7-2d66b0a5b587`. Branch `plan/m8-unified-scanner`,
worktree `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`.

**Source implementation and bounded self-checks complete; G2 independent source
acceptance is PENDING coordinator review. G3 build/static and G4 physical proof
remain PENDING.** This report is not camera, Android runtime, model or release
validation. The writer will freeze this report and stop before its single
authorized direct completion message. `writer/writer-stopped.json` is the
authoritative STOP marker; its presence/hash is verified at finalization.

## Authority, scope and source bindings

Implemented only the October15 S1 dispatch (`b10911da94cc0e8709374b9d4ccf1a928449aed8dcd53cb51fd5be2b3f3d72c8`)
under founder choice A / D-054. Five allowed existing deltas and17 new files;
no migration, dependency, model/P1 pin, business/catalogue/SQLite/outbox/sync,
RecognitionService, shared package, plan/decision/state/workflow or Git mutation.
No Gradle/Expo/EAS/APK build, installation, ADB, camera/phone/private-pixel/model
execution, radio, network/cloud or additional agent/chat dispatch occurred.
PROJECT_STATE/workflow/lease transitions remain coordinator-owned.

Evidence root:
`apps/recognition-lab/runs/phone-experiment/p2-camera-source-20261015-a1/writer/`.
The installed coding/testing/security routes informed implementation; review-audit
was loaded and used for a fresh **self-review**, not an independent audit. No
functional lead or worker ran. No adjacent GLOBAL_MEMORY router was found; the
context gap is recorded in `change-brief.json`, with the explicit dispatch used.

- Camera source manifest34 rows: `94c7f02d7eb7626e22c2bae6d1753ab3e45757e64a042fbda3ef1b31b417ab6a`;
  `source-manifest-a6.json` and generated `CameraProofSource.java` agree.
- Recipe version: `camera-android-jpeg-exif-roi-center-bilinear-u8-gray128-rgb224-f32-div255-v1`;
  recipe-name SHA256 `76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522`.
  Source hash additionally binds the numerical implementation/parameters. This
  recipe-name hash alone is not an APK or transitive dependency closure hash.
- Pinned model SHA256 `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`;
  adapter checks4117670 asset bytes at future execution, application-only CPU,
  one thread, XNNPACK off, no GPU/NNAPI delegates, float32 RGB224x224/div255.
  No model was executed in these checks.
- Flat/indexed final source copies22: `source-after-index-final-v2.json`, SHA256
  `2f1b2cb0db9182f07f73b5e36a09dc0a569c28176379854b6534dca7f0f725be`. Five original source copies/index remain in `source-before/`
  and `before-index.json`; `integration-diff.patch` compares those exact bytes.
  Earlier manifest/source/check attempts remain historical, not current bindings.

## Resulting behavior

Camera opt-in requires both existing isolated recognition flags and
`EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF=1`. CAMERA is the only extra permission;
audio/barcode are disabled, residual barcode metadata removed, and other native
exclusions/security/CPU settings retained. Default zero-camera entry never
evaluates expo-camera; camera entry does not mount legacy recovery. The one
line require-style exception documents Metro's synchronous conditional entry;
no test/lint configuration or timeout/assertion was relaxed.

Permission and capture are deliberate. A reported positive size<=4MP is selected,
then a new camera-ready event is required. Rear/picture/portrait app configuration,
zoom0/minimum1x, mirror/flash/torch off, raw skipProcessing/exif true/no base64,
no fastMode/onPictureSaved/pictureRef or processed fallback. Measured preview
geometry is frozen in an owned request record before SDK capture. Status text
occupies fixed controls and candidate review uses a modal, preserving that
preview. Geometry changes during a request invalidate it rather than remap it.

Native reservation/current ticket + trusted app callback + newly created UUID
cache file are the experimental provenance. Native snapshots pre-existing cache
leaves before capture and rejects their reuse, foreign/content/http/traversal/
encoding/URI aliases, nonregular/symlink/hard-link/UID/path substitution, stale
tickets and duplicate callbacks. It compares opened descriptor/path identity,
size and nanosecond mtime/ctime around bounded reading. This is not cryptographic
sensor attestation; the SDK callback is explicitly trusted under G0.

Positive JPEG<=12MiB and64-bit header pixels<=4,000,000 are required before
admitted copy/bitmap decode. Returned dimensions, JPEG header and observed EXIF1..8
must agree. SDK -1/missing metadata stays unknown and refuses. No inference of
missing dimensions, hidden decode sampling or arbitrary EXIF export occurs.
Bitmap dimensions/ARGB8888/allocation<=8 bytes per admitted pixel are checked;
recycling occurs in finally. Bounded failure observations retain available SDK
size/identity/header/hash facts without copying an oversized producer file.

ROI is centered80% guide +5% padding ONCE, oriented half-open integer bounds,
floor minima/ceil maxima/clamp. A uses measured available portrait preview;
B is4:3 inside it. FILL/FIT math distinguishes actual image from bars. Receipt
hashes JPEG, upright cropped row-major RGB-u8 ROI, tensor, preview PNG, model,
recipe and raw/normalized vectors; ROI hashing uses a fixed chunk, not another
full-sized image. Existing pinned sampled tensor math is unchanged. Preview is
the exact224x224 tensor raster. `geometryStatus=INCONCLUSIVE`, physical FOV false,
sensor exposure unknown, auto-accept false and camera-proof acceptance false.
Timing is coarse native monotonic timing: inferenceMs includes the CPU adapter's
asset/runtime preparation plus vector validation; requestToReceiptMs starts at
ticket creation after reservation and ends at receipt assembly before commit.
Neither is sensor exposure, full commit/UI latency or directly comparable to
P1's kernel-only inference timing.

One shared native busy owner covers old experiment operations and camera work.
Cancel/background/unmount/permission loss invalidate publication once; native
background/destruction hooks also signal. Cancellation does not release ownership
or invent SDK drain. The flag does not wait behind the gate/store commit monitor.
Late/current callbacks still drain their own work; stale/double completions cannot
release a newer job. A checksum/source/job-bound invalidation marker can append
after commit and blocks later numerical reads, including partial marker residue.
Restart/status never recaptures; explicit recovery classifies old unfinished jobs.

## Exact owned storage accounting

New app-private `files/camera-proof-v1` only. Owner identity binds camera source,
model and recipe. The fixed64KiB refusal file has128 checksum-bound512-byte slots;
it is preallocated before jobs and never grows or silently rolls over.

| Per-job final role | Maximum bytes |
| --- | ---: |
| raw.jpg | 12,582,912 |
| preview.png | 262,144 |
| receipt.json + numerical.json | 131,072 |
| failure.json + interruption.json | 8,192 |
| reservation + request.json + done + invalidated | 16,384 |
| One full profile | 13,000,704 |
| Reservation B =2x profile | **26,001,408** |

Root charge is exact owner byte length +65,536 refusal bytes. Each unfinished
job claims max(B, observed final/staged/backup bytes); each committed job charges
all retained file lengths. Before each output write, projected usage includes
both stage/destination lengths at exclusive hard-link publication, even when
existing residue already exceeds B. .new/.bak/failure/interruption/invalidation
residue is never silently removed or treated as free. Initialization is fixed
metadata; refusal writes stay within its preallocated charge. Receipt and numerical
copy/export bytes are both reserved; numerical export contains no JPEG/URI/path
or arbitrary EXIF. No separate export-copy destination is offered.

The hard application quota is268,435,456 logical file bytes/reservations, with
conservative duplicate-name peak charging. Host sparse-length checks do not prove
Android physical allocated blocks/inode overhead, durable fsync behavior or total
RAM. SDK cache/producer allocation is separate: only bounded post-callback cache
observations are recorded; actual producer/cache peak is unknown and uncapped.
Free-space headroom is a refusal guard, never proof of a producer cap.115 is a
count ceiling only; neither115 photos nor the old19/20-image arithmetic is promised.

## Verification actually run

All inputs were generated/injected. Exact command, cwd, UTC, exit/stdout/stderr and
source-before/after hashes are in the corresponding JSON receipts below. No old
test, fixture, assertion, timeout or preset was edited.

| Check / evidence JSON | Result | What it establishes |
| --- | --- | --- |
| jvm-final-a9.json | exit0; core177 + capacity8 checks | Actual pure Frame/Store/Lifecycle seams, host files and injected pixels/faults; JPEG/4MP/12MiB, EXIF1..8/rotations/asymmetry/ROI hashes/FILL/FIT, invalid vectors, fresh/stale URI/jobs, nonblocking cancellation, restart/corruption/refusal slots/partial reservation and post-commit invalidation, exact256MiB and one-byte-over refusal |
| Same JVM receipt, unchanged legacy checks | exit0;300 +37 +108 assertions | Generated geometry/export, private ownership/drain and saved offline-policy/status controls |
| android-compile-a7.json | exit0; javac-Xlint:all, no warnings | New Java against installed Android36 + cached LiteRT API/runtime jars; **not Kotlin compilation or Android execution** |
| mobile-regressions-final-a4.json | exit0;36/36,10 suites |19 camera checks/four suites plus17 unchanged generated/private/adapter/root regressions, mocked camera/native only |
| typecheck-final-a6.json | exit0 | Mobile TypeScript noEmit |
| lint-final-a5.json | exit0, max-warnings0 | Entire mobile ESLint tree |
| lab-jest-a1.json | exit0;54 passed,1 skipped | Exact72-file source/test/fixture shadow; session/enrollment/current CLI/storage controls inside writer root |
| private-jvm-a1.json | exit0;14,888,235 assertions | Unchanged private JSON/geometry/ranking controls; no-argument generated branch only, no private packet opened |
| binding-final-a4.json | exit0 | Current34-row camera source binding matches generated Java constant |

The one unmodified historical session CLI case is explicitly filtered by
`^(?!actual CLI retains).*`: its expected old01 output root conflicts with the
current02 CLI. It is not claimed passed. Current enrollment/legacy CLI controls
were executed in the exact shadow; frozen original run roots were untouched.
Pure JVM compilation retains two warnings in unchanged legacy classes
(unused FileLock resource reference, missing serialVersionUID); these were not
silenced or edited. They are separate from zero-warning mobile lint/new Java API
compile. The final Java-only quota refinement changed no mobile TS files.

## Retained failures and false-confidence limits

Early attempts remain in writer JSONs and `checks-index.json`: missing exported
Expo permission function (corrected to Camera method); hoisted Jest mock function
undefined (corrected in mock); unsupported Android unlink/O_DIRECTORY symbols
(replaced with verified public APIs); test typing/ref/render lint errors (fixed);
missing legacy compile source in harness (included); wrong hand-computed rotation
oracle (corrected with explicit unpadded coordinates, no recipe change); capacity
fixture tried publishing into its own existing stage (corrected fixture sequencing).
An attempted async React entry exposed Jest VM dynamic-import incompatibility;
final entry is the required synchronous conditional Metro boundary.

Cold/first-case5s timeouts occurred in new isolation/UI tests in earlier mixed
runs. A later unchanged36/36 run passed, as did the final36/36 run. Root setup
timings/output remain retained. Cause is not established; cache/concurrency is
context, not a diagnosis. No timing claim, timeout increase, assertion weakening,
or test relocation outside the timeout was used. Long host filesystem checks are
also not phone performance evidence; repeated verification hashes may be costly.
Earlier commands with sourceStable=false span development revisions and do not
replace final component receipts/frozen copies.

Android descriptor/link/unlink/fsync/substitution, BitmapFactory allocation and
SDK raw metadata/drain behavior were **not executed** on this host. The host IO
test adapter uses Java filesystem operations, not Android Os. Kotlin wrapper and
actual native/app dependency closure are uncompiled. In particular barcode-off
compileOnly/class references and CameraX transitive closure need the later exact
build/static gate; do not broaden autolinking or add packages to hide a failure.

Corrupt source/owner/reservation markers, hard-link crash residue and partial
invalidation block admission for review. An exhausted refusal log rejects further
non-capture records; jobs have their separately reserved failure records. No
automatic reset, eviction or repair-by-deletion exists. Failure to persist cancellation invalidation
keeps the live owner blocked. If a process dies before any durable cancellation
write, its previous unaccepted candidate receipt can remain the last durable
state; no auto-read/capture or camera-proof acceptance follows. Physical failure/
power-loss and recovery behavior still require the later native gate.

## Preservation and next action

Final preflight verifies917 coordinator source rows:912 unchanged/five allowed
deltas, no missing baseline file;17 prior marker hashes and28 G0 frozen P1
snapshots/results exact. Coordinator metadata hashes also match. This is the
enumerated baseline coverage, not an unmeasured whole-disk or production claim.
`preservation-final.json`, flat source copies, full writer inventory and the last
STOP marker provide the stopped review boundary. No required coordinator-owned
state/workflow edit was made by this writer.

Coordinator next: verify STOP/inventory/source/handoff hashes, release the writer
lease and independently audit G2. Resolve the retained source/native/timing risks
before any separate exact G3 build/static authorization. G4 needs separately
authorized generated-target camera/Android/geometry/durability/drain evidence
(landmark residual<=1%, annotation uncertainty<=2 physicalpx, rounding<=1 sourcepx).
No phone operation, live model call, enrollment/matching/P2-04 or next phase is
authorized by this stopped source handoff.

## Exact source files and SHA256

| Path | Change | SHA256 |
| --- | --- | --- |
| `apps/mobile/__tests__/recognitionExperimentCameraProof.test.ts` | new | `035c4f994d4db832bd01febcbc0341945ed309fdab0132bb546c3bb7780bb476` |
| `apps/mobile/__tests__/recognitionExperimentCameraProofConfig.test.ts` | new | `46f9371ad892b750184378ef713f2de565e06b455ee6a0dc7c47659e296b375f` |
| `apps/mobile/__tests__/recognitionExperimentCameraProofIsolation.test.tsx` | new | `3253b1c314bcfcbbc5f7be5a1afb506f400feebde479586d3f90a3237aedc44c` |
| `apps/mobile/__tests__/recognitionExperimentCameraProofUi.test.tsx` | new | `6d276d0e2fe4612d1292d3ced89ad8de7eec658b266eaa1f2c70bfac75609a4c` |
| `apps/mobile/app.config.ts` | existing allowed delta | `2d79a0aeb06df5cdf15f92269e27ac69c134a261288a5b1f45893a7c988db19f` |
| `apps/mobile/plugins/withRecognitionExperiment.js` | existing allowed delta | `00948f868ff14ce27d4420a6b2a23959bd6227ef62db995d2b42950b7797743d` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofAndroid.java` | new | `f5e745edd78e5debc6d051f8566b85d23d594d22fa6b34377a45b8985a2b42bb` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofCpu.java` | new | `cc2dacdab9deb588ae3c0424828a8263b153af6a96a5680f31cd2f9b517c0a25` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofFiles.java` | new | `288bb85df5af57004b3193996317cd069a5e37d6a0c38c7fb4450d861bcce9b5` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofFrame.java` | new | `d572f411748e28fb16a24b9c9998f566d56408417c6677e68402c49b6c7fe153` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofLifecycle.java` | new | `0edea77681997f6e0e16edf05ff9d542064ef6a323966aed43c5491f48083a1a` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofSource.java` | new | `6f3f0e5095425d76cb7693671fa033b79b413acad47e6bb5116a4082c3215e4e` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofStore.java` | new | `6f22872989c56c1898f7b4373b7a96a29c8224a69d4cb24d94530c9281ded23e` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/test/java/expo/modules/recognitioncpu/CameraProofCapacityChecks.java` | new | `0de12076b40847c1c1671c3986401a30f5d3981d83843c6c79a4707f13021982` |
| `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/test/java/expo/modules/recognitioncpu/CameraProofChecks.java` | new | `110f275dac540b4ddfd9ee352e243e054ef2a816cf4595dde12e4b0dd9e54176` |
| `apps/mobile/recognition-native/recognition-experiment/android/src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt` | existing allowed delta | `2d0c4d916d9b750a19c2da6e6b65d5e734ec4c9a7bedbe6ea9e0ba85e06fbd83` |
| `apps/mobile/src/recognitionExperiment/cameraProof.ts` | new | `623285dd517984dcc58e1bf185bb425aacbbaa8b59e5785f69524a3a4b0d57d9` |
| `apps/mobile/src/recognitionExperiment/CameraProofPanel.tsx` | new | `ea267168713f283d66952240df47a724016a97d8aab16f199c05e4da90bfc706` |
| `apps/mobile/src/recognitionExperiment/ExperimentRoot.tsx` | existing allowed delta | `df5bce6c89a652b1635af21b506c2feead0cf0f782ec46a82882a840aa32458e` |
| `apps/mobile/src/recognitionExperiment/nativeAdapter.ts` | existing allowed delta | `7c002fe8fcbff4472afa130cb3a5cb3098bd0b41ebc813b9375ae5608143dd52` |
| `tools/scripts/phone-camera-proof-checks.py` | new | `8c06774f659753d092c5c66cc9399623c26a789d39d94c0368f927d252b5aeb4` |
| `tools/scripts/phone-camera-proof-source.py` | new | `3d0cb8f670739d4ec7cb1d779e63878e1951a171fcea8968757d29bc4e458134` |
