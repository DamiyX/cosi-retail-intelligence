# R2 independent preparation review

Date:2026-10-02. Coordinator review after stopped report-back from chat
01a0fbba-0b16-7fb2-a39c-d09fdb6e4065. Checkout COSI-m8-planning, branch
plan/m8-unified-scanner, HEAD66ea3fc22595a48d7355d1729bb879496cc98896.
All changes remain uncommitted; original unrelated work preserved.

Decision: accept RB2-01..03 preparation/source only. No blocking specification
or repository-standard finding in this review. Actual encoder execution, model
rights, real-image accuracy, native performance and production adoption remain
pending. There is no selected model/runtime or measured Android result.

Scope: five R2 source modules, four test modules, public toy bundles/declarations,
CLI/reporting guide and ledger updates. Traced declaration -> exact bundle/input
binding -> own-space gallery -> failure-inclusive metrics -> calibration-only
choice -> candidate/dataset/config-bound holdout. Checked rejection and output
confinement/privacy paths. Existing R0/R1 metrics are reused; no business schema,
production source, package versions, ML/native dependencies or threshold change.

Specification: same query population is maintained, reference failures stop
setup with null metrics, query failures remain in denominators, missing-package
label coverage remains explicit, and raw retrieval differs from simulated display
recovery. Holdout requires a matching freeze and rejects configuration overrides.
Standards: confined explicit asset input and ignored output, no arbitrary producer
execution or remote fetch, no automated rights/model acceptance, and separate
unverified producer timing versus measured Node postprocessing. Hashes detect
accidental drift; they do not prove signed provenance or prevent deliberate tuning.

## Fresh evidence

- npm test --workspace @retail/recognition-lab:172 tests/11 suites passed,
  93.352 seconds, exit0.
- npm run typecheck --workspace @retail/recognition-lab:exit0.
- npm run lint --workspace @retail/recognition-lab:exit0, max warnings0.
- Coordinator-authored actual CLI harness in ignored
  apps/recognition-lab/runs/r2-independent-check.mjs:7 cases passed expected exits.
  Calibration A/B0/0, holdout2, wrong freeze1, config override1, reference-failure2,
  stale asset1. Its audit-results.json retains argv/results.
- Independent output assertions:8 holdout queries per candidate with1 failure,
  known top1 count4/6, no winner and no real benchmark acceptance. Failed-reference
  setup retains selected3/evaluated0/blocked3, null metrics/results and the
  separately declared ADAPTER_ERROR query. No failure is converted into UNKNOWN.

Two audit-helper assumptions failed first: the known-top1 field was incorrectly
named, then an exact-object assertion omitted reportedQueryFailures. Inspected
actual schema/output and corrected only the ignored helper; final assertions pass.
Neither was an implementation defect; no production repair occurred.

Root/business tests, Expo/native/device checks and real encoder execution were
not rerun for this isolated lab addition. Builder172-test/16-CLI/scope-hash evidence
is separately recorded in R2_PREPARATION.md; these are not extra independent counts.
Precomputed authored toy vectors prove evaluator mechanics only. R1 real photos,
exact artifact/rights/execution review, two-device measurement and R4 real holdout
remain required. Founder explicitly defers physical tests until return.

Next: coordinator prepares and dispatches R3 benchmark-record preparation, then
stops. No actual device/native runner, runtime adoption or M12 integration follows
from this review. Final combined Astra review awaits founder return.
