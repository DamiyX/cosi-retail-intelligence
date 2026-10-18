# Shared R0/R1 FA-03 report safety — stopped correction handoff

2026-10-02, Africa/Lagos. Implementer chat01a0fa25-d216-75f0-ab21-40d7b06ccef7;
founder-authorized sequential correction relayed by coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587. Assigned Sol6.1 HIGH; UI model/effort setting
is not verified by source tools. No delegation or model/effort switch performed.

Shared CLI repair implemented/self-checked. **Independent correction review
pending.** Implementer stops all commands/edits before its one authorized
completion message. Coordinator owns independent acceptance and state updates.
No onward milestone or R1 data collection started.

## Objective, boundary and scope

Prevent report output from changing linked files, configured source inputs or
earlier/later siblings on preflight rejection. The confirmed defect was unchecked
final destinations: validate integrity.json and readiness readiness.md followed
disposable hardlinks and overwrote sentinels. Changes affect local sequential
report writes, not recognition/ranking/readiness criteria or production behavior.

Exact checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch `plan/m8-unified-scanner`; HEAD unchanged
`66ea3fc22595a48d7355d1729bb879496cc98896`. Extensive pending work stays uncommitted.
Review base is this assignment's530-file intake snapshot, not HEAD's pre-lab tree.

Only five assigned files changed/added:

- `apps/recognition-lab/src/cli.ts` — local complete-output preflight.
- `apps/recognition-lab/__tests__/cliOutput.test.ts` — new110-case executable regression suite.
- `apps/recognition-lab/README.md` — shared R0/R1 command safety/limits.
- `apps/recognition-lab/DATASET_CAPTURE.md` — readiness error-report safety/limits.
- This new stopped handoff.

Coordinator PROJECT_STATE/workflow/ledgers, historical audits/reproduction scripts,
all R2/R3/R4 code/tests/guides/reviews, importer/readiness/metrics/ranking/calibration,
fixtures/configs and package/lock/tooling files are byte-exact to intake. Final
scope check:530 baseline files,532 final,527 protected unchanged, exactly three
assigned existing edits and two additions; no unexpected changes/deletions/additions.
`git diff --name-only -- apps/mobile packages supabase` returns no paths.
No schema/contract/threshold/model/dependency changes or shared refactor.

The installed global router GLOBAL_MEMORY.md was absent; applicable repository
truth and coding/testing/debugging/security/review-audit skills supplied the
bounded route. This was a direct correction with self-review, not an independent
audit or agent delegation.

## Guard and preserved semantics

Each command builds its complete fixed output set before any mkdir/write:

| Command | Destinations |
| --- | --- |
| validate | integrity.json |
| run | results.json, summary.md |
| sweep | sweep.json, frozen-config.json |
| readiness | readiness.json, readiness.md |

Output must remain beneath ignored `apps/recognition-lab/runs/`. Walk every
ancestor and final target with lstat: reject symlinks/junctions (including dangling
ones), non-directory ancestors/output directory, non-file report targets and
hard-linked files. Preflight every target before any creation/write. Physically
aliased report targets also reject, including hard-linked report siblings.

Protect the manifest, every declared string asset locator from readable manifest
JSON and every supplied config/configs/frozen/curation file. This collection does
not replace the existing importer/curation validation. Readiness may assess
invalid/missing inputs, so protection happens before assessment and does not
depend on a successful import. Malformed JSON still protects the manifest itself;
there is no declared asset list to recover or read from that malformed input.

Compare lexical/canonical paths and exact bigint device/inode identities.
Windows realpath alone may retain8.3 spellings; existing-file identities prevent
those source aliases. Missing destinations/inputs bind to their nearest existing
physical ancestor plus remaining components, preventing error reports from
creating a missing source through a short-directory alias. Unresolvable identity
I/O fails closed with sanitized diagnostics. No raw filesystem message/stack is
printed. Existing bounded importer issues and readiness diagnostics are retained.

Safe fresh/nested output and regular-file report rewrites remain supported.
Results/metrics/provenance, calibration freeze/holdout gates and readiness
assessment are unchanged. Integrity and sweep remain exit0; authored development
and frozen holdout remain exit2 for deliberate query failures. Safe invalid
readiness input still emits INVALID JSON/Markdown and exits1; incomplete readiness
still emits INCOMPLETE reports and exits2. Unsafe output/input preflight exits1
before any report/directory change. A stale report is never evidence of a rejected
run's success; inspect exit/report together.

Sequential local filesystem use is the explicit recovery boundary. This is not
an atomic multi-report transaction or protection against hostile concurrent path
replacement after preflight. No additional sibling issue was established in the
bounded inspection. R2/R3/R4 remain owned by their accepted stopped repairs.

## Reproduction and fresh verification

All repository commands ran from the exact approved checkout using existing
Node24.21.0/npm11.19.0 dependencies. Lab compiler TypeScript6.0.3, Jest29.7.0,
ESLint9.39.5. No install, download or environment configuration change.

| Command/check | Actual result |
| --- | --- |
| `node apps/recognition-lab/runs/coordinator-siblings.mjs` before repair | Probe exit0; validate CLI0/overwritten=true, readiness CLI2/overwritten=true; accepted R4 CLI1/overwritten=false. |
| `npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/cliOutput.test.ts -t hard-linked` before repair | Seven discriminating tests failed; npm exit1,25.764s.97 unrelated cases filtered/skipped. |
| Focused cliOutput + existing cli + readiness suites after initial repair |137 passed/seven native file-symlink skips, three suites212.317s, exit0. |
| Final missing-input alias/future-directory additions, focused `-t 'future\|missing input at'` | Six passed,16.618s, exit0;104 unrelated cases filtered. Both native8.3 missing-input cases executed. |
| `npm test --workspace @retail/recognition-lab` on final source |510 passed/nine explicit native file-symlink skips;23 suites472.248s, npm exit0. |
| `npm run typecheck --workspace @retail/recognition-lab` on final source | Exit0. |
| `npm run lint --workspace @retail/recognition-lab` on final source | Exit0, zero-warning mode. |
| Unchanged coordinator sibling probe after/final repair | Validate/readiness/R4 all CLI1, all overwritten=false; probe exit0. |
| Final intake SHA256 scope guard and `git diff --check` |527 protected unchanged; only five assigned paths changed/added; diff check0, original CRLF normalization warnings retained. |

Before probe data: ignored runs/coordinator-siblings-Irt8GB/evidence.json.
First after probe: runs/coordinator-siblings-Kb8Sq6/evidence.json. Fresh final probe
directory is recorded in runs/r0-r1-fa03/sibling-final.log. All probes touch only
unique ignored disposable files/sentinels; no actual source/private input was
overwritten. Historical saved probes/reports were not rewritten to go green.

New110-case suite covers every primary/secondary destination as a hardlink,
directory, live/dangling junction, manifest and asset alias; configured single
config, config list, frozen file and curation aliases; source junction and physical
report-sibling aliases; linked/nonfile ancestors and outside-runs outputs;
missing/malformed/schema-invalid readiness sources at both targets; missing
assets, missing sources with uncreated output parents; normal fresh/repeated
output and safe INVALID reports. Rejections assert exit1, sanitized failures,
unchanged sentinels, earlier/later sibling snapshots and all configured
source/asset hashes (including continued absence of missing inputs).

All nine new native Windows8.3 cases executed: seven existing-file aliases and two
missing-source aliases. Native file-symlink creation is denied EPERM on this host:
seven new cases explicitly skipped; the full suite's other two skips are existing
R3 cases. Live/dangling junction and hardlink tests execute, but do not establish
native file-symlink execution. No skips are counted as passes. No failed check was
hidden or repaired by weakening an assertion. Initial137-test focused run preceded
the final six additions; the510-test full run includes final source and all110 cases.

Logs/snapshots in ignored `apps/recognition-lab/runs/r0-r1-fa03/`:
baseline.json, regression-before.log, focused.log, missing-alias-focused.log,
full-final-source.log, typecheck-final-source.log, lint-final-source.log,
sibling-final.log, final-scope-check.json. Disposable regression cases remain
under runs/r0-r1-fa03-tests/. Generated run fingerprints reflect their snapshots;
this later handoff changes the nonignored source fingerprint.

## Stop, limits and decision requested

Coordinator independently reviews the stopped shared CLI repair and updates
acceptance/state if supported. This handoff records self-check evidence only.
No commit/push/merge/rebase/reset/deploy/spend/phone/adb/Metro/Docker/cloud/model
download/build action, production change or new milestone. Broader root/mobile/
database validation was not rerun for this isolated CLI boundary; lab tests/types/
lint are fresh, broader historical results remain historical.

Real captures/rights/curation, actual encoder execution/model licences, Android
runtime, device performance, frozen real-data recognition quality and physical
M8 gates remain pending. Headless filesystem tests do not satisfy those gates.
Implementer remains stopped after the authorized report-back; return any correction
to this same chat/branch. No further R1/R5/M12 work is authorized by this packet.
