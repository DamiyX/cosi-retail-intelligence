# C9 one offline ARM64 release — build/static handoff

Implementer artifact handoff for independent coordinator audit, not installation,
physical export, release acceptance or geometry proof. Source83 independently
accepted before this task; no source/dependency/config repair in this build.

## Exact artifact and frozen inputs

APK apps/recognition-lab/runs/phone-experiment/p2-camera-export-c9-build-20261023-a1/writer/recognition-camera-c9-export-release.apk
SHA9939439b1ab3e7c4ff29184ec767e85c28e8f5f3f9d821febce788cc6c814145,
39944042bytes,587 safe unique ZIP payloads,ARM64/18 native libraries.
Baseline C8 APKfea1596df345e7aa75ca47dc7004bbe322370cbdbb20e43c53b5e3fbd1958f6c,
39944046bytes retained unchanged. Current APK is four bytes smaller; this is not
a performance/RAM claim. Uncompressed DEX grows1476bytes, native bytes unchanged,
assets decrease196bytes; compression/alignment account for differing ZIP totals.

C9 source-index83 SHAad195cb12ae90c98f86b259a546c46c62814d5fb04a12af49f49ed431f2c6989;
derived exporter byte SHA97ae67ac939d733d07f25121924697c793ca114dc34be7dd25cbc6535d16bb8c.
Build-inputs SHA87f30418745114b073283e78103b0d3f9374742cca1a53dcbe25eebc38721768.
C8 stationary-derived pin9ef681d1069911952661ea351fb2ca72f7755e5ccedc3b01d67577018ef56bfa,
legacy owner36004274...d0e, original model/recipe/assets unchanged. C9 exporter
provenance stays separate from original C8 capture/source for saved A6 job
21b9d32b-5f31-45ac-b453-2a261e9e9ccc/JPEGf6557f45...cf19/previewe1684cbf...8b63.

Fresh shadow C:/Users/doyew/.cache/cosi-p2-camera-export-c9-build-20261023-a1.
Verified/copied1029 accepted C8 stage source files excluding outputs/caches and
junction traversal. Overlay48 reviewed mobile/derived rows. Stage1031 files;
exactly10 deltas: seven existing reviewed source/derived/test changes, two new
reviewed C9 helper/test files, task Metro configuration. Every delta listed in
extra-static-checks.json; no package/native dependency/signing/JNI recipe repair.
Original C8 stage1029 source files and eight baseline static artifacts/mapping/
graph inputs rehashed unchanged. Original C7/C8 build scripts never edited.

New build helpers reside ONLY in ignored new build root: build.py,
build-static.py, static-execution.py, build-extra-checks.py, generated Metro
observer and byte-exact accepted release init script. First four plus original
APK parser/observer template were hash-bound to charter before execution;
generated observer/init/charter/helper hashes bound in build-inputs before build.
No tools/scripts/phone-camera-export-c9-* addition invalidated source index.

## One build executed

Cached JDK17/SDK36/NDK27.1.12297006/CMake3.22.1/Gradle9.3.1/runtime and existing
internal test signer. No download/new key/install/phone. One release command,
exit0,2026-10-23T02:59:55.047291Z to03:09:56.301988Z (601.255seconds), within
1200second deadline. One intent recorded before spawning; no retry. Captured
raw/redacted log87246bytes, below64MiB cap; bounded pipe queue and streaming
secret redaction. No timeout, cap hit, read error, taskkill or source drift.
Parent exit0 and output reader ended; no independent claim all OS descendants
were enumerated/drained. Signing secret values stayed in environment/redacted
stream, no values recorded. Compiler/Gradle warnings remain in gradle-live.log.

Command exactly child.json/gradle-release.json, new app/android:

    gradlew.bat :recognition-cpu-runtime:compileReleaseJavaWithJavac :recognition-experiment:compileReleaseKotlin :expo-camera:compileReleaseKotlin :app:p2ResolvedArtifacts :app:assembleRelease :app:dependencies --configuration releaseRuntimeClasspath --init-script <new writer>/release.init.gradle --offline --no-daemon --console=plain --max-workers=2 -PreactNativeDevServerIp=192.168.1.13

The RN property preserves the accepted generated resource value; no host network
configuration change. EXPO_OFFLINE/CI and Gradle offline use existing cache; no
network acquisition requested. This is not whole-system network monitoring.

## Static evidence and every payload delta

Static wrapper exit0 in13.560seconds,240second ceiling; extra closure exit0.
No failed/intermediate check, checker relaxation, second build or corrective
source edit. All assertions prepared before build remained unchanged.

- apksigner verify succeeds with same internal certificate
  48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.
  Static update compatibility only; no actual install/UID/data observation.
- AndroidManifest.xml and resources.arsc byte-exact C8: same package, min24,
  target36, permissions/components/providers/backup/network. No new capability.
- All18 ARM64 native libraries retain sizes/ELF/16KiB ZIP/load alignment;
  zipalign passes.15 exact bytes; libappmodules.so, libcamera_proof_publish.so,
  libexpo-modules-core.so differ ONLY in independently located GNU build-ID
  descriptors. No other ELF normalization or code/import change accepted.
- JNI publishNative signature and compiled export present once, DSO minSDK24,
  NEEDED libc/libdl/libm, LIBC version only, dlsym retained/no direct renameat2
  or libc++ import. Source/packaging proof, not API24 filesystem execution.
- Model/licenses/assets exact except intended bundle and generated ART profiles.
  Original model unchanged, no photo/chart/tensor asset introduced. Packaged
  bundle/profiles equal actual generated outputs.
- Two DEX files contain exact C9 source/A6 image/job/capture pins, fixed C9
  namespace/legacy admission guards, old owner/C7 source/APK and C8 job/target/
  bridges. No forbidden retail/bootstrap/test harness classes. R8 mapping IDs
  bind actual APK DEX markers. Added original mapped classes are C9 helper and
  its synthetic backport; removed original mapped class is Journal synthetic
  backport. This is consistent with moving canonical String.join logic from
  Journal into C9 helper. Mapping lines retained in final-closure.json; all
  additions/removals belong to the reviewed C9 export boundary. No unrelated
  mapped source class added. Four service interface/provider sets/order match
  C8 under actual mappings, no unexpected service capability.
-391 captured artifact rows/138 unique external files freshly rehashed; hashes
  and all component-coordinate lists exactly C8. No dependency/native module
  change. Actual compilation/runtime graph captured by existing init recipe.
- Metro534 modules+7 premodules; source-map/graph exact current byte bindings.
  JS module set/premodule order exact C8. ONLY changed JS source is reviewed
  cameraEvidenceExport.ts. Five required C9/C8 protocol/adapter/Panel sources
  matched stage/repository/graph/map. Default Expo serializer/premodule identity
  unchanged; forbidden eager bootstrap/barrels absent. Lazy fetch packaging
  observation is static, no startup/network/device behavior claim.

All eight changed payloads relative C8:

- assets/dexopt/baseline.prof and baseline.profm: exact generated ART outputs.
- classes.dex and classes2.dex: reviewed C9 Java selection/admission/journal/
  one-MiB writer plus R8 optimization/renaming/backport relocation.
- lib/arm64-v8a/libappmodules.so, libcamera_proof_publish.so and
  libexpo-modules-core.so: GNU build-ID descriptors only, all other bytes exact.
- assets/index.android.bundle: only fixed A6 job/one-MiB TS validator source
  changed in otherwise identical JS module closure.

No manifest/resource/model/license/dependency/unexplained payload change accepted.
Individual byte/hash/size deltas and mapping proof in final-closure.json;
static-review.json, extra-static-checks.json and APK inventory retain full facts.

## Residual risks and stopped next action

Actual native IO/SAF/fsync/close/cancel/restart/private legacy-journal admission
and successful new-job export remain unverified for this APK. Frozen observed
C7 shared-output admission is not a general legacy measurement. Original A6
full-resolution JPEG remains private; sharpness/glare/faulty-display effects,
marker uncertainty and precise geometry remain pending. Sensor exposure,
continuous stationarity, absolute scale, SDK cache/peak RAM and cold-render
residuals unchanged. No P2-03/G4 or later phase acceptance from this build.

No ADB/device check/install/launch/restart/capture/model/decoder/public export,
radio, dependency acquisition, Git/CI or later implementation occurred. User was
away and no photo was needed. P2-04/05 planning awaits explicit founder Astra
switch; do not begin it. CI repair remains deferred verbatim.

Writer STOPPED/lease released. Coordinator must independently audit this exact
APK/build/closure before any separate data-preserving install/export packet.
No automatic next stage; preserve old public outputs and use a new Downloads
filename when export is later explicitly executed. No commands or edits after
writer-stopped.json, except authorized direct report-back.

Final packaging note: after all build/static checks passed and lease was released,
evidence-index enumeration failed because the host hash helper doubled an already
extended Windows path prefix. No STOP/index had been written. The error is retained
in final-index-first-failure.json; corrected prefix handling finished only evidence
packaging. No build/static retry, helper/assertion/source/APK change or new effect.
