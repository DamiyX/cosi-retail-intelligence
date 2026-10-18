# LE-C1 partial-evidence correction — stopped handoff

Same sole writer01a1051f-0777-7573-ad09-0e550a4bd56a, checkout
`C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
LE-C1 is corrected and self-checked. STOPPED, leaseNULL for independent review;
no source acceptance or private text review/analysis is claimed. This correction
supersedes the current packet/source claims in the initial preparation handoff;
that report and every prior packet/evidence artifact remain unchanged.

## Cause and smallest repair

The coordinator's exact generated query `partial: Mea 600ml` contradicted fully
readable `meadow`, allowing a wrong unknown-brand600ml rival to become sole
support and move first. Direct reproduction recorded that wrong promotion.
The exact assertion exits1 before the repair and0 after it; JSON/logs retain both
outcomes. This is an implementation/specification bug, not a typo to fuzzy-match.

One production line in `tools/label-evidence/core.cjs` adds `partial` to the
shared observation abstention set. Partial query fields now normalize to unknown,
produce reasonPARTIAL, and cannot support/contradict/promote or flag a decisive
conflict. The same helper causes partial reference observations to be omitted
from decisive cards. Fully readable siblings remain usable; their evidence is
neither contaminated nor removed. Missing rival metadata remains unknown.
There is no prefix matching, character completion or new completeness contract.

Literal text, source spans, partial readability and all20 query rows remain in
review/freeze/report records. Partial status is a reviewed outcome; an unfinished
review still means not-reviewed. Decisive normalized field availability excludes
partial text; readability counts and raw observed spans preserve its coverage.
Fully readable600ml/0.6L equivalence, stable remaining order and unchanged raw
scores remain covered. No candidate-set, schema, recipe or recognition-state change.

Existing allowed deltas: core.cjs, `__tests__/labelEvidence.node.ts`,
`__tests__/labelEvidenceCli.node.ts`, founder guide, workflow and PROJECT_STATE.
The prior assertion permitting partial quantity promotion was replaced with the
approved conservative expectation while retaining a fully readable positive
assertion. Nine discriminating rule/progress tests and two actual CLI scenarios
were added. No test is skipped or timeout/config weakened. This report is new.
The blank C1 worksheet/README and all other implementation files remain unchanged.

## New bound blank packet and sample

Current packet: `apps/recognition-lab/runs/label-evidence/preparation-20261011-a3/`.
Its six files contain two local review pages,40 blank/not-reviewed text entries,
the bound manifest and a DRAFT_NOT_APPROVED analysis template. Preparation read
metadata/raw buffer hashes only; no private pixels were decoded or transcribed.
Revisionsa1/a2 remain byte-identical and both reject as stale under the new source.
Do not refresh either packet in place. A3 is a preparation revision, not inference.

| Binding | SHA256 |
| --- | --- |
| Preparation-a3 manifest | `ef3f71d9e8be6498bc0e4539deb48a61e4d50e4f418a98878a0d2a2ed069ddcc` |
| Corrected label source closure | `3ec40b723876d1dcc9c56f2c3eb5a242096b1a70f95c34367c968a847fdaa3f2` |
| Corrected conservative rule | `62a2127154cc6bb2fbf84027b0f6190d1752a18c83a21b34b29bbc0c3a489a1c` |
| Accepted crop source, unchanged | `dd68bc1f2a4b1bfd899363ad3223f15c74e2d393db612a609703dc65b7e6999d` |

New sample root:
`apps/recognition-lab/runs/label-evidence/generated-ce651c6b-667c-4eff-8fa1-980e52b72d3b/`.
`sample/report.html` retains the deliberately constructed fully readable example:
14→20 first choices,20→20 top3, six gains/zero losses. `partial-text-report/`
contains20 partial queries,20 reviewed, zero gains/losses/promotions, unchanged
visual candidates/scores, retained `Jun Mea 60ml` spans, reasonPARTIAL and no
positive engineering claim. `partial-reference-report/` likewise keeps all20
queries and visual ordering; the frozen partial reference cards contain unknown
fields/no decisive support. These use invented identities, authored literal spans/
vectors and colored generated images; no text was measured from those pixels.
They are tooling examples, never FC06/OCR or real recognition results.

## Commands, exits and meaningful evidence

Pinned Node:
`C:\Users\doyew\.cache\cosi-toolchain\node-v24.21.0-win-x64\node.EXE`.
Exact command/output logs, source-before bytes, baseline and final inventories:
`C:\Users\doyew\AppData\Local\Temp\cosi-label-evidence-le-c1-20261011\`.
Python checks use the existing pinned exploratory venv with `-B`; no installs.

- `node Counterexample.cjs counterexample-before.json`: exit1, wrong promotion.
  After the one-line repair, the same script with `counterexample-after.json`:
  exit0, correct/wrong/rival unchanged, every fieldUNKNOWN, reasonPARTIAL.
- `node --test --test-reporter=tap apps/recognition-lab/__tests__/labelEvidence.node.ts`:
  before repair23 tests/14 pass/9 fail, exit1; after repair23 pass/zero fail,
  exit0. Covers the exact counterexample, partial brand/variant/quantity digits,
  partial references, missing rival evidence, readable reference siblings and
  validated progress preservation; prior readable equivalence/abstention cases pass.
- `node apps/mobile/node_modules/typescript/bin/tsc --noEmit -p apps/recognition-lab/tsconfig.json`: exit0.
- From lab: `node ../../node_modules/eslint/bin/eslint.js . --max-warnings=0`: exit0.
- `node node_modules/jest/bin/jest.js --config apps/recognition-lab/jest.config.cjs --runInBand --runTestsByPath` with
  labelEvidence, labelEvidenceCli, labelEvidenceViewer, metrics, metricCorrections,
  retrievalEvaluation `.test.ts` paths: exit0,31 tests/six suites/30.855s.
  Three wrappers run23 rule/progress,13 CLI/evaluation and3 viewer Node tests;
  those39 child tests are separate counts, not additional Jest tests.
- The new generated fixture retains25 actual CLI receipts, with asserted0/1/2
  exits and exact argv/stdout/stderr. New complete partial-text merges/analyzes and
  partial-reference freeze/merge/analyze all exit0, retain20 queries and make no
  promotions. Existing incomplete reviews exit2; invalid/boundary cases exit1.
  Fully readable saved-score positive behavior remains unchanged.
- `Prepare-FC06.ps1` invokes the exact metadata-only `prepare` inputs from consumed
  FC06/A5 and newouta3: exit0. `Check-Bindings.mjs`: exit0; original hashes, both
  stale packets,40 blank entries, new source/rule, HTML CSP script/style hashes,
  positive/partial generated reports and25 CLI receipts validated.
- Actual private `analyze` witha3 blank templates and no approval: exit1
  LABEL_PRIVATE_ANALYSIS_NOT_AUTHORIZED, before originals/rule loading; the selected
  `denied-private-analysis-le-c1-20261011` output does not exist.

Actual browser/EXIF/zoom/file-dialog checks remain pending from the recorded
file-protocol policy rejection. This correction did not retry or circumvent
that policy. VM/DOM unit success is not actual-browser evidence. Independent
source acceptance precedes an ordinary founder generated-page browser check
and any subsequent private text review. No private assisted result exists.

## Exact preservation and stop

New baseline:724 repository source records and85922 protected artifact/link
records, including earlier preparations/samples/hand-offs and coordinator evidence.
Final preservation verifies718 unchanged source records, only the six allowed
existing deltas, this one new report, and every85922 protected record unchanged.
Old recipes/contracts/controller/model/software/original/FC06/A5 bytes, accepted
source, branch/HEAD, independent audit, all other tests/docs and blank C1 inventory
remain unchanged. New output additions are only under lab `runs/label-evidence`
and this new correction evidence root. Exact task deltas/new-source/output
inventories and hashes are frozen in `frozen-handoff.json`; workflow schema and
scoped whitespace checks pass. Gates/owner/completed states are preserved, and
PROJECT_STATE changes only its current-work paragraph. Final leaseNULL.

No cross-chat message, agent/model/branch/Git effect, private transcription/
pixels/inference, native/phone/OCR/runtime/dependency/download/network service,
new photos/capture campaign, automation change or M12 effect. Founder guide
now describes partial abstention and the fresha3 packet. Coordinator next action:
audit the stopped correction and source/output bindings; later browser/private
review remain separately gated. LE-C1 is self-checked, independent acceptancePENDING.
