# P2-01 generated scan-session stopped handoff

2026-10-14, Africa/Lagos. Ticket P2-01 only. Same writer
01a1051f-0777-7573-ad09-0e550a4bd56a, checkout
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`, inspected HEAD66ea3fc22595a48d7355d1729bb879496cc98896.
Self-checks pass; independent coordinator acceptance remains pending.

## Implemented boundary

New files only: `apps/recognition-lab/src/phoneCapture/session.ts`,
`generated.ts`, `cli.ts`, `__tests__/phoneCaptureSession.test.ts`, ten authored
JSON fixtures under `fixtures/phone-capture-session/`, and this report.
The malformed fixture is a generated refusal control containing no real data.
No existing source/test/config/package/lock, P0 schema/fixture or P1 pin changed.
No P2-02 enrollment/storage/UI, mobile/native/build or phone wiring was begun.

The portable controller has no imports, timers, wall-clock calls, truth or
ranking input. Injected monotonic epoch time and an owned capture job bind
session/job/gallery/source/model/recipe identity. One job, queue0, max3 attempts,
minimum400ms accepted capture gaps, and strict3000ms completion/admission cutoff
are enforced. Request/capture/completion times are separate. A fresh session has
its own epoch; a capture-job request at the current session's3000ms is refused.

Cancel/background/unmount/offline loss immediately invalidates admission. A
deadline can terminalize a result while its actual owned job remains DRAINING.
Start stays blocked until the matching completion and successful release. Cancel
signal return, timeout, duplicate/stale/wrong-gallery callback and release failure
never invent a drain or clear another owner. Each actual owned completion attempts
one release. Failed release remains visibly owned; thrown start remains draining.
Capture/decode/inference errors terminate with earlier usable partial evidence,
without automatic retries. Snapshot consumers cannot mutate controller evidence.

The generated adapter uses fake two-dimensional vectors/handles and virtual
clocks. Ranking read-only reuses existing `productScores` math; it never feeds
outcomes back into selection. All scheduled slots/trials/four arms remain, with
usable/failed/late/cancelled/pending/missing counts. Fallback and partial rankings
are labelled; autoAccept/nativeValidated are false. Hand-computed complete ranks
are V21:a, V41:a, V23:b, V43:a; mean scores2/3 vs1/3 and exact ASCII ties are tested.

The CLI admits only named bundled generated scenarios, never arbitrary/private
trace paths. Strict schema/version/kind/field/vector/gallery/session/event bounds
apply, including4096 events before nested parsing. Output is a new `cli-*` leaf
inside the assigned run; traversal/absolute paths, unsafe ancestors and existing
destinations refuse. Inputs validate before destination creation. Files use exclusive
creation; partial operational write failure retains its claimed destination.
Exits0 complete,2 retained valid incomplete,1 invalid/operational error.

## Evidence actually run

All commands used installed Node24.21.0 at
`C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe`.
Run root: `apps/recognition-lab/runs/phone-experiment/p2-generated-01-20261014-a1`.
Exact CLI command arrays/cwd/exits and output hashes are in `cli-final-results.json`;
stdout/stderr logs are retained separately. Final receipts use `cli-final-*`.

From `apps/recognition-lab`:

```powershell
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' '../../node_modules/jest/bin/jest.js' --config jest.config.cjs --runInBand __tests__/phoneCaptureSession.test.ts
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' '../../node_modules/eslint/bin/eslint.js' . --max-warnings=0
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' 'src/phoneCapture/cli.ts' --scenario complete --out cli-final-complete-a1
```

From repository root:

```powershell
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' 'node_modules/typescript/bin/tsc' --noEmit -p apps/recognition-lab/tsconfig.json
```

Final focused Jest:24 cases/one suite PASS,21.294s, exit0 (`jest-a3.log`).
Lab typecheck and whole-lab zero-warning lint exit0, empty final logs
(`typecheck-a3.log`, `lint-a3.log`). No root/broad test sweep occurred.

Tests challenge2999/3000/3001 completion, deadline admission, no queue/catch-up,
cancel-at-final-completion order, all four invalidation causes, never-completing
work, stale/duplicate/wrong-gallery/session callbacks after a newer scan,
create/start/release errors, exactly-once release, all three pipeline error codes,
bounded ledger, truth/malformed/cap rejection, ranking/ties and actual CLI refusal.

Initial23-case pass is retained. A review then reproduced one reporting defect:
START_ERROR became CANCELLED on drain. `start-error-before-a2.log` records the
one-case failure (other23 skipped). The correction preserves failed disposition
and failure code without changing release or admission. Final24-case pass follows.
Assertions/timeouts/configs were not weakened. Initial CLI receipts remain under
their earlier source binding; final receipts were written to distinct new paths.

| Final output leaf | Exit | Retained outcome |
| --- | --- | --- |
| cli-final-complete-a1 / cli-final-complete-a2 | 0 / 0 | Three-frame COMPLETE; identical report/source bytes |
| cli-final-cancelled-a1 | 2 | CANCELLED; first usable frame retained, cancelled second discarded |
| cli-final-late-a1 | 2 | Exactly3000ms result LATE; DEADLINE; actual owned completion releases once |
| cli-final-stale-a1 | 2 | Two trials/eight arms; first cancelled, newer COMPLETE; stale callbacks ignored |
| cli-final-never-finishing-a1 | 2 | DRAINING/stillOwnedWork:true; no forced release |
| cli-final-failed-a1 | 2 | DECODE_ERROR/FAILED; labelled one-frame partial fallback |
| cli-final-not-ready-a1 | 2 | No job, three missing slots, DEADLINE |
| cli-final-permission-a1 | 2 | PERMISSION_DENIED/FAILED, no job |
| cli-final-offline-loss-a1 | 2 | Mocked offline-policy cancellation, earlier usable partial frame |
| cli-final-malformed-a1 | 1 | Real-kind/malformed control refused; no output directory created |

Each valid leaf contains `report.json`, `source-manifest.json`, `receipt.json`.
Deterministic substantive files are report/source manifest; only receipt destination
and createdUtc differ. Complete report SHA256
`e4d54115d51b337b6559f33ca3970db5c089c47a4905d72bf36b6b1286641a7a`.
Final CLI source/fixture/dependency manifest (15 rows) SHA256
`3f8309adf16e5c733285531b4f594071c0b52f221dba13d5518dd23002f1497b`.
Fake-model binding0528fbd83cfb2aebc7e6e679b356a8c569e46237da341d4001e68f6c308b0d3a;
no-image-recipe bindingba9dd135f6cc70991ac2548e18761dcf3141ddc69f1408a915263882d5900d6c.
These identify simulation inputs, not the actual P1 model or Android recipe.

## Preservation, stop and remaining decision

All124 coordinator-protected source/config/comparator records match the initial
baseline SHAe46fa9261d714909cdde75592649c2a680f7594b5cb008da121ca708d3003fd7.
All24 P1 source rows and canonical
cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d remain exact.
Existing P0 fixtures/configs and workflow/lease are unchanged. This is a scoped
source-only check, not an old-run/private-archive or whole-machine inventory.
No private images or old large runs were scanned; one prescribed P1 source
manifest was read for the24 source checks. Coordinator snapshots were not overwritten.

`source-inventory.json` binds the15 allowed new source/fixture/report additions.
Final assigned-run inventory and exclusive `writer-stopped.json` record STOPPED,
ticket/time/handoff/source/fixture/result/check hashes and limitations. The stop
marker is the final filesystem write; commands/edits cease before ONE authorized
direct completion. Delivery is recorded by tool trace/final response, not an extra
filesystem edit. Writer does not edit PROJECT_STATE/workflow or release/renew
lease; coordinator releases it after observing this stopped return.

Generated checks cannot prove Android resources/cancellation, camera speed,
radios, actual recognition quality, process durability or release readiness.
Ownership is per controller instance; later integration must retain that owner
through UI recreation/drain and review the native adapter separately. No enrollment
or durable store is implemented. No native/phone/private-model/build/dependency/
service/cloud/Git/automation action occurred. P1 hotspot-related deferral persists.

Next action: coordinator independently audits this stopped P2-01 source/output/
preservation evidence. P2-02 and native camera work require their later dispatch;
this handoff does not self-accept or authorize either.
