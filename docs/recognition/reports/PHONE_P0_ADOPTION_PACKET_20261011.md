# P0 native adoption/build/isolation packet

2026-10-11. Reviewable proposal plus generated preparation; **no native adoption,
install, build or device validation performed**. P1–P5 remain gated. Scope follows
PHONE_P0_DISPATCH_20261011.md. Existing scanner-verification, business code,
model/recipes, confirmed manual-label result and all prior runs remain unchanged.

## Decision requested

Review the isolated mobile entry and a staged **CPU Interpreter2.2.0 candidate**.
Do not authorize a blanket setup/build. First resolve the published Play-delivery
dependency/license boundary and the generated Expo toolchain; then approve exact
artifact acquisition and a generated-only native build. Private portability/live
capture is a later exact packet. P0 cannot prove that this stack builds.

The concrete findings below distinguish local source/metadata facts, calculations,
proposed guards and missing native evidence. The known ten items remain correlated
development data. Confirmed manual labels supplied zero gains/losses; no automatic
OCR or extra matcher is selected by this packet.

## 1. Runtime/model identity and rights

Candidate dependency `com.google.ai.edge.litert:litert:2.2.0` from Google Maven;
CPU `org.tensorflow.lite.Interpreter`, application-bundled runtime only, one
interpreter/worker, `numThreads=1`, no NNAPI/GPU and explicit XNNPACK=false.
The unchanged laptop producer uses one thread and BUILTIN_WITHOUT_DEFAULT_DELEGATES.
This is a numerical-equivalence starting point, not production model selection.
The [LiteRT Android table](https://developers.google.com/edge/litert/android)
documents2.2.0 CPU Interpreter/minSDK23/NDKr26a; its quickstart still shows2.1.0.
The [Interpreter options](https://developers.google.com/edge/api/tflite/java/org/tensorflow/lite/Interpreter.Options)
document application runtime selection and XNNPACK's enabled default, which must
be explicitly disabled. Exact options/linkage still require the pinned AAR build.

| Artifact | Verified public metadata | Payload validation |
| --- | --- | --- |
| litert2.2.0 AAR | HEAD11,761,541 bytes; publisher SHA256 `624518d72f8a249711a19e9901f480e74f823ca7818260a739cb2c023024807c` | Not downloaded/opened |
| litert-api2.2.0 AAR | HEAD934,666 bytes; publisher SHA256 `b785714414d7af54ad1e8f4a40a382f2809b538b88a2246dcdeb9039394bc38d` | Not downloaded/opened |
| Existing model | Local retained download/metadata and producer pin:4,117,670 bytes, SHA256 `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40` | Prior artifact unchanged; no new inference |

Official AAR URLs are
[litert](https://dl.google.com/dl/android/maven2/com/google/ai/edge/litert/litert/2.2.0/litert-2.2.0.aar)
and [litert-api](https://dl.google.com/dl/android/maven2/com/google/ai/edge/litert/litert-api/2.2.0/litert-api-2.2.0.aar).
Only headers and textual `.sha256`/POM metadata were read in P0. Publisher hashes
are proposed pins; they are not a locally verified payload checksum.

Model source is the retained MediaPipe MobileNetV3 Small0.75 float32/v1 image
embedder URL, not a newly converted model. The [official model guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder)
describes its224x224 float32 family; local model metadata declares MediaPipe and
Apache2.0. Input is RGB NHWC `[1,224,224,3]`, output `[1,1024]`, float32; producer
also checks `serving_default_inputs:0` and `StatefulPartitionedCall:0`.
The wording in metadata lists channels ambiguously; actual producer explicitly
uses RGB. Model metadata/license declaration and previous laptop review do not
automatically establish Android redistribution acceptance. Before APK adoption,
retain source URL/hash, model metadata, Apache text/required notices, and exact
transitive SDK terms in an offline notice asset. No private photos enter an APK.

## 2. Published dependency graph: material offline gap

Saved primary POMs and their byte hashes are in the generated preparation run.
[litert POM](https://dl.google.com/dl/android/maven2/com/google/ai/edge/litert/litert/2.2.0/litert-2.2.0.pom)
pins litert-api2.2.0. [Its API POM](https://dl.google.com/dl/android/maven2/com/google/ai/edge/litert/litert-api/2.2.0/litert-api-2.2.0.pom)
declares the following direct edges. This is published metadata, not a resolved
Gradle lock/dependency tree:

| Edge | Declared pin / relevant evidence | Review consequence |
| --- | --- | --- |
| AndroidX lifecycle-runtime |2.10.0; Gradle module delegates Android to lifecycle-runtime-android2.10.0; metadata Kotlin stdlib2.0.21 | Final Android variant/minSDK/compile metadata still uninspected |
| Guava |33.5.0-android; parent/BOM-managed annotation/failureaccess/listenablefuture edges | Camera already forces listenablefuture1.0; final conflict resolution needs inspection |
| kotlinx-coroutines-guava |1.8.0; POM also asks core-jvm1.8.0, Guava31.0.1-jre and Kotlin stdlib1.9.21 | Resolve Android/JRE variant and workspace coroutine versions explicitly |
| Play ai-delivery |0.1.1-alpha01 | Not covered by LiteRT's Apache license |
| ai-delivery children |play-services-basement18.4.0, play-services-tasks18.2.0, asset-delivery2.3.0, core-common2.0.4 | Delivery/network SDK surface conflicts with an unexamined offline claim |

LiteRT/LiteRT API POM and pinned upstream LICENSE declare Apache2.0. ai-delivery's
[POM](https://dl.google.com/dl/android/maven2/com/google/android/play/ai-delivery/0.1.1-alpha01/ai-delivery-0.1.1-alpha01.pom)
declares **Play Core SDK Terms**, pointing to the
[Play Core license/overview](https://developer.android.com/guide/playcore/license).
No terms were accepted and no SDK downloaded. POM licenses are not an exhaustive
binary notice inventory. Gradle `.module` metadata for litert2.2.0 returned404;
the POM was fetched successfully via bounded direct public text requests after
the web reader could not open it. Those failures and successful receipts remain.

**Recommended gate:** propose excluding `com.google.android.play:ai-delivery`
from the experiment's litert dependency because this test uses an application
model and Interpreter, not model delivery. This is an unverified exclusion,
not an applied Gradle edit or proof that it works. Artifact inspection must trace
Interpreter class/loading dependencies; a generated-only CPU smoke/R8 build must
succeed without missing-class suppression and without Play delivery classes,
providers or permissions. If exclusion breaks the candidate, STOP and return a
new runtime proposal; do not silently ship Play dependencies, add `dontwarn`, use
Play-services inference or change to1.4.x/another model. An alternative runtime
requires its own reviewed version/rights/equivalence proposal.

After scoped approval, freeze the resolved runtime classpath (including Gradle
module variants), dependency locks, checksum verification metadata and LICENSE/
NOTICE/SDK-term inventory. Disallow dynamic versions and unbounded upgrades.

## 3. Exact stack/prerequisite matrix

| Item | P0 evidence | Status for native adoption |
| --- | --- | --- |
| Expo/RN | Installed57.0.22 /0.86.3, camera57.0.6, current package/lock unchanged | Locally verified versions; combination unbuilt |
| Expo camera alignment | Workspace requests~57.0.6; installed Expo bundled table lists~57.0.5 | Patch alignment needs later native check; no substitution made |
| Expo module API | Existing Kotlin module core installed; [official API](https://docs.expo.dev/modules/overview/) supports Kotlin/New Architecture | Supports approach, not exact build compatibility |
| RN defaults | Local catalog: minSDK24, compile/target36, build-tools36.0.0, NDK27.1.12297006, AGP8.12.0, Kotlin2.1.20 | Defaults, not generated app's resolved versions |
| Gradle | Installed RN plugin wrapper references9.3.1; no app native tree/wrapper exists | Do not confuse plugin wrapper with application wrapper |
| AGP | [8.12 requirements](https://developer.android.com/build/releases/agp-8-12-0-release-notes): API36, minimum Gradle8.13/JDK17 | Generated Expo wrapper/plugin compatibility remains unknown |
| Java/SDK | java/javac/gradle/sdkmanager not found in PATH; JAVA_HOME/ANDROID_HOME/ANDROID_SDK_ROOT unset; checked standard SDK/JDK/cache locations absent | Limited local inspection, not a whole-disk absence claim |
| adb | Existing cached platform-tools executable found | No adb command/device access performed; insufficient to build |
| ABI | Candidate arm64-v8a-only release for the reported Galaxy A15 | Device ABI/OS/RAM/page size must be recorded later; AAR ABI contents unknown |
|16KB pages | Prebuilt AARs never inspected. Installed RN NDK27 does not itself certify16KB | Verify every packaged ELF and APK ZIP alignment; device/emulator test pending |

[Android's16KB guidance](https://developer.android.com/guide/practices/page-sizes)
requires both ELF and packaging compatibility for native libraries. AGP>=8.5.1
addresses packaging; NDKr28 defaults differ from the installed r27 candidate.
No native source compiler setting can repair an incompatible prebuilt AAR.
Future checks include `llvm-readelf -l`, `zipalign -c -P 16 -v 4 <apk>` and an
approved16KB environment. A Galaxy A15 success alone would not cover16KB Android.

## 4. Isolated entry within this mobile workspace

Current `apps/mobile/app/_layout.tsx` imports DatabaseProvider, calls
initializeAppDatabase and mounts PilotSyncScheduler. Scanner-verification's
different package ID does not remove those paths. Keep its files/build intact.

Proposed new package ID
`com.damiyx.retailintelligence.recognitionverification`; standalone **release APK**
with bundled JS/model. No dev-client, Metro requirement, Expo Router business
entry, Supabase client, SQLite/database, secure store, sync, sale/stock commands
or business catalogue/enrollment imports. Experiment identities/vectors live in
its own app-private files. Changing an ID is not the isolation proof.

Future P1 allowlist to review (none created/edited in P0):

- `apps/mobile/app.config.ts`: guarded recognition-verification variant; require
  matching build env and explicit experiment opt-in; reject partial/mismatched flags.
- NEW `apps/mobile/recognition-entry.js`: calls Expo registerRootComponent with
  only `src/recognitionExperiment/ExperimentRoot.tsx`. Ordinary package main stays
  `expo-router/entry`. Do not use one JS conditional entry importing both roots:
  Metro can resolve both branches even if one is later eliminated.
- NEW `apps/mobile/plugins/withRecognitionExperiment.ts`: experiment-only Android
  entryFile override, autolink allow/exclusion configuration, permission/backup
  manifest rules, arm64 filter and offline asset packaging. Keep ordinary config
  outputs identical except explicitly reviewed exclusion safeguards.
- NEW `apps/mobile/recognition-native/recognition-experiment/` with local package/
  expo-module metadata, Android Gradle file, CPU module, preprocessing helper,
  model/notice assets and generated instrumentation tests. This is inside the
  existing mobile workspace, **outside default `./modules` discovery**.
- NEW `apps/mobile/src/recognitionExperiment/` containing the experiment root,
  local packet/import-export boundary and generated-only native adapter tests.
  P1 builds runtime/generated replay; P2 live session/enrollment UI remains later.
- NEW bounded local build script/receipt file under `tools/scripts/` only if
  separately approved for P1. No shared domain/contract or repository topology change.
- Generated ignored `apps/mobile/android/` after approval. No committed native tree
  is currently present. No clean/reset/prebuild deletion is authorized by P0.

Installed Expo autolinking supports `searchPaths`/`exclude` in its settings
extension; default local nativeModulesDir is `./modules`. Add the explicit
recognition-native search path **only** for the guarded experiment build. Ordinary
build must neither discover nor link the new module; the model asset belongs to
that module alone, never shared `apps/mobile/assets` or a global asset pattern.
Apply exclusions before obtaining RN config/useExpoModules commands, and verify
both generated module provider and RN package registry. There is no new npm
runtime dependency proposed just for the Kotlin bridge. If package/lock changes
are needed after inspection, return their exact delta for review first.

Proposed experiment excludes expo-router, expo-sqlite, expo-secure-store,
expo-audio, expo-dev-client and its dev-launcher/dev-menu/interface children,
expo-updates if present, and unrelated native modules. Keep only RN/Hermes/core,
camera and explicitly needed local file support. Disabling a JS import is not
enough to exclude a native initializer. Camera barcodeScannerEnabled=false uses
compileOnly barcode SDK dependencies in installed Gradle source; exclude their
runtime/Play paths and verify camera startup still works. This behavior is
source-inspected, not a proven stripped APK.

The future plugin must remove INTERNET/ACCESS_NETWORK_STATE, microphone, broad
media/storage, location and unrelated permissions using manifest-merger removal
rules. Only CAMERA is expected. Disable backup/data-extraction of experiment
files. Use app-private cache/documents and system SAF picker/export grants;
no all-files access, build-time private data, OTA/update checks or network logging.
SDK data/code-provider initialization must be absent, not merely offline errors.

Mandatory ordinary/experiment artifact comparison before phone use:
entry bundle/import graph; resolved Gradle runtime classpath; generated Expo/RN
registries; merged manifest and exported components/providers; permission list;
APK assets/classes/JNI/ABI; model hash; JS source maps; startup/file/traffic probes.
Ordinary artifact must contain no new model, module or LiteRT dependency. The
experiment must contain no business DB/sync commands/providers, Play delivery,
dev-launcher or unapproved network initialization. Record failures, not screenshots
of an app ID as isolation evidence. Native runtime safety/privacy acceptance is OPEN.

## 5. Android capture/lifecycle and ROI proposal

Installed CameraView.tsx uses special native takePictureRef only on iOS. Android
uses regular takePicture; Kotlin copies CameraX ImageProxy JPEG bytes and closes
the proxy, then processes asynchronously. Android ResolveTakenPicture also has
a pictureRef branch after JPEG decode; therefore it is inaccurate to claim all
Android native references are absent, but it is not a documented zero-copy stream.
The initial proposal avoids that ambiguity: ordinary cache JPEG,
pictureRef=false/base64=false/fastMode=false/skipProcessing=true. Raw JPEG
orientation/dimensions are parsed and validated by the later native adapter,
not assumed from possibly missing EXIF width/height fields. No extra recompression
or double rotation. The safe pipeline still needs physical orientation testing.

Choose only an actually reported picture size <=4MP for live capture; verify
the returned JPEG before decoding (proposed12MiB encoded cap). CameraX's fallback
can return a larger size, so a prop is not a hard buffer bound. Existing frozen
40-image replay uses separately approved original caps/boxes, never silently
downsizes input to meet this live-camera limit. Large originals may reveal a
memory feasibility failure and must retain IDs/failure records.

Wait for permission/onCameraReady; never capture with paused/unmounted preview.
One worker, queue0, at most3 frames separated by>=400ms and a3s deadline.
On cancel/background/unmount invalidate the session token immediately; discard
late output and delete its temporary file only when its job resolves. Do not
assume the interpreter/CameraX call is forcibly interruptible. Keep replacement
session blocked until the worker drains; close Interpreter/ByteBuffers afterward.
Existing camera source cancels its coroutine scope/unbinds at destruction, but
this does not prove the experiment's cancellation behavior.

Guide is centered80% of preview width/height. P0 mapGuide derives aspect-fill
scale/offset, inverses rotation/mirroring, adds5% of guide width/height per side,
floor/ceil half-open bounds and clamps to upright image dimensions. It records
both upright and encoded bounds. Actual preview/capture FoV, zoom/crop and sensor
transform may differ; if they are not the same image extent, stop rather than
pretend aspect-fill alone is sufficient. Generated bounds are not a camera test.

Measured trigger for a different source, proposed before capture: snapshot+
bridge+decode p95>750ms in>=20 warm attempts, or attributable preview stalls>2s,
or failure to get complementary frames within3s, with inference/search measured
separately. Record preview cadence/stalls and camera-ready time, not a claimed
continuous scanner. A trigger opens a reviewed CameraX ImageAnalysis proposal;
it does not automatically add VisionCamera, alter camera ownership or install a library.

## 6. Separate generated correctness gates

P0 generates three identical-input runtime tensors (zero/gray128/gradient),
float32 little-endian NHWC602,112 bytes each. Later laptop/phone executions use
exact tensor/model hashes. Frozen proposed runtime ceilings are normalized
max-component error<=1e-4 and cosine distance<=1e-5; raw max/mean difference is
also reported. These come from the plan and are strict development rejection
limits, not validated numerical guarantees. Require1024 finite nonzero outputs.
Near ties must be bounded independently by measured score error and reported;
do not forgive changed ordering simply by inventing an epsilon after a result.

Separate generated JPEG probes include EXIF1–8, odd37x23 dimensions, gradients,
colored borders, upright RGB, centered padded crops and full/cropped Pillow12.3.0
LANCZOS tensor oracles. Geometry/dimensions/padding must agree exactly. Proposed
image-development tolerances: decoded JPEG channel max error<=2/mean<=0.5 levels;
LANCZOS tensor max absolute difference<=1/255/mean<=0.25/255. These are predeclared
provisional allowances for rounding/decoder differences, not observed native results.
Failures require generated-data diagnosis or a newly reviewed phone recipe;
do not tune after private data. Android bilinear defaults cannot be assumed
equivalent. A versioned differing recipe needs a controlled portability comparison
and cannot inherit the old17/20 manually cropped accuracy claim.

The Python oracle creates only synthetic input and uses the already installed
Pillow12.3.0/NumPy; no model is executed. TS runtime/probe checks test comparison
arithmetic and geometry. They **do not** validate Android tensors, image decoding,
JNI, native performance, actual ROI capture, ABI or recognition quality.

## 7. Four-arm contract and fixed evaluation

New lab-only phoneExperiment schema/evaluation/CLI files implement P0 generated
logic. The CLI accepts generated-only kinds; native numeric serialization needs
a separately reviewed evidence-kind extension in P1, never relabeling phone data
as generated. These Node lab modules are laptop validators/oracles, not RN imports.
Manifest pins model/recipe/policy/source, ordered4-reference gallery and
the entire expected trial/session schedule. V21/V23 use the first2 references
of each identical4-reference set; V21/V41 share first selected frame; V23/V43
share up to3. Selection consumes timing/readiness/session IDs, never outcome,
truth, scores or image quality. Failed selected frames cannot be backfilled with
a better frame. One-frame fallbacks and actual acquisition counts are explicit.

Every expected trial produces all4 arm rows. Missing arm/trial/reference records
produce explicit unscored rows and block completeness. Native/capture failures,
late/stale/cancelled events remain visible even if another usable frame permits
scoring. Overlap, duplicate/orphan records and model/recipe/source mismatches reject.
Multi-frame score is the arithmetic mean of each product's per-frame maximum
reference cosine; exact ties use ASCII product ID, and reference ties use ID.
No learned weights, winner-frame selection or full-truth gallery optimization.

Generated typed specifications retain separate power-W/luminous-output-lm/net
quantity dimensions, reference-ID/hash/exact-span or typed-pending provenance.
They never affect P0 visual ranks. No OCR, unit parsing, completeness inference or
query-derived catalogue fields are implemented. P3 still needs its own review.

Timing records keep camera/capture/bridge/decode/preprocess/inference/search stages.
First-actionable correctness is evaluated from the usable frame prefix at its
recorded time, separately from final correctness; a later correct result cannot
borrow an earlier wrong result's time. Impossible pre-output/final times reject.
Nearest-rank median/p95 include every attempt; no actionable result is represented
as infinite latency with a typed JSON marker, plus observed final/timeout duration.
Successful-only statistics are explicitly secondary. Phase/condition groups<20
remain descriptive. Stability requires two successive same first choices through
completion, not a single frame or a declared flag alone. All timing data in P0
is authored/generated; none is a phone measurement.

Unknown trials get manual suggestions and separate accounting; no automatic
acceptance, STRONG/UNKNOWN threshold or false-accept calibration is claimed.
The familiar25-scan schedule is not25 independent products. Later engineering
triage needs paired gains with zero observed first-choice losses in development
and a frozen confirmation session, plus budgets/no unsupported text promotion;
P0 does not mark that gate met.

## 8. Resource costs and bounded next steps

Measured metadata: two compressed AAR payload lengths plus model total16,813,877
bytes (~16.035MiB). This is not installed incremental size; it excludes other
transitives, decompression/ABI slicing, notices, JS/Kotlin/R8 and image data.
Interpreter arena/peak native RAM, exact stripped arm64 size and device thermals
remain UNKNOWN. Four1024-D float32 vectors are16KiB/product,15.625MiB/1000 and
78.125MiB/5000. A<=32KiB/product numerical+text target leaves16KiB for bounded
metadata at4 references; enforce real measured encoding size later.

Working-buffer arithmetic: one224x224x3 float input0.574MiB, one output4KiB,
RGBA4MP bitmap~15.26MiB, before extra copies/interpreter arena. This does not
establish the proposed<=200MiB peak-memory or<=50MiB installed-size ceilings.
Keep normalized/gallery floats native; sending the whole gallery as JS number
arrays adds copies and exceeds float32 arithmetic expectations.

Generated Node exact-search receipts cover100/1000/5000 identities with2/4
references, including normalization. They record host/representation, three
search samples, build time and sampled RSS/heap. They expose scale/copy cost only;
three RSS snapshots are not continuous peak and these are not Galaxy A15 timings.
See handoff for the exact current-source final receipts and execution conditions.
For example,5000*4 already needs78.125MiB of vector bytes before indexes/metadata.
Exact native search is the baseline; optimize only after an actual device measurement.

Proposed future approval stages:

1. **Metadata/rights boundary:** approve Interpreter-only dependency exclusion
   investigation, exact pins above, arm64 candidate and guarded entry allowlist.
   Inspect classes/manifests/licenses and freeze all resolved transitives/checksums;
   reject incompatible Play delivery or return a revised candidate. No private data.
2. **Bounded local setup:** candidate JDK17 Temurin17.0.20.1+1 from its
   [official release](https://github.com/adoptium/temurin17-binaries/releases/tag/jdk-17.0.20.1%2B1),
   Android command-line tools (exact archive/version/checksum must first be frozen),
   `platforms;android-36`, `build-tools;36.0.0`, `ndk;27.1.12297006` and required
   CMake3.22.1 only. Use task-local SDK/Gradle caches and process-local variables;
   no global PATH or account changes. SDK/license acceptance needs its own approval.
   No emulator/system-image/GPU tooling or unrelated package upgrades in this stage.
3. **Generated-only P1 source/build:** approved plugin/module/entry, then pinned
   installed Expo CLI `prebuild --platform android --no-install` with matching
   experiment flags, recording generated template/toolchain versions before any
   build. Reconcile app-wrapper versus installed plugin defaults; no silent tool
   upgrades. Use generated app `gradlew.bat :app:assembleRelease --no-daemon` with
   bundled JS/model and a locally reviewed signing choice. Do not launch Metro,
   cloud EAS or `run:android` install implicitly. Windows EAS-local is
   [not officially supported](https://docs.expo.dev/build-reference/local-builds/);
   direct generated Gradle release is the proposed local path.
4. **Artifact source/isolation audit:** verify ordinary and experiment bundles,
   APK/model/SHA values, manifests/providers/network exclusion, ABI/16KB alignment,
   notices, size and generated tensor/JPEG probe preparation. Build success alone
   does not authorize phone/private execution. If prerequisites or exclusion fail,
   stop with the exact failure; no automatic fallback to cloud/another runtime.
5. **Separate phone execution packet:** founder approval for exact device/APK,
   generated probes first, later exact40-image portability packet/frozen boxes
   without redraw, then P2 enrollment/live25-trial development schedule. Native
   runtime and image recipe must clear separate equivalence/privacy gates first.
   SAF import/export bounds/hashes, app-private temp cleanup and explicit diagnostic
   image budget are required. Default exports contain IDs/timings/ranks, no photos;
   no indefinite video retention. Sustained10–15min/offline/restart/device-resource
   checks are later physical evidence, not P0 results.

All steps are concrete proposals, not current permission to execute them.
The command-line-tools archive and generated native toolchain remain explicit
setup prerequisites to freeze before approval, not permission for unlimited setup.
P0 is ready for source/packet review with those adoption blockers visible.
