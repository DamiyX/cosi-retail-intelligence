# Proposed G3-C2: isolated camera-only native source copy

2026-10-17. **APPROVED by founder: “Okay, go ahead.”** D-055 records the bounded
amendment. Execute only through PHONE_P2_03_G3_C2_DISPATCH_20261017.md and its
finite workflow lease; this approval is not build acceptance or installation authority.

Outcome: produce the same isolated still-camera proof APK without unused barcode
implementation or scanner runtime. Keep the same Expo Camera 57.0.6 base, pinned
toolchain, recognition source, model, tensor recipe, logical storage limits and
camera input/cancellation/durability behavior. This is a test-only maintained
derivative, not a permanent production-provider choice or approval to install.

## Exact amendment requested

Allow the existing writer to create and modify a task-owned copy of the installed
camera library, then select that copy only in a fresh camera-proof build shadow.
Installed node_modules, repository package/lock, ordinary app variants, P1/G2
sources and all earlier stages/evidence stay read-only. This explicitly amends
the prior no-native-source-change ceiling for this one experiment. Preserve the
MIT copyright/licence and record base and derivative hashes plus complete diff.
All changes must be reproducible and fail closed when upstream source hashes
or expected edit anchors differ. No copying through a junction write destination.

Bounded source targets, relative to the copied expo-camera package:

- `android/src/main/java/expo/modules/camera/CameraViewModule.kt`: availability
  is false; barcode scan/launch requests reject as unavailable before any URL
  loading or scanner work. Remove scanner imports/calls from those bodies.
  Preserve the still-camera permission, view and capture interfaces.
- `android/src/main/java/expo/modules/camera/ExpoCameraView.kt`: remove the
  BarcodeAnalyzer hookup and scanner callback work; scanner opt-in cannot become
  true. Preserve camera binding, preview, picture size, capture and lifecycle.
- `android/src/main/java/expo/modules/camera/utils/CameraUtils.kt`: camera-only
  barcode availability is false, with no reflective scanner lookup or scan-only
  store/package probe in the derivative.
- `android/src/main/java/expo/modules/camera/records/CameraRecords.kt`: retain
  any pure record/enum shapes still needed by exported API, while removing
  scanner-only format conversion and external Barcode constants/imports together
  with all callers. Do not change non-barcode camera records or capture math.
- `android/build.gradle`: exclude the three source files
  `analyzers/BarcodeAnalyzer.kt`, `analyzers/BarcodeScannerResultSerializer.kt`
  and `analyzers/MLKitBarcodeAnalyzer.kt` from this copy's compilation. Remove
  their three scanner dependency declarations, including compileOnly, from this
  derivative only. Preserve CameraX, other versions/options and consumer rules.
- `android/src/main/AndroidManifest.xml`: omit the unused barcode delivery
  metadata in this copy; preserve CAMERA. Generated proof manifest must still
  refuse network/audio/media/storage/location/radio permissions.

Do not introduce fake GMS/ML Kit classes, generic missing-class suppressions,
reflection tricks, runtime exclusions that conceal required code or an R8 bypass.
If this target set is insufficient or changes still-camera behavior, stop with
the exact proposed additional diff before expanding scope. No alternative native
camera library/provider or version upgrade is included.

## Receiver guard and acceptance

Retain exactly the application-ID-qualified AndroidX
`DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` declaration and request, with signature
protection. Amend the literal permission criterion explicitly: CAMERA is the only
Android capability permission; this one exact internal signature guard is also
required/allowed. No wildcard custom-permission exception and no guard stripping.
Check the raw final APK permission/manifest list and record the distinction.
The original C1 assertion remains a preserved failure, not retroactively passed.

## Evidence before a new build and handoff

1. Freeze C1 STOP/reports/inventories. Prepare fresh C2 stage/evidence, base and
   derivative indexes/diff, exact build-selection proof and ordinary-variant
   isolation checks. Hash recognition source/model/recipe separately from the
   new native-library derivative; do not present G2 acceptance as derivative
   acceptance. Reuse existing verified inputs/cache; no new download is planned.
2. Focused negative checks: barcode true/URL scan/launch remain unavailable;
   refusal occurs before URL/image/scanner work. Verify selected compilation
   excludes the scanner source paths and that scanner dependencies are absent
   from compile/runtime graphs. Preserve original still-camera proof tests and
   thresholds; no broad stress replay unless a change actually warrants it.
3. Compile the derivative and real wrapper/app, then run offline R8/release with
   unchanged shrinker settings. A green graph or source grep is insufficient.
   Inspect final DEX definitions/references/reflection strings, merged manifests,
   assets/native/JNI, entry/registration, notices, signature/certificate, ZIP/ELF
   16KiB alignment, ABI and sizes. No scanner runtime/classes/models/delivery.
4. Stop on any new closure/compiler/behavior defect outside the bounded patch;
   do not iterate by suppression. Drain all processes, complete preservation and
   exact handoff/result, write STOP last, directly report once to the coordinator.
   Coordinator independently audits before any G4 install/physical packet.

Same writer, Sol 6.1 High, sequential ownership. Coordinator publishes a fresh
finite lease and exact C2 paths/baselines for this approval. No phone, ADB,
private images, model inference, service, Git or external publication effects.
G4 and P2-04 remain held. The derivative adds a small maintenance obligation and
requires native source/physical review; no successful APK or timing is promised.
