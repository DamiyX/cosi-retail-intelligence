# Track B R4 — Retrieval preparation tickets

Published under founder-delegated technical judgment. Sol6.1 HIGH, sequential.
Plan:TRACK_B_R4_PLAN.md; ledger:recognition-track-b.json. Preparation only.

October2 implementation self-check:RB4-01..03 source/verification complete in
chat01a0fc05-ee01-7852-ac66-537cfd9c2a04; no independent acceptance. Final304
tests/18 suites176.308s, typecheck and zero-warning lint exit0;25 standalone CLI
cases match expected exits and499 protected hashes unchanged. Report:R4_PREPARATION.md.
Final direct STOPPED handoff follows all commands; delivery/coordinator audit
remains separately recorded. Real data/device/quality and combined Astra gates pending.

## RB4-01 — Load a compatible store gallery and recognize recorded queries

Blocked by: accepted R0–R3 preparation and reviewed R4 packet.
Delivers:a lab-local query searches its store's selected product/package references
using existing ranking, with honest package uncertainty/refusal/error outcomes.
Scope:validated gallery/service seam and end-to-end decision tests.

- [x] Exact store/candidate/dataset/reference/active-selection bindings; reject
  foreign/duplicate/corrupt inputs, preserve grouped product/package ranking and
  zero-stock identity. No price/conversion/business writes or encoder execution.
- [x] Correct known/ambiguous/unknown decisions; explicit invalid/unavailable/
  failure/cancel/stale outcomes distinct from UNKNOWN; one-in-flight and generation
  safeguards plus caller-mutation defense verified with deterministic tests.
- [x] Meaningful focused tests, lab typecheck and zero-warning lint pass; existing
  R0–R3 source/production contracts remain preserved.

## RB4-02 — Reuse a derived cache safely and fall back when it is invalid

Blocked by: RB4-01 gallery/query path.
Delivers:serialized lab gallery reopens with identical decisions or explicit
rebuild-required/manual fallback. Scope:lab cache load/round-trip/error tests.

- [x] Bind snapshot format/content/store/dataset/candidate/preprocessing/reference/
  selection revisions. Reject missing/corrupt/stale/foreign/incompatible cache
  without mutating source data or silently accepting partial references.
- [x] Round-trip preserves results; model/store/gallery switch and stale work cannot
  leak results; nonfinite/zero/dimension/duplicate/ownership tampering tests pass.
  Cache is disposable derived lab data, no production database/protocol decision.
- [x] Full lab tests, typecheck and zero-warning lint pass with prior scope preserved.

## RB4-03 — Evaluate the prepared path and return the final stopped packet

Blocked by: RB4-01 and RB4-02.
Delivers:actual standalone command/report proves retrieval/cache behavior and
calibration/holdout discipline using authored recorded fixtures.

- [x] Existing R2 calibration/freeze/metrics reused; holdout requires matching frozen
  config and rejects tuning/drift. Actual known/unknown/failure/cache/invalid/path
  CLI examples tested; counts and exact provenance/limits visible without vectors
  or private locators. Outputs confined to ignored runs including linked targets.
- [x] R4_PREPARATION.md and guide record exact commands/files/results/limits and
  all pending real/physical gates. Full lab tests/typecheck/zero-warning lint pass;
  no final model, real accuracy, device or production recognition claim.
- [x] Update ledger/workflow/PROJECT_STATE with self-check only, stop all commands
  and send one directly authorized handoff to coordinator for independent review.
  Do not self-accept source, begin R5/M12 or erase pending physical gates.

## Real R4 quality/holdout — PENDING, NOT ASSIGNED

Requires real R1 data, reviewed/executed R2 encoder and R3 native results. Calibrate
only on calibration data, then evaluate independently held-out real products with
truthful coverage/package/unknown/failure evidence. All real/device acceptance and
final combined Astra audit await founder return. This prep ledger cannot pass them.

Independent preparation source accepted in reports/R4_INDEPENDENT_REVIEW.md.
Actual stopped delivery received. Cycle stops for founder combined Astra audit;
all real/device/quality gates remain pending.
