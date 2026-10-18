# P2-02 independent audit — recovery correction required

2026-10-14. Decision: CHANGES REQUIRED. Generated enrollment/recovery only.
Stopped direct handoff,579 frozen entries and22 exact source snapshots verified;
coordinator released lease. Source remained untouched by reviewer.

## Specification finding P202-A1 — high: interrupted partial results are erased

Actual resumeInterrupted TRIAL path constructs frames:[] and replaces an existing
stillOwnedWork record. A valid persisted partial trial can contain earlier USABLE
frames and an outstanding frame. Reopen/explicit resume currently discards all of
them, losing vectors and observed attempt counts. Keeping the trial denominator
does not preserve its already observed evidence.

Independent actual-source/disposable-store reproduction:
- Enroll four generated views and freeze one scheduled trial.
- Commit a DRAINING record containing job-1 USABLE[1,0] completed100ms and job-2
  PENDING requested/captured400ms, with its active trial marker retained.
- Reopen actual generated JSON, classify interrupted and explicitly resume.
- Before:2 observed frames/1 usable vector/attempted2. After:0 frames/0 usable
  vectors/attempted0 and missing3. Original output and source bindings retained.

Proof: p2-generated-02-independent-20261014-a1/interrupted-partial-challenge.ts/json;
unchanged actual source imported directly, exit1. Full before/after record/report
and real generated checkpoint retained. No private data or model/camera calls.

Required correction: preserve every previously observed frame/timing/ID/value/
failure fact during interruption classification, while reporting INTERRUPTED,
keeping failed/incomplete trial semantics and requiring explicit user continuation.
Do not turn incomplete work into success, recapture queries, infer native drain or
invent missing vectors. Existing marker with no prior record may still yield an
empty interrupted row. Duplicate recovery must remain idempotent and completed
records/revisions immutable. Scope is this recovery path and its regression.

## Checks passed and limits

Fresh current16 enrollment tests/one suite43.405s pass in exact source/test/fixture
shadow, avoiding frozen writer outputs. Fresh current34 accepted session functional
cases pass/one suite5.341s; the35th old CLI test is explicitly skipped because its
destination expectation predates the authorized P2-02 root change. Current extended
CLI is covered by the fresh enrollment suite; old35 pre-extension shadow evidence
remains historical. Actual-source lab typecheck/lint exit0. No assertions or
timeouts changed; no production repair to obtain these results.

Old-valid/new-valid publication, cap/refusal, ordering, revisions and ordinary
empty-marker recovery have positive coverage. The failing partial-record path
was absent from those tests. No further broad testing is needed before correction.

## Preservation and inventory limits

Extended-length, read-only enumeration verified579 writer rows including3 generated
junction targets without following them. Writer inventory/stop hashes match;
22 current source/fixture/test/handoff bytes match snapshots.138/140 original
source rows exact; only authorized cli.ts/generated.ts extensions differ. Accepted
P2-01 session/35-case test and P0/P1 source/config remain byte-exact.

Prior full path sets: original writer173, first audit45, C1 writer104, accepted C1
audit48. Earlier coordinator accepted C1 inventory included43 files but omitted5
long-path shadow source-manifest files. Each actual extra file matches the source
hash declared by its already-frozen sibling receipt (c689cccf...9972fa); all43
indexed files match and no unrelated additions exist. Coverage gap is now disclosed
and cryptographically closed; old inventories were not rewritten. New enumeration
uses extended Windows paths and records reparse targets without following them.

Writer's Windows EPERM rename failure and attempted-harness diagnostics remain
retained. It refused publication and left old-valid generated state; no automatic
rename retry is claimed. Dead-process commit locks are not stolen automatically.
Neither later test passes nor injected faults prove Android power-loss durability.

## Next action

Same stopped writer corrects P202-A1 under PHONE_P2_02_C1_CORRECTIONS_20261014.md,
then returns direct stopped handoff. P2-02 acceptance withheld. P1 remains founder
hotspot-deferred; no P2-03/native/private/phone work. Future native recovery must
establish actual process/job lifecycle and physical drain; reopening a generated
file alone does not prove another native worker stopped.
