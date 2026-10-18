# R3 independent preparation review

Date:2026-10-02. Stopped implementation chat01a0fbe7-acef-7b81-92e2-7f8a1e720285
reported back before this audit. Actual checkout COSI-m8-planning; branch
plan/m8-unified-scanner; HEAD66ea3fc22595a48d7355d1729bb879496cc98896 unchanged.

Decision: accept RB3-01..03 preparation/source. No blocking specification or
repository-standard finding. This is supplied-record analysis, not an executed
Android benchmark, reviewed model export or native/recognition acceptance.

Scope: deviceBenchmark.ts/deviceEquivalence.ts/deviceBenchmarkCli.ts, three new
test suites, public authored fixtures, empty template and guide/ledger. Traced
exact candidate/dataset/export/runtime/input binding, trial/failure/warmup grouping,
null coverage, successful-sample percentiles, paired failure accounting, explicit
tolerances, CLI parsing and linked-output confinement. Existing central vector
normalization is reused. No actual inference or native runtime exists here.

Specification: cold/warm/warmup and measurement stages remain distinct; failures
are counted beside successful latency rather than hidden. Missing measurements
remain null. Original weights and converted export have separate identity. Pair
validation rejects missing/foreign/stale inputs, and failures on either side stay
in the inventory. Declared completeness never gives native acceptance.
Standards: exact supplied paths only; hash/provenance bindings; safe public IDs;
no vectors/private locators in summary; ignored output guard; no production,
schema/dependency/model/threshold effect. Record attestations are not proof of
execution, licensing or complete/honest trial collection.

## Independent fresh evidence

- npm test --workspace @retail/recognition-lab:226 tests/14 suites,113.765s, exit0.
- npm run typecheck --workspace @retail/recognition-lab:exit0.
- npm run lint --workspace @retail/recognition-lab:exit0/max-warnings0.
- Coordinator-authored ignored runs/r3-independent-check.mjs:7 actual CLI cases
  passed expected exits. Valid0; incomplete2; failure2; custom small-tail2;
  drift2; missing pair1; stale runtime target1.
- Independent custom10 successful timings1..10 plus1 untimed failure retained
  attempts11/successes10/failures1, median5.5/p90=9/p95=null. Valid8/8 pairs;
  orthogonal drift count1/max normalized error1;111/110/1 failure fixture counts;
  null incomplete memory; nativePass/deviceWorkMeasured false; no raw vectors or
  checkout path in summary. Results/argv retained in runs/r3-independent.
- Independently recomputed SHA256 for477 protected baseline files:zero mismatches.
  Only three assigned self-check files excluded from480-file baseline comparison.
  Actual source additions agree with the handoff; no code correction needed.

The initial baseline-file lookup guessed baseline-hashes.json; the actual file is
baseline.json. This was a read-path error, not implementation failure. Independent
seven-case helper passed without assertion repair. Builder54 focused tests and17
CLI cases are separate historical self-check evidence, not extra unique counts.

Residual limitations: Windows denied the builder's true file-symlink setup (EPERM);
that executable case remains unverified. Fresh suite exercised directory-junction
and linked report-target rejection; source lstat guard covers file/dangling links.
No privilege/global setting change or claim of privileged file-link verification.
No root/mobile/native/device/actual encoder tests rerun for this lab-only work.
All real R1 data, exact rights/model/export/runtime execution, two-device latency,
memory/disk/sustained/offline, numerical and recognition-quality gates remain pending.
Final combined Astra audit waits for founder return. Source/preparation acceptance
permits the next R4 preparation packet only; it does not select a runtime or pass
M12/beta integration.
