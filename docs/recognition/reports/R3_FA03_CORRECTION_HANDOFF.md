# R3 FA-03 output protection correction

2026-10-02 Africa/Lagos. Sole R3 implementer
chat01a0fbe7-acef-7b81-92e2-7f8a1e720285; founder-authorized sequential
correction after R2 stopped and was independently accepted. Requested Sol6.1 HIGH;
UI setting not verified by source tools. No subagents. Coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587 owns independent review and other owners' work.

FA-03 R3 is implemented/self-checked at this handoff. Independent correction
acceptance remains pending. All commands/edits stop before the authorized single
completion message. No new milestone, R4 or R0/R1/R2 implementation.

## Scope and correction

Exactly four files changed/added relative to correction intake:

- apps/recognition-lab/src/deviceBenchmarkCli.ts — existing CLI only.
- apps/recognition-lab/DEVICE_BENCHMARK.md — existing guide only.
- apps/recognition-lab/__tests__/deviceBenchmarkOutput.test.ts — new regressions.
- docs/recognition/reports/R3_FA03_CORRECTION_HANDOFF.md — new handoff report.

Original R3 checked final symlinks/nonfiles but did not reject hardlinked files
or source/output aliases. writeFileSync could overwrite a disposable sentinel
through either report target. Exact Windows8.3 output spelling also reached a
long-path candidate/pair input and overwrote it.

The local guard now preflights **both** device-benchmark.json and
device-benchmark.md and every ancestor before creating directories or writing
anything. Reject symlinks/junctions, including dangling links, non-directory
ancestors, non-file report targets and hardlinks (nlink>1). Protect the manifest,
every manifest-listed asset, candidate, target, record and supplied reference/pair
files. Compare canonical paths plus exact bigint device/inode file identity to
catch Windows8.3 aliases even when realpath retains short spelling. Ordinary
safe regular-file rewrites remain supported. No dependency or shared refactor;
followed the accepted R2 pattern locally, preserving R2 bytes.

This fixes a lab filesystem bug; no benchmark/equivalence computation, candidate/
dataset/vector contract, ranking/threshold or production RecognitionService
change. Reports remain recorded-only, error output sanitized, no encoder/native
work or automatic acceptance. Sequential local filesystem use is the boundary;
no atomic multi-report transaction or hostile concurrent path-replacement safety
is claimed.

## Actual verification

All commands ran only in C:\Users\doyew\Documents\DEV 2\COSI-m8-planning,
with pinned C:\Users\doyew\.cache\cosi-toolchain\node-v24.21.0-win-x64\node.exe
v24.21.0 and its folder prepended to PATH. No installs. Logs/helpers live only
under ignored apps/recognition-lab/runs/r3-fa03; tests use unique disposable
public-fixture copies under runs/r3-fa03-tests. No real source/private/model data
was overwritten by probes.

| Command/check | Actual result |
| --- | --- |
| node docs/recognition/reports/R1_R4_FINAL_AUDIT_REPRO.mjs before repair |probe0; R3 CLI0/sentinelOverwritten=true; R2 CLI1/false |
| npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/deviceBenchmarkOutput.test.ts -t 'hard-linked\|Windows short output' before repair |4 failed/26 skipped or filtered,10.549s; both hardlinks and both actual Windows8.3 input-overwrite cases discriminate the bug |
| Same saved audit repro after repair |probe0; R3 CLI1/sentinelOverwritten=false; R2 remains1/false |
| npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/deviceBenchmarkOutput.test.ts __tests__/deviceBenchmarkCli.test.ts |32 passed/2 native file-link skips/2 suites,62.159s, exit0 |
| npm run typecheck --workspace @retail/recognition-lab (focused source) |exit0 |
| npm run lint --workspace @retail/recognition-lab (focused source) |exit0, max-warnings0 |
| npm test --workspace @retail/recognition-lab (final full source) |367 passed/2 native file-link skips/20 suites,246.291s, exit0 |
| npm run typecheck --workspace @retail/recognition-lab (final full source) |exit0 |
| npm run lint --workspace @retail/recognition-lab (final full source) |exit0, max-warnings0 |
| node apps/recognition-lab/runs/r3-fa03/scope-check.mjs |523-file intake,521 protected files unchanged; exactly two assigned existing edits/two additions;0 unexpected changes |
| git diff --check |exit0; existing CRLF notices retained |

Counts overlap; do not add focused and full results together. The full run retains
all339 previously passing lab tests and adds28 passing R3 regression cases, plus
two explicit native file-symlink skips. Both actual Windows8.3 cases execute and
pass. A separate isolated native file-link capability check records EPERM; no
file-link executable pass is claimed.

Evidence: ignored runs/r3-fa03/baseline.json, probe-before.log, probe-after.log,
regression-before.log, focused.log, typecheck.log, lint.log, full.log,
typecheck-final.log, lint-final.log, scope-check.log, scope-check.json,
native-file-link-capability.json, diff-check.log and final-status.log. The saved
audit probe's own unique disposable directories retain results.json for exact
counterexample outputs. All historical probe/report bytes are unchanged.

Final source SHA256 values (the handoff's own hash is in scope-check.json):

- deviceBenchmarkCli.ts:d1ebcee13cee26bc5513d291e541ba617825bb3ba645403dceafae825bade3d6
- deviceBenchmarkOutput.test.ts:e5bcb2e9442ea8c7288baf7911c90928b9b49f54df2fc01179814cba4655a659
- DEVICE_BENCHMARK.md:9a19061112a89abf0030c9052bae85753a0d54539b4a711d527fa5dec8be53b1

The new suite has30 cases: both targets as hardlink, directory, junction and
dangling junction; both targets aliased to candidate/target/record/reference/pairs,
manifest and valid hash-rebound asset; source through input junction; normal and
dangling output-ancestor junctions; fresh/repeated safe outputs and incomplete
analysis; two real Windows8.3 aliases (primary candidate, secondary pairs);
two conditional native file-symlink cases. All configured input/asset hashes are
asserted unchanged on every invocation. Rejected runs assert empty stdout,
sanitized stderr, unchanged sibling snapshots and sentinel/target bytes, plus no
creation through rejected ancestor paths. Two native file-link cases are explicit
capability skips on this Windows host; junction/dangling and both8.3 cases executed.
No privilege/global setting changed to enable file symlinks. No intermediate
implementation/test syntax failures occurred; expected pre-repair failures remain
preserved in regression-before.log.

## Preservation, remaining issues and stop

Branch plan/m8-unified-scanner, HEAD66ea3fc22595a48d7355d1729bb879496cc98896,
unchanged. Intake pwd/branch/HEAD/status/diff matched existing pending work. No
commit/push/reset/branch/worktree/deployment/phone/Docker/download/model/runtime
effect. Original extensive intentional uncommitted root/docs/native/lab packets
remain. Coordinator-owned PROJECT_STATE/workflow/ledgers are preserved under
this narrower correction scope; coordinator updates status after stopped review.

Known queued sibling failures remain outside ownership: R4 FA-01/02/04 and shared
R0/R1 FA-03. The saved probe still shows their original R4 holdout/stale-context
counterexamples; no R4 source was changed. No new sibling issue was established.
Historical audit, saved repro and R2 independent repair/source remain unchanged.
All521 protected intake file hashes match, including every R0/R1/R2/R4 file,
original R3 modules/tests/fixtures/preparation report, root/package/lockfile,
PROJECT_STATE, workflow/ledgers, production/shared contracts and native packets.

No unrelated root/business/native suite was broadened. Real photos/curation,
rights/exact models/exports/runtime/actual encoder execution, physical Android/
Galaxy A15/lower-spec latency/memory/disk/thermal/offline and real quality gates
remain pending, not waived. This is work-R3 output protection, not evaluation-R3
pilot or native acceptance. Final broader audit/correction acceptance belongs to
the coordinator/founder.

The implementer stops all commands/edits at the final handoff, then delivers one
authorized completion report to coordinator01a098ef-d830-7531-bca7-2d66b0a5b587.
Tool delivery is recorded in the chat, not inferred from this report. Next action:
independent coordinator R3 FA-03 review, then sequentially dispatch queued owners.
