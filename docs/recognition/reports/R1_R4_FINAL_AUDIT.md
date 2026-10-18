# R1–R4 final independent source audit

Date: 2026-10-02. Original decision: **CHANGES REQUIRED**.

Current correction status: **ALL REPRODUCED SOURCE FINDINGS CORRECTED AND INDEPENDENTLY ACCEPTED**, 2026-10-02. Sequential correction reviews are R2_FA03_INDEPENDENT_REVIEW.md, R3_FA03_INDEPENDENT_REVIEW.md, R4_FINAL_AUDIT_INDEPENDENT_REVIEW.md and R0_R1_FA03_INDEPENDENT_REVIEW.md. The original audit/proof below is preserved as history. This is preparation acceptance; real recognition/device gates remain pending. No implementation repairs or agent messages performed. Founder requested an independent final review and a correction packet for later dispatch using a cheaper model.

## Scope and comparison

Actual checkout COSI-m8-planning; branch plan/m8-unified-scanner; HEAD 66ea3fc22595a48d7355d1729bb879496cc98896. Reviewed the uncommitted recognition-lab preparation against TRACK_B_R1/2/3/4_PLAN and their boundaries, not a misleading HEAD-only diff (the lab is untracked). Preserved existing M8 production work and unrelated pending documents. Reviewed curation/readiness, candidate/output identity and freeze, device record/equivalence summaries, retrieval/session/cache and CLI write boundaries. This is source preparation review, not real recognition or native acceptance.

Existing green tests did not cover the counterexamples below. Earlier preparation reviews remain historical evidence; their acceptance is conditional on resolving these newly reproduced findings.

## Specification findings

### FA-01 — Medium: holdout gallery freeze is enforced only by the CLI

Locations: apps/recognition-lab/src/retrievalEvaluation.ts:52 and src/retrieval.ts:28–31.

Calibrate the full gallery with calibrateRetrieval. Remove product a from the active selection and change its revision. retrievalHoldoutConfig correctly throws FROZEN_GALLERY_MISMATCH. However, pass the inner r2Frozen to evaluateRetrieval with that changed selection: all eight holdout queries execute and metrics are returned (QUERY_FAILURES refers to the fixture's one recorded timeout, not rejection of the changed gallery). The direct evaluator checks the candidate/config freeze but omits the R4 gallery freeze.

Consequence: a caller of the exported evaluation API can alter the gallery after calibration and evaluate holdout data, defeating the same-gallery protection provided by the CLI. The guide explicitly documents the weaker direct-facade check; documenting it does not preserve the plan's no-holdout-tuning invariant. This is a bounded lab evaluation-integrity issue, not a production transaction defect.

Correction: enforce candidate AND gallery freeze at the exported holdout evaluation boundary, with an unambiguous input contract. Keep generic development retrieval separate if necessary. Reject missing, inner-only, stale selection/reference/store bindings before querying or emitting metrics. Update CLI/direct callers and guide consistently. Regression: direct API plus CLI reject the same altered gallery; unchanged calibrated input still evaluates.

### FA-02 — Medium: an old query context is accepted by a replacement gallery

Location: apps/recognition-lab/src/retrieval.ts:36–57.

Create a facade for session same-session, save context, close it as instructed. Create a replacement facade with the same store/candidate/session but a changed selection. Both begin at generation 1; context contains no gallery or unique incarnation binding. The saved context exactly equals the replacement context, and querying q-a using that old context returns DECISION instead of STALE.

Consequence: delayed requests from an earlier gallery can be evaluated against its replacement. Closing the old facade correctly invalidates work already running there, but does not reject its captured request on the new facade. The plan requires current gallery-generation checks; the API does not require globally unique session IDs per reconstruction.

Correction: bind contexts to the gallery and a non-reused facade/session incarnation (or an explicit safely advancing generation contract). Preserve cancellation and one-flight behavior. Regression: close old, replace same session/store/model with changed selection, submit old context => STALE; current context succeeds. Also cover unchanged-gallery reconstruction and changed configuration if these create a new incarnation. Do not add production lifecycle machinery.

## Standards finding

### FA-03 — Medium: R2/R3 report output can overwrite linked files

Locations: apps/recognition-lab/src/comparisonCli.ts:20–38,58–66,86–87; src/deviceBenchmarkCli.ts:25–45,86–87.

The R2 guard validates output directories but not report destinations. R3 checks final symlinks/non-files but not hard-linked files. A pre-existing hard link named calibration.json (R2) or device-benchmark.json (R3) points to a disposable sentinel. Both CLIs exit 0 and overwrite the sentinel through writeFileSync. The executable proof uses only new ignored runs files, never actual source/private data. Hard links can also refer to source/input files on the same volume; the guard has no protection against this. R2 final-file symlink exposure follows from source inspection; no executable file-symlink claim is made on this Windows host.

Correction: preflight every destination before any write; reject links/hardlinks/non-files and source/output aliases, including secondary Markdown/freeze destinations. Reuse the already stronger R4 approach where appropriate without broad refactoring. Regression: hard links on first and later destinations leave all sentinels and inputs unchanged and return a failed run; normal output remains supported. Inspect sibling lab CLI output paths for the same pattern and report scope before modifying earlier-owned modules. Assume sequential local filesystem use; a hostile concurrent filesystem race is not demonstrated here.

## Evidence and limits

- Fresh npm test --workspace @retail/recognition-lab: **304/304 tests, 18/18 suites, 171.176s, exit 0**.
- Fresh lab typecheck and zero-warning lint: exit 0.
- Independent counterexample script R1_R4_FINAL_AUDIT_REPRO.mjs: reproduced all three findings. Run from repository root with pinned Node24.21.0. It creates only unique ignored runs subdirectories and disposable hardlinks. Its exit 0 means the probe ran, NOT acceptance; inspect JSON results. Preserve as historical proof when repairs change its outcomes.
- Latest probe: strict holdout FROZEN_GALLERY_MISMATCH versus direct evaluator 8 evaluated; old/replacement contexts identical with DECISION; R2/R3 exit 0 with sentinelOverwritten true.
- No additional actionable R1 defect established in this review. Coverage counts and curator flags remain preparation evidence requiring human verification; aggregate challenge coverage is not proof of per-stratum holdout quality.
- Cache revalidation and explicit recorded-versus-executed evidence labeling remain useful safeguards. No actual encoder, native runtime, image accuracy, lawful-data attestation or device measurements were verified.
- Physical capture, real model/rights review, actual inference, Galaxy A15/lower-spec tests and frozen real-data quality remain pending. No R5/M12 or production acceptance.

## Dispatch packet — prepared, NOT sent

Use GPT-6.1 Sol HIGH as requested. Work sequentially; no overlapping edits. Read AGENTS/project state/current diff before edits, preserve uncommitted work, stop after corrections and report exact commands/results/changed files/remaining gates. Do not reset, push, deploy, start phone/Docker, download models or advance milestones.

1. R2 chat 01a0fbba-0b16-7fb2-a39c-d09fdb6e4065: FA-03 R2 destinations, tests and relevant guide only. Coordinate any shared helper before other owners consume it.
2. R3 chat 01a0fbe7-acef-7b81-92e2-7f8a1e720285: FA-03 R3 destinations/tests/guide after R2 stops.
3. R4 chat 01a0fc05-ee01-7852-ac66-537cfd9c2a04: FA-01 and FA-02 retrieval/evaluation contracts, direct+CLI regressions and guide. Do not change ranking thresholds or production RecognitionService.
4. Coordinator independently rechecks each correction and full lab suite/types/lint; updates acceptance only on actual evidence. All physical gates stay pending.

Founder can now switch models to dispatch this packet. This audit does not authorize new external effects or mark corrections completed.

## Correction-cycle update — 2026-10-02

R2 FA-03 returned a stopped handoff (R2_FA03_CORRECTION_HANDOFF.md). Coordinator independently inspected the complete preflight/input-identity implementation and new regression suite. Original probe now shows R2 exit1/sentinelOverwritten=false; typecheck and zero-warning lint pass. Focused suite acceptance is recorded in R2_FA03_INDEPENDENT_REVIEW.md when complete. Implementer full339 tests/19 suites is reported evidence, not a fresh coordinator full run.

Additional FA-03 siblings independently reproduced with new ignored disposable probes: R0 validate integrity.json hardlink exits0/overwrites; R1 readiness.md hardlink exits2/overwrites. Assign their shared cli.ts to ONE sequential owner (R0 chat), never concurrent R0/R1 edits.

**FA-04 — Medium, standards: R4 physical input/output alias bypass.** retrievalPaths.ts protectInputs compares path strings only. Windows 8.3 output spelling LONGOU~1 aliases the long-path candidate at retrieval-calibration.json; actual calibration exits0/overwrites the disposable candidate. Coordinator independently reproduced this. Require canonical/physical bigint file-identity protection for every report/cache destination and every configured input/asset, plus distinct-target aliases, before writes. Assign to R4 with FA-01/02. Do not claim normal path-string comparison is sufficient.

Independent sibling evidence: apps/recognition-lab/runs/coordinator-siblings-LP5NRD/evidence.json; reproducer runs/coordinator-siblings.mjs. All three sibling probes reproduced; no production/source/input data was overwritten. This extends existing report safety scope; no new milestone. R3 next, then R4 (FA-01/02/04), then shared R0/R1 CLI correction, each stopped and independently reviewed.

## Correction cycle closed — 2026-10-02

Founder-authorized Sol6.1 HIGH sequential stopped handoff and independent reviews resolved FA-01/02/03/04 plus shared R0/R1 FA-03. Latest fresh coordinator shared-CLI check143 passes/7 native file-symlink skips/3 suites218.097s, types/lint0, unchanged sibling probe allCLI1/no overwrites,527 protected intake hashes unchanged. Earlier fresh independent correction checks:R2 39 passes; R3 32 passes/2 skips; R4 110 passes. Counts overlap and are not additive. Implementer final full510 passes/9 native file-symlink skips/23 suites472.248s is reported evidence, not a coordinator full rerun. All model/photo/native/quality gates remain pending. No repairs remain from this audit; no next milestone dispatched.

Remaining work beyond deferred focus/slider: (1) lawful curated30–50-product real dataset; (2) reviewed exact encoder candidates and actual inference comparison; (3) Android runtime/export/device benchmark and frozen real holdout; (4) later guided enrollment, OCR experiments, private same-store reference sync and approved M12 app integration. These later packets need scope/approval and are not already implemented by preparation. M8 barcode acceptance separately retains native decoder/storage/photo/sound/large-text/TalkBack/standalone-offline checks, live-provider rights/contact/native compatibility, and identifier-association/backend activation/sync gates. Provider and ordinary automatic addition remain disabled. No claim that physical testing alone completes all M8/recognition work.
