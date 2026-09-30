# M8 independent audit — pass 1

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
