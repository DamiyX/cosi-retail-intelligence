# R0 A2 correction — independent acceptance review

Date: 2026-10-02, Africa/Lagos. Decision: **accept corrected R0 source/tooling scope**.
R0-A2-01 and R0-A2-02 are resolved. No further material correction found in this
bounded repair. This decision supersedes the second audit's changes-required
status; both earlier reports remain historical evidence.

## Scope and specification

Stopped implementation in COSI-m8-planning, branch plan/m8-unified-scanner,
HEAD66ea3fc22595a48d7355d1729bb879496cc98896. Pending work remains uncommitted.
Reviewed metrics.ts, both metric test suites, README, handoff and ledger/workflow
changes against R0_REAUDIT.md. Ranking/experiment/schema/CLI consumers were
inspected to verify the metric assumptions; no production mobile/domain/contracts
or Supabase paths are changed in the working diff.

A2-01: joint precision now uses package-labelled STRONG outcomes only. Wrong
products and labelled unknown false positives remain failures in that denominator.
Missing labels do not manufacture success; all-unlabelled is N/A. Label counts
and coverage expose exclusions; product precision retains all STRONG outcomes.
Independent imported all-unlabelled and mixed cases verified N/A and joint0/1
with label coverage1/2, respectively.

A2-02: raw top3 retrieval is retained. Simulated display recovery records its
policy: STRONG primary, AMBIGUOUS top3, UNKNOWN/FAILURE none. A valid query with
true B ranked third under wrong STRONG A has raw retrieval1/1 but simulated
recovery0/1. Changing the status to AMBIGUOUS yields simulated recovery1/1;
UNKNOWN and FAILURE yield0/1. Summary and JSON disclaim actual UI/user recovery.

## Standards review

No production contract, migration, dependency, threshold or architecture change
was needed. The independent examples pass the actual importer and experiment;
new tests exercise meaningful missing-label and wrong-STRONG cases. Ranking
bounds the candidate array to three distinct products, matching the report policy.
Historical defect reproduction remains byte-identical:
f8bbdd08ab3b5c33ecf901fbbe70f5fdf750d93019b387eb28cf2e350de1ea2c.
It asserts old bugs and is not a current passing regression test. Existing
historical audits were not rewritten to hide the findings. Stale active routing
context was corrected during this review.

## Fresh independent evidence

Existing pinned Node24.21.0/toolchain; approved checkout root:

- npm test --workspace @retail/recognition-lab:59 tests/six suites passed,22.289s.
- npm run typecheck --workspace @retail/recognition-lab:exit0.
- npm run lint --workspace @retail/recognition-lab:exit0, zero-warning mode.
- Separate in-memory imported counterexamples/assertions:exit0; all-unlabelled,
  mixed denominator, wrong STRONG, AMBIGUOUS/UNKNOWN/FAILURE, preserved proof hash.
- Direct Node CLI integrity/sweep:exit0/0; development/frozen holdout:exit2/2
  for deliberate ADAPTER_ERROR/TIMEOUT. Ignored outputs:apps/recognition-lab/runs/a2-independent.
- Independent generated JSON/readable summary assertions:exit0. Renamed metric,
  policy/label counts and expected holdout joint2/4/recovery5/6/failure1 retained.

The full root692-test validation is historical builder evidence; this bounded
metrics repair was independently checked through lab tests and actual CLI,
without rerunning unrelated mobile/database suites. No phone, real dataset,
encoder, native benchmark, second laptop, live provider or production accuracy
acceptance was performed. Synthetic unknown lookalikes still expose deliberately
unsafe confidence; these numbers are tooling checks, not model quality.

## Next boundary

R0 implementation is stopped and accepted for lab tooling. R1 representative
dataset/capture planning is next; collection/model/native adoption and M12 need
later reviewed packets. No commit, push, merge, build spending, installation,
Docker or external action occurred. M8 physical gates remain open separately.
