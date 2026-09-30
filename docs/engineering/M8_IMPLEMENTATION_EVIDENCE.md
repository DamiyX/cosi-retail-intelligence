# M8 implementation evidence

Implementer: chat 01a0ec1c-578c-7c41-b151-e803c9e5c548. Checkout: C:\Users\doyew\Documents\DEV 2\COSI-m8-planning; branch plan/m8-unified-scanner.
Accepted base c817edb; approved planning commit 4105618. No subagents, production change, push, merge, reset or M9 work. Coding, testing, UI, database/Supabase and security skills were read and used. Adjacent GLOBAL_MEMORY.md/.agents/GLOBAL_MEMORY.md was unavailable; repository truth and approved M8 plan controlled scope.

## Implementation

- M8-01 (512352e): provider-neutral recognition contract, validated GTIN aliases and exact bounded QR, store-scoped SQLite resolver, latch/cancellation, guarded lazy camera adapter, exact package/price confirmation. Zero recorded stock remains recognizable. Stationary callbacks cannot continuously add units. Sales still own atomic completion and immutable snapshots.
- M8-02 (3eda905): /sell moved from tabs to root stack, existing usePreventRemove guard, global Scan on Today/Products/More with keyboard/safe-area handling and manual Sell preserved. Cart remains mounted through scanner and forms.
- M8-03 (fa49f9c): typed temporary creation, price entry, stable operation IDs, explicit association, exact QR preservation, local alias rejection, same basket resume. A later correction makes an already received remote association a true no-op with no new outbox row.
- M8-04 (0944431 plus verification corrections): PostgreSQL collision guard, local quarantine, manual owner recovery, dependent-sale retry, resolver ambiguity and pull progress. Original rejected outbox payload, product identity and completed-sale snapshots are retained. Recovery queues the same new product without its rejected identifier; it never retargets the sale to the winning product.
- M8-05: optional playback/mute and lifecycle correction, scanner sale/audio regressions, tooling checks and explicit Android procedure. Physical work is blocked, not accepted.

## Migrations and boundaries

SQLite migration 24 adds scanner_identifier_quarantine metadata and its unresolved lookup index. PostgreSQL 20260929092623_m8_identifier_claim_guard.sql wraps existing apply_one under the existing per-store lock, deriving barcode claim keys from raw values and accepted facts. It audits historical accepted collisions and refuses deployment if found. No separate claim database, protocol version, ledger rewrite or automatic merge.

PostgreSQL migration/tests ran in BEGIN/ROLLBACK transactions on the existing local Supabase container. The migration is not applied persistently or deployed. Existing local Auth/Edge test creates disposable local fixtures; no production account/data used.

## Dependency review

Expo remains 57.0.22; Node 24.21.0/npm 11.19.0 unchanged. npm ci succeeded. expo-camera 57.0.5 and expo-audio 57.0.5 are Expo-maintained, SDK-matched, MIT native modules. Camera is confined to one lazy adapter; playback is optional, lazy, releases on unmount/mute and fails without interrupting sale mutation. No recording/capture/storage APIs, recording permissions or background playback are enabled. Existing stack had no playback API; one 100ms generated 880Hz PCM WAV (4454 bytes) supplies the optional beep. Exit path is removing the optional adapter/dependency and config plugin; no business data depends on either. Actual native binary cost remains unmeasured.

Reviewed official docs: https://docs.expo.dev/versions/v57.0.0/sdk/camera/ and https://docs.expo.dev/versions/v57.0.0/sdk/audio/ (2026-09-29). Audio installation succeeded but Expo CLI exited 1 because dynamic app.config.ts requires a manual plugin entry; that entry was added with microphone/background options false. npm reported 13 moderate dependency advisories; no forced upgrade or unrelated dependency remediation attempted.

## Verification trace

- Before correction: M8_POSTGRES_TESTS=1 M8_REPRODUCE_BASELINE=1 with scannerSync.postgres.test.ts reproduced six double-accepted claims (raw UPC, UPC/EAN alias, legacy-normalized QR; nested product creation and later association). Same-value/QR pull failed local uniqueness; aliases could remain ambiguous.
- After correction: scannerSync.postgres.test.ts 6/6 passes using authenticated public.sync_push and real PostgreSQL plus file-backed SQLite. Tests cover rejection, quarantine, owner-only recovery, durable dependent sale, replay, unrelated pull/cursor progress, restart, fresh bootstrap and denied caller with no private conflict payload. Pull/bootstrap transport pages are constructed from the accepted envelopes; this is not a two-phone or deployed HTTP M8 run.
- scannerSale.test.tsx 2/2: real sale client/SQLite with mocked camera, A-A-A one line, A-B distinct lines, explicit repeat, Undo, no automatic completed sale; default fast path remains off and missing package/price opens confirmation.
- scannerFeedback.test.tsx 2/2: explicit feedback only, mute/release, stale playback and native throw isolation. Mocked playback is not audibility evidence.
- Existing sale tests 25/25 passed after updating their explicit migration-history expectation for version 24. Existing navigation 10 tests, sale UI 21 and catalogue regressions were retained.
- npm exec -- supabase test db --local: 10 files / 92 assertions passed on local baseline. The same files also passed with M8 migration injected into each rollback-only transaction. Initial direct psql run lacked pgTAP search path; corrected by installing pgTAP in the transaction and using extensions search path. No test failure was suppressed.
- npm run test:sync:local passed existing local Auth/Edge/PostgreSQL reference-context/device/nonmember authorization, bootstrap, sale and purchase checks. It tests the persistently installed M7 backend, not a deployed M8 migration.
- npm run mobile:doctor: 21/21 passed.
- npm run mobile:export: passed; 1586 modules, 28 assets, 5.2 MB Hermes bundle. These are export observations, not APK size or speed claims.
- Root validation final outcome is appended below. Earlier runs found and corrected strict null narrowing, test bootstrap payloadVersion, test hook generic typing, unused lint suppression and the version-23-only migration fixture. A bootstrap fixture included local-only contact/device fields; corrected to the existing strict wire shape. An unauthorized-push test expected a per-operation rejection; corrected to assert the existing RPC-level permission exception without private payload.

## Gates and remaining limits

EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED defaults off; reviewed deployment must apply the server migration before enabling it. Automatic basket addition defaults off in ordinary builds; tests and the isolated scanner-verification build can enable it. Camera evidence and independent review are still required. Scanner can be disabled with EXPO_PUBLIC_SCANNER_ENABLED=false without removing manual sales.

adb devices -l found no device; Java unavailable. No rebuilt APK, physical A15 launch diagnosis, native permission/torch/beep observation, first-use offline detector check, 200% text/TalkBack check, APK size or timed-selection comparison. See M8_ANDROID_VERIFICATION.md. Carried M3–M7/two-phone/second-laptop/remote-CI release gates stay open.

Historical acknowledged identifier collisions require support; the migration refuses accepted server collisions, and the client never silently reassigns an already acknowledged mapping. Claim lookup scans accepted facts within the store; scale/performance remains unbenchmarked. Coordinator independently audits source and migration; no acceptance gate is self-approved.

Final source correction commit: e10ca70. Expo install --check passed (the intentionally pinned Expo package remains excluded by existing configuration). Expo config --type introspect generated CAMERA, INTERNET, MODIFY_AUDIO_SETTINGS, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW and VIBRATE, with no RECORD_AUDIO; this is configuration evidence, not an inspected APK. Final Android export passed again after corrections (5.2 MB Hermes bundle, 28 assets).

## Initial verification result (before audit)

On final source e10ca70, npm run validate exited 0: environment check, strict workspace typecheck, zero-warning lint, contracts 12/12, domain 150/150, mobile 368/368 (56 passing mobile suites). Six opt-in PostgreSQL tests are skipped by the ordinary root run and passed separately with M8_POSTGRES_TESTS=1: total 536 executed passing tests across those runs, plus 92 pgTAP assertions. No snapshot tests. The existing product-list VirtualizedList act(...) console warning remains; no failing assertion was ignored. Workflow/index schema checks and git diff --check passed.

The initial handoff was left untracked under the earlier stop-after-writing instruction. The coordinator clarified during audit that repository continuity requires committing it before stopping; the current correction handoff follows that instruction. No physical/native acceptance, deployment, push or merge occurred.

## Audit pass 1 correction evidence — source e5b23ff

Original cancelled-QR regression reproduced: scannerSale.test.tsx had 2 passes and 1 failure before correction. After shared scan-intent cleanup, all 9 scanner-sale tests pass, including saved-row assertions, dirty/clean cancel, explicit search-to-association, cart discard, new sale and preserved existing basket. No lifecycle finding is claimed fixed merely from compilation.

Ordinary worker tests: 2/2 passed for nested creation and later association using realistic full parsed protocol responses, real SQLite, OfflineSyncWorker acknowledgement/pull/retry and owner recovery. They assert one conflict, original rejected outbox retained, durable sale, subsequent synchronization, second-client convergence and restart. No direct quarantine helper bypass. Fixture transport remains explicitly distinct from live PostgreSQL.

New scannerWorker.postgres.test.ts (2 opt-in cases) is implemented/typechecked but its run was environment-blocked before RPC execution: Docker reported missing npipe dockerDesktopLinuxEngine. One `docker desktop start --timeout 50` attempt ended `Docker Desktop is still starting: context deadline exceeded`; own waiting status CLI processes were stopped. The coordinator took over startup, reported the stale sailor-ingest.sock problem, and directed no further attempts. No reset, database deletion or Docker configuration change was made by this implementer. The prior six real PostgreSQL tests are historical evidence, not rerun evidence for this correction.

Root npm run validate exited 0: contracts 12, domain 150, mobile 377 = 539 passing tests, 8 opt-in PostgreSQL tests skipped. New ordinary worker tests (2) and actual-route verification tests (2) passed separately after root discovery, for 543 passing tests across these runs. Fresh mobile typecheck and zero-warning lint passed after the new files. An intermediate typecheck caught nullable cursor use in the test fixture; corrected and rechecked. Existing product-list act(...) warning persists without failed assertions.

Verification build: dedicated internal EAS profile plus isolated app environment/ID; actual route checks all guard values and displays a verification banner. Configuration resolution produced com.damiyx.retailintelligence.scannerverification with opt-in true. Production with the same opt-in was rejected. Verification-mode Android export passed (1587 modules, 28 assets, 5.2 MB Hermes bundle); not an APK/native or physical result. No build job submitted, no dependency added. Procedure is in M8_ANDROID_VERIFICATION.md.

Audit response, active routing contexts, BUILD_PLAN, design summaries, tickets, PROJECT_STATE and workflow are updated. The current handoff is committed before stopping. Independent re-audit, live worker/PostgreSQL evidence and physical acceptance remain open.

## Live database verification — 2026-09-30

At source HEAD c995641, ran with the pinned Node 24.21.0/npm 11.19.0 toolchain:

```powershell
$env:M8_POSTGRES_TESTS = '1'
npm run test --workspace @retail/mobile -- --runInBand scannerWorker.postgres.test.ts scannerSync.postgres.test.ts
```

Exit 0: two suites, eight tests passed, zero snapshots; Jest reported 40.551 seconds. Both new live OfflineSyncWorker cases passed (PRODUCT_CREATED and PRODUCT_IDENTIFIER_ADDED), using actual sync_push/sync_pull/sync_reference_context JSON through contract parsing, recovery, dependent-sale retry, two-client convergence and restart. All six existing scannerSync PostgreSQL collision cases also passed in this run. This resolves the prior unavailable-engine evidence gap for these database tests.

Tests invoked psql inside existing supabase_db_retail-intelligence and injected the M8 migration and disposable fixtures in BEGIN/ROLLBACK transactions. No source/test changes, persistent migration, reset, Docker startup/repair, deployment or HTTP smoke run occurred. The coordinator reported the Edge runtime exited; no HTTP readiness is inferred. Prior root/mobile validation remains attributed to its earlier runs rather than rerun here.

Coordinator's uncommitted independent audit, workflow/state updates and DEVELOPMENT.md Docker workaround were preserved. Physical verification is still pending; coordinator reports the SM-A156E Android 16 is connected, but this database-only task performed no phone/native work. Independent source re-audit passed as recorded by the coordinator; final gate ownership remains with the coordinator.

## Sequential phone utility evidence — 2026-09-30

At clean baseline 59ad39c, directly inspected the authorized SM-A156E Android
16/API 36. Existing preview opened its test-store Home screen; existing
development reached Expo's launcher. Historical September 28 logs localize the
dev failure to DevLauncherActivity redirection; the failure did not recur in the
single current launch and its root cause remains unverified. Installed dev
requests no CAMERA permission. No M8 scanner check was performed.

Read-only EAS history returned no M8 build; newest finished development/preview
jobs both use pre-camera source 1b2b100. No compatible APK/generated native
project exists in the inspected checkout/artifacts. Java/Android SDK build tools
were unavailable, so local native build was not feasible. No cloud build was
submitted; remaining quota/cost is unverified. The dedicated isolated profile's
minimum command and separate standalone/association prerequisites are recorded
in M8_ANDROID_VERIFICATION.md.

This is device/build inspection and existing-app launch evidence only. All
camera, permissions, scan cases, lifecycle, beep/torch, accessibility,
standalone/offline-first-use and completed-sale restart criteria remain
unperformed. No data clearing, app overwrite/installation, tool installation,
Metro startup, Docker action, migration deployment or production code change
occurred. Evidence-only documentation/workflow checks are recorded in the
utility's final coordinator handoff; acceptance remains coordinator-owned.
Workflow schema validation returned True and git diff --check exited 0.
Production tests were not rerun for these evidence-only changes.

## Authorized isolated native pass — 2026-09-30

This supersedes the preceding compatible-build blocker. The founder authorized
one included scanner-verification build conditional on no additional charge.
EAS build 105bb294-dce0-487c-ba87-d1620a40cd82 from exact source
4d6521e66e1b43641fe93e69791b779bcf727baa finished; post-build authenticated
Free-plan usage showed zero overages and total cost zero. APK 264,484,039 bytes,
SHA-256 76f6d2ed882b3e89bb2d234ac00927728fc1d72944f11d2fb73cff8e114692dd,
installed into separate com.damiyx.retailintelligence.scannerverification.
Native camera/audio/barcode classes and CAMERA permission were inspected;
RECORD_AUDIO is absent. SM-A156E Android 16/API 36 ran the actual isolated
verification route with matching Metro, associations off and synthetic fixtures.

Correct Fanta (5449000011527) and AirPro (6922420651355) EAN-13 additions,
exact AirPro UNKNOWN/cancel preserving Fanta, permission denial/search/settings
grant, physical torch and one audible AirPro addition beep were observed.
Three unexpected UPC/EAN values paused UNKNOWN, without an extra basket line.
Continuous stability/false-decode acceptance is not passed; initial Fanta beep
was silent and longer-distance blur/reflective-can glare were reported.
Large text was partially inspected; TalkBack tutorial blocked field evidence.
Font change lost the unfinished memory-only cart. Settings return refresh and
the remaining native criteria remain unproven, as itemized in the device report.

A manually reconstructed sale of 2 Fanta cans + 1 AirPro can at synthetic prices,
NGN 4,000 Cash, completed with airplane mode on and Wi-Fi off. After isolated-app
force-stop/cold reopen, the native sale, payment, snapshots, inventory events and
pending outbox evidence matched byte-for-byte; the receipt reopened correctly.
Both checkpoint hashes are
150808148a92498814e8c0f3c7b74c135e499622bc826bcd072120901e43d9d5.
USB Metro was still available: standalone offline launch/first-use detector
availability and cloud sync are not proved. This was not completion of the
original scanned basket. Zero recorded stock produced explicit negative SALE
events with reconciliation required; cost coverage was unavailable.

The pass is stopped. Normal font/accessibility/network settings were restored,
camera active clients were empty, Metro exited and port 8083 had no listener or
reverse remaining. Installed isolated app/synthetic data are preserved. No
production source/dependency changes, migration deployment, second build,
push/merge or self-acceptance. Full procedure, evidence and outstanding criteria
are in M8_ANDROID_VERIFICATION.md. Final workflow schema/diff checks are recorded
in M8_IMPLEMENTATION_HANDOFF.md; ordinary tests were not rerun for evidence edits.

## M8-06 price-first source — 2026-09-30

Approved planning preserved at 8a3c15b. Selling shortcut generates its nonempty distinguishing label from stable StoreProduct identity, validates exact price/quantity and adds directly to the same basket with operation-ID deduplication. Ordinary Products creation stays name-based. New regressions cover invalid price, rapid taps, distinct labels/replay and enrichment with unchanged completed-sale snapshots after restart. Focused priceFirstSale/scannerSale/catalogue/scannerCatalogue: 30/30 passed; navigation/sell/products/scannerPanel also passed (58 cases in the earlier focused run). Fresh mobile typecheck and zero-warning lint passed. Initial old scanner assertions expected the superseded name/line form; updated to price-only behavior while retaining saved-identifier assertions. No physical acceptance inferred. M8-07 photo implementation follows separately.
