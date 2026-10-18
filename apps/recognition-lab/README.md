# Recognition lab — R0 tooling and R1/R2 preparation

**SYNTHETIC TOOLING-ONLY — NOT RECOGNITION ACCURACY.**

Work milestone R0 / evaluation setup with tiny authored fixtures. This is a
headless Node lab. No encoder, camera, image decoder, production contract imports,
network calls or real-data accuracy results. The checked-in v2 dataset contains
20 unique text assets: six references, three development queries, three calibration
queries and eight holdout queries. Vector values are authored, not image features.
A real manifest can be integrity-checked; a real recognition run is unavailable.
Execution accepts only authored-vector-v1 / identity-v1 adapter metadata;
unsupported adapter/preprocessing IDs fail instead of claiming they ran.

R2 adds a separate [recorded-output comparison CLI](ENCODER_COMPARISON.md).
**Its precomputed adapter DOES NOT execute an encoder.** Exact candidate/bundle
bindings, identical populations and candidate-bound freezes are preparation
tooling. Public authored toy comparisons establish no model/real-data/native
accuracy or licence acceptance. Actual R1 photos, real R2 execution/licences and
R3/R4 physical/quality gates remain pending, not waived. R0/R1 commands below
retain their original contracts.

## Local setup and commands

Use repository root, Node **24.21.0**, npm **11.19.0**, Git and the existing locked
dependencies. On a new laptop, dependency setup must first be authorized; normal
`npm ci` uses package-lock.json. No new ML/Python/native tooling is required.
This assignment performed only an offline package-lock-only update, with scripts,
audit and funding disabled; no dependency download/install or npm ci was run.

Compiler: **TypeScript6.0.3** explicitly reused from mobile's local installation
(root currently hoists5.9.3). Jest **29.7.0**, Babel preset Expo **57.0.11**,
ESLint **9.39.5**, eslint-config-expo **57.0.2**, Zod **4.6.4** are reused from
the existing lockfile. Node's native TypeScript stripping executes the CLI;
erasableSyntaxOnly prevents unsupported runtime syntax.

```powershell
npm test --workspace @retail/recognition-lab
npm run typecheck --workspace @retail/recognition-lab
npm run lint --workspace @retail/recognition-lab
npm run fixture --workspace @retail/recognition-lab
npm run validate
```

Fixture writes per-query machine results, metrics and readable summary to ignored
`apps/recognition-lab/runs/development/`. It intentionally includes an adapter
failure and exits2. **CLI exit0** means a completed failure-free run or valid
import; **exit1** means rejected input/run; **exit2** means completed report with
query failures. npm relays nonzero results as lifecycle errors. Inspect each
command's exit and generated report; old output in a reused directory does not
establish success after a rejected command. Automated Jest tests assert these
exact exit semantics and repeatability. Root validation includes lab tests/types/
zero-warning lint. Its source-only environment check checks Node/npm/Git and skips
optional adb/java/docker probes; ordinary check:environment retains those probes.

From root, validate assets, sweep calibration only, explicitly choose configuration0
for the authored toy fixture, then run holdout with that frozen configuration:

```powershell
node apps/recognition-lab/src/cli.ts validate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --out apps/recognition-lab/runs/integrity
node apps/recognition-lab/src/cli.ts sweep --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split calibration --configs apps/recognition-lab/fixtures/configs.json --choose 0 --out apps/recognition-lab/runs/calibration
node apps/recognition-lab/src/cli.ts run --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split holdout --frozen apps/recognition-lab/runs/calibration/frozen-config.json --out apps/recognition-lab/runs/holdout
```

The last command intentionally exits2 for a TIMEOUT observation. The sweep has two
configs and exits0. For development/calibration single runs, optional --config
accepts a config JSON; holdout rejects --config and requires --frozen. Sweeps reject
development/holdout. Frozen config binds dataset bytes, calibration query IDs and
config checksum. This detects accidental drift; it is not signing, tamper-proof
storage or enforcement of human non-retuning. Real holdout must be sealed by its
curator before tuning. This public toy holdout is measurement-test data, not an
independent recognition-quality test.

All shared R0/R1 CLI commands (`validate`, `run`, `sweep`, `readiness`) require
output beneath ignored `apps/recognition-lab/runs/`. The complete command output
set is preflighted before any directory creation or write, including Markdown
and frozen-config secondary files. Symlink/junction ancestors or final targets,
dangling links, hard-linked files and non-file destinations reject. Manifest,
every declared asset and supplied config/configs/frozen/curation files are protected
against output replacement, including invalid or missing inputs. Canonical paths
and exact bigint device/inode identities detect Windows8.3 aliases; missing
destinations also bind to their nearest existing physical ancestor. Physically
aliased output targets reject. Fresh nested directories and regular-file report
rewrites remain supported. Output/input preflight failures exit1 with sanitized
diagnostics and leave all reports/inputs untouched. This assumes sequential local
filesystem use; it is not a hostile-race guard or atomic multi-report transaction.

## Measurement rules

References aggregate by product/package using maximum cosine similarity.
Distinct products form product top3; distinct product/package pairs form package
top3. Repeated views never take another identity's slot. Stable ASCII code-unit
ordering breaks display ties; epsilon ties cannot become STRONG even with zero
margin. Uncertain package yields null and AMBIGUOUS. Scores are not probabilities.
An unknown with an indistinguishable vector can still receive STRONG; the fixture
deliberately exposes this false acceptance. No unknown-safety claim is made.

Every metric includes numerator, denominator and value; empty populations use
null/N/A. Known retrieval, coverage and unknown recall include failed queries.
Product top1/top3 measure raw retrieval, including refused rankings.
`knownSimulatedDisplayRecovery` uses the recorded lab policy
`strong-primary-ambiguous-top3-v1`: STRONG exposes its primary product only,
AMBIGUOUS exposes the three distinct products, and UNKNOWN/FAILURE expose none.
Its denominator includes all known queries, including failures. This is a
simulated policy, not rendered UI or measured user recovery. Package top1 is conservative: an uncertain
package does not count correct. Package top3 measures raw pair recovery. STRONG
joint precision requires correct product and labelled package; its denominator is
only STRONG outcomes with non-null package ground truth, including labelled wrong
products and unknown false positives. All-unlabelled STRONG populations report
N/A. Missing package truth is neither package-correct nor package-wrong; product
precision is shown separately across all STRONG outcomes. `packageLabels` shows
labelled/missing counts for all, known and STRONG queries. `packageLabelCoverage`
is labelled/all queries; `strongJointLabelCoverage` is labelled STRONG/all STRONG.
Zero denominators report N/A. Claimed package accuracy is joint correctness among STRONG
claims with package-labelled truth, including false acceptance of unknowns.
This avoids rewarding the same generic package name on a wrong product.
Claim coverage is displayed beside precision. Confusion cases show wrong products,
wrong/uncertain packages, false STRONG unknowns, refused knowns and runtime failures.

Latency records actual synthetic Node tool execution, including failed queries,
with all/success/failure populations. Median is reported; nearest-rank p90 requires
10 samples and p95 requires20, otherwise null. These sample limits are descriptive,
not statistical confidence or Android evidence. Timeout observations are injected
fixture failures, not measurements of a real model deadline.

Run provenance includes commit, branch, dirty state and SHA256 of status plus
tracked/staged diff and sorted nonignored untracked content hashes. It records
dataset bytes hash, adapter/preprocessing/space/dimension, ranking/config/hash,
frozen config (holdout), runtime versions/platform/architecture and seed=null
(no randomness). StartedAt, per-query elapsedMs and derived timing distributions
are explicitly nondeterministic. No diff content or private absolute image paths
are emitted. Ignored runs cannot change the next input fingerprint. The CLI Jest
tests compare every remaining field across actual Node runs.

DATASET_CAPTURE.md covers integrity, privacy, curator review and R1 preparation.
The v2 source fixture can be regenerated intentionally with
`node apps/recognition-lab/fixtures/generate-initial.mjs`; checked-in LF attributes
preserve exact asset bytes on Windows. Do not alter a real dataset version in place.
No real image assets or models are available in R0. Missing assets fail rather
than silently falling back to synthetic observations.

## R1 readiness preparation

RB1-01..03 adds empty capture worksheets/templates, a strict lab-local curator
sidecar and readiness reports through the existing importer. No real photos,
decoder, encoder or recognition model was added. RB1-04 remains pending founder
capture; R1 preparation source was accepted in reports/R1_INDEPENDENT_REVIEW.md.
Read `DATASET_CAPTURE.md` and `templates/r1-v1/README.md` before later collection.

```powershell
node apps/recognition-lab/src/cli.ts readiness --manifest apps/recognition-lab/templates/r1-v1/dataset.json --dataset-root apps/recognition-lab/templates/r1-v1 --curation apps/recognition-lab/templates/r1-v1/curation.json --out apps/recognition-lab/runs/r1-empty
node apps/recognition-lab/src/cli.ts readiness --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --curation apps/recognition-lab/fixtures/r1-curation.json --out apps/recognition-lab/runs/r1-fixture
```

Both examples deliberately exit2: valid but incomplete, **realDatasetReady=false**.
The first contains no captures/consent; the second contains R0 authored text/vectors
with no completed reviews or seal. Reports are `readiness.json` and `readiness.md`.
Every field is deterministic for identical manifest/assets/sidecar bytes. Exact
manifest and sidecar hashes are recorded; even manifest whitespace drift makes a
previous non-null binding invalid. No timings, scores or Git scan are needed.

Readiness accepts exactly --manifest, --dataset-root, --curation and --out; curation
is confined to the explicit root. Use ignored runs for output. For this command,
exit0 is recorded preparation readiness eligible for independent curator acceptance,
exit2 is valid incomplete input, exit1 is invalid input/arguments/I/O. Independent
acceptance is never automated. Invalid dataset/sidecar input emits INVALID reports
only after output/input preflight passes. Even an error report cannot replace an
invalid or missing input at an output target. Argument/preflight/output-I/O
rejection may leave previous files. Always inspect the exit.
No real ready example is supplied or claimed. Existing R0 exits remain unchanged.

Reports separate integrity/review/coverage/seal/real-data gates. Capture targets
and exact count/denominator gaps are versioned preparation guidance, not evidence
of recognition accuracy. A full authored test set can meet structural coverage
and recorded seal targets but remains explicitly synthetic and real-ineligible.
Human image usability/rights/physical independence flags and checksum seals are
recorded attestations/change detection, not automated proof. Missing/rejected
reviews cannot be silently removed; rejected assets require a revised manifest.

R2 preparation stops after handoff for coordinator audit. Actual real data,
encoders, R3 Android benchmarks, R4 accuracy and production/M12 gates remain pending.
