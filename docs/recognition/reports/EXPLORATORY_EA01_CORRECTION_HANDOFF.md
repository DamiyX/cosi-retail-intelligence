# EA-01 correction handoff — 2026-10-04

Status: **STOPPED / HANDOFF READY for independent correction review**.
Private E05 remains **BLOCKED**. This report does not supersede the first E04
audit or authorize inference. The sole writer is chat
`01a1051f-0777-7573-ad09-0e550a4bd56a`; coordinator is
`01a098ef-d830-7531-bca7-2d66b0a5b587`. No agents or new chats were created.

Actual checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
Correction baseline/lease began about 06:29 Africa/Lagos (05:29 UTC);
implementation and checks ended about 06:44. Exact release time is retained in
the evidence folder. No commit or push was made.

## Narrow repair

The E04 probe exposed a load-stage worker fatal being flattened to forty NOT_RUN
records with zero loading/encoding durations and no cause. The parent now
retains a bounded `runFailure`: `{stage: 'load', reason: ...}` with reasons
`TIMEOUT`, `WORKER_FATAL`, `DISCONNECTED`, `OS_ERROR`, `INVALID_READY`.
New bundles explicitly set null on success. No raw exception or private path
is accepted in this strict optional/null field.

`loadMs` measures parent wall time from spawn through readiness/failure receipt;
`encodingMs` measures the image-work interval (zero when loading fails);
`attemptMs` includes loading, image work and worker termination/join cleanup.
It excludes preflight hashing, original preservation rechecks and serialization.
It is not Android performance. Validation rejects nonfinite/negative timing,
total time smaller than loading plus encoding, and global load failures without
positive load time, total time, zero encoding and forty NOT_RUN records.
Legacy bundles may omit the new fields; absent attempt time is shown as unrecorded.

Evaluator results, results.json, HTML, shared summary and both CLI summaries
retain the cause and timings. Producer and evaluator retain failure exit2,
forty records, twenty query rows, denominator20 and 0/20 scoring. CSV retains
its existing twenty-query schema. Existing ranking, thresholds, preprocessing,
path helpers, per-image timeout/crash handling and private execution gate were
not changed.

Eight existing NEW exploratory files changed:

- `tools/exploratory/producer.py`, `tools/exploratory/test_producer.py`;
- `src/exploratoryEvaluation.ts`, `src/exploratoryReport.ts`, `src/exploratoryCli.ts`;
- `__tests__/exploratory.node.ts`, `__tests__/exploratory.test.ts`;
- `apps/recognition-lab/EXPLORATORY.md`.

Paths above, except the fully qualified last item, are relative to
`apps/recognition-lab`. This handoff is the only new source document. No
dependencies, schema migrations, persistent contracts or native settings changed.

## Fresh baseline and preservation

Ignored evidence root, abbreviated `$ea` below:
`apps/recognition-lab/runs/exploratory/ea01-correction-20261004`.
`baseline.json` captured635 tracked/nonignored source files and3235 protected
ignored/external files AFTER the coordinator ledger/state/audit update.
Baseline SHA256:
`87017bfbc1134bb95cc3d90c97c92129e93a49db4992c31a82b25e998704f05f`.
`before-source/` retains original exploratory source bytes;
`status-before.txt` captures the inherited dirty checkout. Existing changes
are not attributable to this correction merely because they appear in Git status.

`delta-before-release.json` found only the eight changes above and the owned
lease. Final `delta-final.json` verifies627/635 baseline source files unchanged,
eight changed, this single handoff added, zero deletions, unchanged branch/HEAD,
and all3235 protected files unchanged, including all49 private intake files.
`source-delta.patch` contains the eight-file before/after diff.

The original E01–E03 handoff, first E04 audit, old probe bundle/logs, coordinator
temporary evidence, generated inputs, private prepared study, installed
environment, model, lock, setup and software inventory remain byte-identical.
The recognition workflow was restored from `workflow-before.raw`, preserving
all coordinator fields and exact bytes while releasing the lease. Project state
and coordinator ledgers were intentionally preserved for coordinator review.

Current source fingerprint (Python, Node and fresh bundle/result match):
`1df885b33fe752ac2c81fa9a7e4b7bfa432a9bddb1b1d63435643245831b8cb0`.
Previous source fingerprint:
`a9a2c52e24442ce5c3a4b8c00ef74eacc7fc17f1c81ad438beab4f7c1c5abf4e`.
Old bundles are not relabeled with the new fingerprint.

Unchanged model SHA256:
`bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.
Unchanged recipe SHA256:
`ac67af950aed4789c275425b93e8816cf0950f2d6bd01a199879a011b669b81a`.
Unchanged setup SHA256:
`42d15c1ff79e754adfbd82a1c2692a3130a4286eb6e03640cdde54a0e9a06616`.
Unchanged software inventory SHA256:
`3d727c07763d95c0865cd975581a3690e8bbe6718a9eb8f24dd397af6c69989e`.
Additional generated study/bundle/results hashes are in `binding-check.json`.

## Discriminator and fresh checks

Commands ran from the actual checkout using the EXISTING isolated interpreter.
For these concrete commands:

```powershell
$ea = 'apps/recognition-lab/runs/exploratory/ea01-correction-20261004'
$previous = 'apps/recognition-lab/runs/exploratory/e01-e03-20261004'
$trialPython = "$previous/venv/Scripts/python.exe"
& $trialPython "$ea/expected-cause.py" apps/recognition-lab/runs/exploratory/e04-load-failure-probe/bundle.json
& $trialPython apps/recognition-lab/tools/exploratory/test_producer.py
node --test --test-reporter=tap apps/recognition-lab/__tests__/exploratory.node.ts
npm run typecheck --workspace @retail/recognition-lab
npm run lint --workspace @retail/recognition-lab
& $trialPython "$ea/load-probe.py"
& $trialPython "$ea/expected-cause.py" "$ea/fatal-producer/bundle.json"
node apps/recognition-lab/src/exploratoryCli.ts --study "$previous/generated/study.json" --root "$previous/generated" --bundle "$ea/fatal-producer/bundle.json" --setup "$previous/setup.json" --out "$ea/fatal-report" --run-id ea01-load-failure
npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/metrics.test.ts __tests__/retrievalOutput.test.ts
npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/exploratory.test.ts
& $trialPython "$ea/verify-preservation.py" delta-final.json
```

The producer probe/report commands require fresh output directories and must
not be rerun into these retained outputs.

| Check | Result | Evidence |
| --- | --- | --- |
| Same cause/timing assertion against old E04 bundle | expected exit1, missing load-stage cause | `before-discriminator.log` |
| Python generated-only suite | exit0;14 total,13 pass,1 host symlink privilege1314 skip;15.099s | `python-tests.log` |
| Actual spawned controls | success, fatal, deadline, disconnect, invalid readiness pass;40 rows;positive loading/attempt | Python suite |
| OS error boundary injection | bounded OS_ERROR;no injected private text | Python suite |
| Existing image timeout/crash and decode controls | pass unchanged | Python suite |
| Actual Node ESM suite | exit0;13 pass,0 fail/skips;8677.9223ms | `node-tests.log` |
| Lab typecheck | exit0 | `typecheck.log` |
| Lab zero-warning lint | exit0 after test-style correction | `lint-corrected.log` |
| Real reviewed model load, empty worklist | exit0;null failure;0 images/inference | `load-probe.log` |
| Fresh generated fatal producer bundle | function exit2,40 NOT_RUN,0 vectors;probe assertions exit0 | `load-probe.log`, `fatal-producer/bundle.json` |
| Same cause/timing assertion against fresh bundle | exit0 | `after-discriminator.log` |
| Actual fresh CLI report | exit2;load/WORKER_FATAL;0/20 scored;cause/timings in results/HTML/summary | `failure-report.log`, `fatal-report/` |
| Existing metrics/report/path regressions | exit0;30 pass in2 suites;64.664s | `jest-regressions-corrected.log` |
| Clean Jest exploratory subprocess wrapper | exit0;1 wrapper pass executes13 Node cases;6.813s | `jest-wrapper-corrected.log` |
| Binding and byte preservation | match;networkReviewed false;zero protected changes | binding/preservation JSON/logs |

Real model load-only measured2503.415ms load,0.002ms empty collection interval,
2528.437ms total. Fresh fatal bundle measured756.591ms load,0ms encoding,
773.744ms total. These are single laptop observations, not benchmarks.

Retained correction mistakes: `lint.log` exit1 for new test `Array<T>` style;
corrected to `T[]`. `jest-targeted.log` exit1 because two guessed test filenames
did not exist; its exploratory wrapper passed, then the actual existing30 cases
and clean wrapper passed separately. `binding-check.log` exit1 from Windows
default cp1252 while building a diagnostic diff; corrected diagnostic uses
explicit UTF-8 in `binding-check-corrected.log`. A read-only inspection also
requested a nonexistent nested before-source path; snapshots are flat filenames.
No failed output/log was overwritten and no private experiment was retried.
The previous full511-case suite is historical evidence; no full-suite repetition
or new forty-image model inference was needed for this load-reporting correction.

## Boundaries and next action

**Native-egress remains unresolved; `networkReviewed:false`.** No private image
decode/inference, E05 execution, approval artifact, model substitution, network
investigation, installation, service, firewall/global configuration or protected
ranking/path/test/threshold change occurred. Private files were only hashed for
preservation. HTML content was asserted/read; browser rendering remains
unverified after the earlier file-protocol rejection, without a workaround.

This is implementer evidence, not independent acceptance or production readiness.
The coordinator should review the narrow diff, discriminating old/fresh bundles
and retained checks. Keep E05 paused while exact-runtime native-egress evidence
is unresolved; source closure alone cannot authorize private inference. Writer
lease is released, source work is stopped, and exactly one completion report is
sent to the authorized coordinator chat.
