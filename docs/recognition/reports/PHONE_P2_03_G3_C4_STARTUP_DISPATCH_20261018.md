# G3-C4 — repair isolated camera JavaScript startup

2026-10-18. Coordinator diagnosis completed on Sol6.1High after founder switched
back and said proceed. G4's first real launch FAILED; it was not a cosmetic status
message. Exact C3 APK6097b9d5...d0a99 and its packaged Hermes bundle are bound to
the generated source map. Symbolicating the actual target crash gives:

CameraProofPanel:3 -> expo-camera/build/index.js:1 -> expo/src/Expo.ts:1 ->
Expo.fx.tsx:4 -> expo-asset/build/index.js -> Asset.fx.js -> Asset.js ->
ExpoAsset.js:2 -> requireNativeModule('ExpoAsset'). The plugin intentionally
excludes native ExpoAsset. Static C3 evidence did not exercise this eager startup
path; the mocked camera UI tests masked the missing integration boundary.

## Repair and boundaries

Objective: remove unnecessary Expo barrel initialization from this isolated
camera entry, preserving real native camera and permission behavior. Do not add
ExpoAsset/native modules, widen autolinking or alter installed package sources.
Installed expo-modules-core exports the same createPermissionHook that expo
re-exports. Installed expo-camera/build/CameraView.js and ExpoCameraManager.js
import core and their own camera implementation directly. Use those pinned,
existing paths in the experiment-only source (a small local camera adapter is
allowed if useful); retain exact get/request methods, hook options and capture
permission recheck. Deep imports are tied to the current installed version;
assert actual file/package hashes and fail on unexpected changes.

This is a local correction within D-054/D-055's existing isolated camera scope,
not a new provider, native dependency, permission or production scanner change.
If those constraints cannot solve startup, STOP with evidence before expanding.
Do not stub ExpoAsset, suppress requireNativeModule errors, fake camera readiness,
replace camera implementation or patch Expo sources. Do not alter native capture,
geometry, ownership, limits, tensor/model recipe, persistence or recovery.

Same sole writer 01a1051f-0777-7573-ad09-0e550a4bd56a, Sol6.1High; parent
01a098ef-d830-7531-bca7-2d66b0a5b587. You are not alone; preserve all other work.
No delegation, new branch/worktree, Git or external effects. Work only existing
C:/Users/doyew/Documents/DEV 2/COSI-m8-planning, branch plan/m8-unified-scanner,
HEAD66ea3fc22595a48d7355d1729bb879496cc98896. Read current project/workflow,
G4 failure report and C3 audit/handoff. G3 startup closure is reopened; G4 and
P2-04 held. Do not treat old G2 source fingerprint as covering the new source.

Fresh evidence root apps/recognition-lab/runs/phone-experiment/
p2-camera-build-g3-c4-20261018-a1/. Only writer/ belongs to you. Coordinator
records/scripts are read-only. Fresh stage
C:/Users/doyew/.cache/cosi-p2-camera-g3-c4-20261018-a1/; verify absent first.
Current actual baselines and before copies are in coordinator-* files; preserve
all frozen prior C1/C2/C3/G4/P1 evidence and C3 stage. No rewriting old STOP files.

Existing writable source: CameraProofPanel.tsx and its UI/isolation tests under
apps/mobile/. New one small experiment-only adapter and one focused startup/import
regression test allowed. Snapshot any existing writable file before edit.
Existing writable helpers ONLY tools/scripts/phone-camera-proof-build.py,
phone-camera-proof-build-config.mjs, phone-camera-proof-apk.py, for fresh roots,
finite lease/baseline/source/index and new JS closure verification. Other helper
sources read-only; new bounded phone-camera-proof-build*/apk* helpers or writer/
checks allowed. No package/lock/plugin/other source/native edits or assertion,
timeout, skip, retry or broad acceptance weakening.

## Required evidence and return

First show a real-import regression fails for the original barrel path and passes
for the corrected source. Exercise actual installed camera JS modules rather than
mocking their whole barrel. Native/RN boundaries may be controlled doubles, clearly
labelled; forbidden Expo/asset bootstrap must fail, not be swallowed. Verify no
automatic request/capture, exact permission get/request and revoked/denied/error
behavior. Default zero-camera route must not evaluate camera/deep imports. Adapt
existing mocks only to preserve existing behavioral tests; retain their assertions.
Focused existing camera UI/isolation/config and new import checks, type/lint for
changed code. If cold timing fails, preserve as unresolved; no warmed pass as cure.

After source checks, one justified offline release build with existing accepted
toolchain/cache/signing handling, no installs/downloads/network/cache deletion.
Reuse exact C3 native camera derivative806 rows/fingerprint187019dc...d4a3 and exact
four-removal app manifest overlay. Installed JS/native/packages/lock untouched.
Generate fresh source pin/index and shadow package from repaired isolated source.
Do not reuse old source pins as acceptance. All numerical/runtime pins unchanged.

Inspect actual Metro dependency graph/source map and packaged JS binding so camera
startup cannot evaluate expo/Expo.fx/expo-asset/PictureRef or Camera.types through
accidental value imports. Explain unreachable lazy/dead modules if present; mere
absence of one string is insufficient. Preserve baseline failure evidence. Review
actual native registration/dependency closure remains the exact prior five Expo
modules; no Asset, scanner/GMS/MLKit or new native runtime. Complete existing APK
manifest/DEX/native/asset/notices/signature/certificate/SDK/ABI/ZIP/ELF16KiB checks
against this exact new APK, with C3 comparison and expected JS-only effects; flag
any unexplained native/DEX/manifest changes. Do not claim physical startup passed.

No ADB, phone install/launch, camera, radio, private pixels, model invocation or
P1 repeat. Camera functional/geometry proof still requires Medium G4 execution
after stopped independent audit. Producer cache/RAM and old timing limits stand.

Use coordinator-issued six-hour lease in workflow, no self-renewal. Drain all owned
processes, finalize PHONE_P2_03_G3_C4_HANDOFF_20261018.md and C4_RESULT under
docs/recognition/reports/, including exact artifact, tests and preservation/source
inventories. Write writer-stopped.json LAST and read it back; no further mutation.
Founder explicitly authorizes ONE direct completion message to parent with STOP,
absolute handoff/result paths and hashes, artifact/blocker. Tell founder handoff
delivered. Coordinator stops now and audits only after stopped handoff.
