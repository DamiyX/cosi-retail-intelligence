# Recovery S2 build C2 — stopped artifact handoff

2026-10-24. **DONE: one offline release build and builder static checks passed.**
Independent coordinator artifact acceptance remains pending. No phone action is
authorized by this handoff. Writer01a1051f-0777-7573-ad09-0e550a4bd56a, same
C:/Users/doyew/Documents/DEV 2/COSI-m8-planning, branch plan/m8-unified-scanner.
STOP/lease release are recorded in the evidence root's writer-stopped.json.

Evidence root: apps/recognition-lab/runs/phone-experiment/p203-export-recovery-build-c2-20261024-a1/.
New private stage: C:/Users/doyew/.cache/cosi-p203-export-recovery-build-c2-20261024-a1.
Authorization: PHONE_P2_03_EXPORT_RECOVERY_DEPENDENCY_C1_REVIEW_20261024.md,
superseding the original build dispatch's source pins/paths. Earlier failure,
C1 probe, source helpers and all original evidence remain preserved.

## Exact artifact and provenance

APK: evidence-root/recognition-camera-recovery-release.apk
Bytes:39972034 (12004 smaller than original capture APK; not installed-size proof).
APK SHA256:
11f23281af8e9c0d7e41f2b460888a56bc28fc69d583a520d4354c414ab139ff.
Signer certificate SHA256:
48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.
Package com.damiyx.retailintelligence.recognitionverification, versionCode1,
minSdk24, target/compileSdk36, ARM64 only. The actual old b83 capture APK's
signature/package/version were compared; same signer and nondecreasing version
support static update compatibility. No installation/data-preservation result
is inferred, and uninstall/clear-data was not performed.

Current exporter source-index:606 inputs, SHA256
 eed896702c8dbc7490b51e1371986f1a13571787e0c7bcade45adfb672d5a1f5.
Derived RecoverySource SHA256
 91809532b21c52ee863e610f7676c0f41835f467ae1e437a934c9f567827c308.
Historical capture source08d1f1f319765a12ebc98b1805d5d83056d620c466b0561e607a41f6926ce19b,
capture APKb83a2b2d6cc744345c46106c3d76c9c1a52eddddeecb7c2535394230f3512674,
camera owner360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e,
model/recipe/run/registry and old-root meanings remain distinct from the exporter.
Packaged DEX contains the expected original/new provenance constants.

## Build and preservation

One invocation, gradle-release.json: explicit scoped Java/Kotlin compile tasks,
app:p2BuildInputs, app:p2ResolvedArtifacts, app:assembleRelease and runtime
report; --offline --no-daemon --console=plain --max-workers=2 with frozen init.
Exit0, BUILD SUCCESSFUL in8m34s,323 tasks.87649-byte redacted log within64MiB,
1800s deadline. No download, compatibility suppression, source workaround, lock
relaxation or retry. Existing framework/Gradle deprecation warnings remain in the
log; success is not a claim of warning-free native compilation. The wrapper and
reader exited normally; the runner does not prove every descendant lifetime.

Actual build metadata: JDK17.0.20.1, Gradle9.3.1, Kotlin plugin2.1.20-release-217
with compiler-embeddable2.1.20; SDK/build-tools36, NDK27.1.12297006. Source-to-stage
mapping covers all606 indexed inputs:588 mobile source/test files staged plus
18 binding-only evidence/helper inputs; derived RecoverySource staged separately.
The1059 stage source files and all606 workspace inputs rechecked unchanged.
109 recorded prior stopped evidence files and the old probe stage1059 source
files match. No runtime/test/lockfile/historical helper edit or source regeneration
occurred. build-inputs.json SHA256
553115f058869800ae4874e73bd33bfa220a923cface5a4a9b2da55e475c3b5e.

## Static evidence actually checked

- apksigner verification passed for both actual APKs, with matching certificate.
  zipalign -c -P16 passed. Full ZIP CRC and APK inventory passed.
- Actual release dependency artifact multisets, including duplicates:409 rows
  across8 configurations exactly equal accepted C1; zero graph-edge differences.
  The independently accepted C1 reference hash is
  a13e0eac88abbdb4b5073a5c584ebb955b7e0289b01d14cc34bb0b4a1c1f856b.
  Actual raw graph hash is recorded in verification.json. Cache files rehashed.
  Module Core/KTX1.17, app/camera1.18 and Activity1.8 selections are preserved.
- Packaged binary manifest's entire canonical tree equals old b83 after removing
  exactly the new recovery Activity. It is enabled in this isolated build,
  non-exported, with no intent filter. No unexpected component/permission addition.
  Platform permission remains CAMERA only; the old package-local signature
  DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION remains unchanged. Existing framework
  provider/receiver components were compared, not assumed absent. The source
  three-variable isolated-variant gate remains frozen; no production build ran.
- All18 native libraries are ARM64 with16KiB-compatible ELF loads and uncompressed,
 16KiB-aligned ZIP placement.15 libraries are byte-identical. Two differ only in
  GNU build-ID note bytes (names recorded below/in native-delta.json). The sole
  meaningful delta is libcamera_proof_publish.so: same one JNI export, expected
  two fixed recovery roots/six journal leaves compiled in. Other payloads match
  after excluding only their GNU build-ID notes. All original model/runtime assets
  retain exact bytes. No extra library was introduced.
- Recovery UI text, closed original endpoints, stable registration key and mapped
  recovery classes are present in the actual DEX/bundle. Actual build pre-R8
  Activity constructor disassembly shows unconditional stable-key registry.register
  before onCreate; mapping plus DEX identity are recorded. This does not prove
  Android callback delivery after recreation/process death.
- Four META-INF/services filenames changed under R8 obfuscation. Paired old/new
  mappings show identical original interfaces and provider classes. All other ZIP
  entry names match. Changes are DEX/bundle, one manifest addition, build/profile
  metadata and explained native payloads; exact deltas are retained.
- Captured actual Metro graph/source-map closure passed using the default Expo
  serializer and unchanged premodules. No generic business route or unintended
  bootstrap addition was accepted. See startup-closure-result.json.

Static-helper initial assumptions about framework permission/components, R8 class
names and service filenames were corrected to compare the actual old artifact
and mappings. A helper parenthesis typo was also corrected. No application source
or APK was patched/rebuilt; static-helper-notes.json records the limitations.
All commands/results/hashes, mappings, manifest comparisons, APK inventory,
compiled-registration proof and source preservation are retained under the root.

## Next gate and limits

Main independently audits this stopped exact APK/static packet before considering
an update. S3 must separately approve and execute the finite generated fixture
with one Activity recreation, one background process death (not force-stop), one
selection/write and one completed restart, through the same native Activity/state
engine. Establish the exact device method and actual PID/result/grant observations
in that packet; this build introduced no new runtime hooks or trial budget.
Only after independent S3 success may S4 recover the fixed existing empty ZIP.
No app update, fixture preparation, picker, actual evidence read/export/Save/transfer,
capture/model operation, ADB/phone connection, Git/CI or P2-04/05 occurred here.

S5 original-image/phase/crop/geometry audit remains pending. Four preview markers
remain inconclusive and strict chart-only scene gate unestablished. No Android
lifecycle/grant lifetime, peak RAM/cache, installed footprint, power-loss/provider-
directory durability or P2-03 acceptance is claimed. P2-04 held, P2-05+CI deferred.

GNU build-ID-only differences: lib/arm64-v8a/libappmodules.so, lib/arm64-v8a/libexpo-modules-core.so.
