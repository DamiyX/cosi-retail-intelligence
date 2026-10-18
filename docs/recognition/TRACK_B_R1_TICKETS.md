# Track B R1 — Dataset preparation tickets

Status: RB1-01..03 source implemented and self-checked; independent acceptance pending.
Final authorized report-back follows the stopped boundary; RB1-04 remains pending.
Plan: TRACK_B_R1_PLAN.md. Task state: recognition-track-b.json. The root M8 ledger
remains active for scanner gates; this is the sole R1 execution ledger.

All tickets preserve existing R0 metric fixes, importer, synthetic labels and
production boundaries. Existing lab toolchain only; no phone, automatic private
image reuse, model/dependency installation, backend, spend or Git external action.
Boxes record actual evidence, not independent acceptance. Report commands/results.

## RB1-01 — A usable capture packet with no fabricated data

Blocked by: accepted R0 and this founder-approved R1 packet.
Outcome: founder can prepare useful reference/query captures without warehouse or
ML terminology. Scope: versioned empty templates, short selection/capture workflow
and strict curator-sidecar shape, lab-local validation/tests. No capture app.

- [x] Templates round-trip into the documented strict shape; empty/unfilled records
  remain incomplete, never real-capture evidence or invented consent. No private
  assets are committed or current thumbnails exported.
- [x] Capture instructions distinguish product vs package, independent physical/
  source/session groups, reference vs development/calibration/holdout, known vs
  unknown and unknown-package challenges; include permissions and image review.
- [x] Positive/negative template/sidecar tests, lab typecheck and zero-warning lint
  pass; document the exact files/commands and limitations for another laptop.

Risk: turning a human attestation into automated proof. Retain manual review gate.

## RB1-02 — Readiness report shows missing evidence clearly

Blocked by: RB1-01 sidecar/capture shape; accepted R0 importer/metric fixes.
Outcome: one command validates an explicitly supplied dataset root and reports
coverage, review and seal gaps without executing an encoder. Scope: lab readiness
module + CLI + report + tests; existing importer owns base integrity checks.

- [x] JSON and readable report separate integrity/review/coverage/seal/readiness,
  show distinct products/packages, per-split known/unknown counts, reference and
  independent query coverage, challenge/lighting/view gaps and missing labels.
  Synthetic kind can never satisfy real readiness. Valid incomplete input emits
  an actionable incomplete report with documented exit code.
- [x] Wrong/stale manifest hash, orphan/duplicate reviews, leakage-family conflicts,
  missing permissions/usability decisions, absent query splits or holdout seal
  cannot silently pass. Rejected entries are not silently dropped. Unknown
  packages of enrolled products remain known-product challenges. No image bytes,
  private absolute paths or personal data enter reports.
- [x] Discriminating tests exercise importer-to-readiness-to-output; include empty,
  incomplete, synthetic and structurally complete **authored test** records without
  claiming physical collection. Existing R0 lab suite/CLI, typecheck/lint pass.

Risk: source group IDs/flags cannot prove physical independence or lawful rights.
Output must preserve that evidence limitation even when structurally complete.

## RB1-03 — Reproducible preparation handoff with truthful physical gates

Blocked by: RB1-01 and RB1-02.
Outcome: coordinator/founder can see exactly what is ready to use and what still
needs real photos. Scope: final CLI verification, README/capture guide/report,
ledger/workflow/PROJECT_STATE. No broad code refactor or next phase.

- [x] Fresh documented readiness commands have verified exit codes and matching
  JSON/readable output; deterministic fields repeat; seal/hash changes invalidate
  old review. Record lab tests/typecheck/zero-warning lint and R0 behavior checks.
- [x] Deliver R1_PREPARATION.md with capture checklist, files/commands/results,
  missing samples/rights/independence/device evidence and exact Git state. No
  recognition score or real-data gate is claimed; RB1-04 remains pending.
- [x] Implementer stops all commands/edits and sends one authorized completion
  message to coordinator for independent review. Do not start R2 yourself.

## RB1-04 — Actual difficult dataset (PENDING; not assigned now)

Blocked by: real photos/permission records explicitly supplied by founder, capture
availability and audited RB1-01..03 tooling. No sample folder currently authorized.
Outcome:30–50 real enrolled product identities with independent queries and
unknown/package challenges; explicit missing strata. Modules: private manifest/
curation/assets under authorized root; reviewed dataset report only in Git.

- [ ] Real product-focused photos, provenance and rights records inspected; image
  usability and leakage-family/physical independence reviewed. No synthetic stand-in.
- [ ] Coverage, unknown-query ratios, package challenges and development/calibration/
  sealed holdout reviewed with exact counts and limitations; asset/hash/version
  bindings valid. Target coverage is not an asserted recognition-quality result.
- [ ] Coordinator accepts actual dataset evidence or records exact gaps; no R2
  benchmark/accuracy acceptance before the real dataset gate is met.

Deferred by founder October2: collect photos and physical checks after return.
This is pending, not waived. Preparation can advance without claiming it passed.

## October2 implementation self-check — independent acceptance pending

Implementer chat01a0fb94-826a-7ed2-b935-8597d3124511; assigned Sol6.1 HIGH.
RB1-01/02 source and RB1-03 verification/report are self-checked, not independently
accepted. Final stop/send checkbox is left open until the actual report-back tool
record, after all commands/edits. Coordinator owns closing that delivery/acceptance
boundary. No R2/R3/R4 implementation has started; RB1-04 remains pending photos.

Evidence: reports/R1_PREPARATION.md. Fresh final lab96 tests/seven suites65.529s;
typecheck and zero-warning lint exit0.37 new readiness tests plus all59 R0 tests.
Initial focused37/one48.437s overlaps the full run. Empty/fixture readiness CLI2/2;
repeat deterministic JSON identical. Invalid stale binding, family leakage,
duplicate reviews, malformed/outside-root curation and manifest drift each exit1.
Existing R0 integrity/sweep0/0; development/holdout2/2 intentional failures;
A2 joint2/4, simulated recovery5/6, failure1 and proof hash retained.62 preserved
out-of-scope file hashes match. No real readiness exit0, scores, photo/rights/
physical/device/second-laptop acceptance. Source report/guide/template shapes are
ready for coordinator audit. No dependency/migration/production/model/native/Git
external action. Detailed logs are in ignored apps/recognition-lab/runs/r1-preparation.

## Independent preparation acceptance — October2

RB1-01..03 source accepted after independent96-test/7-suite59.49s run, lab
typecheck/zero-warning lint and separate importer/readiness/CLI examples. Actual
stopped report-back delivered. See reports/R1_INDEPENDENT_REVIEW.md. RB1-04 real
dataset remains pending; R2 preparation may advance, not real encoder acceptance.
