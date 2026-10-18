# R0 second independent audit and prepared correction handoff

Date: 2026-10-02. Founder requested a fresh review after switching models.
Decision: **changes required** for two metric/reporting defects. This supersedes
the earlier source acceptance in R0_INDEPENDENT_AUDIT.md. No implementation source
was changed and no message was sent to the implementation chat.

## Scope and evidence

Same stopped worktree COSI-m8-planning, branch plan/m8-unified-scanner,
HEAD66ea3fc22595a48d7355d1729bb879496cc98896; pending work remains uncommitted.
Reviewed all eight lab modules, five test suites, fixture/schema/configuration,
setup/capture instructions and root script/lockfile/environment changes. The
existing coordinator/native documentation diff is not new implementation work.
Production mobile/domain/contracts/Supabase code is unchanged.

The re-review challenged metric meaning against missing package labels and an
incorrect STRONG result with the correct product lower in the ranking. Both
counterexamples pass the actual dataset importer and exercise experiment + metrics.
Reproduce from repository root with pinned Node24:

```powershell
node docs/recognition/reports/R0_REAUDIT_REPRO.mjs
```

The script asserts current defects, not desired behavior; it exits0 when they are
reproduced. Future regression tests must assert the corrected outcomes instead.

Fresh existing suite: 51 tests/5 suites passed, 19.965s. Those tests do not cover
these counterexamples. Fresh lab typecheck and zero-warning lint also exited0.
The earlier full692-test suite remains historical builder
evidence; no second full mobile/database run was needed for isolated metric review.

## Specification findings

### R0-A2-01 — Medium: missing package truth is counted as correct joint precision

Location: apps/recognition-lab/src/metrics.ts, jointCorrect and strongJointPrecision.

The schema permits packageId=null. jointCorrect treats it as a wildcard success
whenever the product is correct. A valid known query with no package ground truth
and a STRONG predicted single package returns strongJointPrecision=1/1 (100%),
while claimedPackageAccuracy correctly returns N/A. Therefore the metric named
joint precision can claim verified product-and-package correctness without any
package evidence. A mixture of unlabeled and wrongly labeled cases can dilute
package mistakes in that combined metric.

Required correction: distinguish product correctness from evaluable joint
correctness. For joint precision, use explicitly package-labeled outcomes, report
N/A when none are evaluable, and expose the excluded/unlabeled population or label
coverage alongside the metric. Preserve wrong-product/unknown failures within
the applicable labeled denominator. Do not count an unlabeled outcome as package
correct or automatically package wrong. Existing product-only precision remains.
Clarify the definition in summary/README and record changed denominator semantics.

Regression acceptance: all-unlabeled STRONG results yield joint N/A with visible
missing-label count; mixing unlabeled outcomes with a labeled wrong package cannot
improve evaluated joint precision; labeled correct/wrong/unknown and zero-population
cases have independently hand-counted denominators.

### R0-A2-02 — Medium: internal alternatives are reported as shown recovery

Location: apps/recognition-lab/src/metrics.ts, knownTop3ShownRecovery.

A valid query for product B with the vector of A yields STRONG A, with B third in
the raw candidate array. strongProductPrecision=0/1 but knownTop3ShownRecovery=
1/1 (100%). The current predicate counts every non-UNKNOWN top-three ranking as
shown. No rendering or display-policy field establishes that these alternatives
are actually offered. SCANNING_ARCHITECTURE sections37–38 distinguish a prominent
STRONG candidate from an AMBIGUOUS choice list. The current metric silently assumes
the choice list also appears on STRONG outcomes.

Raw top-three retrieval=100% is valid in this example. Calling it shown recovery
is the unsupported part. Required correction: retain raw retrieval, and either
derive a clearly labeled simulated-policy recovery metric (STRONG primary only,
AMBIGUOUS top three, UNKNOWN/FAILURE none), or rename the existing metric as an
explicit candidate-eligibility statistic with no UI/recovery claim. The first
option provides a more useful benchmark and is recommended. Do not implement
production UI merely to justify a lab metric.

Regression acceptance: wrong STRONG primary with truth ranked second/third must
not count as primary-only policy recovery; the same ranking under AMBIGUOUS may
count; correct STRONG, UNKNOWN and FAILURE cases have documented expected results.
All metric names, summaries, fixture expectations and docs agree with the selected
definition. No assertion of actual user recovery before a UI experiment exists.

## Standards review and retained limits

No additional blocking boundary/dependency/production-scope finding was established.
Root confinement, exact-copy/session leakage checks, explicit query failures,
calibration-only sweeps, checksummed configuration, deterministic reruns and the
synthetic labels remain useful. Their passing tests do not resolve these metric
semantics. Hashes cannot prove physical capture independence; frozen files cannot
prove human non-retuning; device/real-data/licence/accuracy gates remain open.

## Ready-to-send correction brief — NOT SENT

Recipient: existing R0 chat01a0fa25-d216-75f0-ab21-40d7b06ccef7.
Proposed implementation setting: GPT-6.1 Sol HIGH, as previously authorized.
Founder requested this brief be retained until a later model sends it.

Resume the same checkout/branch and preserve all pending work. Read this report,
R0_REAUDIT_REPRO.mjs, the R0 plan/tickets and actual current Git state. Fix only
R0-A2-01 and R0-A2-02 in lab metrics/reporting plus regression coverage and
affected evidence/docs. Do not rewrite the lab, change ranking thresholds,
production scanner/business contracts, dataset scope or start R1. Recommended
semantics above are audit corrections, not production confidence decisions.

Add discriminating tests that fail on the old implementation and pass on the
repair; include mixed labeled/unlabeled cases and wrong STRONG lower-ranked truth.
Run lab tests, typecheck, zero-warning lint and CLI development/calibration/
holdout reproduction; record intended exit2 failures truthfully. Update handoff,
ledger/workflow and source status without erasing either audit's historical evidence.
Explain changed metrics/denominators explicitly. Do not delete this reproduction
artifact to make a check green; it is historical defect evidence.

Stop all work and provide a handoff for independent review after the repair.
No phone/Docker/model download/cloud build/spending/backend/commit/push/merge.
No independent acceptance or new milestone. Coordinator sends this only after
the founder's requested model handover; no dispatch occurred during this audit.
