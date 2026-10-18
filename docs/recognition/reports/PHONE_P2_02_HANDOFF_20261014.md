# P2-02 generated enrollment and recovery handoff

2026-10-14. Sole writer `01a1051f-0777-7573-ad09-0e550a4bd56a` on the existing
`plan/m8-unified-scanner` checkout, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
Generated implementation and writer verification complete; independent acceptance
is pending. This is generated preparation only. P2-03 has not started.

Authority: founder continuation and same-agent choice, coordinator dispatch in
`PHONE_P2_02_DISPATCH_20261014.md`, and shared/P2-02 scope in
`../PHONE_P2_TICKETS_20261014.md`. The immutable same-agent resume record supplies
the active lease through `2026-10-14T14:53:29.518861+00:00`; older preliminary
expiry/hold records remain preserved. The writer did not renew/release the lease,
edit the workflow or update PROJECT_STATE. Coordinator owns those actions after
observing the actual STOPPED return.

All evidence below is relative to the exclusively assigned ignored root:
`apps/recognition-lab/runs/phone-experiment/p2-generated-02-20261014-a1`.
No previous evidence destination was used for a new execution.

## Implemented scope

New files:

- `apps/recognition-lab/src/phoneCapture/enrollment.ts`: strict generated domain
  state, ordered references, explicit resume, replacement history, immutable
  gallery/trial revisions, completed/interrupted trial records and validation.
- `apps/recognition-lab/src/phoneCapture/store.ts`: Node-only disposable JSON
  checkpoint publication, bounded input, checksums, scoped paths and commit lock.
- `apps/recognition-lab/__tests__/phoneCaptureEnrollment.test.ts`: 16 meaningful
  generated persistence, race, corruption, alias, cap and current CLI cases.
- `apps/recognition-lab/fixtures/phone-capture-enrollment/{normal,retained,malformed}.json`:
  authored fake vectors and rejection control; no real/private input.
- This handoff. New scripts, logs, snapshots and receipts are inside the assigned
  ignored run only. There are no migrations or new dependencies.

Only accepted `src/phoneCapture/cli.ts` and `generated.ts` were extended. The CLI
uses the exact new root and adds `--enrollment setup|reopen|resume|replace|freeze|scan
--fixture normal|retained|malformed --store store-LEAF --out cli-LEAF`.
The original `--scenario` path remains exercised. Enrollment evaluation reuses the
accepted simulator, parser, math and limits; the accepted generated code is exact
after removing the new top type import and appended extension (one separating
blank line). `session.ts` and the original 35-case test are byte unchanged.

Reference order is front, rear, complementary1, complementary2. The two-view arm
uses exactly the first two of the same four references. Missing slots prevent
freeze. Reference markers are saved before work; reopened markers are classified
without writing or silently resuming. Explicit resume uses a new reference token,
rejects the stale one, and fills only missing slots. Prefreeze replacement records
both old/new references and their hashes. Postfreeze replacement forks a new draft
and gallery revision; old galleries, trial schedules and completed records remain
immutable. Freeze binds source/model/recipe/fixture, all references and each
declared query-input hash before query results. Truth is evaluator metadata;
selection/controller calls do not receive known/unknown truth.

An interrupted generated trial has no query work invoked. Actual reopen reports
it as interrupted; explicit resume commits a zero-frame INTERRUPTED record rather
than recapturing or dropping the row. Failed, interrupted and not-run rows keep
their scheduled three-attempt and four-arm denominators. Auto-accept remains false.

The store enforces 10 products / 40 ordered slots / 25 total declared trials /
75 query attempts / 4096 events, 4 MiB checkpoints and at most four retained staged
files. Roots are validated disposable `store-*` directories under the assigned
scope; traversal, junction/symlink aliases, hardlinks, unsupported kinds/versions,
corruption, ownership, hash and binding mismatches refuse readiness. Unknown files
are preserved and cause refusal. Recovery reads are idempotent.

Publication uses an exclusive nonce/pid commit lock, exclusive staged file,
fsync/checksum/exact-byte validation and rename over state.json. The checkpoint is
read and its version/body rechecked under the lock, closing the reproduced window
where another writer committed after the optimistic read but before lock
acquisition. Publication then rechecks staged/current bytes. Only the invocation's
unchanged lock is removed; failed stage evidence remains and is never automatically
published. A leftover dead-process lock is not stolen automatically.

## Commands and results actually checked

Installed Node: `C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe`.
Python tools use the existing `runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe -B`.
No installation, download, build, services or network operation was needed.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Exact accepted session source/test shadow; original Jest config, `--runInBand phoneCaptureSession.test.ts` | 35/35 pass, 1 suite, 10.102s, exit0 | `accepted-session-shadow-jest-a1.log`, `accepted-shadow-source.json` |
| Current focused Jest, `--config jest.config.cjs --runInBand __tests__/phoneCaptureEnrollment.test.ts --modulePathIgnorePatterns 'runs/'`, lab cwd, sequential final run | 16/16 pass, 1 suite, 26.301s, exit0 | `enrollment-jest-a8-serial.log` |
| `node node_modules/typescript/bin/tsc --noEmit -p apps/recognition-lab/tsconfig.json`, checkout cwd | exit0 | `typecheck-a3.log` |
| `node ../../node_modules/eslint/bin/eslint.js . --max-warnings=0`, lab cwd | exit0, zero warnings | `lint-a3.log` |
| Actual sequential CLI journeys, `python -B cli-journeys-a7.py`, lab cwd | All35 command exits and assertions match, driver exit0 | `cli-results-a7.json`, `cli-journeys-a7.log`, 35 individual `cli-a7-command-*.json` receipts |
| Current source, frozen records, shadow and coordinator preservation | 138/140 baseline source rows exact; only the two permitted extensions changed; all protected records match | `preservation-a9.json`, `preservation-a9.log` |
| Current P1 source vs canonical C2 replay source pin | 24/24 rows exact, canonical SHA exact, exit0 | `p1-source-check.json` |

The accepted 35-case test hardcodes the frozen C1 output root. It was executed
only in an exact 18-file pre-extension source/test/fixture/config shadow under
this new run; the derived C1 output directory is inside that shadow. It did not
execute against the actual frozen C1 root. Thus its CLI portion checks exact
accepted pre-extension behavior. The 16-case suite and actual CLI receipts check
the current extensions. The `runs/` module ignore flag prevents Haste discovering
the evidence shadow's duplicate package; no config, assertion, deadline or timeout
was relaxed. No mobile/root sweep or physical test is claimed.

Coverage includes actual file reopen, old-valid/new-valid publication at four
injected fault boundaries, injected write/rename failures and tampered stage
bytes, lock reentry/stale writes, actual Windows junction/hardlink rejection,
sentinel user-file preservation, missing-slot freeze refusal, replacement history
and frozen byte identities, strict malformed/source/model/recipe/fixture/version/
oversize rejection, positive 10/40/25/75 caps and excess/event caps, truth separation,
retained interrupted rows, overwrite-before-mutation and accepted deadline behavior.

The standalone normal journeys persist partial enrollment, reopen without changes,
explicitly resume without recapturing committed slots, replace before freeze,
freeze a schedule before results, scan and reopen. Two independent stores produce
byte-identical report/source manifests. Their reports are
`cli-a7-a7-normal-one-06-scan/report.json` and
`cli-a7-a7-normal-two-14-scan/report.json`. Receipt path/store/time are the only
declared determinism exclusions. Report SHA:
`83e4fe832f4adf7a11b44c19e553cf4a1904a749c12fc81a79d710bfefc1170c`.

`cli-a7-revision-two-{replace,freeze,scan}` exercises postfreeze replacement and
a second immutable revision; original gallery and two original completed records
remain exact. The retained fixture preserves FAILED, COMPLETE and INTERRUPTED
rows with denominators3 trials /12 arms /9 scheduled attempts and zero interrupted
frames. Actual malformed/binding/path/overwrite refusals and legacy complete0 /
cancelled2 /late2 /stale2 /malformed1 are recorded. Legacy complete still ranks
`a,a,b,a` in the four arms.

## Failures retained and their implications

`enrollment-jest-a1.log`: 15/15 passed before the stale-write regression; initial
Haste duplicate-package warning retained. `lint-a1.log`: exit1 for the new import
being below declarations; moving that import to the top corrected it.
`store-version-before-a2.log`: the new race regression failed before correction
(1 failure /15 skipped, exit1); the under-lock version recheck makes it pass.

`enrollment-jest-a3.log`: 15 passed /1 CLI failed, exit1. The actual failure was
Windows EPERM replacing state.json during resume, not the version oracle. Its
diagnostic and staged file remain. The retained state was old-valid sequence11,
with no active marker and incomplete enrollment; reopening correctly returned2,
interrupted=false and readyGallery=false without changes. Explicit resume in
`cli-results-a5.json` commands1/2 preserved every previously committed reference.
The final strict suite was run once sequentially after this diagnosed operational
failure; all16 passed. No retry or delay was added to the store. Windows publication
failure remains an operational refusal path, not a promised durability guarantee.

Standalone verification scripts also failed on harness assumptions: a4 expected an
interruption marker for that EPERM checkpoint even though work had not been admitted;
a5 reused a reopen output name; a6 reconstructed the scan destination without its
sequence number, so the intended overwrite probe instead legitimately performed
a postfreeze replacement in its separate store. Those scripts, outputs and logs
remain. The a7 harness uses returned actual destinations and distinct outputs and
passes all35 expected exits. Source behavior/assertions were not changed for them.

The first preservation pass hit Windows path-length handling. Extended-length
read-only enumeration exposed five old C1 independent shadow source manifests
omitted by the preliminary43-file baseline. All43 baselined files match; each of
the five manifests matches the sourceSha256 in its already-baselined frozen
receipt (`c689cccf9dd053af877ddc8fcefa0aa8391a42501b40b372edb344610d9972fa`).
The full48-file set equals baseline plus those receipt-declared manifests.
No old inventory or artifact was rewritten. `preservation-a8.log` retains the
initial mismatch; a9 explicitly records this closure instead of hiding it.

## Bindings, preservation and stop

Final runtime manifest has20 rows and SHA
`974234dbbc0235d86250408b6519fb53a4c9df0def68ae0fa72951a613765e06`.
Normal fixture SHA `6c18bbbdeffcb15fa04d2aa9532373dfeba981249b6c251b6447542eaf6370db`;
fake model SHA `0528fbd83cfb2aebc7e6e679b356a8c569e46237da341d4001e68f6c308b0d3a`;
fake recipe SHA `ba9dd135f6cc70991ac2548e18761dcf3141ddc69f1408a915263882d5900d6c`.
All source and three fixture hashes are in that manifest; exact final changed/new
source snapshots and this handoff are bound by `source-inventory.json` and the
final inventory/stop marker.

Accepted session SHA remains
`0837eb623066e364079e78a48fddfa6a3d5ca2df83e8f078af1d064659016255`;
accepted35 test SHA remains
`547e9ec56b3026f8ac32cf38ac987b94c83c2660fd11d60287f87367e73e8ade`.
Canonical P1 SHA remains
`cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d`.
Prior roots retain173/45/104 baselined files exactly, and the C1 independent root
has43 exact baselined files plus the five receipt-bound manifests. All11 coordinator
metadata records, exact workflow/lease and18 accepted shadow copies match.
PROJECT_STATE was not written by this writer; its current hash is recorded.

Single-use finalization rechecks protection and the live lease, snapshots source,
binds checks/results and writes the exclusive `writer-stopped.json` LAST. All
commands/edits stop on recognized completion. Then one founder-authorized direct
return is sent to coordinator `01a098ef-d830-7531-bca7-2d66b0a5b587`; no poststop
filesystem receipt is written. Delivery proves receipt, not audit execution or
independent acceptance.

No private pixels, image imports, inference model/runtime, Android/mobile/native
effect, phone/ADB, camera/radio, build/install/dependency/download/service, Git
mutation, cloud or automation action occurred. Actual disposable file reopen and
injected publication faults do not prove Android process/power-loss durability,
physical drain/resource ownership, camera geometry/speed, radio behavior or
recognition-quality/UNKNOWN/holdout/M12/release acceptance. P1 remains founder-
deferred for hotspot connectivity. Deferred V21/V41 fallback-label cleanup was
not changed. Next action: coordinator independently verifies stopped P2-02 scope,
the reproduced version race, current CLI and preservation, then decides acceptance.
