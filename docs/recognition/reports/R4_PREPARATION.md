# R4 preparation — stopped implementation self-check

Date:2026-10-02. Implementer chat01a0fc05-ee01-7852-ac66-537cfd9c2a04.
Assigned GPT-6.1 Sol HIGH; no model switch or subagent used. This is self-check
evidence, not independent source acceptance, real recognition quality or native
acceptance. Work milestone R4 preparation is distinct from evaluation phases R0–R3.

Outcome: RB4-01..03 implemented within the published preparation packet. All
commands/edits stop before the one founder-authorized direct report-back to
coordinator01a098ef-d830-7531-bca7-2d66b0a5b587. Actual delivery is recorded by the
chat tool after this report; this document does not claim future delivery.
Coordinator owns independent source audit. The R1–R4 cycle then stops for founder
return, combined Astra audit and later physical work. No R5/M12 starts here.

## Checkout, objective and protected boundary

All shell commands used explicit cwd:
`C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch:plan/m8-unified-scanner.
HEAD:66ea3fc22595a48d7355d1729bb879496cc98896, unchanged.
Saved COSI cwd was not used for Git/read/write work. No alternate checkout,
clone, branch/worktree creation, reset/discard, commit/push/merge or install.

Initial inspection:pwd/branch/HEAD/status/log/diff summary matched dispatch;
13 tracked files modified and the untracked lab/report groups were already intentional.
The existing R0–R3 lab/reports and root/native/documentation work were preserved.
Baseline SHA256 inventory captured502 nonignored tracked/untracked files before
source edits in ignored runs/r4-verification/baseline.json. Only three existing
assigned self-check files may change. All499 protected files remain byte-identical,
including accepted R0–R3 source/tests/fixtures/guides/reports, coordinator plans/
acceptance, contexts, workflow index, production contracts/mobile/shared packages,
package/lockfiles and root scripts. Final scope-check.json lists14 new nonignored
files and exactly those three permitted changed files.

Read AGENTS, PROJECT_STATE, model/sequential policy section1.1, workflow index/
Track B record, project context, root ticket routing, Track B/R4 plan/tickets in
full, R2/R3 independent reviews, work-R4 BUILD_PLAN, store/package/cache/failure
architecture/test rules and D-017..22/D-030. Used coding/testing skills; inspected
existing adapter/ranking/importer/calibration/freeze/metrics and R0–R3 seams/tests.
No adjacent GLOBAL_MEMORY.md or .agents/GLOBAL_MEMORY.md was present; repository
workflow/context router and supplied policy provided task routing. No global
policy/memory or architecture decision was edited.

Objective: lab-only store-selected recorded-query retrieval, exact disposable
cache and evaluated CLI. Highest risks: foreign/stale bindings, caller mutation,
failure-denominator loss, holdout bypass and filesystem output overwriting inputs.
Recovery: new local lab files and assigned self-check text only; source remains
uncommitted. No business persistence, migration, security/RecognitionService
contract, prices/conversions/sales/inventory/sync/camera or native policy changes.
No dependencies/downloads/model execution, phone/adb/Metro/Docker/backend/cloud/
spending/deploy. This packet makes no production storage/model/runtime choice.

## Files and implementation

New source under apps/recognition-lab/src:

- retrievalGallery.ts: strict active-selection/store/product/package validation;
  exact imported dataset/candidate/model/preprocessing/reference/selection binding;
  all selected product views; zero-stock identity retained; R2 adaptPrecomputed
  and central unitVector reused. Empty, failed, missing, duplicate or foreign
  galleries reject instead of partially accepting. Query evidence never enrolls.
- retrieval.ts: copied gallery/config/query facade using existing rank. Explicit
  DECISION STRONG/AMBIGUOUS/UNKNOWN with package confirmation, and INVALID/
  UNAVAILABLE/FAILURE/TIMEOUT/CANCELLED/STALE/BUSY fallback states. Strict current
  store/session/candidate/generation check, one pending request per facade,
  AbortSignal cancellation and permanent close before replacement. Controlled
  loaders are recorded-output seams only. Returned/caller arrays cannot change
  later results. R2 candidate freeze is mandatory for direct holdout queries.
- retrievalCache.ts: serializable lab-derived-gallery-v1 with exact schema/content
  checksum plus current-source equality validation, even on rechecksummed tampering.
  Missing/corrupt/incompatible cache means unavailable/rebuild-required. Complete
  source normalization is recomputed on load; this is correctness preparation,
  not measured cache performance. No partial-corrupt acceptance or source edits.
- retrievalEvaluation.ts: accepted R2 calibration/freeze/evaluate seams and metrics
  reused. Complete enrolled selection required for R2 calibration; R4 wrapper binds
  store/selection/references too. Facade decision/rate parity self-check against
  same scoped R2 evaluation. Subset development queries retain full inventory and
  become unknown when absent from active gallery. No holdout tuning or winner.
- retrievalPaths.ts: confined explicit lab inputs, ignored runs report/cache
  outputs, every existing linked ancestor/target checked (including internal
  junctions and hardlinks), all-target preflight, and source/output collisions
  rejected before creation/write.
- retrievalCli.ts: standalone evaluate/calibrate commands, explicit cache build/
  reuse/rebuild, safe IDs/hashes/decisions/failure counts without vectors, source
  locators or free-text producer/declaration prose in JSON/Markdown summaries.

New tests under apps/recognition-lab/__tests__:
retrieval.test.ts, retrievalCache.test.ts, retrievalEvaluation.test.ts,
retrievalCli.test.ts and retrievalHelpers.ts. Added78 tests over accepted226.
New public authored fixture:fixtures/r4/selection.json (zero-stock examples).
Guide:apps/recognition-lab/RETRIEVAL_PREPARATION.md. This report is the14th new file.
Self-check updates only:TRACK_B_R4_TICKETS.md, recognition-track-b.json and
PROJECT_STATE.md. No coordinator acceptance checkbox/gate or other plan/context
was changed. No migrations or package/lockfile edits.

## Evidence actually run

Toolchain:existing Node24.21.0 at
`C:\Users\doyew\.cache\cosi-toolchain\node-v24.21.0-win-x64\node.exe`;
its directory prepended to process PATH for npm. No installs.

Commands from the exact checkout above:

```powershell
npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/retrieval.test.ts
npm test --workspace @retail/recognition-lab
npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/retrievalEvaluation.test.ts __tests__/retrievalCli.test.ts
npm run typecheck --workspace @retail/recognition-lab
npm run lint --workspace @retail/recognition-lab
node apps/recognition-lab/runs/r4-verification/standalone.mjs
node apps/recognition-lab/runs/r4-verification/protected-check.mjs
git diff --check
```

- RB4-01 corrected focused29 tests/one suite passed6.211s; lab typecheck and
  zero-warning lint exit0. Final suite includes four later boundary regressions.
- RB4-02 full280 tests/16 suites passed122.322s; lab typecheck/lint exit0.
- RB4-03 initial focused19 tests/two suites passed47.679s; types/lint exit0.
  Five later tests cover actual switches/context/collision. Counts overlap and
  are not extra unique tests.
- Final full304 tests/18 suites passed176.308s, exit0. Logs:ignored
  runs/r4-verification/final-tests.log. All226 prior R0–R3 tests retained.
- Final typecheck exit0 and final corrected lint exit0/max-warnings0:
  final-typecheck-corrected.log and final-lint-corrected.log. The only change
  during the full run was consolidation of duplicate test-helper imports;
  no runtime/behavior edit followed the final full run.
- Actual standalone harness25 cases, all expected exits, final exit0. Exact
  argv/expected/actual/stderr retained in runs/r4-standalone/invocations.json;
  assertions.json records deterministic fields, cache decision/metric parity,
  eight holdout queries/one failure and file-symlink limitation. Includes the
  four exact guide commands with exits0/0/0/2, repeat reuse, development failure,
  missing/corrupt/foreign cache/rebuild, failed reference, cross-store/package,
  invalid vector, unfrozen holdout/tuning, lexical and linked input/output/report/
  cache targets and input/output source collision. Jest CLI cases are additional
  self-check execution, not independent audit counts.
- Discriminating tests: every grouped reference, product/package ties, unknown
  refusal, failed reference/full blocked counts, TIMEOUT/query failures, active
  selection changes, store/model/gallery switches, independent mutation of
  source/config/context/snapshot/result/loader record, controlled-promise
  cancel/stale/rejection/busy, exact cache decisions/metrics and rechecksummed
  ownership/model/vector/content tampering. No sleeps used as concurrency oracle.
- R4 CLI summaries exclude vectors/asset locators/checkout paths; a deliberately
  supplied private-path producer/declaration string is omitted too. Cache vectors
  are only public authored toy-derived files in ignored runs.
- Installed Ajv2020 + ajv-formats validates workflow index and active Track B
  workflow. git diff --check exits0. Final scope-check.json recomputes all499
  protected baseline hashes:zero mismatches. Fresh branch/HEAD/status captured.

Authored holdout counts remain intentionally unsafe:8 selected,6 known/2 unknown,
7 successful/1 TIMEOUT,4 STRONG/2 AMBIGUOUS/1 UNKNOWN. Joint STRONG precision2/4,
known product top1 4/6, unknown false STRONG1/2. Package-tie needs confirmation.
Calibration:3 selected,2 STRONG (one unsafe lookalike),1 UNKNOWN. No quality/beta
target is passed by these vectors; metric parity proves tooling mechanics only.

## Failed attempts and residual limits

All failed logs remain in ignored verification output:

- First RB4-01 run:15 failed/14 passed because new selection/test expected names
  single-a/pack-a differed from established single/pack. Corrected only new files.
- Second run:3 failed/26 passed because Jest toMatchObject expected one candidate
  array while accepted rank correctly returned three. Corrected only assertions;
  third run29 passed. No ranking/config/threshold change.
- Final first lint returned1 for two duplicate helper-import warnings in new
  tests. Consolidated imports; final zero-warning lint0. Typechecks stayed0.
- Ignored protected-check helper initially used one too many parent segments in
  its Ajv module path (ERR_MODULE_NOT_FOUND; no alternate checkout search or file
  loaded). Corrected to installed checkout-local module. Its broad all-workflow
  assertion then exposed an existing M2 schema mismatch. Final helper retains
  all workflow validation results and asserts the active/index checks required
  for this packet; it does not claim all historical records pass.
- Pre-existing .agents/workflows/m2-catalogue-package-units.json has
  acceptance_gates[4].verification.kind outside the current schema enum. It is
  protected/unchanged and outside assigned correction scope. Eight other records,
  including Track B, validate. Coordinator may triage M2 separately.
- True file-symlink creation denied Windows EPERM in the actual standalone
  attempt. Executable true file-symlink case remains unverified. Directory
  junctions and actual hardlinked file targets passed rejection tests; source
  lstat guard also rejects symbolic/dangling links. No privilege/settings change.

These are specification and repository-rule self-checks, not an independent
audit. Importer checks do not prove physical capture independence, rights,
producer execution or human holdout secrecy. One-flight control is per facade;
close/cancel invalidates output but cannot terminate an uncooperative loader or
implement a global/native queue. File checks assume the authorized sequential
local run; no concurrent multi-user filesystem race guarantee is claimed.
Plain JSON is disposable lab preparation, not production SQLite/storage adoption.
Node postprocessing timings are explicitly nondeterministic and not inference/
Android latency. No root/mobile/native/physical checks were rerun because those
protected surfaces did not change. They remain deferred, not passed.

Pending:real founder captures/curation and independent holdout, exact weights/
code and weight rights/export/native compatibility, executed real encoders,
Galaxy A15 plus lower-spec physical latency/memory/disk/sustained/offline/
numerical equivalence, actual Android cache/lifecycle/persistence, representative
product/package/open-set coverage and R4 quality. Existing beta targets unchanged.
Source acceptance awaits coordinator R4 audit; final combined Astra review awaits
founder return. No final model/runtime/tolerance or real-data/device/M12 acceptance.

Next safe action: coordinator independently audits this stopped R4 packet using
the actual new files and evidence. Return only bounded corrections if needed;
otherwise stop the R1–R4 cycle for founder-return combined review and later
physical work. The implementer sends one authorized STOPPED report and waits.
