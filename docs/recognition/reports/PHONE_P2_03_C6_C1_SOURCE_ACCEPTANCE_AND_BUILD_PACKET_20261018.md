# C6-C1 source accepted; bounded build and device sequence

2026-10-18. Coordinator independent source decision: ACCEPT for the reviewed
source/generated-check scope. This closes the C6 directory-sync review finding.
It does not establish JNI loading, actual Android persistence, physical camera
success, P2-03 completion or release readiness.

## Evidence actually checked

Compared the three C1 files to the stopped C6 snapshots: required IO barrier at
the common scan boundary, owned/canonical descriptor directory fsync, and the
explicit logic-only HostIO method. No other production delta in this slice.
Current51 source rows/sizes/hashes, handoff hash and two final check-receipt hashes
verified against C1 STOP. Reviewed the actual Java error/descriptor lifetime and
unchanged C6 JNI/publication/recovery consumers.

Fresh coordinator javac and188 durability/215 recovery/134 finalization assertions
all pass. Additional independent CameraProofBarrierReview confirms persistent
flush refusal blocks status, reserve, recovery, inspection and a new Store;
later successful barrier acknowledges unchanged records and releases the claim.
Receipts and source-bound runner:
apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-c1-review-20261018-a1/.

The Android implementation verifies canonical owned directory, opened descriptor
type/UID/device/inode before fsync and named identity afterward; close failure
cannot hide the primary error. All scan consumers, including reopening, cross
the barrier before trusting resolution/done/invalidation or capacity. This avoids
forgetting uncertainty in a process-local flag. Actual device behavior is unrun.
Read-only inspection now means no names/content rewritten; its fsync is explicit.

The legacy native source field remains old-data identity. Current runtime source
provenance is external index edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d,
51 inputs. Do not present the legacy hash as describing the repaired runtime.

## Gate A — same writer, build/static only

Founder requested continuation of pending phone verification; D-056 source review
is now satisfied. This packet sequences preparation before that verification.
Same writer01a1051f-0777-7573-ad09-0e550a4bd56a, Sol6.1 High. You are not alone;
preserve all existing changes. Worktree COSI-m8-planning, plan/m8-unified-scanner,
HEAD374286dd87e22703ea90f1cd7a978020e32a8903. No branch/worktree change.

Fresh run root apps/recognition-lab/runs/phone-experiment/
p2-camera-storage-c6-build-20261018-a1/writer/ and fresh shadow stage
C:/Users/doyew/.cache/cosi-p2-camera-c6-build-20261018-a1/. Verify both absent
before creation. Keep all previous stages/runs/STOP/artifacts immutable.

1. Establish before inventories and exact C1 source binding before compilation.
   Clone preserved last known build shadow; refresh only source rows covered by
   reviewed C6/C1 plus already approved task helpers. Reverify installed packages,
   camera derivative, assets/model/recipe and non-target sources against prior
   hashes. No package/lock/provider/autolinking/permissions/model/recipe changes.
2. Use cached SDK/NDK27.1/CMake3.22.1/JDK17/Gradle and existing isolated signing
   setup without exposing credentials. Offline build only; no downloads/install.
   One signed release result, bounded20-minute child deadline. Stop with missing
   cache evidence rather than fetching dependencies or weakening checks.
3. New helper(s) under task-specific tools/scripts/phone-camera-storage-build*
   may generate/verify this shadow and collect receipts. Old helper scripts and
   STOP guards stay immutable; do not run them against an expired old charter.
   No production source/test/native fix is part of this build-only dispatch.
   If compilation finds an actual source defect, STOP for reviewed correction.
4. Exact static closure: signature and data-preserving update compatibility,
   minSdk24, unchanged permission/component/backup/network surface and camera-only
   isolation. Check new camera_proof_publish library is present for ARM64,
   expected JNI export retained by R8,16KiB ELF/ZIP alignment and only intended
   DT_NEEDED/imports. Verify no direct renameat2 API30 import (runtime dlsym only),
   no unexpected C++ runtime/dependency and no scanner/GMS/MLKit/Asset bootstrap.
   The old17-library expectation must be explicitly amended for this one library,
   not bypassed with a wildcard. Existing camera/model native libraries retain
   their previous static constraints; document build-ID-only differences.
5. Capture exact APK/DEX/bundle/library/source/build-command hashes and dependency
   coordinates. Every payload delta from C5 must be enumerated and attributed to
   reviewed C6/C1 code or normal generated artifact; unexplained delta stops.
   No claim that old C4/C5 static guard automatically certifies the new library.

Writer STOP and direct handoff to coordinator after build/static evidence. No
ADB/phone command/install/app launch/old-data recovery/camera/model/probe/Git/CI.
Six-hour exclusive lease in workflow bounds this dispatch; no retroactive renewal.

## Gates B–D — reviewed sequence after build STOP, no execution by Gate A writer

B. Prepare the concrete generated Android storage smoke using exact reviewed
production IO/JNI bytes, no model/camera/network or old app data. Exercise success,
existing-destination no-replace with both files unchanged, symlink/type/hard-link
and substitution/destination-race refusals where Android permits constructing
the fixture, directory barrier and reopen. An unavailable hostile fixture is
reported unexecuted, not passed. New smoke harness/source must be reviewed before
installation. A separate APK requires its explicit bounded install approval;
the previously paused hard-link probe remains uninstalled. General camera test
authorization does not silently authorize extra packages or instrumentation of
private data. API24 loading remains separate from API36 physical evidence.

C. After exact APK and generated smoke acceptance, data-preserving update of the
existing isolated test app. Verify current installed package/hash/UID before,
matching signer and exact new APK hash after. No uninstall/data clear/force-stop,
radio changes, privilege bypass or private-file extraction. First owning-app
read-only status/inspection must prove actual old group eligibility. Classification
is conditional on the reviewed exact marker/role/hash/drain criteria; refusal
stops, without deletion/forced promotion. Verify preserved bytes/claim accounting,
INTERRUPTED classification only, and reopen durability. No fabricated success.

D. A single generated-chart capture only after storage gates, with founder
awake/aiming and a fresh bounded physical packet. Observe actual startup/capture/
JPEG/receipt/geometry/numerical/lifecycle evidence. The damaged display limits
colour claims; source acceptance is not a physical result. Do not repeat captures
automatically. Permission-denial coverage and full later G4 matrix remain separate.

## State carried

P2-03/G4 and P2-04/05/06 remain held. Existing real-hook cold-render timeout,
historical partial broad sweep, SDK-cache/RAM bounds and physical geometry are
not cured by this audit. No GitHub/dependency/CI correction or push is authorized
in this packet; founder's deferral remains active.
