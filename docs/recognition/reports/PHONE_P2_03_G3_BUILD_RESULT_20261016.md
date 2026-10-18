# P2-03 G3 result — BLOCKED, no APK

2026-10-16, Africa/Lagos. Exact G2 camera source remains unchanged. G3 cannot
pass: actual Expo autolinking selects the installed Expo Camera **prebuilt Maven
publication**, whose metadata declares prohibited barcode/Play runtime
dependencies. A camera source-build selection requires coordinator review and a
fresh scoped dispatch. No dependency, exclusion, source or R8 suppression change
was made. G4 and P2-04 remain held.

Worktree: `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`,
`plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
Evidence below is relative to
`apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-20261016-a1/writer/`.

## Observed blocker

The source/shadow configs and generated `gradle.properties` correctly set
`expo.camera.barcode-scanner-enabled=false`. The plugin removes only the camera
exclusion. The actual RN autolinking output contains only `expo`; the Expo resolve
command returns the five intended packages. However, the resolved camera entry
also advertises `host.exp.exponent:expo.modules.camera:57.0.6` from
`expo-camera/local-maven-repo`.

Installed `SettingsManager.kt` chooses a publication by default when one is
advertised and links a source project only when publication use is false. The
actual Gradle output marks camera as a publication; its explicit source-project
task fails because there is no `:expo-camera` project. The one offline attempt
exits1 after80.593s (`gradle-a1.json`):

> Cannot locate tasks that match ':expo-camera:compileReleaseKotlin' as project 'expo-camera' not found

This is a task-selection failure, not an observed Kotlin compiler error, missing
artifact resolver error or R8 failure. The new runner assumed a source project;
that assumption exposed the actual publication selection. No app/module compile
task ran and no release APK exists. No second build was attempted after inspection
identified the material closure conflict.

The installed publication's richer `.module` runtime variant and its POM declare:

| Prohibited runtime declaration | Version |
| --- | --- |
| `com.google.android.gms:play-services-code-scanner` | `16.1.0` |
| `com.google.mlkit:barcode-scanning` | `17.3.0` |
| `androidx.camera:camera-mlkit-vision` | `1.6.0` |

The property in source `android/build.gradle` changes the barcode dependencies
to compileOnly **only when that source build script is evaluated**. It does not
rewrite the installed prebuilt publication metadata. Therefore a passing config
test is insufficient to prove the requested runtime closure.

The locally installed AAR is273,217 bytes, SHA256
`6eab21591a5f39d14257a2658d0a1d626cbc36666bc236d86319e7f68ff6ea86`,
matching its local module metadata. Its class archive has172 `.class` entries,
23 with barcode names. Its library manifest includes CAMERA and barcode_ui
download metadata. The generated app manifest contains the intended removal
directive, but final merger/removal was not executed. These are library/config
observations, not final APK DEX definitions, merged permissions or reachable-class
proof. No complete resolved runtime graph or R8 guard analysis was produced.
`camera-publication-inspection.json` retains exact metadata, dependencies, AAR
entry hashes/classfile names and library manifest; `static-input-index.json`
binds nine exact relevant source/generated copies.

## Missing cached prerequisites, separately observed

The approved cache has no version directories for these twelve direct publication
declarations (a filesystem observation, not a Gradle resolver result):

- `androidx.exifinterface:exifinterface:1.4.2`
- `androidx.appcompat:appcompat:1.7.1`
- `androidx.camera:camera-core:1.6.0`
- `androidx.camera:camera-camera2:1.6.0`
- `androidx.camera:camera-lifecycle:1.6.0`
- `androidx.camera:camera-video:1.6.0`
- `androidx.camera:camera-view:1.6.0`
- `androidx.camera:camera-extensions:1.6.0`
- `androidx.camera:camera-mlkit-vision:1.6.0`
- `androidx.core:core-ktx:1.18.0`
- `com.google.android.gms:play-services-code-scanner:16.1.0`
- `com.google.mlkit:barcode-scanning:17.3.0`

Provenance is the installed Expo Camera57.0.6 publication and source declarations,
under the configured Google/Maven repositories; no remote metadata was queried.
Required remote byte sizes and the transitive closure are **unknown** because
the relevant metadata is absent locally and network access is not authorized.
The installed publication POM declares MIT for Expo Camera; exact missing-version
transitive licences/checksums/sizes still require reviewed metadata acquisition.
The prohibited barcode coordinates are evidence of the conflict, not a proposed
download list. Source-build selection must be reviewed before deciding which
compileOnly/runtime prerequisites, if any, to acquire.

## Evidence and limits

| Fresh check | Actual result |
| --- | --- |
| Exact shadow prebuild | exit0, offline/no-install;163 copied inputs/32,431,840 bytes; dependency/version fields unchanged |
| Isolated config processes | six valid source/shadow pairs exact; four invalid combinations rejected |
| Autolinking checks | five intended Expo packages, only expo in RN dependencies; publication distinction retained |
| New helper checks |7 passed: STOP/lease/input/exclusive evidence/process-env boundaries |
| Mobile types/lint | both exit0; lint zero warnings |
| Normal test-env config/isolation |3 config tests pass;1 default-route UI test hits unchanged5s timeout; no retry/relaxation |
| Source binding |35 rows match `360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e` |
| Toolchain | five accepted archives and selected installed tools match;314 Gradle distribution files exact;866 cached artifacts indexed |
| Offline Gradle | one attempt, exit1/task selection; no source compilation, R8 or APK |

Two new-harness failures remain visible: `toolchain-attempt-a1.json` records a
Windows long-path `stat` error corrected only in the new helper; the complete
read-only verification then passed. `isolation-a1.json` records production-env
Jest misuse (missing React act and production env inlining). Its diagnosed
correction runs unchanged tests with NODE_ENV=test, unset opt-ins and a fresh
task-owned cache. `isolation-clean-a2.json` then exposes the retained cold UI
timeout. That timeout's cause remains unknown; no further rerun was made. No
test, assertion or timeout was edited. The prior C1 timing risk remains open.

All955 source paths,2995 coordinator installed input paths,104 native assets and
75 frozen bindings match. A broader9008-entry installed input tree also matches,
including distributed JS build files; only explicitly enumerated native/plugin
generated outputs are excluded. All866 pre-existing cache artifact bytes and
all163 staged accepted inputs match after build (`preservation-after.json`).
`source-path-ceiling-final.json` confirms only the two permitted helpers and two
assigned reports were added within the coordinator's source suffix set, with
all pre-existing Git status rows preserved. It also records an initial inventory
comparison diagnostic: unfiltered Git paths included pre-existing non-source
files omitted by that baseline; applying the actual baseline filter resolves
the comparison without changing any repository content.

No actual APK permission/component/DEX/native/JNI/licence/signature/alignment/
ELF inspection can pass without an APK. No signer certificate was read out or
APK signed. Kotlin, camera source compilation, release R8 and real Android
behavior remain unverified. No network/download/install/ADB/phone/camera/model/
private-image/radio/cloud/Git effect or source/dependency repair occurred. The
30-minute storage stress suite was not repeated. Geometry remains INCONCLUSIVE;
D-054 choiceA and logical256MiB/B26,009,600 limits remain unchanged.

Recommended next action: coordinator review a narrowly scoped **source-build
selection for existing Expo Camera only**, retaining barcode=false and all
exclusions, then review precise missing-artifact metadata/sizes/licences before
any acquisition. Do not accept the prebuilt scanner runtime closure. A subsequent
dispatch must own any source/config correction and renewed build attempt.
