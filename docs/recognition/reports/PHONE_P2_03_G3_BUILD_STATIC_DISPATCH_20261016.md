# P2-03 G3 — exact camera build and static inspection

2026-10-16, Africa/Lagos. Founder explicitly said continue to the next phase after
G2 source acceptance. This packet authorizes a bounded LOCAL build/static review
of that exact source. No installation, device connection, camera use, model call,
private-image read, upload or P2-04 is included.

Same sole writer: `01a1051f-0777-7573-ad09-0e550a4bd56a`, Sol6.1 HIGH. Parent:
`01a098ef-d830-7531-bca7-2d66b0a5b587`. Repository:
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch `plan/m8-unified-scanner`,
HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`. Verify before work; preserve the
dirty checkout. You are not alone; coordinator pauses edits/audit until STOP.

## Intake and unchanged source

Read repository instructions/current state/workflow, D-054, G0, S1 dispatch,
S1-C1 handoff and independent review of October16. G2 is accepted only for source
with residual host timing risk. Exact camera source35-row SHA:
`360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e`.
Model: `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.
Recipe: `76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522`.
Application CPU, one thread, XNNPACK/NNAPI/GPU off. Camera-only opt-in; barcode
and audio off. Logical owned256MiB/B26,009,600 bytes; SDK/RAM cap unproved under
choice A. Do not change these values, source semantics or accepted P1 bindings.

New ignored evidence root:
`apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-20261016-a1/writer/`.
Optional short task-owned staging root (fresh, no pre-existing contents):
`C:/Users/doyew/.cache/cosi-p2-camera-g3-20261016-a1/`.
Record every path/command/input hash. Original S1/C1/audit/P1 runs are immutable.

All existing repository and installed package SOURCE files are READ-ONLY. No
semantic fixes in this build slice: return exact compile/closure blockers first.
New repository files allowed only:

- `tools/scripts/phone-camera-proof-build*.py`, `.ps1`, `.mjs` for task-owned
  staging, offline build, source/config/dependency preservation and diagnostics;
- `tools/scripts/phone-camera-proof-apk*.py` for static inspection;
- focused generated helper checks below the new writer root;
- `docs/recognition/reports/PHONE_P2_03_G3_BUILD_HANDOFF_20261016.md` and
  `PHONE_P2_03_G3_BUILD_RESULT_20261016.md`.

No edits to package/lock, node_modules source, camera/native/TS/plugin code,
existing build scripts, .gitignore, P1 pins, plans/state/workflow/lease or old
tests. No worktree/branch/Git/account/service/cloud/automation changes. Do not
invoke old hard-coded-output runners against frozen destinations.

## Build preparation and permitted generated outputs

Use a new task-owned shadow app/native build workspace, preferably under the
short staging root to avoid Windows/CMake path limits. Copy exact app config,
plugins, recognition entry/experiment source/native module/helper, build config
and accepted public/generated model/fixture/notice assets. Use flat source indexes
with byte/hash readback. Preserve source relations and prove which exact copied
files the compiler/bundler consumed. Ordinary app/business code is not an entry.
Record generated-template changes separately; no hand-patching generated files
to hide a source defect. A generated shadow package may gain ordinary Expo run
scripts; dependency/version fields must not change.

An explicitly indexed task-local node_modules directory junction to the existing
repository install is permitted if staging outside the repository needs module
resolution. Verify its exact target and do not traverse it during copies/freezes.
It is not a new installation. Installed Java/Kotlin/config/source remains fixed.
Gradle may produce normal generated `android/build`, `.gradle`, `.cxx` outputs
ONLY for the actually allowed Expo/RN/camera modules. Enumerate those exact paths
before build, snapshot/hash all installed input sources apart from documented
generated-output directories, and verify unchanged after. No cache clean/delete,
source patch, overwrite of old evidence or traversal of unowned reparse targets.

Reuse the accepted cached toolchain:
`C:/Users/doyew/.cache/cosi-p1-20261012-a1/{jdk17,sdk,gradle}` and
`C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/`.
JDK17/SDK36/build-tools36.0.0/NDK27.1.12297006/CMake3.22.1/Gradle9.3.1 remain fixed.
Wrapper distribution checksum:
`b266d5ff6b90eada6dc3b20cb090e3731302e553a27c5d3e4df1f0d76beaff06`.
Read prior accepted setup metadata/manifests and compare actual inputs; do not
assume a path implies an unchanged tool. Reuse existing Gradle artifact cache;
generated compilation/transform/cache entries may be added, never clear or alter
cached artifact bytes. Keep new CMake/project-build output in task-owned staging.

Run local Expo generation without installing packages or cleaning the old native
project; e.g. existing local CLI prebuild --platform android --no-install in the
fresh shadow, with EXPO_OFFLINE=1/EXPO_NO_TELEMETRY=1 and CI=1. Build process env:
EXPO_PUBLIC_APP_ENV=recognition-verification, COSI_RECOGNITION_EXPERIMENT=1,
COSI_SCANNER_VERIFICATION=0, EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF=1,
NODE_ENV=production. No developer server/EAS/cloud build. Do not alter global env.

Use Gradle --offline --no-daemon --console=plain --max-workers=2, actual release
compilation and R8, plus explicit module/helper compile and runtime graph reports.
Build the frozen source, including Kotlin and Java, not a stub or fake runtime.
Lock/inspect resolved dependencies in task-owned generated outputs only. Capture
actual task list, commands, output/exit and source before/after. If exact cached
prerequisites are missing, STOP with requested coordinates/sizes/provenance/license
questions, not a download fallback. No npm install, SDK installer, runtime/toolchain
upgrade, ai-delivery/Play fallback, metadata stripping, skip checks or dontwarn.

Internal signer: use the already accepted cached recognition-test.jks and existing
test-signing-password.txt only inside the build process. Never print/copy/log the
password, full process environment or private key. Remove secret env values in
finally. Report signer public certificate fingerprint and APK verification only.
No new signer/account/production key, and no external signature service.

## Pre-build isolation checks

Before compiling, evaluate current ordinary/scanner/default-zero-camera/camera
configs in isolated processes. Check mismatched opt-ins reject. Config/entry/
autolinking should leave ordinary app behavior unchanged, zero-camera recognition
without camera permission/module, and camera proof with only intended additional
expo-camera. Inspect ACTUAL Gradle autolinking arguments/module registration, not
only a synthetic search. Preserve existing ABI/SDK/security/CPU/entry exclusions.
Capture shadow manifest/registration/entry and source-hash equivalence.

Installed Expo Camera57.0.6 declares CameraX1.6.0, Exif1.4.2, AppCompat1.7.1,
core-ktx1.18.0 and listenablefuture1.0 force. These are inspected direct declarations,
not a proved transitive runtime closure. barcode=false sets three dependencies
compileOnly; Google classes are still referenced in camera source. Resolve and
compile that exact configuration. A missing class/R8/guard problem is a blocker,
not permission to re-enable barcode, add Play runtime or patch node_modules.

## Static acceptance evidence for the exact final APK

Return a signed arm64 standalone release APK only if actual build succeeds, with
size/SHA/source/toolchain/signer/model/generated-assets/recipe bindings. Preserve
all failed attempts with distinct names; no rerun until an understood reason and
no rerun that overwrites earlier evidence. Stop once the final relevant checks
pass or a material blocker needs review; no repeated broad stress suite.

Check the exact final APK, not only intermediate manifest:

- aapt2/manifest-merger: CAMERA is the only requested permission; no INTERNET,
  network state, microphone, gallery/storage/location/Bluetooth/foreground or
  optional vendor/NPU declarations. Backup/cleartext off. Inventory exported
  components/providers/intents; distinguish ordinary launcher from an unwanted
  externally callable camera/import/export surface. Remove/verify no dynamic
  barcode model-download metadata. Resolve unexpected manifest entries, don't
  infer absence from app.config alone.
- Actual resolved artifact list and compile/runtime dependency graphs for app,
  recognition wrapper, CPU helper and camera. No Play Services/GMS/ML Kit scanner
  runtime/ai-delivery artifacts or class DEFINITIONS. Distinguish definitions from
  optional type/string references, examine guard/R8 behavior, and record any
  unresolved class loading risk for G4. Do not claim dependency absence from a
  filename scan, and do not suppress a missing-class build failure.
- Generated Expo/RN module registration, packaged JS entry/module inventory and
  bytecode evidence must show the isolated camera proof route. No business/router/
  Supabase/private-photo UI root. Preserve default/ordinary isolation evidence;
  config evidence alone is not an ordinary-app native execution pass.
- Every packaged model/generated fixture/notice/licence asset, ARM64 JNI/native
  payload, reflected/JNI entry names/R8 retention. Inspect all DEX classes/types
  with robust bounded parsers or existing validated tools. Record transitive
  licences/notices without substituting an old zero-camera inventory.
- APK signature verification, ZIP alignment and all ELF PT_LOAD16KiB alignment
  checks, actual min/target SDK/ABI and size. Static size is not installed-size,
  memory, battery, startup, offline radio, camera or accuracy acceptance.

Run focused tests for any NEW build/inspection helper boundary plus mobile types,
zero-warning lint and affected config/isolation regressions where relevant. Keep
the existing cold host UI timeout visible; don't raise timeouts or change tests
to make a green build. Do not re-run the30-minute storage stress suite when no
runtime source changed. Any required semantic fix returns to coordinator review.

## Stop and report

Finite lease is in active workflow. Do not self-renew; stop before expiry if
unfinished. Coordinator owns workflow/lease/state. Freeze source/artifact/evidence
inventories and handoff, stop ALL writers/build processes, then write
writer/writer-stopped.json LAST. No mutation after STOP. Include exact built APK
path/hash or exact remaining blocker, command/results, installed/cache/protected
preservation, skipped/unexecuted evidence and G3 self-check limits.

Founder explicitly requires ONE direct completion message to parent chat above
with absolute handoff/result paths/hashes and STOP status. Do not silently wait
or start install/phone/model/G4/P2-04. Coordinator independently audits the stopped
build/static result and prepares a separate exact physical packet afterward.
