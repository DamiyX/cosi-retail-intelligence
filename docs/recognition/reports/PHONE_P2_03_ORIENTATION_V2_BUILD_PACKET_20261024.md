# Orientation V2 — bounded offline build/static packet

2026-10-24. Main source acceptance is recorded in
PHONE_P2_03_ORIENTATION_V2_C1_INDEPENDENT_REVIEW_20261024.md. Founder authorized
continuing the correction workflow. Same Track B, Sol6.1High, is the sole build/
static verification owner, then stops for main artifact review. Main does not
build concurrently. Exact workspace C:/Users/doyew/Documents/DEV 2/COSI-m8-planning,
branch plan/m8-unified-scanner; preserve all unrelated dirty/untracked work.

## Inputs and allowed writes

Freeze and require the exact700-input index from
p203-orientation-source-c1-20261024-a1/source-index.json, SHA256
5df65a511d61d63cb798a7a844628a49d636306bb8a82b2967c8741282c19716.
The derived CameraOrientationSource constant equals that value. Original camera,
matrix and recovery source pins stay untouched. Recipe V2 SHA256
6e321fed06283ee2be42fc80d3b306ab5b52185bc77d627299960dcb7917d6a4;
model SHA256 bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40.

New output root only:
apps/recognition-lab/runs/phone-experiment/p203-orientation-build-20261024-a1/.
Also permit a new task-owned private staging/build-output root under the existing
cache, with exact resolved paths recorded before creation. Existing offline build
helpers may be copied/adapted into the new root; do not mutate old helpers/packets.
Current lease/workflow, concise build handoff and PROJECT_STATE may be updated.
No workspace runtime/test/package/lockfile correction in this slice.

## Build and static checks

1. Claim the null lease; snapshot exact input hashes and source-to-staging mapping.
   Stage the matching isolated camera build with native AND public orientation V2
   and camera-proof flags. Include the checked-in amendment and templates.
2. Patch only an explicitly identified task-owned Expo camera derivative with the
   exact applier. Do not apply through a link into workspace/global node_modules.
   Record before/after hashes, idempotence and which known source variant was used.
   Freeze the helper before one offline release build. Reuse cached Node/JDK/SDK/
   NDK/Gradle/Maven/npm and the last reviewed build pattern; no network fallback.
3. Compare resolved graphs, locks and artifact hashes to the last accepted camera
   recovery APK build; all new classes must use existing dependencies. No new
   native package or version. Stop on an unexplained graph change or source drift.
4. Record signed APK path/size/SHA256, package and signer. Require update compatibility
   with installed package com.damiyx.retailintelligence.recognitionverification and
   signer48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.
   No uninstall/reset/data clearing. No device connection is needed for this check.
5. Inspect merged manifest: existing permission set, isolated V2 metadata and
   non-exported orientation recovery Activity; no unexpected component/export.
   Verify packaged JS selects the V2 panel and patched camera property/event works
   at the static binding level. Confirm legacy recovery code/data compatibility.
6. Check R8 retains the exact reflected CosiGeometryRegistry class and public
   static claim/discard methods. Inspect camera option/event and native source
   linkage in the actual artifact, not merely the compile output. No release keep
   rule changes are allowed silently; report any missing retention for correction.
7. Verify packaged model/runtime/native libraries, ABI, signature and existing
   16KiB alignment requirements, and explain meaningful deltas from the accepted
   recovery artifact. Distinguish build/static success from phone behaviour.
8. Rehash source/old artifacts after building. Preserve original failures and
   timeout evidence. No repeated build-until-green or runtime fixes in staging.

If a reproducible local tooling invocation issue can be resolved without changing
source/dependencies, record the failed command and bounded correction. If the APK
build consumes its attempt or needs source/dependency changes, stop with evidence
for main. Do not manufacture a successful artifact by relaxing inputs/checks.

## Exclusions and return

No ADB/device read, install, file picker, fixture creation on phone, process kill,
photo/model run, private evidence export/transfer, radio/permission change, Git/CI,
P2-04/P2-05 or new agent. The eight-photo proposal still needs its later reviewed
device packet and fresh founder readiness. Capacity is a future device precheck.

Return concise HANDOFF with exact helper/input/APK/toolchain/graph hashes, commands,
artifact/static results, failures and limits. STOP all commands/edits, release lease,
then send one direct completion message to coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587 with the handoff path. Founder authorizes this
completion report. Main independently reviews before any installation/testing.
