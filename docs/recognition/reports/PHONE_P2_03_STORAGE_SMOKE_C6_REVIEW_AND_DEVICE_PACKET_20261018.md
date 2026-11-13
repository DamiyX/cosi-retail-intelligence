# Gate B artifact accepted; installation awaiting founder approval

2026-10-18. Independent coordinator source/static decision: ACCEPT the concrete
generated storage-smoke artifact for the bounded test below. No Android runtime
test, installation or camera acceptance is implied. Writer remains STOPPED.

## Candidate and review evidence

APK apps/recognition-lab/runs/phone-experiment/p2-camera-storage-smoke-c6-20261018-a1/
writer/storage-smoke.apk,61,809bytes, SHA256
6df4ae966f098cd719fa80417b1da7e16232c8a60740040e7ddcc896ce72e118.
Package com.damiyx.retailintelligence.storagesmoke, label Storage verification.
Exact reused native SHA c354955263c1d84280ace86bdec8aac8f30f0fbd12630611a7226a875d493e63.
Source14 SHA444301a9854e4885cadc2c1dae277a84a5c7093486690c7c338fa59158c16239.
Production51 SHAedaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d.

Fresh independent reviewer script/receipts:
apps/recognition-lab/runs/phone-experiment/p2-camera-storage-smoke-c6-review-20261018-a1/.
Verified14 source inputs,70 frozen evidence entries, nine exact production copies,
all51 production source rows, STOP/handoff/helper bindings and APK hash. Fresh
signature check uses the same internal certificate; zipalign16KiB passes. Parsed
DEX has52 intended-package classes and exactly the one native Rename method;
no camera/ML runtime/forbidden SDK types. Five exact ZIP payloads, exact reused
native bytes, exact binding asset and parsed40-byte empty resource table.
Fresh decoded manifest confirms zero permissions/sharedUID, one activity and no
service/provider/receiver/instrumentation. Source disables backup/debug/cleartext.

Reviewed the complete harness: durable one-shot guard before fixtures, finite
sequential ten-case batch, real Files/JNI calls and bounded own-sandbox contexts,
native EEXIST/ESTALE negative oracles, separately labeled Java guard tests,
fixture-unavailable reporting, generated interruption and accounting, exact
receipt publication/fsync, chunked/hash-bound result and no-replay reopen. No
blocking source/static finding. Neither source nor hashes prove kernel behavior.

The deadline is checked between operations; a blocked kernel call is not
preempted. Logical generated files <=256KiB and result <=32KiB; installation/dex/
filesystem overhead is separately unbounded. A new-process reopen verifies saved
generated data; no power-loss persistence or API24 device claim follows. An
unconstructible hardlink fixture is unavailable, never passed. The controlled
destination-after-preflight case tests no-replace at the syscall boundary, not
arbitrary adversarial scheduling. Faulty laptop display does not affect this
storage-only test; main camera geometry still needs separate founder aiming.

## Concrete approval scope

Ask founder to approve this separate61KB Storage verification app: install once,
run one generated batch and, only after collecting a complete passing initial
ledger, stop/reopen just this completed package once to verify a new-process
restart. This is an additional package, outside generic camera-app authorization.
Do not execute any phone command before that approval. No radio changes or
founder aiming required for this storage-only step. USB/unlocked phone required.

Approval covers no main camera app update, original-record recovery, captures,
models, network, paused old probe, app data clearing, uninstall or Git/CI changes.
Leave generated test data/package in place afterward; cleanup is a later choice.

## Execution packet after explicit approval

Coordinator may execute directly; no new writer/delegation required. Use fresh
evidence root p2-camera-storage-smoke-c6-device-20261018-a1 under phone-experiment;
verify absent first. Bind source/APK/report hashes and exact device receipts.

1. Identify the expected Samsung Galaxy A15 through the approved USB serial,
   verify online/unlocked/available space and that the smoke package is ABSENT.
   If it exists, STOP; do not replace/reset/reuse an unknown one-shot state.
   Restrict all commands to that selected device and smoke package. No general
   log clearing, unrelated UI/screenshots/logs or main private-file extraction.
2. Install this exact APK once with cached adb, no -r override. Verify installed
   package path/hash, signer/package permissions and separate UID. Record that
   main camera APK/data was not updated; do not read its private storage.
3. Launch exactly expo.modules.recognitioncpu.StorageSmokeActivity. Establish PID
   and collect only StorageSmoke tag for that PID within90seconds. No automatic
   retry/relaunch/kill if the initial batch is incomplete, blocked or failed.
   The app's30second checks cannot forcibly preempt kernel IO; report limits.
4. Assemble BEGIN/numbered JSON chunks/END, verify counts/checksum/PID and bounded
   JSON before accepting observations. Require INITIAL PASS_STORAGE_ONLY,
   acknowledged result, exact own APK/source/library binding, ten case entries
   with expected names and mandatory native/storage cases passed. Explicit
   symlink/hardlink fixture-unavailable rows remain separate coverage gaps.
   Preserve safe actual refusal codes. No missing case or generic PASS inferred.
5. Only with that complete passing initial result, perform at most one targeted
   `am force-stop com.damiyx.retailintelligence.storagesmoke`, then one explicit
   launch of that same activity. This exact restart effect is part of founder
   approval. Never stop/restart the camera test app or interrupt incomplete work.
   Collect another checksum-bound result within90seconds. Require REOPEN,
   PASS_NEW_PROCESS_REOPEN, changed PID/process nonce evidence, unchanged saved
   result checksum and source/APK binding, existing bytes unchanged/noSecondBatch.
   Same-process status is limited/inconclusive for restart, no retry to improve it.
6. Save raw scoped receipts and independently parsed results plus final result
   report. PASS means observed generated Android storage behavior only. STOP on
   any mismatch/error; do not reinstall/clear/delete/recapture or fix code live.

## Next gates and state

If this smoke passes, prepare main Gate C data-preserving update and first
owning-app inspection of the real old group. Recovery eligibility must be proved,
not inferred from148 bytes. Main Gate A APK remains held until then. Gate D camera
proof follows only after storage and recovery gates. P2-03/G4 and later phases
remain unaccepted. Founder phone-verification request remains active; extra
package approval alone does not accept the camera test. GitHub/CI stays deferred.
