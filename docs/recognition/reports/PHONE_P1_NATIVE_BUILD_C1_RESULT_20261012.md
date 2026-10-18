# P1 native C1 build result

2026-10-12 Africa/Lagos. Implementer self-check; independent acceptance pending.
Task checkout: `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
Authority and scope: `PHONE_P1_NATIVE_BUILD_C1_DISPATCH_20261012.md`.

An actual signed arm64 release APK was built through Java compilation, Kotlin
compilation, R8 minification and packaging. This resolves the original native
compile blocker at the build boundary. No device was installed, launched or used
for inference. This result does not grant independent or phone acceptance.

## Exact candidate

Candidate retained in the NEW ignored run:
`apps/recognition-lab/runs/phone-experiment/p1-native-build-c1-20261012-a1/recognition-generated-c1-release.apk`.
Build output: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.
Both contained identical bytes at inspection.

- APK: **34,454,190 bytes** (about 32.86 MiB).
- SHA256: `3227a851d3825f5362728239710fc6a5090a8e3df838b436cd1ed98da45ff630`.
- Package: `com.damiyx.retailintelligence.recognitionverification`; min SDK24,
  target SDK36, only arm64-v8a.
- Internal test signer certificate SHA256:
  `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`.
  RSA2048, APK v2 signature verified; reused task test signer. Signing secrets
  are neither source artifacts nor report contents.

APK size is distinct from installed size, incremental ordinary-app cost, memory,
startup time, latency and thermal budgets, all unmeasured here.

## NB-C1 correction and dependency evidence

Added internal `recognition-experiment/android/cpu-runtime` Java-only Android
library. It has no Kotlin/Expo plugin. `GeneratedProbeCpu` contains only the
existing LiteRT-dependent bounded asset/tensor/Interpreter operation; its public
arguments/results use Android/Java types. The Kotlin module retains admission,
single worker, busy/closed/drain/promise and exception handling, and calls this
helper through a private project implementation dependency.

The helper keeps LiteRT2.2.0 and exactly the ai-delivery exclusion. Input IDs and
hashes, model bytes/hash, tensor names/counts/shapes/types/byte sizes, finite input
and finite nonzero1024 output remain checked. Interpreter uses application-only
CPU, one thread, XNNPACK false, no configured delegates/NNAPI/CompiledModel, and
closes through try-with-resources. This is source/build evidence; no model was
executed in C1.

The opt-in config plugin explicitly registers the helper only in the isolated
experiment settings. `.gitignore` excludes helper build/cache output. Existing
ordinary app config/package/lock files were not edited in C1.

Actual resolved module scopes in `resolved-artifacts.json`:

| Module | Compile coordinates / LiteRT | Runtime coordinates / LiteRT |
| --- | --- | --- |
| app | 83 / absent | 111 / runtime and API2.2.0 |
| recognition-experiment | 23 / absent | 30 / runtime and API2.2.0 |
| recognition-cpu-runtime | 22 / runtime and API2.2.0 | 28 / runtime and API2.2.0 |

The Kotlin compile scope excludes the incompatible metadata. The Java scope
contains it and compiled successfully without modifying either archive. Every
scope is free of Play/GMS coordinates. Actual cache archives were freshly hashed:

- LiteRT2.2.0 AAR11,761,541 bytes:
  `624518d72f8a249711a19e9901f480e74f823ca7818260a739cb2c023024807c`.
- API2.2.0 AAR934,666 bytes:
  `b785714414d7af54ad1e8f4a40a382f2809b538b88a2246dcdeb9039394bc38d`.

No runtime/model/toolchain upgrade, AAR/metadata stripping, Kotlin skip flag,
new dontwarn rule or permissive dependency exclusion. Existing upstream R8
configuration contains inherited dontwarn patterns (including Android support,
AndroidX, React, JDK/annotation, OkHttp/Okio and Kotlin reflection). It is retained
in `r8-configuration.txt`; absence of all suppressions is not claimed. No new
LiteRT/Play suppression or blanket `-dontwarn **` was introduced.

Pinned tools remain JDK17.0.20.1+1, Gradle9.3.1, AGP8.12.0, Kotlin2.1.20,
KSP2.1.20-2.0.1, SDK/build-tools36, NDK27.1.12297006 and CMake3.22.1.
Actual R8 mapping reports compiler8.12.14/minAPI24 and SHA256
`d7d536e6031e605288ca2b0a9f9630788887ac0fc3dc39d8fb9381ed6f3a77ab`.

## NB-C2 diagnostic and test result

One bounded fresh diagnostic preserved the original timeout: cold render took
6676ms; mount assertions6684ms; press6694ms; failure6709ms against unchanged5000ms
test timeout. The error-observed stage was never reached. This identifies cold
synchronous renderer setup consuming the test timer before async polling yields.
`root-timing-diagnostic.log` and the diagnostic test source are retained.

The correction measures cold mounting in beforeAll, retains initial screen and
no-native-call assertions there and before interaction, and uses a controlled
promise with explicit React act rejection. It asserts the exact probe ID,
pending screen and rendered error. No polling race, global Jest change, raised
timeout or weakened assertion. Cold setup in the corrected fresh full run still
took **5294ms**; no cold-host or phone performance pass is claimed.

- Fresh `jest --runInBand --no-cache recognitionExperiment`: **3 suites /3 tests
  PASS**,11.5s, `jest-corrected-fresh.log`.
- Mobile TypeScript: exit0, `typecheck.log`.
- Changed plugin/root-test zero-warning lint: exit0, `lint.log`.
- Exact ordinary development/preview/production/scanner config comparison,
  mismatched opt-in rejection and actual autolink/Gradle discovery: PASS,
  `config-comparison.json` and associated discovery receipts.
- First C1 release attempt: exit0, `gradle-release-a1.log`, command/exit receipts.
  Both helper Javac and wrapper Kotlin passed, followed by actual R8 and signing.

The original coordinator fresh test failure, metadata failure and old lease gap
remain historical evidence. They were not relabelled or overwritten.

## Final APK checks

`apk-check-exits.json`: apksigner, zipalign and aapt2 all exit0. APK inventory,
manifest/bundle bindings and final static receipts are stored in the NEW run.

- All15 packaged native libraries (23,477,048 bytes) are arm64 ELF. Every PT_LOAD
  has at least16KB alignment and congruence; every native ZIP payload is STORED
  at a16KB-aligned data offset. `zipalign -c -P 16 -v 4` passed.
- Extracted actual packaged native bytes/dynamic receipts show libLiteRt.so
  retains required libEGL.so and libGLESv3.so linkage. These system dependencies
  are not evidence of a configured GPU delegate. A first inspection assertion
  guessed GLESv2 and failed; actual readelf showed GLESv3 and the receipt check
  was corrected. No APK/source/native binary changed in response.
- All41 accepted model/generated/public/notice assets match the immutable
  original ledger exactly. Model is STORED,4,117,670 bytes, SHA256
  `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.
- Actual aapt2 manifest has no android.permission.* uses permissions, providers,
  receivers, hardware features, foreground service or vendor-native declarations.
  Only the app's own signature receiver permission is declared. Backup and
  cleartext are false; no debuggable flag. One exported launcher MainActivity
  and expected schemes remain; optional AndroidX window system libraries remain.
- Hermes bundle1,050,524 bytes has unchanged SHA256
  `2158351943ebf02501083fc89abbf712e304cde996ccff23abb7e061e4f0f3ac`.
  Actual source map contains521 sources and only four mobile experiment source
  files; no mobile business/Router/Supabase root. Source-map SHA256
  `d0a37a936e0364745b2131808ca94a8e8770a59cdd011c07f40a1e9eef032626`.
- Actual generated Expo module list contains the experiment plus expected
  framework fetch/constants/adapters. No business module registration. R8
  mapping lacks inspected SQLite/camera/securestore/router/filesystem/devlauncher
  class roots. Helper is an internal library, not another Expo module.
- Actual7395 DEX definitions and type references contain no Play/GMS. R8 maps
  helper to i3.a and wrapper to j3.a; both exist in packaged DEX. Reflection/JNI
  names InterpreterFactoryImpl, NativeInterpreterWrapper, TensorImpl and
  TensorFlowLite retain original names;44 TFLite native methods remain. This is
  static retention evidence, not executed JNI linkage.
-215 resolved metadata/notice records and24 packaged full notices retained.
  Notices are inventoried; legal/redistribution clearance is not asserted.
- Ordinary config is unchanged and ordinary discovery contains neither native
  experiment module nor helper. Ordinary entry remains expo-router/entry. No
  ordinary APK was built, so no ordinary-app native regression pass is claimed.

## Preservation and limits

Before editing,13 potential existing source files were snapshotted and verified
against frozen P1 hashes. Original fingerprint remains
`aab75e7535ff4e6f3c8d4764a63f23602c063e69b3d29ebc465a636418e7d12b`.
The C1 baseline contains777 source and77,920 protected records; stopped original
P1 and independent-review runs, private data/output, Expo camera and pinned
installed metadata are protected. `preservation-final.json` is the stopped final
comparison; `source-final.json`, `generated-native-final.json`, source fingerprint
and frozen inventory bind this C1 delivery. Flat snapshots avoid Windows path
limits; partial failed initial hierarchical copies remain in the new run.

The first preservation scan passed protected bytes but rejected the new generated
wrapper Gradle lockfile as a source addition outside the exact allowlist. Both
new wrapper/helper lock outputs were moved without deletion into this owned run
as `wrapper-generated.gradle.lockfile` and `helper-generated.gradle.lockfile`,
with hash receipts. The pre-relocation build source snapshot/fingerprint is
retained separately; the final source snapshot records the scoped delivery.
No application/npm lockfile was changed. This output relocation did not rebuild
or alter the candidate APK.

No private images were decoded, no phone/model execution occurred, no Git
stage/commit/push, clean/delete, account/cloud/service or production effect. No
lease renewal was needed; completion clears only the assigned lease, state and
updated_at. PROJECT_STATE remains coordinator-owned under the exact charter.

Physical installation/JNI execution, generated numerical parity, preprocessing
and Pillow equivalence, camera, real recognition, accuracy, memory, latency,
thermal, installed/incremental size and rights gates remain OPEN. Next action:
independent coordinator audit of this stopped C1 packet. Device work requires
its separately approved procedure.
