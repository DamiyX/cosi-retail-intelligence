# R0 independent coordinator audit

**Historical acceptance superseded:** the fresh second audit found two reproducible
metric defects. See R0_REAUDIT.md. Original evidence below is preserved; it does
not establish current acceptance.

Date: 2026-10-02. Decision: accept RB0-01..04 source/tooling scope.
Implementation owner stopped before this audit. No source repair required.
Audit uses the current coordinator model setting after the founder's continue;
no programmatic model change or Terra audit is claimed.

## Scope and comparison

Reviewed stopped, uncommitted R0 work at HEAD
66ea3fc22595a48d7355d1729bb879496cc98896 on plan/m8-unified-scanner in
COSI-m8-planning. Existing coordinator planning/native changes were already
present at dispatch and are outside the implementation comparison. Reviewed the
entire new lab source/test/configuration/fixture surface, root package scripts,
15-line lockfile addition, environment-check change, capture/setup guide and R0
handoff. Production apps/mobile, packages and supabase have no changes in this
working diff. No new ML runtime or production schema/contract adopted.

## Specification review

RB0-01: deterministic authored-vector experiment, versioned inputs/provenance,
explicit failures and synthetic labels are implemented. Node executes the actual
CLI in regression tests, rather than only testing a mocked entry point.

RB0-02: importer validates identity/package relationships, hashes and capture
session split groups, approved-root confinement including escaping junctions,
rights/provenance metadata and unavailable assets. Curator responsibility for
transformed duplicates and actual capture independence is correctly explicit.

RB0-03: distinct product/package aggregation, refusal and tie behavior, numerator/
denominator/N/A reporting, STRONG coverage, package errors, failed-query populations
and separate retrieval/shown-candidate metrics are implemented. Calibration sweeps
reject holdout; frozen configuration detects accidental dataset/configuration
drift. The public synthetic holdout is expressly not unbiased real accuracy data.

RB0-04: scripts include the lab in root checks; reproduction and later capture
guides are supplied; real data and native execution remain unavailable and are
not represented as passed. Handoff stops at the authorized R0 boundary.

## Standards review

No blocking architecture, correctness or repository-scope finding identified.
Root validation skips only optional tool-version probes, retaining Node/npm/Git
checks. Dependency versions are unchanged; Zod is an existing locked dependency.
Private data and generated runs are ignored and no network loader is introduced.
No business database, transaction, scanner/native code or phone state was touched
by this audit. Existing mobile/compiler tooling is reused explicitly; root npm ci
and a second laptop remain unperformed portability checks.

## Fresh independent evidence

- npm test --workspace @retail/recognition-lab: exit0, 51 tests/5 suites,
  20.192 seconds. Includes actual CLI repeated runs, calibration/holdout CLI,
  imported assets, escaping-junction rejection and failure-path tests.
- npm run typecheck --workspace @retail/recognition-lab: exit0.
- npm run lint --workspace @retail/recognition-lab: exit0, zero-warning policy.
- Independent Node assertions imported the fixture and verified SHA256
  6b941fcaf47ae42ffebe5bfe9b608f638ba7700e7135e7d94ef8d00b7c25670f;
  held-out product top1 4/6, false STRONG unknown 1/2, joint precision 2/4,
  STRONG coverage 4/8 and failure 1/8. The deliberate lookalike is exposed as
  incorrectly STRONG; TIMEOUT stays FAILURE. These numbers prove the evaluator's
  bookkeeping only and are intentionally not production quality results.
- Independent assertions rejected holdout sweeps, frozen-config checksum drift
  and real-capture execution without a real encoder.
- Builder root-validation log inspected: 692 passing tests/84 suites, eight live
  PostgreSQL tests/two suites skipped; workspace typechecks/lint passed. This is
  builder evidence, not a second coordinator run of all 692 tests. Production
  source is unchanged and no fresh full-suite rerun was needed for this audit.
- Workflow JSON schema and git diff --check verified at audit close.

## Acceptance limits and next action

R0 source/test-tooling scope is independently accepted. Git changes remain
uncommitted; this is not a committed milestone, a release, or visual-recognition
acceptance. No real-image dataset, encoder accuracy, Android latency/memory/
thermal/offline runtime, licensing, camera enrollment, media sync, second laptop
or M12 integration was exercised. M8 native/provider and M9 audit gates remain.

Prepare the next R1 dataset/capture packet from DATASET_CAPTURE.md before
collection. Representative samples, private rights/storage, independent captures,
sealed split ownership and unknown-package policy need that bounded review.
No automatic R1/R2 implementation or model download is authorized by this audit.
