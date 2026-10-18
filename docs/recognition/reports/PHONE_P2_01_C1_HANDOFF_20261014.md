# P2-01 C1 stopped correction handoff

2026-10-14, Africa/Lagos. Same sole writer01a1051f-0777-7573-ad09-0e550a4bd56a,
checkout `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`, inspected HEAD66ea3fc22595a48d7355d1729bb879496cc98896.
P2-01 C1 only; self-checks pass, independent acceptance remains pending.
Read PHONE_P2_01_INDEPENDENT_AUDIT and C1_CORRECTIONS with this handoff.

## Exact behavioral correction

Existing mutations are exactly `src/phoneCapture/session.ts`,
`__tests__/phoneCaptureSession.test.ts` and the one assigned-root literal in
`src/phoneCapture/cli.ts`, all under apps/recognition-lab. Generator/ten old JSON
fixtures/P0/P1/config/packages and old handoff remain exact. C1 adds this report
and new exclusive evidence in `runs/phone-experiment/p2-generated-01-c1-20261014-a1`.
No P2-02/enrollment/native/phone scope or fallback-label repair was added.

A1: request reserves sole admission before calling the external factory. Nested
request/Start cannot append another frame, create a second resource or replace
the owner. `creationPending` explicitly distinguishes an unresolved factory
reservation from a returned resource. Factory time is observed before begin.
Cancel/deadline during creation invalidates the session and blocks replacement.
Returned resources get completion callbacks, then cancellation is signalled once
if still needed; synchronous completion may already establish drain. No vector
is published from the invalidated session, and no release is invented before
matching completion. A factory throw clears only its unstarted, no-returned-resource
reservation, with CREATE_ERROR and releaseAttempts0/released:false; this is not
physical resource-release evidence. A returned/begun resource remains owned
through start/release errors until actual confirmed drain, under the adapter contract.

A2: a valid current permission:false/offline:false observation is processed
before the busy admission return. Permission loss terminalizes FAILED with
PERMISSION_DENIED; offline loss terminalizes CANCELLED. Publication is invalidated,
earlier usable frames remain, cancellation is attempted once and ownership persists
until completion/release. ready:false alone is readiness, not invalidation.
The cancellation latch is set before external code; callbacks may synchronously
drain and start a new session. The old helper retains its owner reference and
cannot clear/cancel the new owner, including when the old cancel call later throws.
Malformed gate shapes refuse; the generated schema is unchanged.

One job/queue0/max3/400ms/strict3000ms, monotonic binding, event/session caps,
duplicate/stale rejection, scoring and generated labels are preserved. The
deferred LOW planned-single-frame/fallback presentation note remains unchanged.

## Exact before/after evidence

Before source SHA256
`4b37169336aeb0b637f0456126712ad359a3a1468ec63a3aa478efc7a25dc046`.
Current corrected source SHA256
`0837eb623066e364079e78a48fddfa6a3d5ca2df83e8f078af1d064659016255`.

The independent harness was copied byte-exact into C1; SHA256
`918ef5043d62d77c6f4b3057a8e6c2ff36e0e89c6eab106e09b8a54532bd2c76`.
Direct before execution exit1: A1 false, A2 false, positive synchronous control
true. `ownership-challenges.json` is byte-identical to the independent audit's
original JSON, and `ownership-before.log` retains actual exit/summary trace.
No original frozen helper was rerun or overwritten.

After execution uses the same unchanged harness/control flow/import of actual
session.ts. `ownership-after-run.ts` redirects only its one fs.writeFileSync
output to a NEW exclusive `ownership-challenges-after.json`, preserving flag wx.
It changes no assertion, clock, vector, scenario or callback. Exit0: all three
challenge/control rows true; full states and `ownership-after.log` are retained.

Focused before regressions:3 FAIL/32 skipped (`jest-before-a1.log`), exposing
factory re-entry and both busy offline/permission-loss observations. Final35
cases/one suite PASS,15.011s, exit0 (`jest-after-a1.log`): all24 original bodies
byte-exact after undoing only the root literal, plus11 new regressions. Cases
cover nested factory admission/Start,2999/3000/3001 factory crossing, cancellation
and deadline poll during reservation, factory throw after cancellation, duplicate
safety observations, retained earlier frames, callback races starting a newer
owner, readiness-only behavior and the existing synchronous/drain/error/cap suite.
No assertion/timeout/config weakening or retry-until-green/broad test sweep.

Actual-source lab typecheck and whole-lab zero-warning lint exit0, empty logs
(`typecheck-a1.log`, `lint-a1.log`). Installed Node24.21.0 only:

```powershell
# cwd: apps/recognition-lab
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' '../../node_modules/jest/bin/jest.js' --config jest.config.cjs --runInBand __tests__/phoneCaptureSession.test.ts
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' '../../node_modules/eslint/bin/eslint.js' . --max-warnings=0
# cwd: repository root
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' 'node_modules/typescript/bin/tsc' --noEmit -p apps/recognition-lab/tsconfig.json
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' 'apps/recognition-lab/runs/phone-experiment/p2-generated-01-c1-20261014-a1/ownership-challenges.ts'
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' 'apps/recognition-lab/runs/phone-experiment/p2-generated-01-c1-20261014-a1/ownership-after-run.ts'
```

## Actual C1 CLI and bindings

`cli-results.json` records11 exact command arrays/cwd/exits/output paths/hashes;
separate stdout/stderr logs remain. All destinations are NEW in C1. Complete
cli-complete-a1/a2 exit0; cancelled/late/stale/never-finishing/failed/not-ready/
permission/offline-loss exit2 with retained incomplete reports; malformed exit1
with no destination created. Never-finishing stays DRAINING/owned; stale retains
two trials/eight arms and incomplete overall despite newer session COMPLETE.
Four arms and all scheduled slots remain; no score/truth-informed selection.
Actual Jest CLI checks also prove overwrite and traversal/absolute-path refusal.

Example actual invocation from lab cwd:

```powershell
& 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe' 'src/phoneCapture/cli.ts' --scenario complete --out cli-complete-a1
```

Each valid leaf contains report/source-manifest/receipt JSON. Complete report
and source manifest match byte-exact across a1/a2; only receipt destination/
createdUtc are excluded. Complete report SHA256
`d75ec6ab6ecf51bfb7be33cf25a51d28a8a5234fa3f67111f4b95d0685337465`.
C1 runtime source/fixture/reused-math manifest15 rows SHA256
`c689cccf9dd053af877ddc8fcefa0aa8391a42501b40b372edb344610d9972fa`.
Fake model/recipe are unchanged from P2-01; no actual P1 model/inference binding.
All reports remain GENERATED_SESSION_SIMULATION/nativeValidated:false/autoAccept:false.

## Preservation and stop

Original writer171 indexed files plus its excluded inventory/stop records
(173 total) match, with no additions. Independent44 indexed files plus its
frozen inventory (45 total) match, with no additions. Original source snapshots
retain before bytes. All124 protected source/config/comparator rows, all24 P1
source rows and canonical cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d
remain exact. Generator/ten fixtures/old report and coordinator immutable metadata
are unchanged. `preservation-and-bindings.json` and `source-diffs.json` show exact
three-file delta, literal-only CLI and preserved original test bodies.

New C1 source snapshots/final inventory and exclusive writer-stopped.json bind
handoff, actual checks/failure logs/results/source/fixtures and STOPPED time.
Freeze is single-use; marker is the last filesystem write. All commands/edits
stop on recognized completion, then ONE founder-authorized direct return is sent.
No post-stop filesystem receipt is written. Coordinator owns release of the
unchanged finite lease/workflow; writer did not edit/renew them or PROJECT_STATE.
Tool receipt proves delivery, not automatic parent audit/wakeup or acceptance.

No private images/old large private runs/model/native/phone/radio/build/install/
dependency/download/service/cloud/Git mutation/automation action. These are
generated controller checks, not physical resource/cancellation/camera speed/
radio/recognition-quality/durability/privacy/UNKNOWN/M12 or release proof.
Adapter work outside the returned Resource protocol remains a later native
contract/review responsibility. P1 stays deferred for hotspot connectivity.
Next action: coordinator independently verifies stopped C1 counterexamples,
exact scope/preservation/bindings, then decides P2-01 acceptance. P2-02/native
work requires later explicit dispatch.
