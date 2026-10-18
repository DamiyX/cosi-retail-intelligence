# Track B R0 — Lab foundation tickets

Status: corrected R0 source/tooling independently accepted; R0-A2-01/02 resolved.
Work remains uncommitted; no real recognition or device acceptance.
chat01a0fa25-d216-75f0-ab21-40d7b06ccef7 (Sol6.1 HIGH assignment).
Implementer stopped. Independent decision: reports/R0_A2_INDEPENDENT_REVIEW.md.
Correction handoff: reports/R0_A2_CORRECTIONS.md;
original evidence: reports/R0_BENCHMARK.md.

Plan: TRACK_B_PLAN.md. Workflow: recognition-track-b.json. Production M8 tickets
remain in root tickets.md until its open scope is closed. This is the sole R0
ticket ledger, linked from that root; do not copy its acceptance boxes elsewhere.

All tickets: isolated lab only; no production recognition contract/native/model
adoption, business migrations, cloud services or phone state changes. Use existing
toolchain. Each ticket includes tests, typecheck/zero-warning lint and stopped
evidence; a fixture result is never real recognition accuracy. Main workspace
regression validation is required at final handoff.

## RB0-01 — Run one reproducible, explicitly synthetic recognition experiment

Blocked by: approved R0 execution packet only.
Outcome: another laptop can run the same small reference/query fixture and inspect
the same ranked result/report without a camera, model download or private data.
Modules: isolated lab CLI, local experimental adapter, fixture and run manifest.

- [x] One documented command consumes versioned input and emits per-query machine
  results plus readable summary, clearly labelled synthetic/non-accuracy evidence.
- [x] Run records commit, dirty state/diff fingerprint, fixture hash, adapter and
  preprocessing ID, ranking/config version and seed if any; reruns match apart
  from explicitly nondeterministic timing/run identity.
- [x] Invalid inputs, empty galleries, mismatched vector dimensions/versions,
  nonfinite/zero-norm vectors and adapter errors are explicit tested outcomes;
  runtime failure is not converted to a successful UNKNOWN measurement.

Implementer evidence 2026-10-02: lab Jest12 tests/two suites (10.512s), lab
TypeScript6.0.3 typecheck and zero-warning ESLint passed. Real Node24 CLI reruns
match all deterministic fields; deliberate query failure exits2 with a report.
Initial generator newline and Node strip-only parameter-property errors corrected
and rerun. No second-laptop/recognition/device claim; independent audit pending.

Out of scope: real encoder, camera UI and shared API changes. Risk: a convincing
demo mistaken for recognition; mandatory visible lab-only label in all reports.

## RB0-02 — Import a dataset without leaking reference images into evaluation

Blocked by: RB0-01 for the runnable import-to-report path.
Outcome: curator can validate a local manifest and see actionable errors before
an experiment runs. Real data is optional for this ticket; test fixtures suffice.
Modules: manifest validator/import path, capture guide, integrity report.

- [x] Reject exact reference/query duplicates, overlapping capture-session split
  groups, invalid package/product relations, unknown identities present in the
  enrolled gallery, missing metadata and absent/hash-mismatched assets.
- [x] Preserve development/calibration/holdout roles and permission/provenance;
  approved dataset roots only, no traversal or automatic network fetching; reports
  omit private absolute image paths and unnecessary EXIF/personal metadata.
- [x] Document curator review for transformed duplicates that hashes miss, real
  10–20 smoke vs 30–50 difficult-set capture needs and private asset storage; run
  passes valid fixtures and fails deliberately contaminated fixtures predictably.

Implementer evidence 2026-10-02: lab Jest35 tests/three suites (11.932s),
typecheck and zero-warning lint passed. Deliberate contamination, traversal/URL,
missing/hash-mismatched files, metadata/relationships and an escaping Windows
junction rejected. Capture guide: apps/recognition-lab/DATASET_CAPTURE.md.
No real collection/accuracy or independence claim; independent audit pending.

Out of scope: downloading datasets, scraping products, real-store collection or
claiming R1 complete. Risk: independence cannot be proved by hashes alone.

## RB0-03 — Expose wrong confident matches and package mistakes in the report

Blocked by: RB0-01; RB0-02 required before claiming validated dataset results.
Outcome: reviewer can see unsafe errors, uncertainty and refused queries rather
than one misleading accuracy number. Modules: ranking/metric/report pipeline.

- [x] Hand-calculated fixtures verify product/package grouped top-1/top-3, unknown
  false-accept rate, STRONG precision/coverage, unknown recall and package accuracy
  with explicit denominators and N/A for empty populations; failures are reported.
- [x] Ties, several views of one product and unknown lookalikes cannot manufacture
  three distinct correct candidates or force STRONG. Scores are not probabilities.
- [x] Threshold/config sweeps use calibration only; holdout runs record frozen
  configuration. Report confusion cases and latency distributions/sample counts
  with fixture timing labelled tooling-only, never Android performance evidence.

Implementer evidence 2026-10-02: lab Jest49 tests/five suites (22.247s),
typecheck and zero-warning lint passed. Hand-counted eight-query toy holdout:
known product top1 4/6, top3 5/6; package joint top1 2/6, top3 5/6;
false STRONG unknown1/2, joint STRONG precision2/4, coverage4/8,
unknown recall1/2, claimed package accuracy2/4; one TIMEOUT included.
Product/package ties cannot force STRONG, even with zero margin. An indistinguishable
unknown vector can still match confidently: this deliberate unsafe case is
reported, never hidden or claimed solved. CLI calibration freeze/holdout gates
tested. All counts are synthetic tooling-only; independent audit pending.

Out of scope: choosing production confidence thresholds. Risk: all-UNKNOWN can
look precise; coverage and known recovery must be displayed beside precision.

## RB0-04 — Reproduce the run and return a bounded R1 capture handoff

Blocked by: RB0-02 and RB0-03.
Outcome: the coordinator can independently reproduce the evaluator and the founder
has a short practical capture checklist for the first real dataset.
Modules: workspace validation routing, setup/run documentation and R0 report.

- [x] Lab tests/typecheck/zero-warning lint and existing root validation pass;
  missing real assets are reported as unavailable, not silently replaced by mock
  recognition. No unreviewed production source, dependency or migration change.
- [x] Reproduction instructions pin required versions and fixtures; report actual
  commands/commits/results, failure paths and explicitly unperformed second-laptop,
  native, accuracy and real-data checks. No unsupported portability claim.
- [x] Handoff lists R1 product categories, independent capture sessions, unknowns,
  rights/storage needs and next decisions. Stop for coordinator audit; do not
  install models, start R1 collection or build R2 without the next approved packet.

Implementer evidence 2026-10-02: npm run validate exited0;692 tests/84 suites
passed (12 contracts,150 domain,479 mobile,51 lab), eight opt-in PostgreSQL
tests/two suites skipped. All workspace typechecks/zero-warning lint passed;
final adapter guard also passed12 focused tests, lab typecheck/lint. CLI import0,
calibration sweep0, holdout2 for deliberate TIMEOUT. No package versions changed;
lockfile only adds lab workspace/existing Zod. Root validate uses source-only
environment checks to avoid optional adb/java/docker probes. Full commands,
results, dirty Git state, unperformed gates and capture handoff are in
reports/R0_BENCHMARK.md and apps/recognition-lab/README.md + DATASET_CAPTURE.md.
No real accuracy/device/second-laptop gate or independent acceptance claimed.

Published commands: lab-specific test/typecheck/
lint and fixture-run scripts, followed by npm run validate. Exact script names
must be documented by the implementer rather than falsely presented as existing.


## Historical first independent acceptance — October2 (superseded)

Coordinator accepted RB0-01..04 source/tooling after stopped implementation.
Fresh51 tests/5 suites20.192s, typecheck, zero-warning lint and independent
fixture/hash/metric/frozen-config checks pass. See reports/R0_INDEPENDENT_AUDIT.md.
No source corrections required. Git work remains uncommitted; real recognition,
phone, model, R1 dataset and portability gates are unpassed.

## Second independent audit — October2

R0-A2-01/02 reopen RB0-03 metric acceptance and overall R0 acceptance. Existing
51 tests, lab typecheck and lint pass, but valid importer/experiment counterexamples
reproduce inflated joint precision and unsupported shown-recovery claims. See
reports/R0_REAUDIT.md for findings, evidence and ready-to-send correction brief.
No implementation source was changed; no agent contacted. Founder will switch
model before dispatch. Prior test results remain historical, not current acceptance.

## A2 correction self-check — October2; independent review pending

Founder resumed the same implementer/checkout for R0-A2-01/02 only. Joint precision
now evaluates package-labelled STRONG results (including wrong products/unknowns),
with N/A and missing-label counts/coverage when unevaluable. Unlabelled truth is
neither package-correct nor package-wrong. Product-only precision is preserved.
Raw top3 retrieval is retained; knownSimulatedDisplayRecovery records a simulated
STRONG-primary/AMBIGUOUS-top3/UNKNOWN-none/FAILURE-none policy, with no actual UI
or user-recovery claim.

Eight added regressions failed before repair and pass afterward. Fresh lab suite:
59 tests/six suites,30.96s; lab typecheck and zero-warning lint exit0. Fresh CLI
integrity/sweep exit0; development/holdout Node exit2 for ADAPTER_ERROR/TIMEOUT.
Generated JSON and summaries were separately asserted. Original root692-test
validation is historical; this bounded correction reran only lab checks requested
by the second audit. Audit/repro bytes, ranking/config/schema/CLI and production
source are preserved. No new milestone, migration, dependency or acceptance.
Implementer stops for coordinator review. See reports/R0_A2_CORRECTIONS.md.

## Corrected R0 independent acceptance — October2

Both A2 findings resolved. Fresh59 tests/six suites22.289s, lab typecheck and
zero-warning lint pass. Separate valid importer/experiment counterexamples and
actual CLI JSON/summary checks establish corrected metric behavior. R0 lab
source/tooling accepted; implementer stopped. No model/real-data/native gate
passed. See reports/R0_A2_INDEPENDENT_REVIEW.md. R1 planning is next.
