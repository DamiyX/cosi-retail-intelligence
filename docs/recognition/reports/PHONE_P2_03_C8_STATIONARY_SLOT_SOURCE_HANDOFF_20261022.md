# C8 stationary-chart source handoff — source checks complete, review pending

2026-10-22. D-058 and PHONE_P2_03_C8_STATIONARY_SLOT_SOURCE_DISPATCH_20261022.md.
Same Track B writer, sole finite lease, source/generated-check scope only. This
handoff does not accept a native artifact, Android provider behavior, geometry,
P2-03/G4, or a physical test. Coordinator independent review is next.

## Outcome and unchanged boundaries

Implemented one separate fixed stationary-chart capture/export capability for
job `76d28e3f-cdcd-4d1a-a86e-026e2568ce5e`. Capture requires an explicit readiness
acknowledgement, durable intent and fixed internal reservation. Export requires
that exact complete PUBLISHED profile and one durable export attempt. No retry,
reset, caller-selected ID/path, alternate photo or generic export was introduced.
The successful historical C7 capture/save/export remains consumed. Its geometry
remains INCONCLUSIVE because physical correspondence evidence was incomplete.

No phone/ADB, native/Gradle/APK build, install, picker, actual capture/export,
model execution, radio, dependency change, Git mutation/push or CI action occurred
in this slice. Java/Kotlin compilation used installed cached tools/artifacts;
Jest used an isolated new cache. No child agent or independent reviewer ran.
The writer releases its lease at writer-stopped.json and sends one authorized
completion to coordinator 01a098ef-d830-7531-bca7-2d66b0a5b587, then stops.

## Capability, persistence and accounting

Sidecar root is `camera-geometry-c8-v1` under private files. Android creation is
exclusive and requires absence; an existing root including empty crash residue
is consumed. An already saved fixed job with a missing sidecar is also consumed/
incomplete; both status and intent admission refuse rearming. Common Store scan
checks sidecar footprint. Only intent/export-attempt/export-terminal are allowed,
each <=4096 bytes, under the permanent 128KiB bookkeeping allowance. Original
canonical owned directory/file, single-link and verified barrier primitives are
reused; no JNI or cleanup/reset path was added.

Each immutable record is strict ASCII `CAMERA_C8_RECORD_V1` followed by ordered
key=value lines and `sha256=<body SHA256>` with final newline. Re-encoding must
match exactly; duplicate/extra/torn/corrupt records refuse unchanged. Values use
bounded [A-Za-z0-9_.:-], <=180 characters. Schema=1; slot=stationary-chart-c8-v1;
job is the compiled fixed UUID. Exact field order:

- intent: schema, slot, job, target, targetSha256, runtimeSource, captureApk,
  owner, model, recipe, process, layout, mode, intentNanos, readiness.
- export-attempt: schema, slot, job, intentSha256, requestSha256, doneSha256,
  resolutionSha256, rawSha256, previewSha256, numericalSha256, ticket, outputCap,
  exporterSource, exporterApk.
- export-terminal: schema, slot, job, attemptSha256, status, bundleBytes,
  bundleSha256. Unverified statuses require 0/UNVERIFIED; READBACK_VERIFIED needs
  a positive bounded count and hash. No terminal state restores authority.

While holding actual shared capture admission, create/sync root and intent,
then fixed internal Store reservation, then native request.json with purpose,
stationaryJob, targetId/SHA, capture source/APK and intent SHA. Recheck intent,
permission/closed state before returning the unchanged ticket contract. Reuse
existing six-field CameraRequest, camera SDK preflight/ingress, finalizer, model,
recipe and receipt ownership. Readiness string is exactly
SUPPORTED_PHONE_AND_FIXED_CHART_READY, layout A/FILL, with human claim only.
Installed APK is streamed/hash bounded at runtime, never guessed from a report.

Incomplete/failed/cancelled/interrupted/mismatched data cannot export or recapture.
Full Store validation requires all eight exact roles, committed hashes, receipt
identity, owner/process/job/model/recipe, intent/request/target/capture provenance,
PUBLISHED resolution, original JPEG header/EXIF and saved JPEG/preview hashes.
New JPEG/PNG hashes come from this immutable profile; C7 original pins remain
unchanged. Export never invokes capture/model or searches for a latest image.

Export admission creates the actual CameraEvidenceSession ticket FIRST; that same
UUID is durably written before picker dispatch. Request31008 is distinct from
C7=31007/P1/generated ranges. Shared busy remains held through callback and writer
drain; cancellation/destruction/throwing uncertain dispatch does not invent drain;
duplicate/stale callbacks cannot release another ticket. No terminal/readback
success is returned before actual descriptor close and cancellation recheck.

The explicit local Downloads policy, regular/single-link/seekable empty rw FD,
identity checks, no truncate/delete, capped STORED ZIP, sticky errors, sync,
readback/hash and close semantics reuse existing primitives. Nine entries only:
raw.jpg, preview.png, numerical.json, receipt.json, request.json, reservation,
done, resolution, manifest.json. Manifest embeds strict intent text as hex and
binds all entry hashes/counts, fixed target and separate capture/exporter provenance.
Geometry=INCONCLUSIVE, stationarityProven=false, exposureTimeKnown=false;
provider-directory/power-loss durability and tensor-file claims stay false.

Aggregate logical cap remains268435456. Two permanent allowances of16908288 each
(16MiB output +128KiB bookkeeping) total33816576; camera cap234618880. Common
scan/admission/read/write/reopen use the lower cap, with separate per-slot and
aggregate status fields. No eviction or release after failure/success. SDK cache,
physical allocation and peak RAM remain separate unknowns under D-054.

## Source and target binding

Writer root:
`apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-source-20261022-a1/writer/`.

Final accepted-for-handoff source candidate is `source-index-ready.json`,72 rows:
`67b2e7bb9272e7a64a9380f18246d651dcdb3a12856b8b8964318821ccde0874`.
Derived CameraStationarySource.java SHA:
`9ef681d1069911952661ea351fb2ca72f7755e5ccedc3b01d67577018ef56bfa`.
`runtime-binding-ready.json` separately binds the derivative. Indexed rendering
rule in phone-camera-geometry-c8-source.py renders the index digest, excluding
only its own derived output from the input digest. All new runtime/helpers/tests
and three final target files are included. `candidate-ready-inputs` retains all72
exact input bytes, with derived-source-ready.java separately retained. Check mode
recomputes source and rendering; no historical pin is regenerated.

Earlier source-index.json, source-index-a2.json, source-index-final.json and their
runtime bindings remain distinct candidates. Candidate-a2-inputs and
candidate-final-inputs preserve those72 input bytes; prior derived outputs and
failed test fixtures remain retained. Only the new C8 derivative was repinned.

Frozen final chart is `target-a2/stationary-chart.png`,900x1200 black/white,
ID stationary-chart-c8-900x1200-v1, SHA:
`7ffd7f6fbd778405497bbfc0d2f4649281e19c33c8d8af5c626c87d71f02ef6a`.
HTML has black surround/aspect-preserving containment; target-manifest.json defines
image-edge units, pixel(i,j) center(i+.5,j+.5), half-open88x88 square edges.
Marker centers1..8: (110,110),(790,110),(790,1090),(110,1090),(450,110),
(790,600),(450,1090),(110,600). Border edges16,16,884,1184.
First draft retained after title overlap with marker7 label; corrected A2 visually
inspected all eight labels. Independent fresh-root renderer reproduction matches
PNG and HTML bytes; manifest reproducibility receipt retained. Displaymm remains
UNMEASURED; B/W does not repair damaged screen hardware or prove image quality.

## Changed paths and preservation

Immediate baseline before-index.json contains308 dirty-source inputs with exact
SHA-named byte snapshots. Ten existing files changed relative to that baseline:

- `apps/mobile/__tests__/recognitionExperimentCameraProofUi.test.tsx`
- `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraEvidenceSession.java`
- `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofAndroid.java`
- `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofFiles.java`
- `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofStore.java`
- `apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/test/java/expo/modules/recognitioncpu/CameraEvidenceExportChecks.java`
- `apps/mobile/recognition-native/recognition-experiment/android/src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt`
- `apps/mobile/src/recognitionExperiment/cameraProof.ts`
- `apps/mobile/src/recognitionExperiment/CameraProofPanel.tsx`
- `apps/mobile/src/recognitionExperiment/nativeAdapter.ts`

New runtime files: CameraStationarySlot.java, CameraStationaryAndroid.java and
derived CameraStationarySource.java in the CPU runtime Java namespace;
CameraStationaryChecks.java in its test namespace; cameraStationary.ts;
recognitionExperimentCameraStationary.test.ts. New helper files:
tools/scripts/phone-camera-geometry-c8-{source,checks,target}.py. New observation
checklist, this report and current project/workflow status complete the source
slice. after-index.json/changed-paths.json enumerate exact scoped after hashes.

Self-review confirmed298/308 existing baseline inputs unchanged, including C7
CameraEvidenceAndroid/Export/Journal/ExportSource, legacy CameraProofSource,
JNI/rename and indexed build/manifests/dependency files. Existing C7 test changed
only permanent-cap expectation; original90 assertions still pass. New native
bridge code is camera-only; P1/generated/business contracts remain unchanged.
Read-only historical checks freshly verified C7device57 indexed artifacts and
C6capture-resume22 indexed artifacts; both old APK hashes and selected STOP/source
indices are recorded in historical-preservation-check.json. No whole historical
run-tree rehash or verification of every old preparation source is claimed.

## Checks actually executed and retained failures

Cached Python -B helper `tools/scripts/phone-camera-geometry-c8-checks.py` invoked
from COSI-m8-planning; each directory/result.json records full command, cwd,
exit/stdout/stderr. No downloads/Gradle/native build. Final evidence:

| Receipt | Actual result | Scope |
| --- | --- | --- |
| host-final/result.json | all6 commands exit0;82 C8+90 C7+188 durability+215 recovery+134 finalization=709 assertions | Plain production helpers, generated IO/stream fixtures |
| android-ready/result.json | javac API36 cached LiteRT exit0 | Actual current production Java, final C8 pin |
| kotlin-ready/result.json | cached Kotlin2.1.20 actual Module exit0 | Current bridge vs android-ready Java classes/cached Expo/RN jars |
| ui-ready/result.json |60 tests/6 suites pass,48.744s | Explicit action/lifecycle/preflight/protocol/config/isolation |
| types-a4/result.json | tsc --noEmit exit0 | Current final TS/test files |
| lint-ready/result.json | ESLint --max-warnings=0 exit0 | Current mobile workspace |
| final source check |72 rows and derived rendering match | Input provenance, not runtime attestation |

New cases cover fixed job and request/intent/commit/hash mismatches, strict/torn/
empty/unknown/bounded sidecars, failed barrier retaining visible intent, logical
reopen/one-shot export/terminal, interrupted reservation refusing recapture,
missing-intent existing-job predicate, two allowances, same callback ticket,
cross-slot shared busy/callback cancellation/drain/stale identity, explicit UI
status+ACK and failed permission preflight/late background admission with no SDK.
Generated JPEG header is a3x2 fixture and preview bytes are synthetic; this is
not a physical image/real PNG decoder or inference correctness test. Some corrupt
request tests fail first at immutable commit hash; they do not independently prove
every downstream semantic-field branch. Descriptor close failure is not injected
on Android. Existing exporter stream tests exercise local policy, nonempty output,
ZIP caps, short-write/sticky errors, sync/readback/corruption/cancel failures.

First failures remain in check-summary.json and original result receipts:
lint-a1 exit1 (React render refs); corrected display to React state while retaining
synchronous event guards. types-a2/a3 exit2 (new test assigned Jest mock through
deep mocked alias); corrected typed mock assignment to plain native interface,
no any/suppression/production-contract weakening. Failed fixture bytes retained.
Prior passing candidates are historical checks, not counted as additional proof.
No timeout/tolerance/assertion relaxation, dependency change or retry-until-green.

## Limits and next action

Status: implementer source self-check complete with residual risk; independent
source/security/accounting/lifecycle review pending. Actual Android root/fsync/
link/syscall/SAF provider/FD-close fault/power-loss behavior is UNVERIFIED for C8.
No startup, physical layout/preview dimensions, display scale, stationarity,
exposure correspondence or independent eight-marker measurement was executed.
UI controls are larger (410px layout units); actual phone preview rectangle and
small-screen usability require the later physical packet. Host tests do not prove
the complete Android call chain or every crash window. Those limits are review
inputs, not passes or waived acceptance criteria.

Prepared PHONE_P2_03_C8_STATIONARY_OBSERVATION_CHECKLIST_20261022.md requires
supported stationary phone/chart, measured displaymm/previewrect, tightly timestamped
bracketing screenshots around ONE future capture, post-modal-close delay recorded,
independent eight-marker <=2physical-pixel annotation uncertainty, unchanged1%
residual/1source-pixel rounding limits. Missing physical evidence stays INCONCLUSIVE;
no corrective fit, retry, video or general screenshot service.

Coordinator must independently review this stopped source and exact evidence first.
No automatic build/install/capture/export follows. Later fixed test is Low;
implementation/correction/audit High per founder. Existing P2-03/G4/P2-04 and later
gates remain held. GitHub checkpoint374286d is historical remote source backup;
newer source stays local. CI/dependency repair and next push remain deferred until
camera testing completes satisfactorily, as retained verbatim in project/workflow.
