# C6 camera storage repair — source checks passed; STOP for coordinator audit

2026-10-18, Africa/Lagos. Founder explicitly approved execution of the coordinator's
PHONE_P2_03_STORAGE_CAUSE_AND_REPAIR_PLAN_20261018.md. This is its source and
generated-test slice, recorded in D-056. No APK/native library build, device
command, installation, old-record recovery, photo or model execution occurred.
The separate hard-link probe remains uninstalled. GitHub/CI repair stays deferred.

## Outcome and comparison

The Android publisher now uses an isolated JNI adapter for same-directory
renameat2(RENAME_NOREPLACE), replacing link/unlink publication. Unsupported
API/runtime/filesystem behavior fails explicitly before camera admission; there
is no overwrite, ordinary rename, copy/delete, hard-link or syscall fallback.

The store can read-only inspect interrupted file roles, stages, sizes and hashes
without exposing paths or content. Explicit recovery can classify one complete
reservation.new with no other job files, valid source/ticket/process/amount and
an explicit drained-owner assertion. It preserves the reservation content/hash,
appends INTERRUPTED metadata, and never resumes the camera or creates a success
receipt. Invalid, partial, mixed, backup or out-of-order recovery metadata refuses.
Valid interrupted metadata drafts can finish publication after a restart; an old
process's valid staged resolution retains its original bytes. The reservation
claim is released only after a final valid resolution. Conservative reservation
arithmetic and the256MiB owned cap are unchanged.

Compare against C6 before.json snapshots, which include the already-uncommitted
C5 diagnostics. A HEAD-only diff also includes earlier C5/coordinator work and
must not be attributed entirely to C6. Working directory:
C:/Users/doyew/Documents/DEV 2/COSI-m8-planning; branch plan/m8-unified-scanner;
HEAD374286dd87e22703ea90f1cd7a978020e32a8903. No commit or push.

## Exact change surface

Under apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/:

- Changed build.gradle: existing NDK27.1.12297006/CMake3.22.1, native adapter
  integration and keep rules, minSdk24 retained. New consumer-rules.pro.
- New src/main/cpp/{CMakeLists.txt,camera_proof_publish.c} and Java
  CameraProofRename.java. API30 guard and lazy loading; renameat2 resolved through
  dlsym, avoiding an unconditional API30 ELF import. Bounded paired UUID/role
  names, verified parent descriptor, no-follow source, UID/type/single-link and
  dev/inode/length/nanosecond-time checks. Source fsync, no-replace rename,
  directory fsync and post-publication identity checks; close failures do not
  hide the primary error.16KiB page-alignment link settings are source-only here.
- Changed CameraProofFiles.java: adapter use; distinct CAMERA_READ_MISSING,
  CAMERA_READ_SIZE_INVALID and CAMERA_READ_OVERSIZED diagnostics. Existing
  canonical/private-root/write/capture read guards remain.
- Changed CameraProofFinalizer.java: RENAME/FILE_SYNC/FILE_CLOSE diagnostic stages.
- Changed CameraProofStore.java: strict reservation parsing, read-only inspection,
  narrow staged-reservation recovery and validated interrupted-draft continuation.
- Changed CameraProofAndroid.java: explicit saved status includes inspection facts.
- New src/test/java/.../CameraProofRecoveryChecks.java.

Other source/tests:

- apps/mobile/src/recognitionExperiment/cameraProof.ts retains the safe primary
  native admission code and original cause before any lifecycle ticket is returned.
  No SDK/process/failure-drain call is invented after unsuccessful admission.
- CameraProofPanel.tsx shares its bounded diagnostic helper; protocol/UI tests
  cover a safe errno code plus a private bridge message and malformed-code fallback.
- New tools/scripts/phone-camera-storage-repair-{checks,source}.py: bounded local
  checks and external source binding. They do not build/link/install an APK or
  rewrite old source owners, stages, receipts, dependencies or runtime pins.
- D-056, PROJECT_STATE and recognition-track-b task state updated. No migration,
  domain/business/scanner/permission/model/recipe/dependency/CI change.

## Evidence actually executed

Run root: apps/recognition-lab/runs/phone-experiment/
p2-camera-storage-c6-source-20261018-a1/.

| Check | Result and scope |
| --- | --- |
| failure-before.json | Pre-repair production Store plus generated HostIO reproduces complete148-byte staged reservation, failed publication and downstream missing-final recovery failure. No Android syscall is exercised. |
| focused-final-a1/result.json |215 recovery assertions and134 existing durable-finalization assertions pass, actual pure production Store/Lifecycle/Finalizer on generated host files. |
| ui-a1/result.json |36 tests/four suites pass,48.475s: camera protocol, UI, isolation and configuration. SDK/native calls are mocks. |
| android-final-a1/result.json | Current CameraProof Java sources compile against pinned Android36/LiteRT jars. javac-generated JNI declaration matches the C export. No Android execution. |
| syntax-final-a1/result.json | NDK C syntax/API availability checks pass for ARM64, ARMv7, x86 and x86_64 at API24 and30, eight invocations. No object/DSO link or device execution. |
| types-a1 and lint-a1 | Mobile TypeScript and zero-warning lint exit0. |
| self-review.json | Direct fresh boundary review;52 selected protected C5 input rows outside this slice match exactly. No independent assurance claimed. |

Recovery fixtures cover missing final reservation, full reserved claim, read-only
inspection, absent drain proof, malformed/truncated/wrong-source/ticket/process/
amount markers, extra newline/output/partial request/backup, failures before and
after each recovery publication, directory-sync error propagation, cross-process
restart, corrupted drafts, out-of-order metadata, existing destination, changed
published reservation and new generated admission after durable interruption.
The host destination test is not proof of Android kernel race semantics.

Earlier after-a1-check failure was a test comparison of two boxed Long objects;
the oracle now compares numeric values. Expanded after-a2 and final receipts are
retained. No original timeout was raised or assertion waived. The historical
broad JVM sweep remains stopped63/115, not passed; the real-hook cold-render
timeout remains unresolved and was not rerun in this slice.

External49-input source-index.json SHA256:
d80a3a3c3a420120f3b7a4cf05a5fc47588257585b48179c1f24f7697b961294.
It covers the new JNI/build/source/check inputs and actual unchanged legacy owner
file. Legacy36004274... remains the old data ownership identifier; it does not
describe repaired native/JavaScript provenance. No repaired APK exists yet.

## Security boundary and recovery limits

The assets are the isolated app's retained experiment evidence and reservation
accounting. Unexpected names, aliases, substituted files, replacement races or
malformed records must not overwrite evidence or fabricate a successful result.
Canonical/owner/type/single-link checks remain authoritative at IO; native
RENAME_NOREPLACE adds the kernel destination guarantee. Same-UID concurrent
mutation can be detected, not made impossible by the path checks. Store operations
remain serialized; no new exported component or permission is introduced.

This is synthetic/environment-limited evidence plus direct source review.
Actual JNI loading, ELF imports/page alignment, R8 packaging, minSdk24 loading,
Samsung filesystem/SELinux rename support, directory sync, destination-race
refusal, symlink/hard-link/substitution refusal and durable Android reopen remain
unexecuted. No security, production-readiness or physical camera acceptance claim.
The original phone errno and precise old private filename/content remain unknown.
The future owning-app inspection must prove eligibility;148 bytes alone is not proof.

## Requested coordinator decision and next gates

Writer is STOPPED after this report and its immutable run receipt. Independently
review the actual before/after source, JNI lifetime/API/error behavior, recovery
ordering/byte retention and negative tests. Approve or return concrete corrections.

Only after source acceptance, prepare the separately reviewed exact build/native
smoke gates: generated publish, existing-destination refusal with both files
unchanged, negative file-identity cases and durable reopen. Verify minSdk24 lazy
loading, no direct API30 import,16KiB compatibility and the exact additional
native library/R8 keep behavior. Old C4/C5 APK guards cannot silently certify the
new library; current source bindings and explicit allowed payload deltas are needed.

Then separately approve the data-preserving update, first read-only inspect the
real old group, and classify only if its exact eligibility is proved. No reset,
deletion, new store root, owner transfer or assumed data repair. A fresh generated
target capture with founder present follows only after those gates. P2-03/G4 and
P2-04/05/06 remain held, including geometry, permission denial, numerical
correspondence, lifecycle/SDK cache/RAM and faulty-display limitations.

Primary API/platform references are recorded in the coordinator plan:
[Android16 policy](https://android.googlesource.com/platform/system/sepolicy/+/android16-release/private/app_neverallows.te)
and [Bionic API declaration](https://android.googlesource.com/platform/bionic/+/02ce401d1e2b31586c94c8b6999364bbbce27388/libc/include/stdio.h).
