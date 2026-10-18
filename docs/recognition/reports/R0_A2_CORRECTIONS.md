# R0 A2 metric corrections — stopped review handoff

2026-10-02, Africa/Lagos. **SYNTHETIC TOOLING-ONLY — NOT RECOGNITION ACCURACY.**
R0-A2-01/02 implemented and self-checked; independent review and R0 acceptance
remain pending. No R1 or new milestone started.

Founder resumed implementer chat01a0fa25-d216-75f0-ab21-40d7b06ccef7 under the
existing Sol6.1 HIGH assignment. No delegation/model/effort switch occurred.
Coordinator01a098ef-d830-7531-bca7-2d66b0a5b587 owns independent review. Implementer
stops commands/edits before the one authorized completion notification.

## Scope and preserved source

Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch `plan/m8-unified-scanner`; HEAD unchanged:
`66ea3fc22595a48d7355d1729bb879496cc98896`. Pending work remains uncommitted.
All correction edits and successful repository checks use this checkout. One
read-only inspection after resume used the default non-checkout directory and
failed to find files; it performed no mutation. No commit/push/merge/reset/rebase,
installation, phone/adb/Metro/Docker, cloud/backend/model/build or spending action.

Correction surface (relative to the stopped pre-correction working tree):

- `apps/recognition-lab/src/metrics.ts`: calculation and report definitions.
- `apps/recognition-lab/__tests__/metricCorrections.test.ts`: eight new regressions.
- `apps/recognition-lab/__tests__/metrics.test.ts`: renamed metric and label coverage expectations.
- `apps/recognition-lab/README.md`: explicit denominators, missing labels and simulated policy.
- `docs/recognition/reports/R0_BENCHMARK.md`: historical supersession notice only.
- This new handoff, `docs/recognition/TRACK_B_PLAN.md`, `TRACK_B_R0_TICKETS.md`,
  `.agents/workflows/recognition-track-b.json` and `docs/engineering/PROJECT_STATE.md`:
  factual current status/evidence. Historical audit records retained.

No ranking/threshold/config/schema/import/experiment/CLI/runtime changes. No
package/dependency/lockfile/environment-script changes in this correction.
`git diff --name-only -- apps/mobile packages supabase` returns no paths.
Root M8 tickets and other pending coordinator/native changes are preserved.
Pre-correction SHA256 checks confirm audit reports/repro, ranking, schema, CLI,
experiment, fixtures/configs, root package files and environment script unchanged.

Historical `R0_REAUDIT_REPRO.mjs` remains byte-exact SHA256:
`f8bbdd08ab3b5c33ecf901fbbe70f5fdf750d93019b387eb28cf2e350de1ea2c`.
It was executed before repair and exited0, reproducing both defects through the
actual importer/experiment. It asserts old bugs and is intentionally not a green
acceptance test after repair. Neither audit report was rewritten.

## Corrected definitions

**R0-A2-01:** joint correctness requires a non-null ground-truth package plus
correct product and package. `strongJointPrecision` is joint-correct labelled
STRONG outcomes divided by all package-labelled STRONG outcomes. Labelled wrong
products and unknown false positives stay in that denominator. All-unlabelled
STRONG populations yield0/0, null/N/A; adding unlabelled correct products cannot
dilute labelled package errors. Product precision still evaluates every STRONG.

`packageLabels` exposes labelled/missing counts for all, known and STRONG queries.
`packageLabelCoverage` is labelled/all queries; `strongJointLabelCoverage` is
labelled STRONG/all STRONG. Empty denominators use null/N/A. Missing truth is
neither package-correct nor automatically package-wrong in confusion cases;
wrong products are still reported. Existing labelled package retrieval/claim
metrics retain their definitions.

**R0-A2-02:** removed `knownTop3ShownRecovery`; retained raw
`knownProductTop3Retrieval`. New `knownSimulatedDisplayRecovery` records policy
`strong-primary-ambiguous-top3-v1`: STRONG exposes only its primary product,
AMBIGUOUS exposes top-three distinct products, UNKNOWN/FAILURE expose none.
Numerator is known queries recovered under this policy; denominator is all known
queries, including failures. Policy and limitation are included in machine and
readable reports. **No rendered UI or actual user recovery was measured.**
Wrong STRONG primary with truth second/third therefore has raw top3=1/1 and
simulated recovery=0/1; the same ranking as AMBIGUOUS has simulated recovery=1/1.
Ranking itself and production UI are unchanged.

## Fresh evidence

All commands below run from the approved checkout root with existing dependencies.
Node24.21.0, npm11.19.0; lab compiler TypeScript6.0.3; Jest29.7.0/ESLint9.39.5.

| Check | Actual result |
| --- | --- |
| `npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/metricCorrections.test.ts` before repair | All8 tests failed,5.855s; npm test exit1. Ignored log: runs/verification/a2-before-correction.log. |
| `npm test --workspace @retail/recognition-lab` after repair |59 tests/six suites passed,30.96s; exit0. CLI suite exercises executable repeatability/exit codes. |
| `npm run typecheck --workspace @retail/recognition-lab` | Exit0. |
| `npm run lint --workspace @retail/recognition-lab` | Exit0, zero-warning mode. |
| Fresh CLI integrity / calibration sweep | Exit0 / exit0;20 assets, two configs, explicit choice0. |
| Fresh Node development / frozen holdout | Exit2 / exit2; complete reports with deliberate ADAPTER_ERROR / TIMEOUT. |
| Generated development, both calibration configs and holdout JSON/summary assertions | Exit0; new metric/policy/labels present, old metric absent, expected counts/failures retained. |
| `git diff --check` | Exit0; existing CRLF-normalization warnings only. |

The npm fixture wrapper prints child code2 as a lifecycle error; explicit
`$LASTEXITCODE` capture on direct Node development/holdout confirms2 for both.
Ignored run outputs are under `apps/recognition-lab/runs/a2-correction/`; direct
CLI logs under `runs/verification/a2-development.log` and `a2-holdout.log`.
Generated provenance fingerprints represent their run snapshots; later handoff
documentation changes the working-tree fingerprint.

Reproduce integrity, calibration and runs:

```powershell
node apps/recognition-lab/src/cli.ts validate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --out apps/recognition-lab/runs/a2-correction/integrity
node apps/recognition-lab/src/cli.ts sweep --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split calibration --configs apps/recognition-lab/fixtures/configs.json --choose 0 --out apps/recognition-lab/runs/a2-correction/calibration
node apps/recognition-lab/src/cli.ts run --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split development --out apps/recognition-lab/runs/a2-correction/development
node apps/recognition-lab/src/cli.ts run --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split holdout --frozen apps/recognition-lab/runs/a2-correction/calibration/frozen-config.json --out apps/recognition-lab/runs/a2-correction/holdout
```

Hand-count tests cover all-unlabelled, mixed labelled/unlabelled, labelled correct,
wrong package/product/unknown STRONG, missing-label product errors, empty and
non-STRONG populations. Simulated-policy cases cover truth second/third, correct
STRONG, AMBIGUOUS, UNKNOWN and FAILURE. The six-query mixed STRONG case has joint
precision1/4, product precision4/6 and joint label coverage4/6. The five-known-query
policy case has raw top3 retrieval4/5 and simulated recovery2/5.

The fully labelled toy holdout retains raw top1 4/6/top3 5/6, joint precision2/4,
false STRONG unknown1/2, simulated recovery5/6 and label coverage8/8 (STRONG4/4).
These unchanged aggregate numbers alone would miss both defects; discriminating
new cases are the correction evidence. Fixture/config byte hashes remain those
recorded in the original benchmark.

## Limits and next action

Only requested lab correction checks were rerun. Original root692-test validation
is historical builder evidence, not fresh root/mobile/database validation of this
repair. No real dataset, encoder/camera, Android/UI experiment, second laptop,
native performance, licence or recognition-quality gate was performed or passed.
Synthetic confidence remains intentionally unsafe in the unknown-lookalike case.

Coordinator independently verifies both findings and reviews this stopped source.
Self-check restores implementation evidence, not independent acceptance. R1,
production integration and consequential actions require their later packets.
