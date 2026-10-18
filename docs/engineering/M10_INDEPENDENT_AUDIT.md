# M10 independent source audit — source accepted after C1/C2

Main coordinator: `01a098ef-d830-7531-bca7-2d66b0a5b587`.
Date: 2026-10-03. No audit agent. Implementation chat was STOPPED before review.
Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch: `plan/m8-unified-scanner`; HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.

**Current disposition: source accepted after stopped C1/C2 re-audit.** The
initial two P2 findings below are repaired and independently verified; the
initial failure evidence remains historical. See the final review below. M11 is unstarted and held by
founder instruction; this review does not authorize its planning or dispatch.

## Reviewed boundary and preservation

Reviewed market contracts, exact sanitizer/aggregation domain utilities, local
control/cache client and storage, migration27, screen/route/More entry, and
restricted server migration and authored SQL boundary/projection tests. Challenged
ACTIVE account/OWNER/store/device authority, pending enable/revoke races,
prospective eligibility, mapping compatibility, expiry, response validation,
five-independent-store arithmetic and private-field exposure.

Original pre-M10 manifest553 independently compared:543 byte-identical, ten
authorized deltas, zero missing. Handoff27 changed/new file hash rows matched
before coordinator ledger edits. Three pre-existing test files reconstruct their
original hashes after undoing only the approved literal schema expectations:
catalogueLookup once26->27, m9SyncIntegration twice26->27, and sales appending
only migration27 to the complete history assertion. Removing only the new market
import and registry push restores the original full migrations.ts hash:
`94B43E34C9F3CEE256324F20CF1FE1551F6A41DBCD4031178AC4CC224B40D94F`.
Thus migration definitions1–26 and existing registry behavior are byte-preserved.
Other original deltas are market export/route registration and assigned ledgers.
Valid scanner, recognition-lab and M9 runtime dirt remains preserved.

## Evidence actually checked

Fresh coordinator commands with pinned Node24.21.0, all exit0:

- `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/m10MarketControl.test.ts __tests__/m10MarketCache.test.ts __tests__/m10MarketScreen.test.tsx`:36 tests/three suites,26.671s.
- `npm run test --workspace @retail/domain -- --runInBand --runTestsByPath __tests__/marketPrices.test.ts`:38 tests/one suite,5.734s.
- `npm run test --workspace @retail/contracts -- --runInBand --runTestsByPath __tests__/market.test.ts`:13 tests/one suite,6.106s.

These are87 distinct tests/five suites; do not add them to overlapping builder
counts. Coordinator temporary actual-SQLite/cache and React Native screen probes
then reproduced both findings:two failed/two suites,12.902s,exit1. Seven unrelated
copied screen cases were filtered out by `-t Coordinator`; these skips prove
nothing. Temporary checkout probe files were removed; exact sources and failure
log retained at:
`C:\Users\doyew\AppData\Local\Temp\cosi-m10-coordinator-audit-20261003`.

Builder logs reviewed, not independently repeated in full:final validation1274
pass/17 skip (1291 total), all four workspace types/zero-warning lint exit0;
Doctor21/21, dependency check0, Android source export0 (1633modules/29assets/5.4MB).
Initial stale sales-history failure and its approved25-test repair are retained.
These green authored cases did not cover the two reproduced behavior defects.
`git diff --check` passes; existing CRLF normalization notices are not test failures.
After recording findings, M10 workflow/index passed Ajv2020 with formats, gate
dependency DAG and artifact existence checks. Only assigned M10 ledgers and these
audit/correction documents were edited by coordinator; no production repair.

## Findings

**C1/P2:** client.ts:184 equal-release-revision branch ignores every AVAILABLE
result. After caching A, requesting newly accepted product B at that same global
revision silently retains A and drops B. Same-revision tombstone protection must
apply without blocking valid newly requested keys. Permanent regression and
stale/expiry/context/consent protections are required.

**C2/P2:** MarketPricesScreen.tsx:81 labels result cards with package, zone and
currency only. Two distinct products whose package is “each” are indistinguishable.
Private store-local product names already available through getProducts must
identify the corresponding result, without entering shared market payloads.

## Limits and next action

Shipped route/transport remain disabled; this is a provisional source prototype,
not active market sharing. No numerical price or privacy guarantee is certified.
SQL/Auth/RLS/concurrency/parity were NOT executed. Real mappings/geography,
privacy review (including differencing/Sybil/retention), market quality, explicit
activation, Android/accessibility/second-laptop and release gates stay pending.
Static SQL review and synthetic stores do not pass them. Five stores is a policy
threshold, not proof of anonymity or representative coverage.

Send only C1/C2 to the same GPT-6.1 Sol HIGH implementation chat. Coordinator
stops checkout work while writer resumes; directly audit stopped repair handoff.
No services/phone/hosted effects, Git history change, new milestone or M11 work.

## Final stopped C1/C2 independent review — 2026-10-03

Main coordinator reviewed actual client/storage/screen and permanent test deltas;
no audit agent or simultaneous writer. C1 now atomically replaces the visible
request set, admits new/expanded same-revision keys and retains omitted sparse/
observed-expired fences as private backward-readable cache metadata. Requested
AVAILABLE cannot overwrite those same-revision protections. Legacy encoding,
replacement/restart, delayed older replies, stale mapping, context/consent/identity
changes and observed-expiry clock rollback are covered. C2 matches exact local
variant/package keys to private product labels, with missing/wrong-key fallback;
private names remain absent from requests/shared payloads. No new source blocker
identified within this correction boundary.

Fresh coordinator mobile control/cache/screen command (same three paths above):
51 tests/three suites pass,29.720s,exit0. Independently replayed original two
coordinator failure probes:two pass/two suites11.173s,exit0; seven unrelated
original screen cases filtered out, not evidence. Original failure log retained;
repaired probe log is at the same temporary evidence folder as
repaired-original-probes.log. Temporary checkout files removed. Fresh mobile
typecheck and zero-warning lint exit0 after probes were removed. These results
overlap builder cases and must not be added as distinct feature totals.

Fresh573 pre-repair manifest digest and all eight non-self-referential final
file hash rows independently match.563 byte-identical, ten allowed changes,
zero missing/new repository files before coordinator acceptance ledger edits.
Correction/handoff returned digests match the direct report-back. Branch/HEAD
unchanged. SQL/contracts/domain/business/scanner/lab/native/dependencies/old
migrations, authorized compatibility exceptions and coordinator audit/index
are byte-preserved. Builder102 market-case logs reviewed, not another independent
102-case run. Original full1274/17/Doctor/export stays historical.

Conservative limitations accepted for the disabled source prototype:visible and
hidden rows share100-row capacity; overflow fails atomically until a newer
release provides capacity. Observed-expired/time-invalid numerics need a newer
release even after clock rollback. Previously discarded historical protections
cannot be reconstructed. No schema/public contract effect; original migration27
remains unchanged. These are not live market-quality or privacy assurances.

**M10 software source accepted; C1/C2 closed.** SQL/Auth/RLS/concurrency/parity/
privacy/reference/geography/activation and native/physical/accessibility/second-
laptop/release gates remain pending. Activation remains OFF. All writers stopped.
Hold after M10; M11 remains unstarted, with no planning/tickets/dispatch. Pause
the unattended automation. No production source edit by coordinator.

Final acceptance-ledger validation: M10 workflow/index Ajv2020+formats, gate
DAG/met-prerequisite checks, artifact existence and pending-live assertions pass;
git diff --check exit0 with existing CRLF notices. Acceptance edits are limited
to M10 audit/corrections/handoff/tickets/workflow and M10 PROJECT_STATE section.
