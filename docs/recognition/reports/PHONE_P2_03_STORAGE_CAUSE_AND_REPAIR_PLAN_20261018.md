# P2-03 storage failure: coordinator investigation and proposed repair

2026-10-18. Status: PLAN ONLY; source implementation, APK build/install, probe
installation, orphan migration and capture are NOT performed by this review.
Founder requested coordinator investigation followed by a plan for the stopped
Track B implementation chat. GitHub/CI repair remains deferred.

## Finding and confidence

**Confirmed source/platform incompatibility:** CameraProofFiles.publish uses
android.system.Os.link for every exclusive publication. Android 16 AOSP
private/app_neverallows.te explicitly prohibits all_untrusted_apps from hard
linking file_type files. This is an explicit neverallow, stronger evidence than
the previously noted absence of link in create_file_perms. The installed package
receipt identifies an ordinary app, targetSdk36, UID10264. We have not collected
its actual process SELinux context or the original device errno in this review.

**Strongly supported explanation of the physical failure:** reserve writes its
148-byte .reservation.new and then calls publish. A rejected link leaves that
temporary file and no final .reservation. Saved status shows exactly148 added
owned bytes and a26009600 reservation claim, one interrupted group and no active
job. This matches the mechanism. Initial write/fsync/read failure could also
leave148 bytes; therefore the exact historical failing syscall is not claimed
as device-confirmed. No successful JPEG/model result has been established.

**Confirmed recovery limitation:** recover first requires the final reservation.
It cannot classify a group whose reservation publication never completed.
The actual C5 recovery result CAMERA_READ_BOUND, while scan/status succeeds,
strongly indicates that final reservation is absent: scan already bounds group
files to4096 bytes and total group data is148. No private namespace listing was
obtained, so the exact surviving filename/content remains unverified.

**Confirmed test coverage gap:** CameraProofChecks.HostIO.publish uses
Files.move(ATOMIC_MOVE), not the Android link/unlink implementation. Its passing
tests establish store logic on that substitute, not Android publication support.
Reservation fault tests cover partial-write and after-publication states, but
not the complete staged reservation followed by a rejected Android hard link.
The intentional fail-closed behavior is valid protection; automated recovery of
this additional state is a proposed contract extension, not permission to reset.

**Why C5 did not cure it:** C5 preserved the storage operations and added safe
errno reporting. Recovery encounters the missing final file and never replays
the original link operation. It reports the downstream symptom, not its cause.
More free space cannot recreate a missing committed reservation. Original
low-space contribution remains unproven; camera hardware, display tint, model
accuracy and chart alignment do not explain this admission-stage failure.

## Evidence inspected

- Current Files, Store, Android begin/recover and Lifecycle production sources;
  CameraProofChecks host publication and reservation-failure fixtures.
- C4 storage proposal, C5 result report, and actual saved C5 phone/result.json:
  before/after65913 owned,26075365 claimed, one interrupted group, activeJob:null,
  CAMERA_READ_BOUND; zero new capture/model requests in that diagnostic tranche.
- Saved installed-package receipt: targetSdk36, ordinary package and retained UID.
- Current PROJECT_STATE, relevant BUILD_PLAN M8 section, MULTI_AGENT_WORKFLOW,
  D-054/D-055 and Git status. Other edits preserved.
- Android primary source policy and Bionic API declaration below.

No phone command, test execution, code repair, reset, build or installation was
performed during this coordinator review. Existing test totals are historical
writer evidence, not newly rerun or fully independently certified here.
GLOBAL_MEMORY.md and .agents/GLOBAL_MEMORY.md were absent in this checkout.

## Recommended implementation sequence, subject to approval

### 1. Prove and bound the regression locally first

Add a reservation-publication failure fixture to the existing host tests:
write the complete marker, reject publication, reopen, inspect status, attempt
recovery. Preserve bytes/hash and reserved claim, prove no SDK capture/model
invocation and no successful receipt. Add distinct absent-final and oversized
read errors, safe role/stage reporting, and retain the primary begin error when
no lifecycle ticket was returned. Do not expose raw private paths or contents.
These fixtures establish the causal state machine, not physical syscall support.

### 2. Replace the Android publication primitive without losing exclusivity

Recommended design candidate: same-directory renameat2(RENAME_NOREPLACE), through
a minimal isolated native adapter, using the installed toolchain and no new
third-party package. Bionic exposes this from API30; the test device is API36.
Preserve no-follow/canonical/owner/regular-single-link checks, source identity,
file fsync before publication, directory fsync after publication, destination
identity/length checks, and safe stage/errno errors. Use a verified parent
directory descriptor and bounded leaf names. Retain failure evidence.

This is a proposed native boundary amendment, not an already authorized patch.
Before implementation, enumerate exact Java/JNI/build files and review API/ABI
loading on the application's minSdk24. Do not raise production minSdk, make
older devices fail library loading, or silently fall back to overwrite rename.
Unsupported API/filesystem/syscall must produce an explicit bounded refusal
before capture. Confirm the available NDK declarations/linking and target
filesystem behavior during the separately approved native smoke test.

Alternative if the adapter is judged disproportionate: serialized ordinary
rename inside a rigorously single-writer private namespace. This weakens the
primitive-level no-replacement guarantee and requires an explicit revised
threat/concurrency contract. Do not silently choose it. Java ATOMIC_MOVE plus an
existence check is not equivalent to atomic no-replace under a race.

The preferred candidate preserves the current exclusivity promise at the cost
of a small native adapter. No hard-link, copy/delete or overwrite fallback.
Directory-sync failures must remain failures; they cannot be hidden to pass.

### 3. Separately handle the old interrupted reservation

First expose a bounded read-only classification inside the owning app: allowed
file roles, sizes, hashes and reservation parse/owner/ticket validity, no raw
content or external private-file extraction. Do not infer validity from148 bytes.

Proposed narrowly eligible recovery case: exactly one complete reservation.new,
no final reservation, no other job outputs, correct source/ticket/process/amount,
canonical single-link regular file, and independently established drained owner.
After approval, validate it, publish that existing marker with the corrected
exclusive primitive, then append the existing INTERRUPTED completion/resolution
using the normal store path. Never resume its camera job or mark it PUBLISHED.
Retain its bytes and before/after inventory/hash evidence. Idempotent restart
must finish classification without duplication; account for every residue.

If any precondition is missing or ambiguous, remain blocked and report the
actual state. No deletion, force promotion, ownership transfer, general orphan
salvage, app-data clear or new store root to bypass the blocked record.
Do not release its reservation until valid durable classification is complete.

### 4. Verification ladder before another camera attempt

1. Local failure-before/recovery-after state-machine tests, duplicate destination,
   symlink/substitution, invalid/truncated/wrong-owner marker, partial request,
   interrupted publication and directory-sync failure, repeated recovery and
   byte/claim accounting. Preserve all existing negative guards.
2. Test the actual Android adapter on generated data, not only HostIO. One
   separately approved bounded device smoke test must cover successful publish,
   existing-destination refusal with both files unchanged, and durable reopen.
   The already-built separate hard-link probe is optional corroboration; it is
   not required to rediscover the explicit platform incompatibility and remains
   uninstalled. A separate sandbox result does not prove recovery of old data.
3. Review stopped source handoff; then separately approve one fresh exact build
   with manifest/dependency/model/recipe isolation checks and current source pins.
   Do not claim the legacy owner hash covers repaired code. Preserve old artifacts.
4. On approved data-preserving update, classify the actual orphan only if step3's
   eligibility is proved. Verify status and restart durability; stop on refusal.
5. Only then resume one bounded generated-target camera attempt with the founder
   present to aim it. Successful storage is not geometry/recognition acceptance.

## Scope and return contract

Likely files: CameraProofFiles.java, CameraProofStore.java,
CameraProofFinalizer.java, CameraProofAndroid.java (only safe admission error
retention if necessary), relevant Java checks/UI error tests, a narrowly scoped
native publication adapter/build integration if approved, and source/build
binding tools/reports. No business schema, production scanner, dependency/lock,
model/recipe, permissions or CI changes. Source/native architecture delta needs
explicit approval before implementation under AGENTS section10.

Same Track B writer, Sol6.1 High, sequential ownership. This document is a
planning handoff, NOT a writer lease. Writer remains paused until approval and
a bounded dispatch. Then implement source/tests only, STOP and return exact
changed files, failure-before/after receipts, residual risks and handoff path to
the coordinator. No autonomous build/install/capture or third repair attempt.
Coordinator independently audits after STOP; build/device gates follow.

P2-03/G4 and P2-04/05/06 remain held. Permission-denial coverage, actual geometry,
JPEG/tensor/vector correspondence, lifecycle durability, SDK cache/RAM bounds,
and existing cold-render timeout remain separate open items. No success claim
from an end vibration or captureCount alone. GitHub repair stays deferred.

## Primary references

- Android16 policy, explicit hard-link prohibition:
  https://android.googlesource.com/platform/system/sepolicy/+/android16-release/private/app_neverallows.te
- Bionic declaration and API30 boundary for renameat2 / RENAME_NOREPLACE:
  https://android.googlesource.com/platform/bionic/+/02ce401d1e2b31586c94c8b6999364bbbce27388/libc/include/stdio.h

These sources establish platform constraints/API intent, not an observed errno
or successful replacement execution on this Samsung device.
