# Gate B actual Android storage smoke — PASS for generated scope

2026-10-18, Africa/Lagos. Founder explicitly approved the separate Storage
verification installation, one generated batch and one completed-only restart
in the coordinator chat. Coordinator executed directly; writer stayed stopped.

## Verified artifact and device

Samsung Galaxy A15 SM-A156E, selected USB device, unlocked at preflight. Smoke
package was absent. Installed once without replacement/data clear. Exact installed
APK SHA2566df4ae966f098cd719fa80417b1da7e16232c8a60740040e7ddcc896ce72e118
matches reviewed61,809-byte artifact. Separate app UID10294; main isolated app
UID10264 was not targeted. Zero requested permissions/one activity were already
independently source/static verified. Exact native library c3549552...493e63 and
source14/production51 bindings match the runtime ledger.

Fresh evidence root:
apps/recognition-lab/runs/phone-experiment/p2-camera-storage-smoke-c6-device-20261018-a1/.
device.py, approval/preflight/install/launch/scoped logs, initial/reopen raw and
parsed checksum-bound ledgers and validation files preserve the actual commands.
No unrelated log clearing/UI/private-file extraction or radio change.

## Initial batch

One launch, PID2125. Complete bounded INITIAL ledger collected and independently
validated before restarting. PASS_STORAGE_ONLY with acknowledged receipt;
ten case entries, nine PASS and one explicitly unavailable fixture:

| Case | Actual outcome |
| --- | --- |
| Exact production Files/JNI publish | PASS; bytes/inode/device/single link retained, source name absent, actual directory barrier succeeds |
| Native existing destination | PASS; CAMERA_IO_RENAME_EEXIST, both sentinel hashes unchanged |
| Destination appears after caller preflight | PASS; native EEXIST, both unchanged; controlled boundary case, not arbitrary scheduling |
| Native wrong expected source identity | PASS; CAMERA_IO_PUBLISH_ESTALE, no mutation |
| Canonical alias | PASS; Java guard refusal, no native-entry claim |
| Directory as source | PASS; Java guard and actual native ESTALE |
| Symlink | PASS; Java guard and actual native ELOOP |
| Hard-link fixture | FIXTURE_UNAVAILABLE_NOT_PASSED; Android Os.link returned EACCES13 |
| Generated FAILED store record | PASS; barriers/reopen/accounting, no readable success receipt |
| Complete staged reservation | PASS; explicit INTERRUPTED recovery, same marker hash, idempotent reopen, reservation released after resolution, no success receipt |

The direct hard-link EACCES supports the previously established Android policy
incompatibility in this sandbox. It does not retrospectively reveal the exact
original C4 failing errno or prove the original old-file profile.

Logical generated fixture bytes before result133675, below the stated256KiB
logical cap with result headroom. Normal generated store owned/claimed66509;
interrupted generated store owned/claimed66562. These are synthetic stores in
the smoke package, not the real camera app's old record.

## Completed-only new-process reopen

Only after complete initial success: one explicitly approved force-stop of
com.damiyx.retailintelligence.storagesmoke, then one explicit launcher start.
No incomplete worker was killed; no other package stopped. New PID2347.
Complete REOPEN ledger validated as PASS_NEW_PROCESS_REOPEN, differing process
nonce/PID, unchanged generated store bytes/status, unchanged saved result hash,
and no second batch. Saved result SHA256
b95d7e5e0b715a8f92390173715a95a6af095dadac9ad28a66f177c94741f0ea.

## Scope and next gate

This establishes observed API36 JNI loading/no-replace publication/descriptor
refusals/fsync and generated interrupted recovery/reopen using exact reviewed
native bytes and exact production Java sources in a separate SDK-packaged app.
It does not prove main R8 app startup, old-record eligibility, physical power-loss
persistence, API24 loading, camera geometry, memory bounds or recognition accuracy.
Persistent fsync-failure behavior remains generated host evidence; no dangerous
kernel fault/power loss was forced on this phone.

Main camera app was not updated/launched/recovered by this test. No actual photo,
model, private-data access, main force-stop/data reset, automatic rerun, cleanup,
dependency/CI/Git change. Smoke app and generated evidence retained in place.

Gate B accepted for generated Android storage scope, with hardlink guard fixture
unavailable. Next is Gate C: reviewed data-preserving update to exact main APK
80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713, first
owning-app read-only inspection of the real old group, then conditional explicit
interruption classification only if its exact reservation/role/hash/drain
criteria are proved. That separate action was excluded from this bounded approval
and has not been executed. Camera capture follows those storage gates with
founder aiming. P2-03/G4 and later phases remain held; GitHub/CI deferred.
