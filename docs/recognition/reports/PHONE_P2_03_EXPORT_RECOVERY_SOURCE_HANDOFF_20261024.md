# P2-03 export recovery — S1 source handoff

2026-10-24. Track B chat01a1051f-0777-7573-ad09-0e550a4bd56a to coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587. Workspace C:/Users/doyew/Documents/DEV 2/COSI-m8-planning,
branch plan/m8-unified-scanner. Implementer STOP and lease release are authoritative
only when the evidence root's writer-stopped.json exists. S1 source implementation
is DONE; independent source acceptance and every S2–S5 gate remain pending.

Evidence root: apps/recognition-lab/runs/phone-experiment/p203-export-recovery-source-20261024-a1/.
Approved plan SHA25619b4bfce66a42bf9a044db64e08d712e7b4e730db89dacafd799f4aa436eea07.
No APK build, phone/ADB operation, picker, actual export/transfer, capture/model,
dependency download, commit/push or CI action occurred in this source task.

## Result and fixed boundary

The new non-exported ComponentActivity registers a stable Activity Result callback
unconditionally at construction. Application-owned native work and an OS-held
exclusive journal lock survive Activity destruction. React receives only screen
launch acknowledgement or read-only persisted status, never ownership of output.
Opening the JS recovery panel mounts no camera or permission hook and starts no
picker/write. Original camera/matrix capture/export bridge endpoints are closed.

One fixed document is selected with ACTION_OPEN_DOCUMENT: Internal storage >
Download > p203-matrix-20261023-c1-r1.zip. The r1 filename is intentional. Exact
externalstorage.documents primary document ID, display name, offered persistable
RW access, regular single-link zero-length descriptor, current path/descriptor
identity and physical free space are checked before WRITE. Historical inode was
never recorded and remains explicitly unattested. No CREATE, truncate, append,
new destination, second selection or automatic output retry exists.

The six immutable <=2KiB records bind owner and predecessor hashes:
OWNER → SELECTION → DESTINATION → WRITE → VERIFIED → TERMINAL.
Only the execution publishing WRITE obtains a single-use ephemeral permit. A
restart finding WRITE cannot write, even if the output is empty. It recomputes
expected bytes through the same deterministic fixed-metadata STORED ZIP serializer
and may finalize only an exact complete output by read-only reconciliation.
Partial/empty/different output stays UNVERIFIED. Torn records remain preserved.
Missing callbacks and unjournaled grants do not create write authority.

CameraMatrixHistoricalReader opens the fixed old roots through mutation-rejecting
IO, validates exact18 jobs, registry, retained initializer,12 sealed terminal
hashes/profiles, consumed old export and absent old terminal. It fingerprints all
fixed input roots before/after output. The archive retains old provenance and adds
one bounded recovery.json; original exportResult remains null. No pixel decode,
classification or model execution is used. The tiny separate fixture uses the
same Activity/journal/engine/serializer. Actual preparation requires its native
READBACK_VERIFIED receipt; independent S3 lifecycle review remains a procedural
gate and is not implied by that receipt alone.

## Source bindings and changed paths

Exporter source index SHA256:
161995276f4ffe6940e771055a8b59d035a5bab250b32c59c0c099d5bf9c7a7f.
Derived CameraMatrixRecoverySource.java SHA256:
2e6fc1f203285cc5dd73ad8d5cc8dc18469887e5ea0d92b39eeb8a8cbf86c0e6.
source-index.json binds600 inputs, including renderer/check helpers and the old
resolved graph. Run render-source.py --check from this workspace to reproduce it.
No recovery APK exists yet; its hash is computed natively from the installed
artifact later, separately from original capture source/APK.

Unchanged historical pins:
- capture source08d1f1f319765a12ebc98b1805d5d83056d620c466b0561e607a41f6926ce19b;
- capture APKb83a2b2d6cc744345c46106c3d76c9c1a52eddddeecb7c2535394230f3512674;
- camera owner360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e;
- sealed run p203-matrix-20261023-c1-r2, root camera-matrix-20261023-c1-r2-v1.

Exact before/after paths and hashes are in source-verification.json and
unchanged-inputs.json. Within the576-file baseline,9 approved existing files
changed and567 remain byte-identical. Historical plan/source classes, model,
recipe, case IDs and protected failure/plan inputs are among preserved inputs.
The source additions are13 files. path-manifest.json lists every path explicitly.

Existing edits: CameraProofPanel.tsx, nativeAdapter.ts; native module Kotlin,
manifest/build.gradle; CameraProofFiles/CameraProofStore/CameraMatrixEvidence;
exact C publisher allowlist. New CPU classes: RecoveryPlan, RecoverySource,
RecoveryStore, RecoveryEngine, RecoveryAndroid and HistoricalReader (all named
CameraMatrix*); new CameraMatrixRecoveryActivity.kt, cameraMatrixRecovery.ts,
two TS tests and three Java checks. CameraMatrixStore.java was not changed.
No database, migration, capture/model recipe or shared business contract changed.
The C publisher adds only two fixed recovery roots and six leaves; old leaf and
matrix guards remain identical. AndroidX Activity1.8.0 was already resolved;
only that existing version is declared directly. No library was installed.

## Checks and interpretation

All command arrays, input hashes and stdout/stderr are retained under the evidence
root. Python is apps/recognition-lab/runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe -B.
From the workspace, runner paths are under the evidence root:

| Command / evidence | Result and scope |
| --- | --- |
| check.py host host-final |709 assertions across6 JVM check executables; compile with -Xlint:all |
| check.py ui ui-a1 |28 tests/5 suites, including affected older UI/isolation suites |
| check.py types types-a1 |Mobile TypeScript --noEmit passed |
| check.py lint lint-a1 |Affected TS/tests passed --max-warnings=0 |
| offline-compile.py offline-final |All Camera*.java plus local module Kotlin compile; Android-target C -Wall -Wextra -Werror -fsyntax-only passed |
| verify-source.py |Approved path ceiling,567 unchanged inputs, fixed pins, bridge closure, stable registration, exact publisher tables/negative names passed |
| render-source.py --check |600-input source binding and derived class reproduce |

The offline Kotlin check uses cached compiler2.2.21 and hash-verified artifacts
from the reviewed graph, plus cached Expo/unchanged non-camera CPU compile jars.
It does not resolve a new Gradle graph or prove the next APK's merged manifest,
actual compiler/toolchain selection, desugaring or dependency locks. S2 must do so.
Offline1/2 harness failures were missing cached LiteRT/Activity transitive compile
classpath entries; all were corrected using existing artifacts, without downloads.
Host-a1 was a pure harness classpath error. Host-a2 exposed a real missing eager
journal validation at reconstruction; constructor validation now refuses torn
residue immediately. Failure receipts were retained, followed by passing checks.

Coverage includes lost old callback ticket, fresh store/process/source/archive
reconstruction, selection/grant-journal boundary, consumed-empty WRITE,
first/middle/last-byte death, readback/terminal interruption, duplicate/stale
selection, once-only permits, concurrent host FileChannel ownership, wrong
exporter/capture pins, tampered JPEG/seal, nonempty/wrong-identity output, missing
grants/free space, torn/oversized records and short provider writes. Generated
historical serialization produces125 entries and identical bytes across timezone
change; original generated input hashes remain identical.

The old lost-prepared-evidence failure is source-confirmed independently: its
CameraMatrixAndroid.evidence is memory-only and write rejects null with
EXPORT_CONSUMED_OR_CANCELLED. This task did not execute that old Android method
or trace actual Expo result delivery. The correction's fresh-instance archive
reconstruction is host-tested. Do not present source inspection or simulated
process tokens as native Activity/grant/process-death proof.

## Storage proof and remaining gates

quota-proof.json records admitted/observed record sizes and arithmetic. Six2KiB
records plus one2KiB temp =14KiB; zero-byte lock counts toward <=8 entries.
Original canonical172KiB + retained initializer4KiB + recovery14KiB =190KiB,
within unchanged192KiB reserve. Original90MiB output stays fully charged.
The separate permanent64KiB fixture allowance includes its14KiB journal and
<=4KiB output, with no staged ZIP. Old C7/C8/C9 allowances remain charged inside
256MiB. Using the historical observed10469268 claims gives aggregate138919828
bytes <268435456. This is arithmetic on a prior observation, not a fresh device
capacity result. Android checks actual current claims and free space before WRITE.

Next: coordinator independently reviews this stopped S1 source; then separately
approve S2 offline APK/static review with same package/signer/update preservation.
S3 is exactly one fixture selection/write, one Activity recreation, one background
process death (not force-stop), and one completed restart. Confirm actual PID and
persisted process-token change, stable callback delivery independent of JS, grants,
OS lock ownership and no duplicate output. Only after independent success may
S4 select/recover the fixed existing empty actual ZIP and transfer it once.

S5 original-image/metadata/phase/geometry audit remains open. Preview review's
four inconclusive markers and unestablished strict chart-only scene gate are
unchanged. Export success cannot accept P2-03. No hard RAM/SDK cache cap, absence
of memory leaks, power-loss durability or provider-directory durability is claimed.
P2-04 held; P2-05 and GitHub/CI repair deferred. No approvals were expanded.
