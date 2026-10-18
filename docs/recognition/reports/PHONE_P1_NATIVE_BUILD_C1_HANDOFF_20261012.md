# P1 native C1 stopped handoff

2026-10-12 Africa/Lagos. Sole writer01a1051f-0777-7573-ad09-0e550a4bd56a returns
directly to coordinator01a098ef-d830-7531-bca7-2d66b0a5b587. Checkout
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, task branch
`plan/m8-unified-scanner`, unchanged HEAD66ea3fc22595a48d7355d1729bb879496cc98896.

**STOPPED; lease=NULL; state=phone-p1-native-build-c1-writer-stopped-await-audit.**
The final workflow receipt and preservation comparison are in the NEW C1 run.
No acceptance is claimed. No commit/push, phone installation/launch or inference.

Full result: `docs/recognition/reports/PHONE_P1_NATIVE_BUILD_C1_RESULT_20261012.md`.
NEW evidence root:
`apps/recognition-lab/runs/phone-experiment/p1-native-build-c1-20261012-a1`.
Original stopped P1 and coordinator review evidence remain immutable.

## Candidate and changes

Actual internal-test signed arm64 standalone APK:
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning/apps/recognition-lab/runs/phone-experiment/p1-native-build-c1-20261012-a1/recognition-generated-c1-release.apk`.
34,454,190 bytes, SHA256
`3227a851d3825f5362728239710fc6a5090a8e3df838b436cd1ed98da45ff630`.
Certificate SHA256
`48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`.

NB-C1 adds Java-only helper build.gradle/manifest/GeneratedProbeCpu under
`apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime` and
changes only wrapper Kotlin/Gradle, helper plugin registration and two helper
build/cache .gitignore rules. NB-C2 changes the existing root test to deterministic
mount/pending/error assertions without changing timeout or global Jest config.
Build wrappers run/config/notices/APK/preservation use explicit C1 outputs and
inspect corrected artifacts. No other original source is changed in C1.
No app.config/core/shared/domain/contracts/package/lock changes, runtime/toolchain
upgrades, metadata stripping, skip flags or new dontwarn rules. No migrations.

## Evidence for audit

- `gradle-release-a1.log`, command and exit receipts: actual helper Java/wrapper
  Kotlin/release/R8/signing PASS, first C1 attempt exit0.
- `resolved-artifacts.json`, `final-static.json`: actual six compile/runtime
  scopes; wrapper Kotlin compile has neither LiteRT artifact, helper Javac has
  accepted2.2.0; runtime has exact pinned archives; every scope has no Play/GMS.
- `root-timing-diagnostic.log`: old timer failure reproduced once, cold render
  6676ms. `jest-corrected-fresh.log`: fresh three suites/tests PASS11.5s; cold
  mounting still5294ms, no host or device speed acceptance.
- Typecheck and changed-source zero-warning lint exit0.
- `apk-inventory-final.json`, `apk-bindings.json`, signature/zipalign/aapt2 logs:
  all15 actual packaged native payloads16KB ZIP/ELF aligned; all41 assets exact;
  actual isolated manifest, bundle and R8/DEX/JNI retention checked. Packaged
  libLiteRt.so keeps EGL/GLESv3 linkage.215 metadata/notice records and24 full
  packaged notices retained. No rights clearance or executed JNI claim.
- Ordinary config unchanged/default autolinking excludes both modules. No
  ordinary APK was built; configuration isolation is not native regression proof.
- `source-before.json` reproduces13 frozen originals and old fingerprint.
  `source-final.json`, `generated-native-final.json`, `source-fingerprint.json`,
  `preservation-final.json`, `workflow-stopped.raw` and `frozen-inventory.json`
  bind the stopped delivery.77,920 protected records are compared by bytes/hash
  or reparse-link target, without private decoding. Receipt contents determine
  counts and final comparison status.

Generated wrapper/helper Gradle lock outputs were preserved in the owned run,
with hashes and the earlier build-source snapshot; they are not new source
lockfile changes. The first scope scan's rejected wrapper lock addition is
retained as a diagnostic. Final comparison follows the output relocation.

## Remaining gates and next action

Independent C1 acceptance is pending. Phone installation/launch, generated
numerical parity/JNI runtime, preprocessing/Pillow, camera/private photos,
recognition quality, memory/latency/thermal, installed/incremental size and legal
gates remain open. APK compilation and static retention do not pass them.

Coordinator should independently audit the frozen C1 source/artifact/preservation
packet, then decide the separately scoped device procedure. PROJECT_STATE and
other workflow fields stay coordinator-owned. Direct message delivery is
required; its acknowledgement alone does not prove audit started.
