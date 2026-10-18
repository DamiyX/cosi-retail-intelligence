# P2-02 C1 — preserve observed partial trial evidence

2026-10-14. P202-A1 corrected and writer verification complete. Independent
acceptance remains pending. Same sole writer01a1051f-0777-7573-ad09-0e550a4bd56a,
existing `plan/m8-unified-scanner`, HEAD66ea3fc22595a48d7355d1729bb879496cc98896.
Scope: PHONE_P2_02_C1_CORRECTIONS_20261014.md, audit and original P2-02 contract.
No P2-03. Evidence paths below are relative to the exclusively assigned new root
`apps/recognition-lab/runs/phone-experiment/p2-generated-02-c1-20261014-a1`.

## Correction and exact scope

`resumeInterrupted` replaced a pending trial's existing DRAINING record with an
INTERRUPTED record containing frames:[], erasing observed attempts and vectors.
The correction takes frames from the existing cloned trial record, or [] when no
record exists, and hashes the interrupted record with those unchanged observations.
Pending frame dispositions/null completion times remain unchanged. It invokes no
query work, recapture, model or new admission. The trial remains interrupted and
incomplete; this generated classification does not establish native worker drain.

Four authorized existing files changed:

- `src/phoneCapture/enrollment.ts`: one new observation lookup and frames:observed
  in the TRIAL recovery body; every other byte is unchanged.
- `__tests__/phoneCaptureEnrollment.test.ts`: four regression cases, their type
  import and exact C1 root literal. All original16 test bodies/assertions are exact.
- `src/phoneCapture/cli.ts`: only destinationRoot's exact C1 literal.
- `src/phoneCapture/store.ts`: only checkedScope's exact C1 basename literal.

There are no migrations/dependencies/config changes. The generator, accepted
session/35-case test, old evaluator/math and13 fixtures are unchanged. New handoff,
helpers, shadows, generated stores, logs and snapshots remain inside assigned scope.
`delta-and-preservation.json` proves the exact four-file mutation ceiling.

Enrollment source before SHA
`070512c0afc182cbba281bd1a5d1be15295b45cd4270ead3bfcc6bb10b843a9c`;
after SHA `1c3f24b6c5a43869c87cd9277cba1e2e0f3212349e6533934a47f76f64f1bd0a`.

## Failure before and success after

The independent helper was copied byte-exact (SHA
`d7e9938da7743e29df787c6a5902703f0698e8fa758b058640fee2ca5f578ae0`).
Before/after copies change only scope/store/output paths, with normalization checks
in `helper-bindings.json` and the delta verifier. The original assertions, vectors,
clocks, frames and actual-source imports are preserved. The old basename needed
before correction exists only inside this new C1 nested shadow, never in the actual
old run. Both helpers persist and reopen real disposable generated JSON state.

| Check | Before | After |
| --- | --- | --- |
| Exact independent case: one USABLE[1,0] 0-to100ms frame and one PENDING request/capture400ms frame | exit1; frames2-to0, usable1-to0 | exit0; frames2-to2, usable1-to1 |
| Four new persisted recovery regressions | 4 failed/16 skipped, exit1, 6.54s | All4 pass within current20 suite |

`independent-before.ts/json/log` and `independent-after.ts/json/log` retain complete
records, reports and actual checkpoint directories. The corrected row is
INTERRUPTED, complete=false, attempted2, missing1, attemptDenominator3. The pending
frame's completion remains null; no unobserved vector or completion is invented.

Regression cases persist schema-valid records with usable+pending, two usable+
pending, failure+pending and late-observation+pending frames. They assert every
frame/ID/timing/value/failure fact remains exact; completed earlier records and
frozen revision bytes remain exact; one classification event adds no admission;
declared2/8/6 trial/arm/attempt denominators remain. Actual read/reopen is idempotent,
explicit duplicate classification refuses without writes and the interrupted
trial cannot be admitted again. The original empty-marker recovery case remains
unchanged and passes. These are authored generated record controls, not physical
capture or native scheduling observations.

## Commands actually run

Installed Node24 executable:
`C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe`.
Existing Python: `apps/recognition-lab/runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe -B`.
No installation or network access was required.

| Verification | Result | Evidence |
| --- | --- | --- |
| Actual independent helper before / after | exit1 / exit0, exact oracle preserved | `independent-{before,after}.log/json`, `helper-bindings.json` |
| New regressions before repair in exact24-file shadow | 4 fail/16 skip, exit1 | `regression-before.log`, `shadow-before-sources.json` |
| Current enrollment source, `jest --config jest.config.cjs --runInBand __tests__/phoneCaptureEnrollment.test.ts --modulePathIgnorePatterns 'runs/'`, lab cwd | 20/20 pass, 1 suite, 21.885s, exit0 | `enrollment-actual-source.log` |
| Current accepted session source/test in exact24-file after shadow, `jest --config <shadow-after>/jest.config.cjs --runInBand phoneCaptureSession.test.ts --testNamePattern '^(?!actual CLI retains).*'` | 34 pass/1 explicitly skipped, 4.514s, exit0 | `session-functional-after.log`, `shadow-after-sources.json` |
| Lab `tsc --noEmit -p apps/recognition-lab/tsconfig.json`, checkout cwd | exit0 | `types.log` |
| Lab `eslint . --max-warnings=0`, lab cwd | exit0, zero warnings | `lint.log` |
| Actual sequential current CLI `python -B cli-journeys-c1.py`, lab cwd | 35 expected exits/assertions pass, driver exit0 | `cli-results-c1.json`, `cli-journeys-c1.log`, `cli-c1-command-*.json` |
| Exact scoped deltas / frozen evidence / P1 canonical source | exit0 | `delta-and-preservation.json` |

The old35th session test expects a historical CLI output root. Only that named
destination-specific case was excluded, explicitly as allowed by the correction
packet. The unchanged34 functional cases ran against exact current copies.
Current CLI integration is verified by the original enrollment CLI case and35
standalone actual CLI commands. No old test was edited or executed into a frozen
root. Historical pre-extension35-suite results are not represented as a current
35-case pass. Assertions/config/timeouts/deadlines were not weakened.

Standalone journeys include partial setup, read-only reopen, explicit resume
without committed-slot recapture, prefreeze replacement, freeze before queries,
complete scan, postfreeze new revision preserving old records, retained FAILED /
COMPLETE /INTERRUPTED rows with3/12/9 denominators, exact malformed/binding/path/
overwrite refusals and legacy complete0/cancelled2/late2/stale2/malformed1.
Two distinct complete stores produce identical report and source-manifest bytes;
receipt store/destination/time are declared exclusions. Final report SHA
`4dc3c8fda3718864b448d6c53d0fdd232f68838fbfc96b6753295213fc64f45b`;
20-row runtime source manifest SHA
`6f52611fb12432589a59034e8d67211ea7e60b3161509a7c09e078212fa9c19a`.
The changed four source hashes are bound truthfully; model/recipe/fixtures are exact.

## Retained operational failure and limitations

The full current20 suite in the exact after shadow first returned exit1:
19 passed/1 CLI failure, 12.173s. Its resume encountered Windows EPERM renaming
the staged checkpoint over state.json. `enrollment-after.log` and
`shadow-operational-failure.json` retain the diagnostic and staged/old-valid
generated state. This was the previously observed publication refusal path;
no source/timeout/assertion change or automatic retry was added. The four recovery
regressions passed there. A separate bounded verification against actual current
source and the newly assigned C1 root then passed all20 unchanged assertions.
No repeated retry-until-green or deletion of failed evidence occurred.

Windows publication can still refuse operationally. Existing dead-process commit
locks are not automatically stolen. Generated actual file reopen and injected
faults do not prove Android process/power-loss durability, native drain/resource
ownership, camera/radio behavior or recognition quality/UNKNOWN/holdout/M12/release.
No private pixels, model inference, mobile/native change, phone/ADB/radio,
build/install/dependency/download/service/Git/cloud/automation effects occurred.
P1 remains founder-deferred for hotspot connectivity. The deferred fallback-label
cleanup remains outside scope.

## Preservation and stopped return

147-row current source baseline verified before edits;143 unchanged and only the
four exact allowed deltas afterward. Original writer579 indexed entries plus its
inventory/stop remain exact (581 total); independent134 plus frozen inventory
remain exact (135 total). Earlier generated full roots173/45/104/48 remain exact.
The known five old long-path manifests remain byte-bound to already-frozen sibling
receipts; no old inventory rewrite. Extended Windows enumeration records the three
original writer and one independent generated junction targets without following
them. Coordinator metadata is immutable; current workflow/PROJECT_STATE hashes
remain exact. P1 current24 source rows and canonical
`cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d` match.

The coordinator-owned finite lease expires2026-10-14T15:47:45.331515+00:00;
writer neither renews nor releases it. Single-use finalization rechecks protection,
snapshots exact source/test/fixtures/handoff, binds results/checks and writes an
exclusive `writer-stopped.json` LAST. On recognized STOPPED, all commands/edits
cease, followed by one founder-authorized direct coordinator return. No poststop
filesystem receipt is written. Coordinator owns lease release, PROJECT_STATE and
independent re-audit; tool delivery alone proves neither audit nor acceptance.
