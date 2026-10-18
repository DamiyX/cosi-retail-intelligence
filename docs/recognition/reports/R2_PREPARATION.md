# R2 preparation implementation self-check

2026-10-02 Africa/Lagos. Work milestone R2 / evaluation setup only.
Chat01a0fbba-0b16-7fb2-a39c-d09fdb6e4065 from CODEX_THREAD_ID; requested Sol6.1
HIGH, UI setting not verified by source tools. Coordinator01a098ef-d830-7531-bca7-2d66b0a5b587.
RB2-01..03 implemented/self-checked sequentially; no subagents/parallel work.
**Independent source acceptance PENDING. Actual encoder benchmark PENDING.**
All commands/edits stop before the authorized final report-back; coordinator
reviews after stop. No R3/R4 implementation begins in this chat.

**PRECOMPUTED OUTPUTS ONLY. The adapter DOES NOT execute an encoder.** Toy outputs
establish no model/real-data/native accuracy, rights approval or final choice.
Actual R1 photos/rights/curation, exact real R2 artifacts/licences/preprocessing/
export/runtime review and execution, R3 devices and R4 real quality/calibration/
holdout gates remain pending, NOT waived.

## Change and scope

Objective: strict recorded-output provenance, identical failure-inclusive comparison
populations (at most3 candidates), candidate-specific calibration/frozen holdout.
Highest-risk assumption: declared provenance could be mistaken for inference or
failures/missing labels could disappear. Explicit labels/accounting prevent those
claims; human attestations and actual producer execution remain unverified.

RB2-01: draft/toy/recorded-reviewed-real declarations. Draft family facts are null,
with no invented artifact hash/dimension/licence approval. Exact executable model/
artifact/preprocessing/space/dimension/review identities bind bundles to manifest
ID/version/kind/byte hash, split and entry/asset hashes. Missing/duplicate/orphan/
stale/foreign/nonfinite/zero/dimension/space inputs reject. Explicit failures remain.
The real schema-branch test uses named simulated test attestations only, not an
actual model/dataset/rights review.

RB2-02: own-space galleries reuse existing normalization/ranking and corrected R0
metrics. Missing package labels, failures, false STRONG, joint denominators and
simulated primary/top3/none display policy remain visible. A failed reference
prohibits gallery setup: SETUP_FAILURE, null metrics/results, selected/evaluated/
blocked counts and declared reference/query failures. No silent removal or UNKNOWN.
Reports keep normalized/raw-file hashes and missing gates, without vectors/image
bytes/discovered private paths. Explicit-root importer and ignored-run resolved
ancestor/junction checks apply. Review supplied free-text provenance before sharing.

RB2-03: calibration-only explicit config index and freeze binding candidate
declaration (artifact/preprocessing/space/dimension/review), calibration bundle,
dataset byte/content hash, ordered calibration/holdout entry+asset inventory and
chosen config/hash/index. CLI and comparison API reject unfrozen/cross-candidate/
config override/hash/query/split drift and holdout sweep/choice. No production
threshold or automatic winner. Checksums detect accidental drift, not signatures,
human holdout secrecy or deliberate retuning. Producer timing is UNVERIFIED;
elapsedMs/timing measure Node postprocessing only, never encoder/Android latency.

Added files, relative to sole authorized COSI-m8-planning checkout:

- apps/recognition-lab/src/:precomputed.ts, comparison.ts, comparisonCli.ts,
  candidateCalibration.ts, candidateFreeze.ts.
- apps/recognition-lab/__tests__/:precomputed.test.ts, comparison.test.ts,
  candidateCalibration.test.ts, comparisonCli.test.ts.
- apps/recognition-lab/fixtures/r2/:config.json, draft-registry.json, generate.mjs,
  inputs-development.json, inputs-calibration.json, inputs-holdout.json;
  toy-a.json/toy-b.json and each artifact/calibration/development/holdout JSON.
  Two authored mathematical recipes in separate3D/4D spaces, no real encoders.
- apps/recognition-lab/ENCODER_COMPARISON.md and this report.

Existing files changed:lab README.md, TRACK_B_R2_TICKETS.md,
.agents/workflows/recognition-track-b.json, PROJECT_STATE.md. Generated logs/scripts/
results stay in ignored runs/. No migrations/dependencies/package/lockfile/
production edits. Existing schema/importer/ranking/metrics/R0 calibration/CLI,
R1 curation/readiness/tests, historical reports and defect proof are byte-identical.
Reviewed R2 plan unchanged; ledger receives evidence/checkboxes, no rewritten scope.

## Actual verification

Versions:Node24.21.0, npm11.19.0, TypeScript6.0.3 (mobile local), Jest29.7.0,
ESLint9.39.5, Zod4.6.4, Babel preset Expo57.0.11. No installs/downloads/providers.
All command working directories:C:\Users\doyew\Documents\DEV 2\COSI-m8-planning.
No other-repository search/relocation/clone/new worktree.

| Check | Result |
| --- | --- |
| RB2-01 focused precomputed |35 tests/1 suite,6.45s; typecheck/lint0 |
| RB2-02 comparison after assertion correction |5 tests/1 suite,4.636s; types/lint0; actual development CLI2 |
| RB2-03 focused comparison/calibration/executable CLI |35 tests/3 suites,37.679s; types/lint0; overlaps earlier counts |
| npm test --workspace @retail/recognition-lab |172 tests/11 suites,94.105s, exit0; all original96 tests included |
| npm run typecheck --workspace @retail/recognition-lab |exit0 |
| npm run lint --workspace @retail/recognition-lab |exit0, --max-warnings=0 |
| node apps/recognition-lab/runs/r2-verification/verify.mjs |exit0;16 actual CLI cases with asserted expected exits |
| Baseline SHA256 scope check |446 protected pre-existing files unchanged;0 mismatches; four permitted files excepted |
| Final git diff --check / branch / HEAD / status |exit0; original CRLF notices; branch/HEAD unchanged below |

Fresh CLI argv, expected/actual and versions:ignored
apps/recognition-lab/runs/r2-verification/results.json. Cases:

| Case | Exit |
| --- | --- |
| development/calibration comparisons |2/0 |
| explicit A/B calibration freezes |0/0 |
| candidate-frozen holdout/repeat |2/2 |
| holdout choice/unfrozen/cross-freeze/config override |1/1/1/1 |
| stale asset/duplicate output/empty comparison |1/1/1 |
| failed-reference comparison |2; metrics/results null, selected3/evaluated0/blocked3 |
| injected calibration query failure |2; total3/failed1 retained |
| failed-reference calibration freeze |1 |

Each toy holdout:8 queries,6 known/2 unknown,1 TIMEOUT. Known top1=4/6, top3=5/6,
false STRONG unknown=1/2, STRONG joint precision=2/4, coverage=4/8, simulated display
recovery=5/6. Equal rates are intentional mathematical fixture equivalence, not
encoder quality. Comparison regressions exercise missing-package joint N/A and
wrong STRONG raw top3 retrieval1 with simulated primary recovery0. Repeated actual
holdout fields match after excluding declared elapsedMs/timing. JSON/readable
reports preserve failure counts/labels; output path junction/escape rejection is
exercised through actual Node CLI tests.

Failures corrected: privacy test initially matched prose word “values”; narrowed
oracle to JSON vector field. After adding the freeze guard, a stale-manifest test
expected the later adapter error; corrected oracle to earlier freeze rejection.
Both failures were visible before correction; final172-test suite passes. Guide/
report patch context mismatches were reapplied without source changes. Initial
inspection tried tests/ before finding __tests__/. Older Luna/Astra preferences
are superseded by current prompt/MULTI_AGENT_WORKFLOW1.1; no setting change inferred.

Logs:ignored runs/r2-verification/{full-lab,typecheck,lint,rb2-02-cli,rb2-02-tests,
rb2-03-focused,rb2-03-cli-tests,verification}.log; results.json,
baseline-hashes.json, scope-check.json. Main outputs:runs/r2-development,
r2-comparison-calibration, r2-calibration-a/b, r2-holdout/repeat and explicit
negative/setup/failure runs. CLI source fingerprints precede this final state/
report update; only authorized documentation/state changes follow tested sources.

## Stop and review boundary

Branch plan/m8-unified-scanner, HEAD66ea3fc22595a48d7355d1729bb879496cc98896,
unchanged; all work uncommitted. Extensive original R0/R1/coordinator/native pending
work remains intentional. Tracked Git status path set is unchanged from intake;
R2 additions are inside already-untracked lab/reports/task record. Four existing
files above changed; all other baseline bytes preserved. Historical defect proof
SHA256:f8bbdd08ab3b5c33ecf901fbbe70f5fdf750d93019b387eb28cf2e350de1ea2c.

No phone/adb/Metro/Docker/backend/cloud build/spend/deploy/commit/push/merge,
RecognitionService/shared schema/native/ranking/production threshold effect.
No unrelated root/mobile/domain/database rerun; earlier root checks are historical.
No physical/manual photo/licence/model acceptance. Rollback is limited to listed
R2 additions/four allowed files; never reset shared checkout or prior history.

Self-check preparation criteria passed; independent acceptance remains pending.
Next:coordinator independently audits this stopped RB2-01..03 packet and returns
any corrections to this chat/branch. Do not start R3/R4 or accept the source here.
Actual real/physical gates stay pending. Final handoff delivery is proved by the
chat tool/coordinator, not inferred from this report or checked acceptance.
