# P1 generated image pipeline: source/build result

2026-10-12 Africa/Lagos. Implementer self-check; independent acceptance pending.
Exact charter: `PHONE_P1_IMAGE_PIPELINE_DISPATCH_20261012.md`. Same checkout
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD66ea3fc22595a48d7355d1729bb879496cc98896.

Implemented the generated-only image batch and complete local evidence export,
and built an actual signed release/R8 APK. **Zero phone commands, installations,
Android image decodes, private images or model inferences were executed by this
writer.** Android codec/picker/bridge behavior and actual phone pixel/tensor
differences remain unmeasured. The prior9/9 runtime-vector result belongs to the
accepted C1 APK and is preserved; it is not fresh execution of this new APK.

## Exact final candidate

`apps/recognition-lab/runs/phone-experiment/p1-image-pipeline-20261012-a1/recognition-image-generated-release.apk`.

- 38,859,665 bytes, about37.06MiB.
- SHA256 `5bfb3c9c0d37ec5f43d85b1f1e63c6b8bd09cb18dc3c602bc730a768c11b33a8`.
- Same internal test certificate SHA256
  `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`,
  RSA2048, APK v2 verified.
- Same isolated package
  `com.damiyx.retailintelligence.recognitionverification`,min24/target36,
  arm64 only. Actual APK size is distinct from installed/incremental size,
  memory, sustained latency and thermal budgets, all still unmeasured.

NEW ignored evidence root:
`apps/recognition-lab/runs/phone-experiment/p1-image-pipeline-20261012-a1`.
`apk-bindings.json`, final logs and frozen inventory contain exact artifact pins.
Earlier a1/a2 APKs and commands are retained as implementation history.

## Recipe and frozen coverage

Actual recipe version: **generated-android-bitmap-rgb-center-bilinear-u8-v1**.
Spec SHA256:
`001741899a70a9b6b6d2f06d710ac46e26a6b47714c51c113093f33981c80bfc`.
`generated-oracles/image-stage-spec.json` defines every source, oracle, setting,
bound and tolerance.63 new generated assets are pinned in `generated-assets.json`.
An initial full-control revision was archived before asymmetric downsampling
coverage was added; neither revision observed phone outcomes or tuned thresholds.

| Cases | Count | Mechanism |
| --- | --- | --- |
| EXIF1–8 × JPEG/raw RGB × full/saved effective crop | 32 | Separate native decode from orientation/crop/resize |
| Accepted mapGuide rotations0/90/180/270 × mirrored false/true | 8 | Aspect-fill preview-to-original mapping and one5% guide padding |
|257×129 and129×257 edge/alternating RGB controls, asymmetric crops | 2 | Downsampling, opposite aspects, boundaries, channel order |

One batch therefore performs42 cases, including16 JPEG decodes and26 raw-RGB
cases, with **zero model calls**. P0 JPEG raw encoded dimensions are37×23; its
manifest dimensions are upright, swapping for orientations5–8. Saved effective
boxes are used as half-open bounds directly; no second5% padding. Raw encoded
controls invert the already frozen Pillow upright bytes, isolating codec effects.
All original JPEG/upright/full/crop tensors and P0 manifest remain byte-identical.
Historical nativeValidated=false/modelExecuted=false flags are untouched.

Android uses bounded BitmapFactory byte-array JPEG decode, ARGB_8888,
inSampleSize1/inScaled=false, opaque RGB extraction, explicit EXIF1–8 coordinate
mapping, exact half-open crop, pixel-center bilinear with clamped edges and
floor(value+0.5) uint8 rounding, gray128 letterbox, floor(size+0.5), odd remainder
right/bottom, and float32 divide255/little-endian. **Bilinear is a different
recipe from Pillow12.3.0 LANCZOS.** No image/label/accuracy equivalence is inferred.
The existing Interpreter helper/API/options/model/three runtime tensors remain
unchanged; GeneratedProbeCpu source SHA256 remains
`e99622339605583258cb979041d0c3937893a9323d29d900d9c8e782dc81f7e4`.

Bounds: dimensions1..512, individual assets<=1MiB, spec<=256KiB,
P0 manifest<=64KiB, exactly42 cases/211 ZIP entries, aggregate uncompressed output
and ZIP each<=48MiB. These are processing caps, not measured device memory budgets.
Only hash-bound compiled-spec assets and the batch ID all-generated-v1 are
accepted. There is no caller image/path/URI/import/EXIF-file API.

Frozen tolerances: raw orientation/crop/phone-recipe resize/float mismatch0;
guide maximum error<=1e-12. JPEG-vs-Pillow and bilinear-vs-LANCZOS are complete
descriptive mismatch/max/mean comparisons with no equivalence threshold.

## Evidence export and boundary

Each case exports encoded RGB, upright RGB, cropped RGB, letterboxed RGB and
float32 tensor:210 full binary files plus receipt.json. Receipt includes input
pins, dimensions, effective boxes, geometry, stage metrics/timings and all210
output lengths/hashes. Bundle SHA256 and size are shown in the UI. No megabyte UI
payload or manual transcription is required. Progress/failure counts remain
visible; incomplete batches expose no export. No automatic work on mount.

The shared one-worker/busy/closed/drain gate covers runtime, image and export.
One pending CREATE_DOCUMENT request exports only the current generated bundle;
no JS URI is accepted. Filename/MIME/local-only intent are fixed. Native checks
document-URI type, content scheme and allowed system Downloads provider, or
primary:Download/ under system external-storage provider; other/cloud providers,
malformed/traversal destinations are rejected. Request codes are not reused
within a module lifetime, stale/duplicate callbacks are checked, promises settle
once, and activity/module destruction cancels pending admission. Writes check
cancel/closed state between chunks and drain; no true blocking-I/O preemption is
claimed. Cancellation/failure can leave an empty/partial selected document;
no automatic deletion or success claim for that document. Platform lifecycle and
actual picker-authority behavior require independent device evidence.

Boundary self-check used the security skill: potential arbitrary/provider write
was narrowed to the generated bundle and local destination allowlist. Host
negative tests support this policy; they do not prove platform behavior or a
general security verdict. Coordinator owns independent boundary review before
any device effect. Native system picker and stream behavior were checked against
installed Expo/SDK source and primary documentation: [Android documents framework](https://developer.android.com/training/data-storage/shared/documents-files),
[BitmapFactory options](https://developer.android.com/reference/android/graphics/BitmapFactory.Options),
[ExifInterface InputStream API24](https://developer.android.com/reference/android/media/ExifInterface#ExifInterface(java.io.InputStream)).
The installed Expo JNI converter supports the integer/double array payloads as
JS arrays; no executed new bridge claim is made.

## Checks, failures and build

- Pure Java behavioral checks: final300 assertions PASS, including all eight
  transforms, asymmetric/boundary half-open crop, odd padding, channel/rounding,
  all256 float values, invalid dimensions/boxes/orientations, export cap/hash
  format/queue/cancel/stale/settlement and destination controls.
- Native pre-decoder admission:10 negative ID/path/metadata cases PASS against
  SDK types without invoking Android methods. Actual malformed Android JPEG/EXIF
  decoder behavior is unexecuted; source hash/metadata/bounds guards remain.
- Java host outputs:26 raw cases match frozen upright/crop/bilinear RGB/float
  bytes exactly; eight actual accepted mapGuide oracle cases match<=1e-12.
  These are host preparation checks, not Android JPEG evidence.
- Complete synthetic packet comparator:9 tests PASS48.838s. Missing/unlisted
  files, wrong hashes/source/recipe/inference claims/fabricated metrics rejected.
  An honest-hash crop defect is independently detected as41/42 exact stages.
  Host synthetic packet is explicitly marked and is not phone evidence.
- Final fresh no-cache Jest:4 suites/8 tests PASS36.665s. Root no-model/no-image/
  no-export-on-mount, shared gate/progress/cleanup, exact export receipt and
  failure-count/no-partial-export assertions pass. Cold host root setup16679ms
  remains recorded; no cold/phone performance pass and no timeout relaxation.
- Final mobile typecheck and affected zero-warning lint exit0.
- Fresh ordinary four-variant config comparison/default discovery and invalid
  opt-in guards PASS. No ordinary APK built; no ordinary native regression pass.
- Actual offline release builds a1/a2/a3 exit0:4m10s/3m2s/1m40s. Final includes
  local-provider enforcement and failure-count UI. Java/Kotlin/R8/signing/
  packaging completed with existing cached tools and test signer; no new
  dependency, runtime/model/toolchain, download, skip flag or dontwarn rule.

Preserved failures: initial Jest mock replaced Expo exports and intercepted
ExpoFetch, plus beforeAll renderer was unmounted by per-test cleanup. Partial
mock repair still intercepted other modules; final mock is module-specific and
each root test mounts/asserts its own renderer. Both failed runs remain. Initial
lint used wrong cwd, then flagged Array<T> style; command/style repaired. APK
inspection initially lacked subprocess JAVA_HOME and searched the wrong generated
module-list directory; diagnostics retained, accepted JDK/path corrected.
Later builds follow concrete source corrections, not an unchanged retry loop.
Final class-snapshot collection hit Windows path length limits before lease
release; the failed source/receipt is retained. Snapshot reads use extended paths
and bounded flat filenames; no compiled class or APK changed for this repair.

## Actual final APK and preservation

Signature, aapt2 and ZIP alignment checks exit0. Every15 arm64 native payload
(23,477,048 bytes) is byte-identical to C1 and passes every ELF PT_LOAD16KB and
STORED ZIP16KB alignment check. Required EGL/GLESv3 links remain. Original41 and
new63 assets match full pinned bytes/hash; original model4,117,670 bytes/SHA256
bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40 remains STORED.
All six dependency scopes exactly match accepted C1 coordinate sets and LiteRT
archive pins; no Play/GMS artifacts, DEX definitions or type references. Wrapper
Kotlin compile remains free of LiteRT/API metadata. R8 retains all44 original
TFLite native methods, reflection names/factory constructor and actual new helper
classes. Existing upstream R8 suppressions remain; no new bypass rules.
215 metadata/notice records and24 full notices retained; rights clearance open.

Actual manifest has no android.permission.* uses permissions, providers,
receivers/services, hardware/vendor-native declarations, debuggable flag, backup
or cleartext. Own signature receiver permission and one launcher activity remain.
Actual source map522 sources/five mobile experiment files; no business/Router/
Supabase root. Hermes bundle SHA256
5499a33dc80a703e4254e8f9fab7e3b6b8a166bc4081f87ccc8b76d579309cb2;
source-map SHA256
6156d5c4626da83235fc6aed3a7daffab0f001b6c5e4912986e85f1425cc3622.

Baseline786 source/79,176 protected records and24 existing source snapshots were
captured before edits;25,929 selected installed build/runtime input records were
also frozen. Original native41 assets are checked against immutable accepted
pins. Final source/build/generated inventories, preservation and stopped workflow
bindings are in the NEW run; frozen-inventory.sha256.json contains final hashes.
Generated wrapper/helper Gradle lock outputs are retained as build receipts,
outside source. No app.config/package/npm-lock/shared/domain/contracts/schema/
business or other contributor source changes. PROJECT_STATE stays coordinator-owned.

Next: independent stopped source/APK/export audit, then the separately authorized
generated phone procedure in the handoff. Actual decoding/preprocessing/Pillow
differences, export/lifecycle/bridge, phone timing/RAM/thermal/installed size,
private40-image replay, camera, accuracy/UNKNOWN/holdout/legal/M12 remain OPEN.
