# R0 benchmark and stopped implementation handoff

Historical pre-correction handoff. Its metric definitions and source status are
superseded by [R0_A2_CORRECTIONS.md](R0_A2_CORRECTIONS.md). Both independent audit
reports and their reproduction artifact remain unchanged. Earlier shown-recovery
and missing-package joint-precision semantics below are historical defect evidence.

**SYNTHETIC TOOLING-ONLY — NOT RECOGNITION ACCURACY.**

Date: 2026-10-02 (Africa/Lagos). Work milestone R0, evaluation setup only.
RB0-01..04 implemented and self-checked; **independent audit/acceptance pending**.
Implementation chat: 01a0fa25-d216-75f0-ab21-40d7b06ccef7, founder-assigned
GPT-6.1 Sol HIGH; no model/effort switch or agent delegation occurred.
Coordinator: 01a098ef-d830-7531-bca7-2d66b0a5b587. Implementation ownership stops
after final handoff checks, before its one authorized completion notification.

## Git and scope

Only checkout used: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch: `plan/m8-unified-scanner`.
Existing HEAD: `66ea3fc22595a48d7355d1729bb879496cc98896`, unchanged.
No commit, push, merge, rebase, reset, new checkout or discarded pending work.

Intake matched the expected thirteen pending documentation paths: ten tracked
changes and three untracked Track B planning files. They were preserved, with
factual R0 status/evidence appended to the authorized ledger/workflow/state/plan.
Root M8 tickets.md and pending M8/native/coordinator documents were not edited.
Final status remains dirty: thirteen tracked modified paths and forty-eight
untracked files when expanded (44 lab files, Track B plan/ledger/workflow and this
report). Generated runs/logs/private-data are ignored and not part of that count.

Changed surface:
- apps/recognition-lab: isolated private workspace, eight TypeScript modules,
  five test suites, package/configuration, README and DATASET_CAPTURE guide;
  deterministic v2 dataset, two config fixtures, authoring script and20 tiny text
  assets. No real images.
- package.json: lab included in types/lint/tests; root validate selects a
  source-only environment check.
- tools/scripts/check-environment.mjs: optional --source-only skips adb/java/docker
  version probes. Node/npm/Git still checked; normal direct environment check
  keeps its previous optional probes.
- package-lock.json:15 added lines for lab workspace/link and existing Zod4.6.4.
  No existing dependency version/resolution changes. Offline lockfile-only command
  ran with scripts/audit/funding disabled; no installed modules or download changed.
- R0 ticket evidence, workflow owner/evidence, concise PROJECT_STATE and Track B
  plan status updated. No decision, architecture or product behavior changed.

`git diff --name-only -- apps/mobile packages supabase` returned no paths.
No business/photo/barcode/RecognitionService/native source or migrations changed.
No package extraction or production model/runtime adopted. Source-only work did
not touch phone/adb, Metro/current app, Docker services, cloud/provider/backend,
build jobs, models, R1 collection or R2/M12.

GLOBAL_MEMORY.md and .agents/GLOBAL_MEMORY.md were absent. Approved repository
documents/workflow/context and the available coding/testing skills supplied the
bounded route; no additional global router was assumed.

## Versions, fixtures and reproducibility

Actual environment: Node24.21.0, npm11.19.0, Git2.56.0.windows.1, Windows x64.
Lab uses TypeScript6.0.3 explicitly from mobile's local compiler (root's hoisted
compiler remains5.9.3), Jest29.7.0, ESLint9.39.5, eslint-config-expo57.0.2,
Babel preset Expo57.0.11 and Zod4.6.4 from existing locked dependencies.
README contains setup and exact root-relative commands; no second-laptop setup
or npm ci was run here.

Dataset: r0-fixture/v2; synthetic-store;20 unique authored text assets,
six references and14 queries (3 development /3 calibration /8 holdout).
Dataset SHA256:
`6b941fcaf47ae42ffebe5bfe9b608f638ba7700e7135e7d94ef8d00b7c25670f`.
configs.json SHA256:
`af8eaec94ff08d7b8307d3fff19081dda0cc227821de2e93f0727f3196341a2e`.
Adapter authored-vector-v1 / preprocessing identity-v1 / vector space synthetic-v1,
dimension3; ranking/config cosine-max-product-package-v1; seed=null (no randomness).
Unsupported adapter/preprocessing IDs fail rather than falsely reporting execution.
ASCII tie ordering and LF fixture attributes support deterministic inputs.

Run JSON records HEAD/branch/dirty state plus a fingerprint of status, tracked/
staged diff and nonignored untracked file content hashes, fixture hash, adapter/
preprocessing, ranking/config/hash, runtime and frozen config for holdout.
It never exports diff content or absolute image paths. Actual CLI reruns were
compared in Jest across every deterministic field; startedAt, per-query timings
and derived timing distributions are excluded explicitly. Source fingerprints
change when handoff docs change; the generated JSON is authoritative for its run
snapshot, avoiding a circular fingerprint copied into this mutable report.
Ignored output does not affect that fingerprint.

## Commands and actual results

All commands ran in the exact approved checkout; lab npm scripts use their
workspace directory as usual. Focused ticket counts overlap and are not additive.

| Check | Actual result |
| --- | --- |
| RB0-01 lab test + typecheck + lint |12 tests/2 suites,10.512s; typecheck and zero-warning lint exit0 |
| RB0-02 lab test + typecheck + lint |35 tests/3 suites,11.932s; typecheck and zero-warning lint exit0 |
| RB0-03 lab test + typecheck + lint |49 tests/5 suites,22.247s; typecheck and zero-warning lint exit0 |
| Final adapter guard focused test |12 tests/1 suite,5.281s; final lab typecheck/lint exit0 |
| npm run validate |exit0; all workspace typechecks/zero-warning lint;692 tests/84 passing suites;8 PostgreSQL tests/2 suites skipped |
| Contracts in root validation |12 tests/2 suites,6.763s |
| Domain in root validation |150 tests/5 suites,8.133s |
| Mobile in root validation |479 tests/72 suites,378.642s;8 opt-in live PostgreSQL tests skipped |
| Final lab in root validation |51 tests/5 suites,20.504s |
| npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund |exit0; only15 lockfile lines added, no package versions changed |
| node --check tools/scripts/check-environment.mjs |exit0 |
| git diff --check |exit0; existing line-ending conversion notices, no whitespace errors |

The late adapter guard was added while root validation was still running unchanged
mobile tests. Its focused tests and final lab typecheck/lint passed; root's final
lab suite ran after that guard and passed all51. No source changed afterward.
Existing React act console.error notices in mobile tests are retained; zero-warning
lint does not mean the test console was silent.

Focused commands:
```powershell
npm test --workspace @retail/recognition-lab
npm run typecheck --workspace @retail/recognition-lab
npm run lint --workspace @retail/recognition-lab
npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/experiment.test.ts
npm run validate
```

Actual standalone reproduction commands:
```powershell
npm run fixture --workspace @retail/recognition-lab
node apps/recognition-lab/src/cli.ts validate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --out apps/recognition-lab/runs/integrity
node apps/recognition-lab/src/cli.ts sweep --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split calibration --configs apps/recognition-lab/fixtures/configs.json --choose 0 --out apps/recognition-lab/runs/calibration
node apps/recognition-lab/src/cli.ts run --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split holdout --frozen apps/recognition-lab/runs/calibration/frozen-config.json --out apps/recognition-lab/runs/holdout
```

CLI validate exited0; calibration sweep of two configurations, explicit choice0,
exited0; holdout exited2 with its deliberate TIMEOUT and complete report.
Development fixture likewise exits2 for its ADAPTER_ERROR. Invalid/contaminated
inputs exit1. npm emits lifecycle errors for nonzero fixture exits; these are
expected tested semantics, not a recognition pass or a silent omitted query.

Generated local evidence (ignored, retained for reviewer):
- apps/recognition-lab/runs/verification/root-validate.log
- apps/recognition-lab/runs/verification/adapter-test.log
- apps/recognition-lab/runs/verification/final-lab-typecheck.log
- apps/recognition-lab/runs/verification/final-lab-lint.log
- apps/recognition-lab/runs/verification/integrity.log, sweep.log, holdout.log
- apps/recognition-lab/runs/integrity/integrity.json
- apps/recognition-lab/runs/calibration/sweep.json + frozen-config.json
- apps/recognition-lab/runs/holdout/results.json + summary.md
- apps/recognition-lab/runs/development/results.json + summary.md
- apps/recognition-lab/runs/cli-test and cli-holdout actual executable test artifacts.

## What the measurement tests establish

Eight hand-counted synthetic holdout queries:6 known,2 unknown;7 successes,
1 TIMEOUT;4 STRONG,2 AMBIGUOUS,1 UNKNOWN,1 FAILURE.

| Synthetic metric | Count/denominator |
| --- | --- |
| Known product top1 / grouped top3 / shown top3 |4/6;5/6;5/6 |
| Known package joint top1 / grouped pair top3 |2/6;5/6 |
| Unknown false STRONG / unknown recall |1/2;1/2 |
| STRONG product / joint precision |3/4;2/4 |
| STRONG coverage |4/8 |
| Claimed package accuracy / claim coverage |2/4;4/8 |
| Unknown precision |1/1 |
| Ambiguous known top3 recovery |2/2 |
| Failure rate |1/8 |

Failures stay in population/coverage/recall denominators. Empty populations use
null/N/A. All-UNKNOWN tests expose zero coverage and zero shown known recovery.
Multiple views aggregate by product/package; top3 products and top3 pairs are
distinct identities. Ties cannot force STRONG, even at zero margin. Uncertain
package is null/confirmation-required. An exact unknown lookalike still receives
false STRONG in the deliberately unsafe fixture: similarity is not a probability
or proof of identity. Package accuracy requires joint product/package correctness.

Runtime failures are separate from successful UNKNOWN. Tests cover invalid inputs,
empty gallery, zero/nonfinite/extreme vectors, dimensions/spaces, unavailable
adapter/preprocessing, query adapter errors/timeouts, real-encoder unavailability.
Integrity tests reject exact reference/query leakage, query split copies, overlapping
capture sessions, invalid product/package relations, enrolled unknowns, missing
metadata, missing/hash-mismatched files, traversal/URL/drive paths, outside manifests
and an escaping Windows directory junction. No network fetching or EXIF parsing.
The real-capture path only checks integrity; real execution fails MODEL_UNAVAILABLE.

Sweeps use calibration queries only, demonstrated by an unreadable holdout
observation in a test. Holdout requires frozen dataset/config/checksum and
calibration IDs; modified configs, dataset hashes and IDs are rejected. This
guards accidental misuse, not human tampering/non-retuning. This public authored
holdout is a test oracle, not sealed recognition-quality evidence.

Timing is actual Node synthetic tool time, split into all7-success/1-failure
populations (8 total); median/min/max recorded, p90/p95 N/A at this sample size.
Nearest-rank percentile tests use10/20 samples. No Android/camera/model, RAM,
thermal/battery or retailer time-to-selection performance was measured.

## Open gates and bounded R1 handoff

No real assets, representative accuracy test, 10–20 product real smoke,30–50
difficult set, second laptop, target Android phone, lower-spec device, offline
native inference, model/export/licence/runtime review, capture/enrollment UX,
media sync or production integration was performed. Existing M8/M9/release gates
remain intact. No production thresholds or final encoder/runtime selected.

Curator review is required for transformed/cropped duplicates and physical-item
independence; hashes and session IDs cannot prove either. Permissions must be
verified against actual private rights records. Reports assume pseudonymous IDs
and do not constitute consent/security certification.

Next approved R1 packet should use DATASET_CAPTURE.md: choose lookalike sizes/
flavours, single/pack/carton, old/new/glossy/transparent/damaged packaging and
distinctive no-code goods; separate reference/query sessions and keep adjacent
frames/transformed copies/physical samples in one leakage group. Plan15–25%
unknown queries including lookalikes, with exact denominators. Review policy for
unknown packages of known products; R0 unknown means unenrolled product.
Approve rights, access-controlled private storage and curator-owned sealed splits
before collection. Compare future recognition against barcode/manual selection.
Do not automatically reuse existing customer thumbnails or commit private images.

Coordinator next: ask founder about Terra MEDIUM audit switch before independent
review; after reasonable opportunity without reply, authorized Sol6.1 HIGH fallback.
Inspect the stopped uncommitted diff, reproduce checks proportionately and accept
or return concrete corrections. Later R1/R2/M12 require new approved packets.
This report records implementer evidence only and does not accept the milestone.
