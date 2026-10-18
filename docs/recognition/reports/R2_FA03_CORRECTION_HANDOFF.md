# R2 FA-03 output-confinement correction — stopped self-check handoff

2026-10-02 Africa/Lagos. Chat01a0fbba-0b16-7fb2-a39c-d09fdb6e4065
(CODEX_THREAD_ID), founder-authorized sequential correction. Requested Sol6.1 HIGH;
UI setting not verified by source tools. Coordinator01a098ef-d830-7531-bca7-2d66b0a5b587
owns independent acceptance and other owners' corrections. No subagents.

FA-03 R2 correction is implemented/self-checked. All commands/edits stop before
the authorized completion message. **Independent correction acceptance pending.**
No R3/R4 implementation or new milestone was started. Read the unchanged final
audit and saved probe; do not interpret its exit0 as acceptance of all findings.

## Scope and mechanism

Only four files changed/added relative to this correction's intake:

- apps/recognition-lab/src/comparisonCli.ts — existing file changed.
- apps/recognition-lab/ENCODER_COMPARISON.md — existing guide changed.
- apps/recognition-lab/__tests__/comparisonOutput.test.ts — new regression suite.
- docs/recognition/reports/R2_FA03_CORRECTION_HANDOFF.md — this new report.

The original guard checked directories but did not inspect every final report
destination. writeFileSync followed a report hard link into a disposable sentinel.
Preflight now checks the complete output set before creating directories or writing
any report: comparison.json/.md and calibration.json/frozen-candidate.json/
calibration.md. Reject symlink/junction ancestors and final links (including
dangling links), hard-linked files (nlink>1), non-file report destinations and
source/output collisions. Valid regular-file report rewrites remain supported.

Protect manifest, every manifest asset, comparison input list, every candidate/
bundle/config/frozen source and calibration config list. Compare canonical paths
and exact bigint device/inode file identities: Windows realpath can retain 8.3
spelling, so path comparison alone did not prevent LONGOU~1 from reaching a
long-path candidate input. File identity closes that reproduced alias case without
a new dependency. The guard follows stronger R4 preflight patterns locally; no
shared helper or other owner's source was changed.

Sequential local filesystem use is the boundary. This is not an atomic multi-file
report transaction or protection against hostile concurrent path replacement after
preflight. Native file-symlink creation returned EPERM on this Windows host; actual
directory junctions and dangling junctions exercise the link-rejection branch, but
an executable native file-symlink test is not claimed.

## Reproduction and discriminating evidence

Commands below ran from the sole authorized checkout:
C:\Users\doyew\Documents\DEV 2\COSI-m8-planning. All probes use unique ignored
runs subdirectories and disposable fixture copies/sentinels, never real source,
private images or model artifacts. Historical audit/probe bytes remain unchanged.

| Command/check | Actual result |
| --- | --- |
| node docs/recognition/reports/R1_R4_FINAL_AUDIT_REPRO.mjs before fix |probe0; R2 CLI0, sentinelOverwritten=true |
| Same saved probe after/final fix |probe0; R2 CLI1, sentinelOverwritten=false; R3 still0/true; FA-01/02 remain reproduced |
| Native Windows short-directory-alias probe |before fix CLI0, disposable candidate overwritten; no real data touched |
| Short-name regression before fix (-t 'Windows short output') |exit1; candidate SHA256 preservation assertion failed |
| realpath-only attempted alias repair |same regression exit1; insufficient on this host |
| Exact bigint file-identity repair, same targeted regression |exit0;1 passed/34 filtered out,4.633s |
| Final focused npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/comparisonOutput.test.ts __tests__/comparisonCli.test.ts |39 passed/2 suites,80.145s, exit0 |
| npm test --workspace @retail/recognition-lab |339 passed/19 suites,201.248s, exit0 |
| npm run typecheck --workspace @retail/recognition-lab |exit0 |
| npm run lint --workspace @retail/recognition-lab |exit0, --max-warnings=0 |
| Final baseline SHA256 scope guard |518 protected intake files unchanged;0 unexpected changes/additions |
| git diff --check |exit0; original CRLF notices retained |

New suite has35 cases: all five destinations are each tested as hard link,
directory, junction and dangling junction; direct/canonical aliases cover input
list, candidate, bundle, config(s), manifest, asset, holdout freeze and an input
junction; one native Windows 8.3 alias case; two normal fresh-directory/repeat
output cases. Rejected commands assert exit1, unchanged sentinels, unchanged
pre-existing report siblings and unchanged hashes for every configured fixture
input/asset. Existing executable comparison/calibration/frozen holdout behavior
and expected failure exits remain supported by the original four CLI tests.
No new test is skipped in the complete339-test run on this host. The short-name
case explicitly skips on hosts without that native capability; targeted -t runs
filter the unrelated34 tests and are not the full acceptance count.

Intermediate checks: initial new test file had a missing closing brace; Jest/typecheck
failed before any test execution, then the syntax was corrected. The initial
cmd/for short-name probe had quoting trouble and was replaced by a read-only dir/x
inventory; the corrected probe reproduced actual overwrite. A338-test earlier
full run passed before adding the discriminating short-name regression. The
realpath-only focused run failed that new case; exact physical identity corrected
it. Final339-test full run and subsequent39-test focused run pass, with final
typecheck/lint0. No failing check was treated as acceptance.

Versions checked:Node24.21.0, npm11.19.0, TypeScript6.0.3 (mobile local),
Jest29.7.0, ESLint9.39.5, Zod4.6.4. No dependency/lockfile/install changes.
Evidence:ignored apps/recognition-lab/runs/r2-fa03/:baseline.json,
probe-before.log, probe-after.log, probe-final.log, short-alias-before.json,
short-regression-before.log, short-regression-after.log,
short-regression-identity.log, focused-verified.log, full-final-source.log,
typecheck-final-source.log, lint-final-source.log, scope-check.json and
final-scope-check.json. Disposable cases remain under runs/r2-fa03-tests/.

## Additional sibling issues — reported, NOT repaired

Required sibling inspection found additional input/output effects beyond the R2
ownership ceiling. These need coordinator review and assignment before edits:

- R0/R1 src/cli.ts still uses unchecked writeFileSync destinations. A new ignored
  hard-linked integrity.json sentinel was overwritten by actual `validate` CLI,
  exit0. A hard-linked secondary readiness.md sentinel was overwritten by actual
  `readiness` CLI, exit2. Evidence:runs/r2-fa03/r0-sibling.json and r1-sibling.json
  include argv/results/disposable directories. This extends the original FA-03
  directory/final-file problem to those earlier-owned report writers.
- R4 src/retrievalPaths.ts protectInputs compares resolved path strings, not
  physical identities. An actual `retrievalCli.ts calibrate` call with a short
  output-directory alias and long-path disposable candidate at
  retrieval-calibration.json exited0 and overwrote that candidate. Evidence:
  runs/r2-fa03/r4-short-alias.json includes exact argv/results. R4 source is
  unchanged; this is a separate newly reproduced alias correction for its owner.
- R3 original hard-link issue remains reproduced by the saved audit probe,
  CLI0/sentinelOverwritten=true. Its owner retains the FA-03 R3 correction.
  Original FA-01/02 retrieval findings remain unchanged and pending their owner.

All sibling probes are diagnostics against existing code, not R3/R4 implementation
or milestone advancement. No other owner's source/guide/report was modified.

## Final base, stop and remaining gates

Branch:plan/m8-unified-scanner.
HEAD:66ea3fc22595a48d7355d1729bb879496cc98896, unchanged; all work uncommitted.
Git status retains the original13 tracked modified paths and existing untracked
lab/workflow/Track B plan-ticket-report groups. R2's two edits and two new files
are within those existing groups; all other518 intake file bytes are preserved.
Coordinator-owned PROJECT_STATE/workflow/ledgers and historical reports/probe are
left intact under this narrower correction authorization. The current prompt
supersedes their stale “packet NOT dispatched” wording; coordinator updates state.

No commit/push/merge/deploy/backend/spend/phone/Docker/model download/production
change. No change to ranking, thresholds, RecognitionService or dataset/vector
contracts. No unrelated root/mobile/domain/database rerun. The precomputed adapter
still DOES NOT execute an encoder. Real photos/rights/model/licence/execution,
physical Android/native/device/quality gates remain pending, NOT waived.

Next safe action:coordinator independently verifies this stopped R2 FA-03 repair,
reviews the additional sibling evidence and sequences the relevant owners. Return
any R2 corrections to this same chat/branch. Implementer remains stopped; no
independent acceptance or permission for other owners' edits is claimed here.
