# R4 independent preparation review

Date:2026-10-02. Coordinator reviewed after actual STOPPED report-back from sole
implementation chat01a0fc05-ee01-7852-ac66-537cfd9c2a04. Checkout COSI-m8-planning;
branch plan/m8-unified-scanner; HEAD66ea3fc22595a48d7355d1729bb879496cc98896
unchanged. Intentional shared work remains uncommitted and preserved.

Decision: accept RB4-01..03 SOURCE PREPARATION only. No blocking specification or
repository-standard finding in this review. No implementation code repair was
needed. This does not implement/accept a real image encoder, native visual scanner,
real recognition accuracy, production cache or final model/runtime.

## Scope and judgments

Six new modules:retrievalGallery/retrieval/retrievalCache/retrievalEvaluation/
retrievalPaths/retrievalCli, four new suites plus helper, selection fixture and guide.
Inspected input -> ownership/selection -> adapted recorded vectors -> central rank
-> package uncertainty/refusal -> cancellation/stale results -> disposable cache
-> R2-calibration/frozen holdout -> failure-inclusive metrics/report. Checked new
source against actual published RB4-01..03 and preserved R0–R3 contracts.

Specification: every selected product keeps its reference views; zero stock does
not suppress identity. Foreign store/package/source, duplicate or failed reference
inputs cannot create a partial accepted gallery. Valid UNKNOWN remains distinct
from INVALID/UNAVAILABLE/FAILURE/CANCELLED/STALE/BUSY. Controlled one-flight work
invalidates on cancel/close and rejects old contexts. Caller input/config/snapshot/
result mutation cannot change the copied internal source. Cache is exact derived
JSON: checksum AND equality to current source rejects even rechecksummed tampering.
Missing cache requires explicit rebuild/manual fallback; source is never rewritten.

Standards: existing R2 adapter/normalization/rank/metrics/calibration reused; no
production/shared contract, schema, native runtime, dependency or threshold change.
CLI requires exact calibrated candidate plus R4 gallery binding for holdout;
ordinary config/tuning/drift is rejected. Explicit file input, confined ignored
cache/reports, linked/hardlinked target guards and input/output collision checks
apply. Public reports contain identities/hashes/decisions, not vectors/private
locators or arbitrary producer prose. No business data writes or encoder execution.

## Fresh independent checks

- npm test --workspace @retail/recognition-lab:304 tests/18 suites172.386s, exit0.
- npm run typecheck --workspace @retail/recognition-lab:exit0.
- npm run lint --workspace @retail/recognition-lab:exit0/max-warnings0.
- Coordinator-created ignored runs/r4-independent-check.mjs:imported-source service/
  cache/context/cancel assertions and8 actual CLI cases passed. CLI build0/reuse0/
  calibration0/holdout2/corrupt-cache2/rebuild0/foreign-store1/unfrozen-holdout1.
  argv/results retained in runs/r4-independent/audit-results.json.
- Independent observations:known q-a STRONG, q-u UNKNOWN, q-error FAILURE;
  rechecksummed vector tampering UNAVAILABLE, missing CACHE_MISSING, caller mutations
  ineffective, foreign context STALE, concurrent request BUSY, cancelled pending
  work CANCELLED and closed service UNAVAILABLE. Cache build/reuse decisions and
  metric rates identical; corrupt cache has null metrics; holdout retains8 queries
  and1 deliberate TIMEOUT with realQualityAccepted=false.
- Independently recomputed499 protected baseline SHA256 hashes:zero mismatches.
  Three assigned self-check files excluded from502-file baseline. No accepted
  R0–R3/production/source/config/dependency/history bytes changed.
- Active Track B schema validation passes. Independently confirmed pre-existing
  historical M2 acceptance_gates[4].verification.kind enum mismatch. It is unchanged
  and outside R4 source scope; record for separate workflow maintenance, no silent
  historical evidence rewrite. Do not claim all historical workflow records valid.

All eight independent CLI cases/assertions passed first execution. Builder78 new
focused tests/25 CLI cases are separate self-check evidence; do not add overlapping
counts. Broad root/mobile/DB/Expo/native tests were not rerun for isolated lab code.
No phone, encoder execution, download, Docker, build spending, backend or Git effect.

## Residual limits and stop

In-memory callers must supply importer-validated sources; checksums are not signed
provenance. Cache load re-normalizes/rebuilds for correctness and is not a measured
performance optimization. One-flight is per facade; a caller must close the old
facade before replacement. Abort invalidates output but cannot terminate an ignored
signal/global native computation. File guards assume sequential authorized local
use, not a concurrent multi-user file server.

True Windows file-symlink creation was denied to builder (EPERM); that executable
case remains unverified. Fresh tests exercised junction and actual hardlink
rejection; source checks include file/dangling links. No privilege change.

All real capture/rights, exact encoders/exports/execution, real two-device numerical/
performance/offline/cache/lifecycle, calibrated independent holdout and production
recognition gates remain pending. Existing beta thresholds unchanged. Authored
holdout is deliberately unsafe and proves tooling, not quality. Source acceptance
ends the founder-authorized R1–R4 preparation cycle. Coordinator stops for founder
return and combined Astra review; do not start R5/M12 or physical work automatically.
