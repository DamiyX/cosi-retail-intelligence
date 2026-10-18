# P1 C1 independent source and APK review

2026-10-12 Africa/Lagos. Coordinator reviewed the STOPPED writer delivery,
lease=NULL, on `plan/m8-unified-scanner` at unchanged HEAD
`66ea3fc22595a48d7355d1729bb879496cc98896`.

**Decision: ACCEPTED for source/build/static APK scope only.** Generated physical
execution, numerical parity and image preprocessing remain untested. This is an
internal generated-input harness, not a live scanner or M12 acceptance.

## Specification review

Comparison: C1 pre-edit snapshots and baseline against stopped final source,
plus actual signed APK and immutable C1 evidence. Unrelated dirty M8–M11 work is
preserved and excluded from this review.

The Java-only internal helper removes LiteRT from the Kotlin compile classpath
while keeping the same LiteRT2.2.0 application runtime at execution. Its public
signature contains only Java/Android types. Reviewed bounded asset reads, exact
model/input hashes and sizes, tensor names/shapes/types, finite inputs and outputs,
nonzero norm, try-with-resources closure, one-worker busy/closed rejection and
drain semantics. No caller paths, camera, private images or business data are
accepted. No metadata stripping, compiler skip or runtime/toolchain upgrade.

The root unit test retains initial no-inference, pending and error assertions;
controlled rejection replaces async polling. Cold synchronous host renderer setup
is measured separately and still slow. No timeout/global test change. Coordinator
fresh no-cache run: THREE suites/THREE tests PASS,24.051s; recorded cold setup
10291ms. This proves unit behavior, not host-speed improvement or phone latency.

## Standards and artifact review

Fresh coordinator evidence is under
`apps/recognition-lab/runs/phone-experiment/p1-native-build-c1-review-20261012-a1`.

- Rehashed1152 frozen artifacts,782 current source records and782 source snapshots;
  final source fingerprint reproduced:
  `f3b74d8003f914b21f3abd0e4458c0a8230638e85d02d77d95cf5a4fb3e8e134`.
- Rehashed77,920 protected byte/link records and766 unchanged baseline sources.
  Eleven existing changes and five additions match the bounded writer scope;
  pre-review Git source paths exactly match the stopped782 record inventory.
  Protected addition scan found no additions before coordinator documentation.
  Workflow delta was only lease/current_state/updated_at. No private decoding.
- Verified311 unique cached dependency files and all SIX saved actual module
  compile/runtime scopes. App/wrapper compile exclude LiteRT; helper compile and
  all runtime scopes include it. No Play/GMS coordinates. Same pinned runtime/API
  archives and toolchain. Actual release log/exit receipt reports C1 attempt1 exit0;
  coordinator did not rebuild the already frozen candidate.
- Fresh apksigner verify exit0, same internal certificate; zipalign16KB exit0;
  aapt2 manifest extraction exit0. Fresh APK inventory equals the stopped inventory
  exactly, including507 entries,15 arm64 libraries/23,477,048 native bytes,
 7395 DEX definitions and8601 type references. All native ELF loads and ZIP data
  offsets satisfy16KB checks. No Play/GMS class definitions or type references.
  Six R8 class mappings and44 TensorFlow native methods retained.
- All41 actual APK assets match original public/generated/notice ledger. Model
 4,117,670 bytes and original SHA unchanged. Bundled Hermes SHA unchanged;
 521-source map has no business/Router/Supabase entry. No Android platform
  permissions, providers, receivers, services or vendor native-library/features.
  Backup/cleartext false. Signature-only app-specific receiver permission remains.
- Fresh ordinary-config comparison with original dirty baseline passes all FOUR
  ordinary variants; both invalid opt-ins rejected; fresh ordinary autolinking
  excludes experiment/helper; entry remains expo-router/entry. This is configuration
  isolation evidence, not an ordinary APK regression test.
- Fresh mobile typecheck and changed-plugin/root-test zero-warning lint exit0.
  Frozen notices and full texts preserved; legal clearance is not asserted.

Reviewed inspection code before invoking its static APK parser into a NEW review
location. No APK/native/model code was executed. One coordinator diagnostic used
the wrong text encoding for the captured manifest; UTF8 decoding fixed the audit
script without changing any source or APK. Fresh checks then passed.

## Accepted artifact

`apps/recognition-lab/runs/phone-experiment/p1-native-build-c1-20261012-a1/recognition-generated-c1-release.apk`

- 34,454,190 bytes (32.858MiB), arm64 standalone signed release/R8.
- APK SHA256: `3227a851d3825f5362728239710fc6a5090a8e3df838b436cd1ed98da45ff630`.
- Certificate SHA256: `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`.
- Model SHA256: `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.

APK size is not installed size, incremental business-app cost or a memory result.

## Remaining evidence and next action

No material finding blocks this source/build decision. Original metadata failure,
failed UI timing, first-run lease gap and diagnostics remain immutable. C1 did not
need a lease renewal. Writer sent the required direct handoff and remains stopped.

Next: separately scoped generated phone execution packet
`PHONE_P1_GENERATED_DEVICE_PACKET_20261012.md`. Source displays the FULL selectable
1024-vector, but reliable complete extraction must be established on the phone;
screenshots of a few numbers cannot prove parity. Generated laptop reference
vectors have not yet been executed/frozen in this stage. Both sides and every
failure must be retained before a numerical pass can be claimed.

JNI/runtime execution, private40-image portability, Android/Pillow/ROI equivalence,
camera/live recognition, accuracy, sustained latency/memory/thermal, installed
delta, ordinary-app native regression and legal/model adoption remain OPEN.
Existing manual17/20 first-choice and20/20 top-three scores are unchanged.
Formal dataset/calibration/UNKNOWN/holdout and production M12 remain OPEN.
