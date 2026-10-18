# P1 isolated generated native build packet

2026-10-12 Africa/Lagos. Sole writer in `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`,
branch `plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
Authority: `PHONE_P1_NATIVE_BUILD_DISPATCH_20261012.md`. Outcome: source/setup and
independent generated evidence completed; **APK build blocked** by the pinned
compiler/runtime metadata incompatibility. No physical-phone execution authorized.

## Implemented boundary

The ordinary package entry remains `expo-router/entry`. The separate
`recognition-entry.js` registers only `ExperimentRoot` through React Native's
AppRegistry. Its graph has no business root conditional import. The guarded
`recognition-verification` environment requires `COSI_RECOGNITION_EXPERIMENT=1`;
other environments reject that flag. The application ID is
`com.damiyx.retailintelligence.recognitionverification`.

The Expo module lives outside default `./modules` discovery. The experiment
plugin adds its search path and excludes business/storage/camera/audio/dev-client,
updates, and unused UI packages from both Expo and RN autolinking. Config checks
compare each ordinary variant with the captured dirty baseline in a fresh module
evaluation, reject mismatched flags, verify ordinary module absence, and assert
experiment discovery contains only the experiment, Expo, constants and core;
RN discovery contains only Expo.

The native API accepts exactly `zero`, `gray128`, and `gradient`. It admits one
job, rejects invalid/busy/closed calls, drains a running job on destruction, and
closes the Interpreter through `use`. It bounds asset reads, checks exact model
and fixture SHA256/byte sizes, validates tensor counts/names/types/shapes, checks
finite unit-range input and finite/nonzero 1024-component output, and returns
bounded vectors and diagnostics. Linkage failures reject explicitly.

Runtime selection is application-only, one thread, XNNPACK off, with no delegates
or CompiledModel construction. `javap` of the accepted 2.2.0 archives shows that
this Interpreter API has removed NNAPI/delegate setters; the source follows that
API rather than calling a nonexistent `setUseNNAPI`. Actual CPU behavior remains
unverified until approved device execution.

Camera, file selection, image decoding/preprocessing, enrollment, recognition
classification, and production integration are absent. No automatic inference
runs on mount. Generated image/oracle assets are retained for future comparison;
their presence is not proof of Android/Pillow equivalence.

## Toolchain and reproducibility

The owned ignored run is
`apps/recognition-lab/runs/phone-experiment/p1-native-build-20261012-a1`.
The unique SDK/JDK/signing cache is `C:/Users/doyew/.cache/cosi-p1-20261012-a1`.
The final Gradle/CMake cache is `C:/p1g-20261012-a1`.
It was absent before setup. The first extraction into the long run path failed at
a Windows path-length limit; that partial extraction and failure log are retained.
The shorter cache resolved extraction without deleting or moving prior files.
Ninja subsequently encountered a React Native prefab-header path over260 characters.
1182 immutable distribution/dependency files (694,490,757 bytes) were copied and
hash-verified into the final shorter Gradle cache, retaining the original. Fresh
CMake staging avoids the old Ninja dependency database. Its hooks are registered
before Expo/RN root plugins eagerly configure Android children. No registry,
global environment, recursive delete or native clean was used.

Official GitHub release metadata pins Temurin `17.0.20.1+1`, 190,817,615 bytes,
SHA256 `e53a79c3c3d86865bd7e787903884331068e71321714ffd44f145785affc7cb0`.
The Adoptium endpoint returned HTTP403; the official release API provided the
archive digest and size. Official Android repository metadata supplies the
exact Windows command tools, platform36 revision2, build-tools36.0.0,
NDK27.1.12297006 and CMake3.22.1. Expected/actual archive checksums, byte sizes,
source URLs and SHA256 are retained per archive in `metadata/*.receipt.json`.
Full prerequisite license text is retained; SDK acceptance is task-local under
the founder's delegated build continuation. JDK legal texts remain in its archive
and extracted `legal/` directory. No Play/Core terms are accepted.
Gradle identified platform-tools as a required SDK prerequisite; official
platform-tools37.0.1 Windows archive (8,044,989 bytes) was verified and retained,
SHA256 `45f4d63113e895ebde0c90f194099a4676b6ac653bd28d54314a9e022bbc1a99`.
No adb/device command was executed. CMake's archive is already rooted at `bin/`,
`share/` and `source.properties`; its extraction preserves that layout. The earlier
incorrect stripped layout remains, with corrected files added without deletion.
All sibling archive layouts were inspected. The installed License bytecode hashes
the exact UTF8 value; trimming its text was corrected in the setup script. Expo
Android libraries are explicitly configured to use approved build-tools36 rather
than fetching their implicit35 default.

The installed Expo57.0.22 template actually uses Gradle9.3.1. Its official
distribution checksum is added to the generated wrapper before first use:
`b266d5ff6b90eada6dc3b20cb090e3731302e553a27c5d3e4df1f0d76beaff06`.
The retained distribution is137,037,885 bytes and matches that official checksum.
Template/native snapshots and final resolved-artifact receipts distinguish actual
versions from installed plugin assumptions.

Reproduction uses the pinned Node24.21.0 and existing Python environment with
`-B`; no npm install or dependency/version changes are needed:

1. Run `phone-native-build-setup.py <owned-run> <unique-short-cache>` using saved
   official metadata. It verifies archives before extraction and refuses partial
   or unrelated destinations.
2. Run `phone-native-build-assets.py <repository-root>`; it verifies public/P0
   inputs and refuses differing destination bytes.
3. Run `phone-native-build-config.mjs` from the repository root.
4. In a fresh, absent generated Android directory, use the installed Expo CLI:
   `prebuild --platform android --no-install` with both matching experiment
   variables. Never use `--clean`. Capture package bytes before/after. The actual
   first prebuild made no package dependency changes.
5. Run `phone-native-build-run.ps1 -TaskRun <run> -ToolRoot <sdk-cache>
   -GradleCache C:/p1g-20261012-a1` in a child
   PowerShell process. It sets child-only paths, generates a new local test signer,
   and invokes release/R8 Gradle with bounded workers and no persistent daemon.
   Signing passwords are passed through environment variables and not logged.
6. The unchanged pins currently fail at Kotlin compilation. After an approved
   correction, inspect a real APK with `phone-native-build-apk.py`, aapt2,
   apksigner, zipalign, module registries, R8 mapping and Metro source maps.
   `-EvidenceOnly` successfully runs the manifest, Hermes bundle and dependency
   receipt tasks; it deliberately produces no APK and does not bypass compilation.

The root `.gitignore` exception exposes only the new module's reviewable Android
source. Module build directories, assets, the generated app Android tree, APKs,
keys, caches and downloads stay ignored. No stage/commit/push/worktree effect.

## Evidence and remaining gates

Source checks currently passed: three targeted mobile suites/three tests,
mobile TypeScript, affected-file lint, ordinary/experiment configuration and
autolinking checks, and 41 public/generated/notice asset copies (19,452,129 bytes).
Initial failed mock/renderer attempts are retained; final tests use the installed
Expo preset while forwarding unrelated native module lookups.

## Actual generated evidence

`gradle-release-a9.log` records the real build blocker:

> LiteRT API2.2.0 Kotlin module metadata is2.3.0; the installed Kotlin compiler expects2.1.0.

The exact24-byte metadata entry is
`META-INF/third_party.odml.litert.litert.kotlin_litert_api_for_maven.kotlin_module`,
SHA256 `e871d64c498617a57844801a5921b0eb078931ca7429f57b863de02b58cbb2a0`.
`kotlin-metadata-blocker.json` independently parses its binary version header.
The actual toolchain is JDK17.0.20.1+1 / Gradle9.3.1 / AGP8.12.0 /
Kotlin2.1.20 / KSP2.1.20-2.0.1 / minSDK24 / compile-target36 /
build-tools36.0.0 / NDK27.1.12297006 / CMake3.22.1.
No compiler skip flag, metadata stripping, runtime downgrade or toolchain
substitution was attempted. The Kotlin CPU probe module did not compile.

Both independent evidence task runs exited0. Final merged manifest has only
the app's signature-protected dynamic-receiver permission, no Android hardware,
storage, network, foreground-service permissions, no providers/receivers, no NPU
feature or optional vendor native-library declarations. Cleartext and backup are
disabled. There is one exported launcher activity and the isolated application ID.
These are generated-manifest results, not APK-manifest results.

The Hermes bundle is1,050,524 bytes,
SHA256 `2158351943ebf02501083fc89abbf712e304cde996ccff23abb7e061e4f0f3ac`.
Its521-source map contains the separate entry and three experiment files, with
no mobile business source, route root or Supabase source. The generated native
registry contains fetch/constants/experiment plus core adapters. Ordinary variants
retain exact config/entry values and exclude the module in actual default search;
an ordinary APK comparison was not built.

Resolved runtime graph:111 unique coordinates /288 retained archive/metadata
records. App compile graph:83 coordinates /215 records. Neither includes Play/GMS.
Both runtime AAR byte sizes and SHA256 match the accepted inspection pins.
App compile visibility hides the module's implementation dependency; the error
occurs in the experiment module's own Kotlin compilation. Dependency locks and
resolved-artifact hashes are retained.215 notice/metadata records include24
packaged full notice/license texts; POM parent/license declarations are retained,
without claiming a completed rights review. LiteRT full notices are in assets.

Fifteen stripped arm64 native intermediate files total23,477,048 bytes; every
PT_LOAD segment is16KB compatible, and required GL/EGL links remain. These are
unpackaged intermediates. Explicit `ndk.abiFilters 'arm64-v8a'` now constrains
packaging; prior all-ABI intermediates remain preserved. APK/native ZIP alignment,
DEX/R8 class retention, signature verification, APK size and installed size are
**UNVERIFIED**, because no APK exists. Proposed phone memory/latency/thermal and
size ceilings have not passed. Source assets total19,452,129 bytes including the
4,117,670-byte model, generated oracles and full duplicated AAR notices.

These checks establish no model execution, numerical parity,
device latency/memory/thermal behavior, camera reliability, model rights clearance,
or readiness for a retailer. The proposed 200MiB peak-memory and 50MiB installed
size ceilings require actual device measurements; APK byte size is a distinct
metric. P2/private-image execution requires a later exact approved phone packet.

## Bounded next repair proposal, not implemented

Recommended: retain Expo/RN/Kotlin2.1.20 and the exact LiteRT2.2.0 pins, and put
the classic Java Interpreter adapter into a tiny Java-only Android submodule
inside the isolated experiment. Its public interface must use Android/Java types
and bounded result values, exposing no LiteRT/Kotlin types. Keep LiteRT as that
helper's `implementation` dependency; the Expo Kotlin wrapper owns admission,
lifecycle and bridge behavior. This is a proposed compile-classpath boundary,
supported by [Gradle API/implementation separation](https://docs.gradle.org/current/userguide/java_library_plugin.html#sec:java_library_separation)
and the observed compile/runtime graph difference. It is an inference, not a
tested fix. The next charter must explicitly cover the internal subproject and
prove Kotlin compile-classpath exclusion, identical runtime hashes, R8 linkage,
manifest/assets/classes, signing and every packaged ELF/ZIP16KB boundary.

Alternative: separately review an experiment-only Kotlin toolchain alignment to
2.3, including Expo/RN/AGP/KSP compatibility. It has a broader tooling impact.
Do not substitute a runtime/model or suppress metadata checks to claim success.
