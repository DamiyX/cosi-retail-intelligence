# C8 one offline release — build/static handoff

2026-10-22. Founder reconnected phone and requested the remaining verification.
The accepted source had no C8 APK yet, so the necessary reviewed offline build
prerequisite was executed under PHONE_P2_03_C8_SOURCE_REVIEW_AND_BUILD_PACKET_20261022.md.
Same Track B writer, finite six-hour lease, source immutable. No child agent.
This is an implementer artifact handoff for independent coordinator review;
it does not authorize or claim physical/native runtime acceptance.

## Exact artifact and inputs

APK: apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-build-20261022-a1/writer/recognition-camera-stationary-release.apk

- SHA256 fea1596df345e7aa75ca47dc7004bbe322370cbdbb20e43c53b5e3fbd1958f6c
- 39944046 bytes,587 ZIP payloads, ARM64,18 native libraries.
- Ready C8 source72 SHA67b2e7bb9272e7a64a9380f18246d651dcdb3a12856b8b8964318821ccde0874.
- Derived C8 source SHA9ef681d1069911952661ea351fb2ca72f7755e5ccedc3b01d67577018ef56bfa.
- Build inputs SHA60216095027a7c821a14a1e815cc8a21a23be9028f9d5ed228052e96f9ac7fc1.
- Target SHA7ffd7f6fbd778405497bbfc0d2f4649281e19c33c8d8af5c626c87d71f02ef6a,
  host-only generated chart; no new runtime photo/asset.
- Fixed job76d28e3f-cdcd-4d1a-a86e-026e2568ce5e.
- Historical C7 baseline APK4eee45f910ff9cc1ceb127f8707d5a4420c0c1b743982019f60e0556326b6827,
  39918298 bytes, retained unchanged.

Fresh shadow C:/Users/doyew/.cache/cosi-p2-camera-geometry-c8-build-20261022-a1/.
Clone verified1023 preserved C7 stage source files, refresh only reviewed C8 mobile
inputs plus derivative. Final stage1029 files,46 reviewed copied rows. Exactly17
source-stage deltas: ten existing reviewed files, six new reviewed source files,
and the task Metro observer configuration. Package/camera derivative, model,
recipe, JNI, permissions, native dependencies, locks and native business contracts
remain unchanged. extra-static-checks.json enumerates every delta; stage-source-
index/refreshed-reviewed-source/old-stage-source-before retain complete hashes.
Original C7 shadow was rehashed before/after and never rewritten. All72 current
accepted source/target/helper inputs and the derivative are guarded against drift.

New task helpers only:
- tools/scripts/phone-camera-geometry-c8-build.py
- tools/scripts/phone-camera-geometry-c8-build-static.py
- writer/static-execution.py and writer/build-extra-checks.py
- task Metro observer and release init script (original supported mechanism).
No production source correction or older helper/charter rewrite occurred.

## One build actually executed

Cached JDK17/SDK36/NDK27.1.12297006/CMake3.22.1/Gradle9.3.1 and existing internal
signing key, no downloads/new keys. Signing passwords were read into environment
only and redacted from captured output; no secret values recorded. One build,
exit0, Gradle reports9m10s, child11:42:02.980122Z to11:51:19.219535Z including
wrapper/preservation. Actual monotonic1200second deadline, not reached.
No retry or native/Gradle/source/dependency repair.

Command recorded exactly in child.json/gradle-release.json, from fresh app/android:

    gradlew.bat :recognition-cpu-runtime:compileReleaseJavaWithJavac :recognition-experiment:compileReleaseKotlin :expo-camera:compileReleaseKotlin :app:p2ResolvedArtifacts :app:assembleRelease :app:dependencies --configuration releaseRuntimeClasspath --init-script <new writer>/release.init.gradle --offline --no-daemon --console=plain --max-workers=2 -PreactNativeDevServerIp=192.168.1.13

The supported RN property preserves C7's reviewed generated development-server
resource value. No global/network configuration change. Gradle deprecation and
compiler warnings remain in gradle-live.log; build success is not a waiver or
Gradle10 compatibility claim.

## Static checks actually passed

static-command-result.json records the one static helper execution, exit0,
11:51:52.239803Z to11:52:03.934037Z,240second bound. Its helper was hash-bound before
build; no checker/assertion relaxation or second checker after a failure.

- apksigner verify succeeds with the same internal certificate
  48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.
  APK update compatibility is static evidence only; no installation.
- AndroidManifest.xml byte-exact C7, including permissions/components/network/
  backup/min24/target36. resources.arsc byte-exact C7 under the explicit RN property.
- Unique safe ZIP payload names,587 entries; all18 native ARM64 ZIP offsets and ELF
  load segments satisfy the checked16KiB alignment constraints; zipalign passes.
- 15 native libraries byte-exact. Three differ ONLY in independently located GNU
  build-ID descriptors: libappmodules.so, libcamera_proof_publish.so,
  libexpo-modules-core.so. Removing only those descriptor bytes yields exact
  equality for each; no blanket ELF normalization. No code/import/other-byte delta.
- JNI publishNative Java native signature and compiled export present exactly once;
  DSO Android min SDK24; dlsym import with no direct renameat2/libc++ import.
  NEEDED libc.so/libdl.so/libm.so, version requirements LIBC only.
- All original model/assets exact except intended JS bundle/generated ART profiles.
  ART profile payloads equal actual generated files. Packaged bundle equals the
  fresh build's generated bundle. No target/photo/tensor is added to assets.
- Two DEX files parsed, no forbidden bootstrap/scanner/test-harness references;
  legacy owner, historical C7 export pin and bridge retained. Current C8 source
  pin, fixed job/target ID/SHA and begin/status/export/cancel bridge strings present.
- R8 mapping ID binds actual APK DEX markers; four service-loader interface/provider
  sets/order remain semantically identical despite obfuscated file-name changes.
- External artifact391 captured rows/138 unique files freshly rehashed, with
  coordinate/hash equality to accepted C7, and supplemental
  equality of all resolved component-coordinate lists for all captured scopes.
- Fresh captured Metro graph534 modules+7 premodules; default Expo serializer and
  premodules preserved. Actual source map533 sources,531 mapped real sources.
  Existing startup-closure guard passes and forbids eager bootstrap/barrels.
  Four current C8 protocol/adapter/controller/Panel files are independently matched
  to graph/source map and exact reviewed stage/repository bytes. Lazy fetch
  packaging observations remain static only, no physical startup claim.

All eight changed payloads relative to C7 are attributed:

- `assets/dexopt/baseline.prof`
- `assets/dexopt/baseline.profm`
- `classes.dex`
- `classes2.dex`
- `lib/arm64-v8a/libappmodules.so`
- `lib/arm64-v8a/libcamera_proof_publish.so`
- `lib/arm64-v8a/libexpo-modules-core.so`
- `assets/index.android.bundle`

The two DEX and JS bundle contain accepted C8 code; ART profiles match generated
outputs; three native differences are build-ID-only as above. No manifest/resource/
model/dependency/unexplained payload difference was accepted.

## Preservation, first preparation error and limits

Preparation initially used Windows default text encoding while reading
PROJECT_STATE after writing fresh charter/workflow lease; UnicodeDecodeError
stopped that project-state update before any stage/build/phone work. A fresh-root
assertion then correctly refused recreating the partial preparation. Resumed the
same root and unchanged lease with explicit UTF-8, preserving before-state copies
and preparation-first-failure.json. This was a preparation encoding error, not a
compile/runtime/phone failure or build retry. No original evidence was deleted.

Prior source709 assertions/60 app tests and coordinator additional12 semantic
assertions remain independently accepted SOURCE evidence; not rerun or relabelled
as fresh build tests. Historical source/STOP/artifact-review helper hashes in
supplemental-preserved-inputs.json are checked unchanged. Source/stage/model/
assets/dependency/graph checks are current static evidence within their scopes.

No ADB/phone command, connection preflight, install, launch, permission/picker,
capture, actual model/inference, export, radio, new dependency, Git mutation/push
or CI action occurred. The user's connection report is not a tool-confirmed
USB/device-ready claim. No current camera storage/slot state was inspected.

Actual startup/callback/native directory barriers/SAF/close faults/power loss,
preview layout/large-font usability, screen damage/scale, stationarity, timing and
eight independently bounded marker annotations are UNVERIFIED for this APK.
APK static acceptance cannot establish precise geometry; it remains INCONCLUSIVE.
SDK cache/peak RAM and cold-render residuals remain. No reset of old C7 or C8 slots.

## Stopped handoff and next action

At writer-stopped.json, release lease and stop all commands/edits. Request
coordinator independent High artifact/source/accounting/graph/native-delta audit
of this exact APK. Founder has requested remaining verification and reports phone
connected; preserve that authorization when preparing the later precise packet.
No automatic installation or test by this stopped build writer.

After artifact acceptance, coordinator prepares the separate fixed phone packet
for data-preserving update and ONE supported stationary-chart capture/inference/
local export. Physical execution Low per founder; readiness/measurement conditions
must be concrete before consuming the one-shot slot. Use prepared observation
checklist; no second photo/retry/reset if incomplete. User need not aim during
build/review. P2-03/G4/P2-04/later remain held; GitHub/CI deferral remains unchanged.
