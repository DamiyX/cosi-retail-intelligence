# R2 recorded-output comparison preparation

**PRECOMPUTED OUTPUTS ONLY. The adapter DOES NOT execute an encoder.**
Public authored toy vectors test orchestration, failure accounting and bindings.
They establish no model/real-data/native accuracy, rights approval or production
acceptance. Actual R1 photos, real R2 reviewed encoder execution, R3 physical
devices and R4 real quality/calibration gates remain pending, NOT waived.

## Inputs and privacy

Use the existing locked Node24.21.0/npm11.19.0/TypeScript/Zod/Jest environment.
No encoder, model download, dependency, Python or native runtime is added.
The existing importer is the only asset-reading path, with an explicit
`--dataset-root` and confined manifest/assets. The adapter reads only explicitly
supplied declarations/bundles. It never discovers images, fetches URLs, runs a
producer command or reuses mobile private photos.

Lab-local declarations (`src/precomputed.ts`) distinguish:

- `draft-unreviewed`: exact artifact, preprocessing and embedding facts are null;
  cannot run. The two family hypotheses in `fixtures/r2/draft-registry.json`
  have no invented artifact hash, dimensions, export or licence approval.
- `authored-toy`: exact public recipe artifact, preprocessing descriptor/hash,
  space/dimension and toy-only references. No actual model weights.
- `reviewed-real`: exact artifact/revision, preprocessing, space/dimension, separate
  code/weight review references, export/runtime references and exact-binding
  reviewer record. These are supplied attestations for independent review, never
  automatic legal, execution, redistribution or quality acceptance. Missing,
  placeholder or Boolean approval facts cannot substitute for the contract.

Bundles bind normalized candidate declaration hash, artifact hash, preprocessing
IDs/version/hash, vector space/dimension and dataset ID/version/kind/manifest byte
hash. Every reference and selected query needs exactly one output with entry ID/
asset hash. Other splits' queries are orphan outputs. Duplicate/missing/orphan/
stale bindings and malformed/nonfinite/zero vectors reject. Explicit query
ADAPTER_ERROR/TIMEOUT outputs stay FAILURE and measured. A failed reference
prohibits gallery setup: SETUP_FAILURE, metrics/results null, selected/blocked
query counts and declared reference/query failures remain visible.

Real bundles require `reported-encoder-output-unverified` and an execution record
reference; real manifests cannot contain authored observations. Importing that
record DOES NOT verify inference or capture. Synthetic test attestations exercise
the schema branch only, with no real eligibility/acceptance. Optional storage
bytes are measured/reported metadata, not inferred model size.

Comparison/calibration output is restricted to ignored `runs/`. All destinations
(comparison.json/.md, calibration.json/.md and frozen-candidate.json) are checked
together before directory creation or any output write. Linked ancestors and final
symlinks/junctions (including dangling links), hard-linked/non-file destinations,
and canonical source/output aliases reject with exit1. Protected sources include
manifest/assets, input list, candidates, bundles, configs and holdout freeze.
Safe regular-file reports may be rewritten. This assumes sequential local
filesystem use; it does not claim protection against a hostile concurrent path
replacement between preflight and write. Private inputs belong in an explicitly authorized private
root, normally ignored `private-data/`; do not add them to Git. Reports contain
IDs/hashes/rates and declared provenance, no vectors/image bytes/discovered private
asset paths. Review free-text provenance for private content before sharing.
Explicit input file paths are CLI locators, not report fields.

## Public toy packet from repository root

The two authored candidates reproduce R0 vectors in separate3D/4D spaces; the
second adds a zero coordinate. Equal metrics are intentional, not evidence that
real encoders perform equally. Each gallery stays in its own space; compare rates
and coverage, not distances across spaces. At most three distinct candidate IDs
use one imported manifest/split/ordered query population. There is no winner.

```powershell
node apps/recognition-lab/src/comparisonCli.ts compare --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split development --inputs apps/recognition-lab/fixtures/r2/inputs-development.json --out apps/recognition-lab/runs/r2-development
node apps/recognition-lab/src/comparisonCli.ts calibrate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split calibration --candidate apps/recognition-lab/fixtures/r2/toy-a.json --bundle apps/recognition-lab/fixtures/r2/toy-a-calibration.json --configs apps/recognition-lab/fixtures/configs.json --choose 0 --out apps/recognition-lab/runs/r2-calibration-a
node apps/recognition-lab/src/comparisonCli.ts calibrate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split calibration --candidate apps/recognition-lab/fixtures/r2/toy-b.json --bundle apps/recognition-lab/fixtures/r2/toy-b-calibration.json --configs apps/recognition-lab/fixtures/configs.json --choose 0 --out apps/recognition-lab/runs/r2-calibration-b
node apps/recognition-lab/src/comparisonCli.ts compare --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split holdout --inputs apps/recognition-lab/fixtures/r2/inputs-holdout.json --out apps/recognition-lab/runs/r2-holdout
```

Expected exits: **2,0,0,2**. Development deliberately has ADAPTER_ERROR; holdout has
TIMEOUT. Each candidate retains3/8 queries. Exit0: completed failure-free report.
Exit2: completed query/setup-failure report. Exit1: rejected input/arguments/I/O.
Old files may remain after rejection: inspect the actual exit and hashes. Outputs
are comparison.json/.md or calibration.json/.md plus frozen-candidate.json. Empty
queries/configs/candidate lists reject. Unsupported fields/duplicate flags cannot
dispatch an arbitrary process. Existing R0/R1 CLI contracts remain unchanged.

## Calibration and holdout

Sweeps accept only calibration and explicit `--choose` index. Configs reuse the R0
schema; no production threshold changes. Freeze binds normalized candidate identity
(artifact/preprocessing/space/dimension/review), calibration bundle, dataset byte/
content hashes, ordered calibration/holdout entry+asset inventory and chosen config/
hash/index. Freeze requires nonempty calibration/holdout and valid gallery; query
failures stay measured. Holdout rows require `frozen` and reject `config`; other
split rows require `config` and reject `frozen`. CLI and comparison API check the
freeze. Cross-candidate/artifact/preprocessing/dataset/query/config/seal drift
rejects. Dataset revision requires revised calibration/freeze.

Checksums detect accidental drift, not signatures, human holdout secrecy or proof
against deliberate retuning. Real holdout must first be curated/sealed through R1.
Public toy holdout is evaluator test data. There is no automatic model adoption.

Metrics reuse corrected R0 joint denominators, package-label coverage, failures,
unknown false STRONG and simulated primary/top3/none display policy. Simulated
recovery is not measured UI/user recovery. elapsedMs/timing measure Node ranking/
postprocessing only; producer timestamps/durations are UNVERIFIED reported provenance,
never Android/encoder measurements. Canonical candidate/bundle/config and raw CLI
file hashes are distinct; dataset byte/whitespace drift changes its binding.

Regenerate only public R2 fixtures intentionally with
`node apps/recognition-lab/fixtures/r2/generate.mjs`; R0/R1 files remain intact.
Self-check: `docs/recognition/reports/R2_PREPARATION.md`. Stop after RB2-03 for
independent coordinator audit; do not start R3 or M12.
