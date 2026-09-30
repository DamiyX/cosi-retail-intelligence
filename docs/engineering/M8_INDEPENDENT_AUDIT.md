# M8 independent audit — pass 1

## Current coordinator re-audit — 2026-09-30, adc8b8f

Decision: amendment corrections R1/R2/R3 pass source re-audit. M8 milestone,
native rollout, live provider and physical acceptance remain unaccepted.
Reviewed d3530bb..adc8b8f against the prior complete amendment inspection.
Implementer was stopped; no parallel implementation occurred. No production
source was edited by the coordinator.

Specification: current validated price is explicitly forwarded to the basket
callback, independently of the immutable product-creation graph/default price.
The actual SellScreen regression preserves the existing line, one new product
and one outbox after overflow/retry, and completes with the corrected price and
quantity. Missing/corrupt optional media no longer blocks scoped committed
replay in either client wrapper. Unsaved-product offline copy is truthful and
the suggestion UI has two main actions plus accessible attribution links.

Standards: first-write photo validation remains after replay lookup and before
new transaction writes. Existing operation/store/device/type checks, exact
calculations, stored snapshots, store isolation and disabled-provider semantics
are retained. Tests operate real SQLite/file ports or native mocks as declared;
this is not Android capture/HTTP/standalone launch evidence.

Fresh coordinator commands on pinned Node24.21.0/npm11.19.0:

- npm run validate: exit0; 12 contracts +150 domain +431 mobile =593 tests,
  75 suites passed; eight opt-in PostgreSQL tests/two mobile suites skipped.
  All workspace typecheck and zero-warning lint passed. Suspense/act harness
  warnings remain; no failed assertions. Log:
  C:\Users\doyew\AppData\Local\Temp\cosi-m8-adc8b8f-coordinator-validate.log.
- npm run mobile:export: exit0; 5.3MB Android Hermes bundle
  entry-5c7706889b66176ec5704d02c2c62829.hbc. Log:
  C:\Users\doyew\AppData\Local\Temp\cosi-m8-adc8b8f-coordinator-export.log.
- npm run mobile:doctor: exit1,20/21; three patch mismatches remain. Log:
  C:\Users\doyew\AppData\Local\Temp\cosi-m8-adc8b8f-coordinator-doctor.log.

Compatibility disposition: require a narrow same-SDK alignment to camera57.0.6,
constants57.0.20 and router57.0.24, with controlled manifest/lockfile change and
fresh checks, before choosing a new native build. Official SDK57 changelogs were
read: camera patch addresses iOS scanning/session bugs; other two patches claim
no user-facing changes. This does not establish a fix for the Galaxy's unexpected
codes. No patch upgrade or APK build was performed in this coordinator review.
Sources: https://github.com/expo/expo/blob/sdk-57/packages/expo-camera/CHANGELOG.md,
https://github.com/expo/expo/blob/sdk-57/packages/expo-constants/CHANGELOG.md,
https://github.com/expo/expo/blob/sdk-57/packages/expo-router/CHANGELOG.md.

Founder daytime continuation authorizes renewed source audit, superseding the
expired unattended window for this work; the overnight automation stays paused.
New PC-10/11/12 ideas are recorded proposals, not implemented contracts. A linked
local Docker workflow was created from the preserved observed workaround; no
Docker startup, phone operation, cloud build/spend, server deployment, Git
push/merge or new milestone was performed. Next: return only the bounded
compatibility task to the same implementer, stop coordinator checkout activity,
and require a stopped completion/blocker report.

## Amendment audit — 2026-09-30, source bcd9e16 / handoff d3530bb

Disposition: changes required; M8-06..09 and the full milestone are not accepted.
The implementer was stopped and the tree clean before this review. Coordinator
added only the two regression tests below and this audit/status record; no
production code, device, service or dependency was changed.

- **P1: corrected selling price is ignored after a basket-add failure.**
  QuickAddProductScreen retains savedGraph after product creation. Its editable
  price is validated on retry but onSaleReady receives the original graph;
  SellScreen.addQuickSale consumes the old defaultSellingPriceMinor. Reproduction:
  save at 1.25, reject basket addition, edit visible price to 2.00, retry: callback
  still receives 125 minor units. Added priceFirstSale regression fails with
  expected 200 / received 125. Preserve the durable product/outbox identity;
  pass the current authoritative sale price separately to basket construction
  rather than silently mutating the original product operation. Adapt the
  regression to that explicit boundary and exercise the actual SellScreen path.
- **P2: optional missing photo blocks idempotent product replay.** Both catalogue
  and sales clients assertReady before the underlying operation checks its
  committed outbox replay. After a photo-backed product is committed, remove
  its photo and retry the same operation: client throws instead of returning
  the durable graph. Added productPhotos client-level regression fails with
  Photo missing or damaged. Check scoped replay before new-photo validation;
  preserve first-write validation and cross-store/device/operation-type guards.
  Cover both wrappers and missing/corrupt media after commit.
- **P2: unsaved Add product has false offline copy.** Shared SuggestionCard
  OFFLINE text says Your product is saved locally, including PreviewSuggestion
  before Save product is pressed. Use truthful neutral copy or context-specific
  saved/unsaved messages and test zero product rows in the unsaved case.
- **UX refinement in approved scope:** FOUND renders five full buttons,
  including Use details and Edit suggested details with identical handlers.
  Reduce redundant actions and present attribution/licence compactly while
  retaining accessible explicit acceptance, editable fields and dismissal.
  Do not waive provider terms or activate live lookup.

Actual focused commands (pinned Node 24.21.0/npm 11.19.0):

1. npm run test --workspace @retail/mobile -- --runInBand productPhotos.test.ts
   -t "client replay succeeds": exit 1, one failed regression, six skipped.
2. npm run test --workspace @retail/mobile -- --runInBand priceFirstSale.test.tsx
   -t "visible corrected price": exit 1, one failed regression, two skipped.
   Existing Suspense/act harness warnings also appeared; assertion failure is
   independent of those warnings.

The retained final-validation log confirms the implementer's 589 passing tests
before these new regressions (12 contracts, 150 domain, 427 mobile); this is
not a fresh auditor full-suite run. Current Doctor 20/21 remains unresolved;
do not claim all validation green. Filesystem method signatures were checked
against installed expo-file-system declarations, not executed on Android.
Live provider remains disabled, and amended phone/camera/standalone offline
checks remain unperformed. Return corrections to the same chat, then stop
coordinator checkout activity until its next stopped handoff. Unattended work
authorization ends 2026-09-30 08:56 Africa/Lagos (07:56 UTC).

Reviewed target: 4ad4a84 (source e10ca70); accepted base c817edb.
Decision: changes required. This is a bounded first pass, not completed independent acceptance.

## Specification finding — high

SellScreen.closeQuickAdd and closeLineConfiguration clear their forms but leave scanIdentifier, scanLine and resumeScanner alive. Reproduction: unknown QR B -> Add product -> Cancel -> ordinary Add product. The unrelated form still displays Scanned QR: B. When scanner associations are enabled, QuickAddProductScreen.save consumes that stale identifier and can attach it to the wrong new product. Cancellation must end the association intent; preserve the cart, and retain scan intent only during intentional search/selection within the same unresolved scan. Inspect sibling line-cancel/discard/new-sale paths and stale resume behavior.

Regression added to apps/mobile/__tests__/scannerSale.test.tsx. Command: npm run test --workspace @retail/mobile -- --runInBand scannerSale.test.tsx scannerPanel.test.tsx scanning.test.ts scannerCatalogue.test.ts. Actual result: 10 passed, 1 failed (the new cancelled-QR regression), 3 suites passed, 1 failed. No production code edited by auditor.

## Standards / evidence gaps

The PostgreSQL scanner tests call the server for acknowledgement statuses but directly invoke quarantineLocalIdentifier and construct pull/bootstrap pages. They do not exercise the new OfflineSyncWorker acknowledgement branch with the real serverPayload shape. Add a worker-level collision/recovery regression using actual response envelopes and assert one recoverable conflict, preserved original product/sale/outbox, owner recovery, subsequent push and pull convergence. Existing successful helper tests are valuable but not this boundary's evidence.

Automatic basket addition is reachable through a test-injected prop only; the real sell route never supplies it. The Android verification procedure calls for fast-add behavior but does not provide a reproducible verification-build path. Supply a deliberately bounded verification-build mechanism/procedure, keep ordinary release defaults off, and do not enable rollout or claim phone evidence.

Correct stale current-status paragraphs in project-context and related routing summaries rather than relying solely on a superseding HTML comment. Track and commit the final handoff; stopping edits is required before notification, not before recording the handoff in Git.

## Limits / next action

Return these corrections to the same implementer. Phone/native checks remain pending; no APK, backend deployment or release authorization is implied. Re-audit revised source and synchronization behavior after the implementer stops. Remaining source review and full acceptance are not complete.

## Implementer response to audit pass 1 — 2026-09-29

Source correction commit: e5b23ff. These are implementation/evidence dispositions, not independent acceptance; the original audit decision above remains for coordinator re-audit.

- Lifecycle finding: corrected. The supplied cancelled-QR regression failed before the fix and passes after it. Shared endScanIntent clears scanIdentifier, scanLine and resumeScanner and cancels pending recognition on cancelled creation/line entry, scanner exit, cart discard, completion and new-sale entry. Intentional search/selection and saved creation retain intent until line commit. Nine scanner-sale tests cover the original regression, dirty/clean sibling exits, new sale, saved identifier ownership, no unintended scanner resume, and preservation of an existing basket. The auditor's original test is preserved and strengthened with an assertion that the unrelated saved product creates no identifier.
- Worker boundary: deterministic coverage added and passing for both nested product creation and later identifier assignment. Full protocol-shaped acknowledgements (including error.details.serverPayload), dependent-sale retry, one recoverable conflict, owner recovery, subsequent push/pull, second-client convergence and restart go through OfflineSyncWorker; no quarantine helper is called by those tests. This fixture transport is not live-server evidence.
- Live worker verification remains environment-blocked. scannerWorker.postgres.test.ts now feeds actual public.sync_push/sync_pull/sync_reference_context RPC output through contract parsing and the worker, using replayed rollback-only transactions. Its attempted run failed before RPC execution because dockerDesktopLinuxEngine was missing. One startup attempt ended with context deadline exceeded; coordinator subsequently took over and confirmed Docker remained unavailable. Per instruction, no further Docker startup/repair/reset was attempted. This evidence gap is not marked resolved.
- Verification-build gap: source mechanism and procedure added. An isolated scanner-verification profile/app ID, explicit opt-in, actual-route guard and visible banner enable fast-add only in that internal app. Two actual-route tests prove ordinary config still confirms and verification config adds. Config resolution and verification Android export passed; production config rejects verification opt-in. No paid/native build or phone evidence is claimed.
- Routing-status gap: current paragraphs in project/app-flow/stack contexts, BUILD_PLAN and design routing summaries now state M7 source acceptance and M8 correction/re-audit status instead of awaiting implementation approval.

Validation: root npm run validate exited 0 (12 contract + 150 domain + 377 mobile = 539 tests; 8 opt-in PostgreSQL tests skipped). Two newer worker-boundary tests and two actual-route tests passed separately, making 543 passing tests across those runs. Fresh mobile typecheck and zero-warning lint passed after those additions. Existing product-list act(...) console warning remains. Physical gates and live-worker evidence remain open. Handoff is tracked and committed before the implementer stops under the coordinator's clarified instruction.

## Independent re-audit of returned corrections — 2026-09-29

Reviewed HEAD c995641, source correction e5b23ff, against first handoff 4ad4a84. The implementer was stopped; the coordinator reviewed the code and evidence sequentially. No production source was changed during this review.

Decision: returned source corrections pass this re-audit. Full milestone acceptance remains pending live PostgreSQL worker evidence and physical Android verification; this does not enable rollout or authorize deployment.

- Confirmed endScanIntent clears the abandoned identifier and resume flags on creation/line cancellation, discard and new-sale paths. Intentional search-to-selection and successful creation retain their association context until line commit. The original regression now verifies no identifier is persisted for the unrelated product, with sibling-path and preserved-basket coverage.
- Confirmed ordinary worker tests exercise OfflineSyncWorker with parsed acknowledgement payloads, one recoverable conflict, original outbox preservation, owner recovery, dependent-sale retry, second-client materialization and restart. Their transport is simulated; the two new live RPC cases remain unexecuted because Docker is unavailable.
- Confirmed isolated verification configuration reaches the actual Sell route, requires the separate environment/package and explicit flag, and displays a banner. Ordinary app variants remain off. This closes the source/procedure gap, not the physical camera gate.
- Routing summaries and the tracked handoff now preserve the returned state. No additional correction request arose from this correction diff.

Independent commands/results: focused scannerSale, scannerWorker and scannerVerificationRoute run passed 13/13 across three suites. The already-started complete mobile run was collected after the model switch without restarting it: npm run test --workspace @retail/mobile -- --runInBand --silent passed 381 tests across 59 suites; eight opt-in database tests in two suites were skipped. Git diff --check for the correction range passed. The working tree was clean at the reviewed HEAD before this audit record update.

Count clarification: 381 mobile plus the implementer's recorded 12 contract and 150 domain tests gives 543 distinct tests. The earlier coordinator statement that four tests were double-counted was premature and is withdrawn. Those four were added after the earlier root discovery. Contract/domain checks were not rerun in this correction audit; their implementation evidence is attributed accordingly.

Next: after the founder switches to the preferred utility model, restore the existing Docker engine and run the pending live worker tests against the disposable local backend. Any new failure returns to source review. Then execute the documented native/phone gate. No Docker setup, native build submission, Git commit/push, deployment, or new implementation chat was performed in this re-audit.

## Implementer amendment correction response — 2026-09-30 cutoff

R1 corrected: current validated sale price is passed separately to onSaleReady and SellScreen, while the original durable graph/default price and operation identity remain unchanged. Auditor regression preserved/adapted to the explicit price argument. Actual SellScreen integration reproduces combined basket overflow, then corrects price/quantity and completes with exact line values, unchanged existing line, and one new product/outbox.

R2 corrected: first-write file validation runs after the existing scoped operation replay check in createTemporaryProduct. Both catalogue/sales wrappers return durable replay graphs with missing/corrupt optional media; original ownership/device/type guards and new-write validation remain. Auditor regression preserved and extended to both wrappers/corruption.

R3 corrected: OFFLINE wording is neutral before save; new unsaved-Add regression proves zero product rows. FOUND has two main actions (Use details, Dismiss), with accessible compact source/licence links; Use details opens actual editable fields followed by explicit Save. Removed duplicate Edit action; related test adapted.

Focused priceFirstSale/productPhotos/catalogueLookupUi:17 passed,3 suites, exit0; actual Sell integration included. Mobile typecheck passed. Final lint result is recorded in the stopped report. Root validation/Android export NOT rerun after these corrections due strict07:56UTC cutoff; prior589 applies only to bcd9e16. Suspended-resource act warnings remain. Doctor20/21, provider-disabled/licensing/contact/native and all physical findings remain open. No acceptance or waiver, package upgrade, phone/Docker/build/backend/push/merge/new milestone.
