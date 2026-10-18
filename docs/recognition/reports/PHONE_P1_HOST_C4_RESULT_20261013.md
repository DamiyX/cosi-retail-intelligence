# P1 host C4 archive finalization/recovery preparation result

2026-10-13, Africa/Lagos. Source/generated self-checks pass. Independent audit,
actual OFF payload validation/recovery and phone work remain pending. C3 remains
failed; its donor, consumed contexts and all original inputs are preserved.

## Implemented boundary

Six new `tools/scripts/phone-portability-host-c4-*` files: `archive.py`,
`recover.py`, `controller.py`, `capture.ps1`, `checks.py`, `control-checks.ps1`.
No original/C2/C3/shared producer, inventory, native or business source changed.

The archive utility validates exact 84-entry membership, names, duplicates,
paths, STORED/no encryption/no symbolic-link entries, sizes and bounds. Recovery
stream-hashes all 40 original JPEGs, 40 existing controls, three metadata entries
and exact manifest. It never extracts, decodes, crops, generates controls, loads
an interpreter or evaluates ranks. Connected preflight reads only outer bytes,
directory information and manifest; real payload validation/copy requires the
new guarded offline operation.

Copy uses an exclusive new writable file; writable flush/fsync, close, full
readback and validation precede same-filesystem Windows no-overwrite rename.
Archive/donor hashes are checked before/after. Receipt is exclusive, durably
flushed and read back. Copy/flush/promotion/receipt/readback failures remain
failures with retained artifacts; there is no cleanup, overwrite or automatic
retry. Stable sanitized stage symbols retain original exception causes internally.

The receipt says `RECOVERED_FROM_C3_FINALIZATION_FAILURE`, with original donor,
failed terminal/stop proof and new session/offline provenance. New controls and
model calls are zero. It explicitly requires new job-closure acceptance: the
archive worker cannot prove its own future drain. After the unchanged helper's
terminal success/drain/restoration proof, the controller writes a separate durable
`recovery-closure.json` binding packet receipt/archive, new session/offline/result/
stop/recovery hashes and original C3 failure. Missing/invalid closure prevents
acceptance. This adds no child job and does not authorize radio restoration.

Recovery authority is distinct, source-bound and narrower: zero tensor budget,
40 existing records/20 queries, exact donor/provenance pins. Boolean budgets are
rejected. Core native radio/uplink/profile/adapter/outside-helper/job/drain/cancel/
session/recovery predicates and finite limits remain unchanged. Status text
describes archive recovery; close-only launcher behavior remains. No source or
network rebinding occurs at launch.

## Complete evidence

| Check | Result and scope |
| --- | --- |
| Old exact Windows line | Generated closed archive opened rb; fsync fails OSError/errno 9 |
| New complete Windows path | 84 generated entries/40 pairs, all payload hashes verified, real writable fsync/copy/rename/readback/durable receipt, byte-identical result |
| Final utility/archive cases | 24 pass: compressed/encrypted/duplicate/traversal/truncated/size/manifest/metadata/JPEG/control failures; donor pin/change, unsafe/link paths, existing/racing target, cancel and explicit COPY/FLUSH/PROMOTION/RECEIPT faults including partial copy retention |
| Full real entry/main/gate | 13 generated published preflight/recovery cases pass; actual source/session/offline/provenance/claim checks and real validator/filesystem, plus unpublished/authority/boolean budget/source/offline/closed/cancel/expiry/provenance/donor/existing-output refusals |
| Inherited finite controller controls | 89 pass in C4 context; only root/launcher/recovery wording normalization, explicit effect stubs, no real helper/job/radio proof |
| New terminal-closure binding | 6 pass; real pure terminal guards/durable closure with generated proof metadata, duplicate/missing completion/restoration/stop-hash refusal |
| Actual read-only checks | Historical C3 14-file provenance/closure hashes and timing pass; two real unpublished C4 entry refusals; fresh connected/native capture and final 38-source/native validation pass |

Success tests do not mock fsync, rename, payload validator or gate. Full entry
bootstrap changes only explicit fixture root/donor/operation constants and records
zero image/model/worker calls or imports. Archive/control payloads are generated
bytes, not real private inputs. Native offline/closed-job records in fixtures are
declared synthetic proof data, not actual radio/drain evidence. Fault hooks inject
failures/racing destinations explicitly; successful filesystem work is real.
All earlier 23/12 passes and the refined 24/13 run are retained in disjoint roots.
No assertion or deadline was relaxed; expected duplicate-name warning is retained.

Sibling review confirms original/C2/C3 read-only-fsync defects remain historical
source. New recovery uses write-capable durability only. No old attempt or
40-photo preparation was rerun. The historical raw C3 exception was withheld;
generated reproduction confirms the defect without claiming a recorded errno.

## Candidate and preservation

NEW unpublished root
`C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c4-20261013-a1`;
operation `portability-host-c4-20261013-a1`; prospective output
`apps/recognition-lab/runs/phone-experiment/private-portability-host-c4-20261013-a1`.
Only draft templates exist, with no actual publication/approval/review/attempt/
session/output or Start/Helper invocation. New raw network snapshot stays in its
external root and is hash-bound. Pre-refresh draft is preserved.

| Binding | SHA-256 |
| --- | --- |
| Controller | `22a5458b2576b870e33c3e0710ccb4b8dddb9ba0c417ccc793501c41b357a892` |
| Final source index, 38 files | `28b5717f7be937666a52ae5b3943941a724fdc784574b86102506ce21b670d64` |
| Network binding | `c944cdf3dd16fbea3573b03280abef04e59929f2c7f6d1f5236a787097e8c9a2` |
| Donor provenance | `25c9a7bfae7ee1ec39e14e99a696a2d6d4bb6f9f3171f831ea1ded87646b5272` |
| Actual C3 donor, 131,901,810 bytes | `059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e` |
| Unchanged APK, 38,911,301 bytes | `d19a1181da0111f408b989f3c7222a889fe0a093f49d611185af255b3bd4511e` |
| Unchanged replay-source index | `628909548dc059465388005e4aa062c9b56c6e31d6f9809b11baca1e9081b1b7` |
| Unchanged manifest | `a3c210af479959d3223b1fda2aa69b6060fe70b050e7e062b9a5bf8e58fefa8c` |

Evidence run `apps/recognition-lab/runs/phone-experiment/p1-portability-host-c4-20261013-a1`.
Baseline 879 source / 91,361 protected / 3,006 existing controller records.
Finalizer rechecks every hash/addition set and all consumed C1/C2/C3, 14 C3
attempt records and two original output files. Final source/controller/fixture/
donor/report inventory bindings are in `preservation-final.json`,
`source-fingerprint.json`, `controller-final.json`, `generated-fixtures-final.json`
and `frozen-inventory.sha256.json`. Expected source delta: six new scripts/two
reports; only assigned workflow lease/current_state/updated_at otherwise changes.
PROJECT_STATE is coordinator-owned and untouched.

No actual donor JPEG/control/metadata entry payload was validated or copied; no
actual donor flush/promotion, decoding/inference, new tensors, original photo
reread by recovery, phone/ADB/APK build, dependencies, services, global settings,
Git/cloud or radio effect. Baseline/outer archive hashes are preservation checks,
not actual payload acceptance. Independent HIGH audit precedes publication; real
recovery waits for founder LOW response. Coordinator must accept actual payload,
durability/provenance and new closure before phone use. OS/polling/power failure,
phone parity/ranks/memory/quality/performance and generated-export issue remain
open. Writer stops/releases lease and sends one authorized direct completion.
