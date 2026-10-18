# R1 preparation — implementation self-check and stopped handoff

Date: 2026-10-02, Africa/Lagos. Implementer chat:
`01a0fb94-826a-7ed2-b935-8597d3124511` (`CODEX_THREAD_ID`).
Assigned settings: GPT-6.1 Sol HIGH; no model switch/subagent was attempted.
Status: **RB1-01..03 source implemented/self-checked; independent acceptance
pending. Stop at this handoff. RB1-04 remains pending, not waived.**
Coordinator: `01a098ef-d830-7531-bca7-2d66b0a5b587`.

## Objective, scope and implementation

Implement only the published capture/readiness preparation packet. This is a
reversible lab-local feature (coding risk R2) with JSON/filesystem boundaries.
The highest-risk assumption is that declared families/rights/usability decisions
describe real reviewed evidence; automated checks cannot establish their truth.
Negative binding/leakage/label/seal checks and explicit evidence limitations protect
the tooling claim. No actual physical/image-quality/rights/accuracy claim is made.

RB1-01: versioned empty manifest/curation templates and header-only selection/
capture worksheets. No products/photos/consent are fabricated. Curation has strict
keys/types, pending/null states, exact dataset/version/manifest/entry asset binding,
pseudonymous reviewer/permission/provenance references and separate source/physical
family IDs. One source family cannot claim inconsistent physical samples. A family
cannot cross reference/query or query-split boundaries, even with distinct hashes
and capture sessions. Sessions can contain several samples within one boundary.

RB1-02: additive `readiness` command calls the actual R0 importer, then validates
the explicit sidecar. No recursive asset discovery, decoding or model execution.
Reports distinguish integrity, recorded curator review, coverage, holdout seal and
real-data readiness. Incomplete inputs produce actionable gaps; invalid inputs
produce sanitized INVALID reports. Rejected entries remain counted and require
explicit revised manifest/version. Unknown products remain unenrolled; unseen
packages of enrolled products remain known with labelled package-challenge gaps.

Policy `r1-capture-coverage-v1`:30–50 enrolled products; at least two distinct
reference view labels; at least two known queries and two declared source/physical
families per product per split;15–25% unknown overall/per split. Query lighting,
views, occlusion and challenge vocabulary gaps are reported across all queries.
These are disclosed preparation targets, not accuracy thresholds, a fixed capture
UI or statistical sufficiency evidence. Products, packages and generations have
separate counts; entry views never inflate product identity count.

Synthetic manifest kind, synthetic curator evidence or authored observations each
prevent real readiness. Complete authored structural tests still report NOT_READY.
A hypothetical fully recorded real set can only be eligible for independent
curator acceptance; independentAcceptance always remains PENDING_NOT_AUTOMATED.
Seal inventory must exactly cover all holdout query IDs/hashes and bind manifest
bytes. Whitespace drift invalidates old bindings. A checksum seal does not prove
secrecy, lawful rights or that tuning preceded no holdout inspection.

RB1-03: guides, reproducible CLI outputs/negative checks, regression evidence and
ledger/workflow/project-state handoff. After the final filesystem checks, stop all
commands/edits and send one founder-authorized completion message to the coordinator.
That tool message is the delivery record; this report does not preclaim delivery.

## Changed files

All paths below are relative to the exact checkout (no migration/dependency changes).

- `apps/recognition-lab/src/curation.ts` — new strict sidecar validation.
- `apps/recognition-lab/src/readiness.ts` — new importer-based assessment/report.
- `apps/recognition-lab/src/cli.ts` — additive readiness dispatch/exit behavior.
- `apps/recognition-lab/__tests__/readiness.test.ts` —37 discriminating tests.
- `apps/recognition-lab/templates/r1-v1/dataset.json` — empty synthetic manifest.
- `apps/recognition-lab/templates/r1-v1/curation.json` — empty pending sidecar.
- `apps/recognition-lab/templates/r1-v1/selection.csv` — product worksheet headers.
- `apps/recognition-lab/templates/r1-v1/captures.csv` — capture worksheet headers.
- `apps/recognition-lab/templates/r1-v1/README.md` — strict fields/curator procedure.
- `apps/recognition-lab/fixtures/r1-curation.json` — deliberately incomplete,
  synthetic sidecar bound to the unchanged R0 manifest.
- `apps/recognition-lab/README.md`, `DATASET_CAPTURE.md` — exact CLI/protocol/gates.
- `docs/recognition/TRACK_B_R1_TICKETS.md` — self-check evidence only.
- `.agents/workflows/recognition-track-b.json` — actual ownership and stopped audit gate.
- `docs/engineering/PROJECT_STATE.md` — current R1 handoff and next action.
- `docs/recognition/reports/R1_PREPARATION.md` — this report.

R0 schema/importer/ranking/experiment/calibration/metrics/tests/config/fixture
assets, historical audit/reproduction and all other coordinator/native/root work
were preserved. A SHA256 comparison of62 pre-existing out-of-scope files reported
zero mismatches. Snapshot covers the pending tracked files and old lab/reports
outside assigned guides/CLI/state; see ignored preservation-check.json. It is a
bounded preservation check, not a claim that every ignored file was inventoried.
Historical repro hash remains
`f8bbdd08ab3b5c33ecf901fbbe70f5fdf750d93019b387eb28cf2e350de1ea2c`.

## Fresh checks and exact commands

All commands used working directory:
`C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Existing Node24.21.0/npm11.19.0 and locked lab toolchain only.

| Command | Exit/result | Scope |
| --- | --- | --- |
| `npm test --workspace @retail/recognition-lab -- --runTestsByPath __tests__/readiness.test.ts` |0;37 tests/one suite,48.437s | Initial focused template/import/curation/coverage/seal/CLI checks |
| `npm test --workspace @retail/recognition-lab` |0;96 tests/seven suites,65.529s | Final37 new plus all59 existing R0 tests; counts overlap focused run |
| `npm run typecheck --workspace @retail/recognition-lab` |0 | Final lab TypeScript boundary |
| `npm run lint --workspace @retail/recognition-lab` |0;zero-warning mode | Final lab lint |
| `node apps/recognition-lab/runs/r1-preparation/verify-cli.mjs` |0 | Actual Node CLI/negative cases, output equality/repeatability and retained R0 A2 metric/repro assertions |
| `git diff --check` |0 | Tracked whitespace check; existing CRLF normalization notices remain |

No new root integration/consumers changed, so unrelated mobile/database/root
validation was not rerun. Prior root692-test result is historical, not this task's
evidence. No phone, Metro, Docker, downloads/installs, cloud build, backend access,
commit/push/merge/rebase/reset or next-phase implementation occurred.

Exact README readiness examples were separately executed unchanged:

```powershell
node apps/recognition-lab/src/cli.ts readiness --manifest apps/recognition-lab/templates/r1-v1/dataset.json --dataset-root apps/recognition-lab/templates/r1-v1 --curation apps/recognition-lab/templates/r1-v1/curation.json --out apps/recognition-lab/runs/r1-empty
node apps/recognition-lab/src/cli.ts readiness --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --curation apps/recognition-lab/fixtures/r1-curation.json --out apps/recognition-lab/runs/r1-fixture
```

Exits2/2; both JSON/readable pairs exist and say INCOMPLETE, realDatasetReady=false.
Empty packet has zero captures/consent. R0 fixture has three enrolled/four declared
products, six references,14 queries and five product-unknown queries (5/14).

Readiness exact interface: four required flags --manifest/--dataset-root/--curation/
--out; no split/config/encoder flags. Curation must resolve inside the supplied
root. Use ignored lab runs for output. Exit0 = recorded real preparation eligible
for independent curator acceptance; exit2 = valid incomplete; exit1 = invalid
input/arguments/I/O. There is no authorized real ready set; exit0 real-readiness
was deliberately **not exercised or claimed**. Invalid dataset/sidecar writes both
INVALID outputs. Argument/output-I/O rejection may leave previous output; exit and
fresh report status must be inspected.

Ignored `runs/r1-preparation/verify-cli.mjs` records every actual invocation with
its exact absolute/relative arguments in `cli-commands.json`. Checked outcomes:

- empty/fixture/fixture repeat:2/2/2, identical repeated readiness JSON bytes;
- stale binding/source-family leakage/duplicate review/malformed sidecar/outside-root
  sidecar/manifest whitespace drift:1 each, expected sanitized diagnostic code;
- stdout/readiness.md equality and no private root/asset bytes in readiness output;
- existing R0 integrity/sweep:0/0; development/frozen holdout:2/2 for deliberate
  ADAPTER_ERROR/TIMEOUT. Holdout retained joint2/4, simulated recovery5/6, failure1
  and primary-only STRONG policy; historical proof hash assertion passed.

Preserved R0 CLI invocations:

```powershell
node apps/recognition-lab/src/cli.ts validate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --out apps/recognition-lab/runs/r1-preparation/r0-integrity
node apps/recognition-lab/src/cli.ts sweep --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split calibration --configs apps/recognition-lab/fixtures/configs.json --choose 0 --out apps/recognition-lab/runs/r1-preparation/r0-calibration
node apps/recognition-lab/src/cli.ts run --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split development --out apps/recognition-lab/runs/r1-preparation/r0-development
node apps/recognition-lab/src/cli.ts run --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --split holdout --frozen apps/recognition-lab/runs/r1-preparation/r0-calibration/frozen-config.json --out apps/recognition-lab/runs/r1-preparation/r0-holdout
```

The initial verification helper exited1 because its expected unknown count was
mistakenly4; manifest inspection confirmed5. Only that helper assertion was
corrected; readiness/product semantics were unchanged. Initial failed log retained
as cli-verification-initial-failed.log; corrected full run exited0.

Complete structural test dataset is explicitly authored:30 enrolled/45 represented
products,60 references/225 queries,46 captured package identities and two declared
packaging generations. Each split has60 known/15 unknown queries. Recorded review,
coverage and seal checks pass structurally, while real readiness remains false.
No generated test text is relabelled as actual photo evidence or committed private
data. The real-labelled boundary test retains synthetic evidence or authored
observations and remains ineligible.

## Git, ownership and residual gates

Branch `plan/m8-unified-scanner`; HEAD
`66ea3fc22595a48d7355d1729bb879496cc98896`, unchanged. Working tree remains dirty
and uncommitted. Initial and final short status preserve the same grouped surface:

```text
 M .agents/contexts/project-context.md
 M .agents/workflows/index.json
 M .agents/workflows/m8-unified-scanner.json
 M docs/engineering/BUILD_PLAN.md
 M docs/engineering/M8_ANDROID_VERIFICATION.md
 M docs/engineering/M8_INDEPENDENT_AUDIT.md
 M docs/engineering/MULTI_AGENT_WORKFLOW.md
 M docs/engineering/PROJECT_STATE.md
 M docs/product/PRODUCT_CHANGE_BACKLOG.md
 M package-lock.json
 M package.json
 M tickets.md
 M tools/scripts/check-environment.mjs
?? .agents/workflows/recognition-track-b.json
?? apps/recognition-lab/
?? docs/recognition/TRACK_B_PLAN.md
?? docs/recognition/TRACK_B_R0_TICKETS.md
?? docs/recognition/TRACK_B_R1_PLAN.md
?? docs/recognition/TRACK_B_R1_TICKETS.md
?? docs/recognition/reports/
```

The checkout, branch and HEAD match the assignment. Older Luna wording in
IMPLEMENTATION_AUDIT_WORKFLOW is superseded by current founder policy in
MULTI_AGENT_WORKFLOW1.1/current packet. Adjacent GLOBAL_MEMORY/.agents/GLOBAL_MEMORY
were absent; repository routing/packet and loaded coding/testing skills provided
the applicable path. No support memory or permanent configuration was created.

Later capture checklist: approve private root/rights; select real difficult30–50
products; collect independent references/queries and unknown/package challenges;
inspect image usability/privacy/physical families; seal holdout before tuning;
assess exact hashes/counts/gaps with the coordinator. No approved real samples or
rights records exist now. Source/family flags can be dishonest or mistaken and
cannot detect every transformed duplicate; human evidence inspection is required.
IDs must remain pseudonymous; the schema cannot prove that alphanumeric IDs are
not names. Reported capture labels are supplied metadata, not image inference.

RB1-04, actual image/rights/independence/holdout review, device/lower-spec/second-
laptop checks, R2 real model/licence/encoder results, R3 physical performance and
R4 actual calibration/accuracy remain pending. Production app/contracts/schema/
thresholds/native code and M8 physical gates were not changed.

Next action belongs to the coordinator: audit the stopped RB1-01..03 source and
fresh evidence; return bounded corrections if needed. Independent acceptance
remains pending. Do not start R2/R3/R4 preparation here.
