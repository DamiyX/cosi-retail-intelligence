# Gate B storage smoke — concrete local APK; STOP for source/static review

2026-10-18, Africa/Lagos. Executed local artifact preparation only under the Gate B
dispatch. No ADB/device command, installation, launch, main-app data access,
recovery, camera/model/network, paused old probe, CI/dependency or Git operation.
The founder's general phone-verification request remains active; explicit approval
for this separate package is still required after this artifact's review.

## Exact candidate

Run root: apps/recognition-lab/runs/phone-experiment/
p2-camera-storage-smoke-c6-20261018-a1/writer/.

- storage-smoke.apk:61,809 bytes, SHA256
  6df4ae966f098cd719fa80417b1da7e16232c8a60740040e7ddcc896ce72e118.
- Package com.damiyx.retailintelligence.storagesmoke, launcher label
  **Storage verification**, one Activity expo.modules.recognitioncpu.StorageSmokeActivity.
- Source index14 inputs, SHA256
  444301a9854e4885cadc2c1dae277a84a5c7093486690c7c338fa59158c16239.
  Nine production Java files are exact copies from accepted C6-C1 source51
  edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d.
- Reuses the exact7656-byte Gate A ARM64 library, SHA256
  c354955263c1d84280ace86bdec8aac8f30f0fbd12630611a7226a875d493e63.
  No native compiler/linker was run. Accepted main APK80e71788...2d86713 unchanged.
- Same existing internal signer48550aec...e2d83, verified after signing. Manifest
  source SHA256e4f17c606db66de54017f6e5a3c8e6bea9250f4703e9c9a70ea129556211f9b7.
  Zero permissions, no shared UID/provider/service/receiver/instrumentation,
  backup/debug/cleartext disabled, minSdk24/target36, ARM64 only.

## Source boundary

New harness source is source/StorageSmokeActivity.java, separate from production.
Copied unchanged: CameraProofFrame, Store, Lifecycle, Finalizer, Files, Rename,
PhonePortabilityImage, PhonePortabilityJson and GeneratedImageGeometry. No
CameraProofAndroid/CPU, Expo module, camera SDK, model or third-party dependency
is packaged. Production sources and all previous artifacts remain unchanged.

The harness owns only its package's getFilesDir. For two generated store fixtures,
a bounded ContextWrapper overrides getFilesDir to an owned normal-store or
staged-store subdirectory. Each still uses exact production Files/Store and the
required camera-proof-v1 child, with unchanged canonical/root/UID/type checks.
This is test scaffolding, not a main-app context, private-file bypass or production
Java binary equivalence claim: these exact Java sources use SDK javac/d8 without
the main APK's R8 packaging. Native bytes are binary-exact.

Source/script/binding asset and copied classes were indexed before compilation.
The asset binds the source index, reviewed production source and reused native
hash. At runtime the app checks its own packaged library bytes and reports its
own installed APK hash; it never reads another package's files or executable.

## Finite test design — NOT EXECUTED

At most ten initial case entries:

1. Production Files -> exact JNI absent-destination publication; original bytes,
   device/inode/single-link identity retained, source name gone, directory barrier.
2. Existing destination: call the actual native adapter, bypassing only Java's
   precheck in this own-sandbox harness. Require native RENAME_EEXIST and both
   source/destination sentinel hashes unchanged.
3. Deterministically create a destination after a caller preflight check, then
   exercise native no-replace. This is a controlled race-boundary state, not a
   claim that concurrent adversarial scheduling has been measured.
4. Wrong expected source inode: actual native PUBLISH_ESTALE, no mutation.
5. Canonical lexical alias: actual Java guard, explicitly no native-entry claim.
6. Directory used as a source file: separate Java guard and native type refusal.
7. Symlink: separate Java guard and native NOFOLLOW/platform refusal if the
   fixture can be created; report the actual native code and distinguish ELOOP
   observation from a policy refusal.
8. Attempt one own-sandbox hard link. If Android denies construction, record
   FIXTURE_UNAVAILABLE_NOT_PASSED with actual errno; no privilege bypass or fake
   guard pass. If constructible, test Java/native single-link refusal and retain
   both links. No FIFO fixture or uncontrolled concurrency is used.
9. Normal generated FAILED Store record, with actual barriers and Store reopen,
   same inventory/claim accounting and no readable success receipt.
10. Exact generated148-byte reservation.new, full reserved claim, read-only
    classification, explicit INTERRUPTED recovery, same reservation hash,
    idempotent Store reopen, released claim only at resolution, no success receipt.
    Drain basis is one generated worker and no SDK/model producer ever started.

There is no successful photo or inference record. captureCount in these synthetic
stores counts generated records only. Actual directory fsync is required; no native
errno or successful fsync is injected. Persistent fsync-failure/power-loss behavior
cannot be safely forced here and is not claimed; accepted537 host assertions are
separate source evidence. This smoke establishes only the observed API36 behavior.

## One-shot, results and restart plan

Before fixtures, exact production IO exclusively writes a durable started guard
and syncs its directory. One worker per process; disk guard prevents a second
batch after completion or crash. Existing incomplete/failed state is retained and
reported without replay, reset or deletion. All fixture calls are sequential,
with a30-second monotonic deadline checked between operations. A blocked kernel
call is not falsely claimed to be forcibly preempted; host collection must stop
as incomplete rather than automatically relaunch or kill work.

Final bounded JSON is written/fsynced to a new UUID receipt stage and published
through the exact native no-replace path, then its directory is synced. UI/log
success follows acknowledgment. A visible final result after uncertain directory
sync is accepted only after a later successful barrier, using existing bytes.
The JSON explicitly says GENERATED_STORAGE_SMOKE/PASS_STORAGE_ONLY, zero camera/
model/network calls, source/library/APK hashes and generated fixture inventories.

Log tag StorageSmoke emits BEGIN/checksum/chunk-count, numbered <=1800-character
JSON chunks and END/checksum. Collect only this test process/tag; assemble and
verify the complete payload before accepting a result. UI shows the same bounded
JSON without paths or raw file contents. Use a screenshot/XML only if it is the
test Activity and needed; no main-app screen/private files or unrelated logs.

Proposed execution packet, requiring separate review/approval, is finite: verify
the new package is absent, install this exact APK once, launch one initial batch,
collect a complete initial result within90 seconds, then at most one controlled
new-process reopen of only this completed test package. Never restart incomplete
work to invent drain. Decide/authorize the exact dedicated-process restart method
in that execution packet; the camera app must not be force-stopped or modified.

Reopen verifies old guard/source/own APK, both store inventories/status and
unchanged saved result without a new batch or new fixture writes. It reports
PASS_NEW_PROCESS_REOPEN only when PID and a process-local nonce differ; same PID
is explicitly PASS_SAME_PROCESS_REOPEN_ONLY. Source Store construction still
performs verified sync barriers. Initial case observations must be collected before
the planned restart; reopen does not re-run them or replace a missing initial
case ledger. Missing/failed evidence is INCOMPLETE, not a reason to reset/retry.

## Footprint and static evidence

Expected APK footprint is the exact61,809-byte signed file plus Android-managed
installation/dex/profile overhead, which is not hard-bounded here. Harness logical
fixture bytes are bounded to256KiB, result JSON to32KiB, <=48 generated tree entries;
two stores preallocate65536-byte refusal logs each. Symlinks are not followed for
logical-byte accounting. This is not a bound on all OS allocation or filesystem
metadata. Fixture names/content remain retained after testing; no cleanup/delete.

Cached SDK-only javac/jar/d8/aapt2/zipalign/apksigner commands succeeded. Nine exact
production files plus the harness compile to52 DEX classes, all in the intended
package; exactly one static native method. No camera/LiteRT/ML/forbidden SDK type
or model assets. One stored7656-byte library has16KiB ELF and ZIP alignment.
Manifest is decoded and checked against zero permissions and one launcher only.
Signing uses the existing internal key without exposing its credentials.

The initial static payload oracle expected four entries; AAPT also emitted a
40-byte resources.arsc. This was a checker error, not another build/source fault.
initial-zip-counterexample.json preserves it. Fresh
tools/scripts/phone-camera-storage-smoke-static.py explicitly parses the table
header/pool: zero resource packages, strings and styles. Exactly five paths are
allowed. All other source/signature/manifest/DEX/native/asset guards remain.
No APK rebuild followed; supplemental helper binding hashes this correction and
the unchanged APK. build-result.json and apk-inventory.json hold exact results.

## Decision requested

Writer STOPPED for coordinator source/static review. Review every harness branch,
one-shot/result publication/reopen, real native negative-case oracles, ContextWrapper
scope, copied source/native hashes, finite collection/deadlines and footprint.
After acceptance, ask the founder explicitly to install/run/restart **this separate
Storage verification package**. The existing general camera test approval does
not cover extra packages, per the approved Gate B packet.

No phone command or execution was performed. The accepted main APK and old phone
record remain held. Only after approved smoke success should coordinator sequence
the existing camera app's data-preserving update/owning-app inspection/conditional
old-record classification and one aimed capture. P2 and GitHub/CI gates remain held.
