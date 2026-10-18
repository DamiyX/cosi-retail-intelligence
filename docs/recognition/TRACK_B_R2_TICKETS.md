# Track B R2 — Comparison preparation tickets

Status: published under delegated judgment; R1 preparation source accepted.
Execution:RB2-01..03 implemented/self-checked by chat01a0fbba-0b16-7fb2-a39c-d09fdb6e4065;
independent R2 preparation source accepted. Evidence:reports/R2_INDEPENDENT_REVIEW.md.
Plan:TRACK_B_R2_PLAN.md. Workflow:recognition-track-b.json.
No real photos/weights exist; real benchmark acceptance pending. Sol6.1 HIGH,
sequential stopped handoff. Preserve R0/R1 source and all coordinator/native work.

## RB2-01 — Validate a candidate's recorded embeddings with exact provenance

Blocked by: reviewed R2 packet; accepted R0/R1 tooling.
Outcome: reviewed embeddings can later enter the lab without mixing models,
preprocessing or captures. Scope: candidate/bundle schema, input validation and
lab-local precomputed adapter; draft registry and explicitly authored fixtures.

- [x] Distinguish unreviewed/draft, authored toy and reviewed real artifacts; bind
  model/artifact/preprocessing/space/dimension and dataset/entry/asset identities.
  Missing exact/rights facts never become real eligibility by default.
- [x] Duplicate/orphan/missing outputs, stale hash/space/version/dimension,
  nonfinite/zero vectors and foreign candidate bindings reject. Explicit query
  failures retained; reference failure yields explicit setup failure. No inference,
  downloads/private-image reuse or actual model claim from toy/precomputed outputs.
- [x] Positive/negative adapter-to-validator tests and lab typecheck/lint pass;
  existing R0/R1 dataset/metric/contracts remain unchanged.

## RB2-02 — Compare candidate results on the same population

Blocked by: RB2-01.
Outcome: one report compares at most three candidates without hiding failed
queries or overstating UI/package success. Scope: ranking/metrics integration,
comparison command, JSON/readable reports and tests.

- [x] Same manifest/split/query inventory for every candidate, own vector spaces,
  corrected joint denominators/label coverage and simulated recovery; failures
  remain visible. Setup failure is not invented UNKNOWN or empty-perfect metric.
- [x] Reports/CLI record exact candidate/dataset/config provenance, synthetic/
  precomputed limits and missing real gates. Empty/invalid inputs reject with
  documented exits; repeatable fields match. No reported latency becomes a device
  measurement, and no automatic final-model selection occurs.
- [x] Hand-count fixtures and actual executable comparison tests pass with all
  R0/R1 lab tests, typecheck and zero-warning lint.

## RB2-03 — Freeze candidate-specific calibration and return the packet

Blocked by: RB2-02 comparison runner.
Outcome: later holdout is reproducible and cannot silently retune candidate/config.
Scope: explicit calibration-only choice, candidate-bound freeze, CLI/tests/docs.

- [x] Calibration-only freeze binds artifact/preprocessing/dataset/config/query
  inventory; holdout requires matching frozen identity. Wrong candidate/hash/
  preprocessing/dataset/config and holdout-based sweep/choice reject. No lowering
  production acceptance thresholds or leaking other splits into calibration.
- [x] Fresh CLI toy comparison/calibration/frozen holdout and negative cases
  verified; lab tests/typecheck/zero-warning lint pass. R2_PREPARATION.md records
  exact files/commands/results and pending real-image/model/licence/device gates.
- [x] Update ledger/workflow/project state truthfully, stop all work and send
  authorized report-back to coordinator. Do not start R3 or accept your own source.

## Pending real benchmark — NOT ASSIGNED

Requires actual R1 dataset, exact weights/preprocessing/licence/runtime review and
executed encoders. Neither toy comparison nor imported provenance establishes
this. Deferred until real prerequisites exist; no approval/accuracy gate waived.

Self-check evidence:172 lab tests/11 suites, typecheck/zero-warning lint0;16 actual
CLI cases passed expected exits. Original96 R0/R1 tests and446 protected baseline
files preserved. Stopped delivery received and independently reviewed. R2 preparation accepted;
actual encoder/data/device/quality benchmark remains pending.
