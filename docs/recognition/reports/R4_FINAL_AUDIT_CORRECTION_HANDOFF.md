# R4 FA-01 / FA-02 / FA-04 correction handoff

2026-10-02. Implementer evidence only; independent acceptance remains pending.
Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch `plan/m8-unified-scanner`; unchanged HEAD
`66ea3fc22595a48d7355d1729bb879496cc98896`.

## Changes and contract

- **FA-01:** The exported evaluator and direct facade now require the complete
  `lab-retrieval-freeze-v1` R4 wrapper for holdout, including its R2 candidate
  freeze and exact gallery binding. The existing helper/schema moved into
  retrievalGallery to avoid a facade/evaluation import cycle; evaluation retains
  compatibility re-exports. The helper returns the full wrapper, so the existing
  CLI passes the same contract without a CLI source edit. Missing/inner-only
  freezes, selection/revision/store/reference drift and config overrides reject
  before query iteration or metrics, including unavailable-cache evaluation.
  Non-holdout inputs cannot carry a holdout freeze. Inputs are copied at entry.
- **FA-02:** Contexts bind the full gallery hash and a UUID per facade incarnation,
  alongside existing store/session/candidate/generation fields. Old contexts
  return STALE before loader execution on replacement facades with the same
  session, whether selection/config changed or remained identical. Fresh contexts
  succeed. Cancellation, closed-session invalidation, pending-result mutation
  checks and one-flight behavior remain covered. Incarnation IDs stay out of
  public reports; no production lifecycle machinery was introduced.
- **FA-04:** Preflight compares exact bigint device/inode identity for all
  supplied source files/assets and existing report/cache destinations, plus
  canonical paths. It rejects distinct destinations sharing physical identity.
  Future destinations bind their nearest existing physical ancestor and remaining
  path components, detecting long/8.3 aliases before creation too. Existing
  link/hardlink/ancestor checks and all-before-write CLI preflight remain in place.
  Source list inspection includes manifest, every asset, candidate, bundle,
  selection, config/config-list and frozen input.

No ranking, thresholds, R2/R3 implementations, production RecognitionService,
shared contracts, model/runtime, schema or business behavior changed. No migration
or dependency added. Generic recorded single-query decisions remain tooling,
not evidence of accepted holdout quality.

## Files and exact SHA-256

Seven existing files changed; three files added including this handoff. Paths
below are relative to the checkout. This document's own final hash is in the
ignored `runs/r4-final-correction/scope-final.json` to avoid a self-reference.

| File | SHA-256 |
| --- | --- |
| apps/recognition-lab/src/retrieval.ts | d3a212ec134687ca23f496df9f53ab4b7fdf70240f5eac8dc4ee5fb003d2b064 |
| apps/recognition-lab/src/retrievalEvaluation.ts | 5f6960ed52a6a3f73aac099ff738491d9238c4a9c29351e0885593508b8366c4 |
| apps/recognition-lab/src/retrievalGallery.ts | 4c1219e3a29b5ad9865c055f59f4344f1ea1c4593815bc42227007e55d2cfeaf |
| apps/recognition-lab/src/retrievalPaths.ts | 152350dbf01aa842ab037674162e04e7b596e407044073a9558a879184dd5316 |
| apps/recognition-lab/__tests__/retrievalHelpers.ts | c0f3c0a4ab01e491ff623cb039e476c1611c5a6092b61e689e00c30c974f745f |
| apps/recognition-lab/__tests__/retrieval.test.ts | a9f83c6b9acb1021370ae0f57b2eb1bbf09c7d1c80df5f63bfd597f3ae034c7c |
| apps/recognition-lab/RETRIEVAL_PREPARATION.md | d9873629bcaae206fd4ed0705f4f18553b23b659a7d2a80aab27468d8470bdd2 |
| apps/recognition-lab/__tests__/retrievalCorrections.test.ts (new) | a9113ad71079846f55a5cbbd3af598685c5394211ad85476841fd4798704eae2 |
| apps/recognition-lab/__tests__/retrievalOutput.test.ts (new) | e6f74e032a9841b2d21020f8ee264f8a88295203724a8279b8a4262cd3179552 |

The original immutable audit probe remains SHA-256
`230b5fba31399af0fc1c8055b155752c70e01282aa99610868246475893a3814`.
The ignored coordinator sibling probe remains
`c9a068ed4a8e492c5d1154a7d2af44efd44c8f379fae255ddfefab09f3157b9b`.

## Verification and preserved failed attempts

Every command ran from the exact checkout using the installed Node 24.21.0,
with `C:\Users\doyew\.cache\cosi-toolchain\node-v24.21.0-win-x64`
prepended to PATH. Logs below are under
`apps/recognition-lab/runs/r4-final-correction/` and remain ignored.

1. Before source repair, the unchanged audit repro exited0 and reproduced the
   direct-evaluator eight-query bypass and identical old/replacement contexts
   returning DECISION. Accepted R2/R3 repairs already exited1 without sentinel
   changes (`audit-before.log`).
2. Newly written regressions first hit a Jest harness issue: retrievalPaths uses
   import.meta.url, incompatible with direct Jest CommonJS import. Changed only
   the new test harness to invoke that module using actual standalone Node.
   Preserved `regressions-before.log`. Corrected pre-repair run: **20 failed,
   13 passed, 33 total; 2 suites; 43.65s; exit1**
   (`regressions-before-corrected.log`). All three defects were reproduced,
   including actual host Windows 8.3 output aliases.
3. Initial repaired six-suite focused run: **111 passed; 6 suites; 109.836s;
   exit0** (`focused-after.log`). Typecheck0; lint1 for one unused import in the
   new output test (`typecheck-after.log`, `lint-after.log`). Removed that import.
4. Added matching actual CLI freeze cases. Extended six-suite run: **117 passed,
   1 failed; 6 suites; 130.183s; exit1** (`focused-final.log`). The store case's
   copied manifest was outside its declared root, so DATASET_INTEGRITY preceded
   freeze validation. Corrected only this new fixture by copying manifest/assets
   under one declared root; no product fix was needed. The guarded full run did
   not start after that failure.
5. Final focused correction suite: **18 passed; 1 suite; 14.862s; exit0**
   (`freeze-final.log`). Covers seven API+facade rejection cases, exact valid
   wrapper, three same-session reincarnation cases and seven actual CLI cases.
   CLI rejection leaves both pre-existing reports and cache hashes unchanged.
6. Full lab result: **407 passed, 2 existing native file-symlink skips, 409 total;
   22/22 suites; 327.403s; exit0** (`full-final.log`). All40 newly added regression
   cases passed. The2 skips belong to accepted R3 host EPERM limitations.
7. Final lab typecheck and zero-warning lint: **exit0 each**
   (`typecheck-final2.log`, `lint-final2.log`).

Exact commands:

```powershell
npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/retrievalCorrections.test.ts __tests__/retrievalOutput.test.ts __tests__/retrieval.test.ts __tests__/retrievalCache.test.ts __tests__/retrievalEvaluation.test.ts __tests__/retrievalCli.test.ts
npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/retrievalCorrections.test.ts
npm test --workspace @retail/recognition-lab
npm run typecheck --workspace @retail/recognition-lab
npm run lint --workspace @retail/recognition-lab
node docs/recognition/reports/R1_R4_FINAL_AUDIT_REPRO.mjs
node apps/recognition-lab/runs/coordinator-siblings.mjs
node apps/recognition-lab/runs/r4-verification/standalone.mjs
node apps/recognition-lab/runs/r4-final-correction/frozen-alias.mjs
node apps/recognition-lab/runs/r4-final-correction/scope.mjs
git diff --check
```

## Executable path and positive behavior evidence

- The new output suite has **22 cases**: all six calibration/evaluation/cache
  destinations with hardlinks, all six with direct source aliases, valid fresh
  nested/repeated output, six actual Windows 8.3 source aliases, existing distinct
  target aliases, not-yet-existing distinct aliases, and a guard loop across all
  six ordinary explicit input roles plus every dataset asset. Nine native 8.3
  test cases executed on this host; none of these were mocks or skips.
- Extra real Windows holdout proof `frozen-alias.mjs`: full valid R4 frozen input
  at long-path gallery.json, short-path cache/output spelling; CLI1,
  OUTPUT_INPUT_COLLISION, frozen input and both reports hash-identical
  (`frozen-alias.log`, `frozen-alias-evidence.json`).
- Unchanged coordinator sibling probe exits0 as a diagnostic; **R4-short-alias
  CLI1, overwritten=false**. R0 validate still exits0/overwritten=true and R1
  readiness exits2/overwritten=true on disposable ignored sentinels. These are
  the known next-owner defects, not repaired here (`siblings-after.log`).
- Unchanged historical final-audit probe now exits1 at its deliberately supplied
  inner-only R2 freeze with RETRIEVAL_NOT_FROZEN (`audit-after.log`). It therefore
  never reaches its later probes; do not call that script a passing full audit.
  New direct/context tests and the separate unchanged sibling probe supply
  post-repair evidence. The historical script was not rewritten to pass.
- Existing standalone verification: **25 expected CLI exits; exit0**. Guide
  examples give 0,0,0,2; valid holdout preserves eight queries and one authored
  TIMEOUT. Exact cache/decision/metric parity and repeat summaries remain valid
  except labelled timings (`standalone-final.log`, runs/r4-standalone/assertions.json).
  Native file-symlink creation returned EPERM: executable file-symlink coverage
  remains unverified. Actual junction/hardlink/8.3 cases ran.

## Scope, limits and next action

Intake SHA-256 baseline: **526 nonignored files**. Final scope: **529 files;
519 protected files unchanged; exactly7 assigned existing edits and3 additions;
no unexpected mutation**. Includes preserved coordinator PROJECT_STATE/workflows/
tickets, R0/R1/R2/R3 sources/docs, production/mobile/shared code and original
audit proof. Ignored runs contain only logs, scripts and disposable toy outputs.
Final scope hashes and this handoff hash are in scope-final.json. Whitespace
verification: **git diff --check exit0 and all10 changed/added files clean**.
Git only reports pre-existing CRLF-normalization notices for other-owner files.
No branch/HEAD change, staging,
commit, push, install, network service, phone/adb/Metro/Docker, model download,
deployment or subagent work.

This is sequential local filesystem preparation. No hostile filesystem race,
atomic multi-report transaction, authenticated provenance, secrecy of holdout
data or prevention of deliberate human retuning is claimed. UUID contexts and
toy files are not production scanner/session/cache acceptance. Root/mobile/native
checks were not run because these changes are confined to the headless lab.

All lawful real photos/curation, exact model rights/weights/export/runtime,
actual encoder execution, Galaxy A15/lower-spec physical measurements, independent
frozen real-data quality and founder-return combined Astra review remain pending.
No R5/M12 or production acceptance. Next: coordinator independent FA-01/02/04
review, then the already assigned sequential shared R0/R1 CLI correction. Work
stops after final evidence and the one founder-authorized coordinator handoff.
