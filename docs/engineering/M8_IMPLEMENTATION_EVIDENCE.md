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

## M8-07 private identification photo source — 2026-09-30

Price-first selling now opens an explicit whole-product photo step before the numeric price. Capture is separate from barcode preview and is cancelled on blur/background/unmount. Permission/camera/storage failure offers retry or Continue without photo. Temporary list, detail and the existing completion form display the photo or truthful absent/damaged state, with originating-device-only wording. No uploads, image URLs or device URI/bytes are added to business envelopes.

SQLite migration 25 local_product_photos stores bounded MediaAsset metadata and enforces one photo per product plus store linkage. Capture is copied to an app-private document directory using generated UUID filenames, a staging file, verified content/dimensions/size and final move before metadata insertion. Product graph, asset attachment and business outbox commit together in SQLite; filesystem writes are separate. Cancel deletes only unattached staging; orphan recovery uses a 24-hour grace and a global reference check, preserving committed files even after an uncertain commit. Replacements keep old files conservatively until recovery. Missing/damaged photos do not remove products or block sales. MD5 is only a corruption fingerprint, not an authenticity claim.

Focused source verification: 109 tests passed across ten suites (photo repository/UI/camera/file-adapter, price-first sale, scanner sale, ordinary Products, navigation and sales). Mobile typecheck and zero-warning lint passed. Tests use real SQLite and actual temporary files for restart/replay/failure recovery; native camera/file bindings are mocked. A stale callback regression was observed and corrected before the passing run. Tests cover permission denial, low storage, invalid file/size/path, pre/post SQL failure, cancellation, recovery, wrong store/replacement, missing/corrupt files, completed sale snapshots and media exclusion from JSON. Physical capture/display/restart retention remain unverified.

Dependency: declared existing locked Expo-maintained MIT expo-file-system 57.0.7 directly; offline package-lock-only install changed only the workspace dependency declaration, no transitive upgrade or native plugin/permission change. Inspected local source/types for document storage and sync file APIs. Current official Camera docs confirm explicit capture initially writes cache and one preview at a time (https://docs.expo.dev/versions/v57.0.0/sdk/camera/). FileSystem docs could not be fetched; installed 57.0.7 source/types were used.

Read-only archive inspection of the existing APK 105bb294-dce0-487c-ba87-d1620a40cd82 matched SHA-256 76f6d2ed882b3e89bb2d234ac00927728fc1d72944f11d2fb73cff8e114692dd and found native FileSystemModule and CameraViewModule classes in its DEX files. This supports testing against the existing development binary, but does not prove native invocation or phone compatibility. No APK build, installation, Metro or phone operation occurred.

## M8-08 — scanner activity source verification (2026-09-30)

Four framing corners and a decorative sweeping line render only after camera readiness while the scanner is active. Reduced motion uses static corners. Overlay ignores touches and accessibility focus; background, error, permission and resolution pauses stop it. Detection remains across the full preview; copy states that accurately. No dependency or detector acceptance change.

Focused scannerActivity/barcodeCamera/scannerPanel/scannerSale: 17 tests passed in four suites. Fresh mobile typecheck passed; lint passed with zero warnings after replacing render-time ref access with a lazily initialized animation state value. The scannerSale suite emitted React suspended-resource act warnings; assertions passed, and this is not physical camera evidence. Native basket continuity, reduced motion, beep and detector stability remain open for the documented sequential retest.

## M8-09 — disabled-provider catalogue suggestion source (2026-09-30)

Source d87597b plus confirmed-foreground correction bcd9e16. D-048 authorizes optional unconfirmed suggestions after local lookup, with live activation gated. Validated UPC/EAN only; QR, URLs, private/internal types and bad checksums cannot request. Unknown price/photo sale returns its durable graph without awaiting network; no-code never looks up. Ordinary Add can explicitly prefill an actual editable name. Later Temporary details show source/brand/size and explicit Use details/Edit/Save or durable Dismiss. Size does not change package conversion. Known local mappings win, and provider responses never automatically change identity, commercial facts, inventory, identifiers or immutable sale snapshots.

SQLite migration 26 local_catalogue_suggestions adds store-scoped metadata, public-data response cache and persistent request budgets only. No server migration, recognition contract or sync envelope change. One active request, same-code deduplication, five-second timeout, foreground/background abort, 10/minute and 100/day device budgets, bounded cache/backoff and manual retry are enforced. Identity/name/version/identifier snapshots, request generation, store/product ownership, enrichment and cancellation protect late results. Dismissal/correction survives restart. Public response cache may finish after one consumer cancels while still foreground; that cancelled consumer cannot mutate product metadata. This is not an OS background scheduling promise.

Focused catalogueLookup/catalogueLookupUi:21 tests passed in two suites before the final foreground guard; the final root run covers that added unknown-state/pre-request-abort guard. Tests use real SQLite with fixture transport and mock native lifecycle. They prove explicit accept/edit/dismiss, actual field values, no late overwriting of typed names, no lookup for invalid/private codes, local priority, product/sale completion before response, replay/cache/backoff/timeout/rates, wrong-store isolation, background/cancel/barcode/enrichment staleness, retained photo metadata/file-port availability, unchanged sale/package/price facts, and schema25->26 preservation of existing product/photo/sale/inventory/outbox rows. Initial tests exposed a lifecycle mock-state/cleanup fault; fixture corrected. No provider coverage or native-network result is claimed.

Provider comparison and terms links are in M8_CATALOGUE_LOOKUP_PROVIDER.md. Open Food Facts candidate uses pinned v3.6 product endpoint/limited fields, strict barcode/name/field/body parsing, fixed attribution URLs and no images/uploads/search. Documentation version discrepancy is retained. Live application defaults use disabledLookup; there is no environment activation switch. No authorized public contact is available and ODbL private-catalogue reuse/attribution has not been reviewed. Native HTTP redirect/User-Agent/body buffering and actual endpoint compatibility are unverified activation checks. No real barcode request, application form, email, signup, paid API, private-photo/business-data transmission or public contribution occurred. Food/nonfood coverage is unmeasured.

Own fresh review checked client forwarding, exclusion from operation payloads, store and stale-response predicates, manual acceptance paths, native lifecycle and exact-price invariants. Unknown initial AppState was tightened to require confirmed active foreground, including abort before provider invocation. This is implementer self-check, not independent assurance.

## Final amendment tooling limits — 2026-09-30

Fresh Expo Doctor ran all 21 checks: 20 passed, one failed for patch-version recommendations. Remote expected camera~57.0.6/constants~57.0.20/router~57.0.24; locked found 57.0.5/57.0.19/57.0.23. Installed Expo 57.0.22 bundled ranges are camera~57.0.5/constants~57.0.18/router~57.0.21 and admit the locked versions. No exclude rule, patch upgrade, native build or waiver was introduced. This discrepancy remains for coordinator review; historical 21/21 does not describe this run.

Final Android export after bcd9e16 source passed: 1615 modules, 28 assets, 5.3 MB Hermes bundle entry-9c7b05be418614f05d6562341462e9da.hbc. Export is not an APK or a physical result. Transient Metro export worker exited; no development server/phone work was started. Native-module compatibility remains limited to the earlier read-only APK class/hash inspection.

## Final frozen-source verification — bcd9e16

`npm run validate` exited 0 after the last foreground guard: contracts 12 + domain 150 + mobile 427 = 589 passing tests; 75 passing suites across workspaces. Eight opt-in live PostgreSQL tests/two mobile suites were skipped in this run. Typecheck and zero-warning lint passed for all three workspaces. Mobile suite duration 205.935 seconds. No runtime edits followed. Latest log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-amendment-foreground-validate.log. Earlier validation passed 588 before migration-retention coverage and 589 before the last foreground guard; these are superseded by this final run.

Jest emitted React suspended-resource act warnings in existing sale/price-first suites; assertions passed. These are test-harness limitations, not lint failures or native evidence. Doctor 20/21 and physical/provider gaps above remain open. Full validation does not include phone, live HTTP, new PostgreSQL/pgTAP or production readiness.

The final export log is C:\Users\doyew\AppData\Local\Temp\cosi-m8-amendment-final-export.log. Workflow state/index schema checks and git diff --check passed during handoff preparation; final repository status is reported only after documentation commit/checks. No source change after the verified bcd9e16 tree.

Audit correction cutoff follow-up: R1 current sale-price callback, R2 replay-before-optional-photo validation and R3 truthful compact suggestion UI corrected. Auditor regressions preserved; actual Sell overflow/retry and unsaved offline-copy cases added. Focused17 tests passed; mobile typecheck passed. Final lint reported with stopped HEAD. Full validation/export remain pending for this newer source;589 is historical bcd9e16 evidence. See M8_INDEPENDENT_AUDIT.md correction response.

## SDK57 compatibility verification — 2026-09-30, 824b2af

Daytime continuation resumed the same implementer/branch. Coordinator's ten pending documentation files were preserved exactly in5f92566 before dependency edits. Amendment corrections atadc8b8f already passed coordinator re-audit; this maintenance result does not independently accept M8 or its native/provider gates.

Official SDK57 changelogs were read before installation: [Camera](https://github.com/expo/expo/blob/sdk-57/packages/expo-camera/CHANGELOG.md), [Constants](https://github.com/expo/expo/blob/sdk-57/packages/expo-constants/CHANGELOG.md) and [Router](https://github.com/expo/expo/blob/sdk-57/packages/expo-router/CHANGELOG.md). Camera57.0.6 addresses iOS barcode/session/fallback bugs; constants57.0.20 and router57.0.24 list no user-facing changes. None establishes a Galaxy unexpected-code fix. Router's published dependency requires @expo/ui^57.0.21; its [official changelog](https://github.com/expo/expo/blob/sdk-57/packages/expo-ui/CHANGELOG.md) adds optional observable-state/platform UI capabilities and an iOS touch fix. COSI source has no direct @expo/ui usage or affected optional API call.

| Existing package | Previous lock | New lock | Manifest convention |
| --- | --- | --- | --- |
| expo-camera | 57.0.5 | 57.0.6 | ~57.0.6 |
| expo-constants | 57.0.19 | 57.0.20 | ~57.0.20 |
| expo-router | 57.0.23 | 57.0.24 | Exact57.0.24 |
| @expo/ui | 57.0.20 | 57.0.21 | Existing transitive dependency required by Router |

Pinned Node24.21.0/npm11.19.0; root `npm install --ignore-scripts --no-audit --no-fund` exited0, changed four packages. JSON lock comparison against preserved baseline confirmed exactly the mobile workspace's three constraints and these four existing entries changed: no added/removed packages or unrelated lock entries. Runtime commit824b2af changes only apps/mobile/package.json and package-lock.json (20 insertions/20 deletions). Expo core57.0.22, RN0.86.3, permissions/plugins, schema26, business contracts, provider/rollout defaults and application source are unchanged.

Fresh commands after the runtime commit, all exit0:

- Root `npm run validate`:12 contracts +150 domain +431 mobile =593 passing tests across75 suites; eight opt-in live PostgreSQL tests/two mobile suites skipped. All workspace typechecks and zero-warning lint pass. Mobile suite337.392 seconds. Existing suspended-resource/act harness warnings remain without failed assertions. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-sdk57-patches-validate.log.
- Root `npm run mobile:doctor`:21/21 passed, no issues detected. This resolves the prior20/21 patch recommendation discrepancy; historical runs above remain historical. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-sdk57-patches-doctor.log.
- Mobile `node ../../node_modules/expo/bin/cli install --check`:dependencies up to date. The pre-existing expo.install.exclude entry for Expo core is retained; no new exclusion/suppression. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-sdk57-patches-install-check.log.
- Root `npm run mobile:export`:1615 modules,28 assets,5.3MB Android Hermes bundle entry-8c98ddb3654b026844752fefbbc39601.hbc. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-sdk57-patches-export.log.

All check processes completed. No runtime edits followed824b2af; subsequent changes are evidence/routing/handoff only. Final schema/diff/clean-HEAD checks are supplied with the stopped notification. No new tests were introduced for the patch update; existing regression coverage was rerun.

Existing isolated APK105bb294 still contains older native modules; no rebuilt APK, installation, phone/Metro development server, Docker startup/repair, live provider lookup, account/message, persistent backend change, spend, Git push/merge or M9 work occurred. Export and native mocks do not prove native compatibility or resolve Galaxy scanning/beep/accessibility/standalone/photo findings. Live provider, associations and ordinary automatic basket addition remain off. PC-10/11/12 are preserved proposals only; overnight automation remains paused. Coordinator reviews this stopped compatibility handoff separately from physical/provider acceptance.

## October feedback implementation — M8-10 (2026-10-01)

Planning/device evidence baseline: 4e1b4ba preserves all twelve coordinator files exactly. R2 source scope: deliberate scanner entry/cancellation and feedback, compatible draft accumulation, private thumbnail presentation/onboarding, and existing Today discount summary; no schema/provider/rollout/native-build change. Main risks are stale scan/audio callbacks, exact draft/Undo arithmetic, image ownership/legacy compatibility and net-sales double subtraction. Focused route/SQLite/file-boundary tests and per-ticket static checks precede final combined validation. Source rollback is by local commits; native findings require separate coordinator-owned verification.

M8-10 changes explicit Scan next item and Single cancellation to reset the previous code only on a deliberate new intent; passive cancellation still preserves the latch. Single match and automatic Basket addition emit one optional match cue at their respective initial events. Valid UNKNOWN/AMBIGUOUS results use a distinct generated 330Hz/100ms neutral PCM cue. Later configured additions are silent; visible matched copy does not imply basket addition.

Inspected installed expo-audio57.0.5 source: createAudioPlayer loads asynchronously, exposes playbackStatusUpdate/isLoaded and asynchronous seekTo. Android getter reports only STATE_READY while status also treats STATE_ENDED as loaded. Feedback waits at most500ms for readiness/seek, tracks loaded status, and cancels stale/muted/background/unmounted requests. Audio failures never block checkout. This addresses concrete readiness/lifecycle gaps, not an established cause of the reported silent first beep.

Initial before-change route attempt exceeded Jest's default5s timeout; this is inconclusive, not failing-before defect proof. Focused checks use explicit30s timeout for SQLite/UI setup on this host. Native camera/audio remain mocked and prior act harness warnings remain. Exact final command results are recorded below after completion.

M8-10 final commands: npm run test --workspace @retail/mobile -- --runInBand --testTimeout=30000 scannerSale.test.tsx scannerPanel.test.tsx scannerFeedback.test.tsx scanning.test.ts passed25 tests/four suites; mobile typecheck and zero-warning lint passed, all exit0. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-10-final.log. Self-check also prevented a failed package read from emitting a match cue. Application initializer uses one root-owned adapter and closes on initialization failure; no concrete app-owned cause of the returned native handle failure established, so connection policy is unchanged.

## M8-11 — compatible draft accumulation (2026-10-01)

Central sales/draft insertion checks the full candidate total before mutation; merges only identical product/variant/package/conversion/price/name/package-name snapshots with zero discounts and exactly preserved base/gross/net sums. Existing D-036 rejects fractional/rounded calculated lines rather than accepting corrupt snapshots. One result-owned Undo restores the previous immutable draft; later edit/removal/completion/new-sale invalidates it. Mode change/Undo cancels in-flight recognition to prevent a late callback overwriting newer draft state.

Before-change actual A/B/A route regression failed because three rows were rendered instead of two (cosi-m8-11-before.log). After-change focused saleDraft/scannerSale/priceFirstSale/scannerPanel passed30 tests/four suites; includes ten-plus-one, incremental Undo, editing, durable sale snapshots/inventory/outbox and operation replay through actual Sell/client/SQLite. Differing commercial snapshots, fractional exactness, quantity/money overflow and stale Undo tested. No migration, completed-sale rewrite, transaction/cost/sync change or draft persistence.

Command: npm run test --workspace @retail/mobile -- --runInBand --testTimeout=30000 saleDraft.test.ts scannerSale.test.tsx priceFirstSale.test.tsx scannerPanel.test.tsx; mobile typecheck exit0. Original lint caught import/first warning only; import moved before export and fresh npm run lint --workspace @retail/mobile exited0 with zero warnings. Logs: C:\Users\doyew\AppData\Local\Temp\cosi-m8-11-final.log and cosi-m8-11-lint-final.log. Two fixture assertions were corrected (actual outbox operation_id column; corrupted rounded line must reject under current exact policy), not weakened business behavior. Source/SQLite evidence only; native storage/scanning remains open. Founder policy packet preserved separately in f9f78bf after quota resume; no implementation check is attributed to those documentation changes.

## M8-12 — product photo presentation (2026-10-01)

Catalogue, sale search, cart and detail show existing private photos for named/temporary/enriched products. Thumbnail controls are siblings of selection/edit/remove, with separate enlargement, Close and Android request-close handling. Generated labels display compactly in cart; underlying stored labels/receipt snapshots remain unchanged. Mounted-item snapshots reverify on product/store/refresh/foreground changes and reject damaged images without blocking selling; no global file cache. Catalogue initially renders eight items, sale search ten and cart twenty per page, bounding eager photo verification/display.

Before-change mounted-item regression read the same file three times across three parent renders instead of once. After-change productPhotoPresentation/productPhotoUi/scannerSale passed19 tests/three suites with explicit30s setup timeout (catalogueScreens pattern matched no additional suite). Tests include two distinct unfinished photos plus named/enriched photo, actual cart/receipt invariants, enlarge/Close/request-close, stale product/store/damaged fallback, and a1000-item catalogue with at most eight mounted reads and no reread on ordinary parent rerender. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-12-focused.log. Existing act harness warnings remain. Native focus, text scale, memory, scroll smoothness and photo/restart remain unverified; source mocks are not device acceptance.
Final M8-12 mounted-snapshot rerun passed2 tests/one suite after memo dependency correction; mobile typecheck and zero-warning lint passed (exit0). Initial static check found an unnecessary dependency warning, corrected by retaining explicit scope/revision witness in the verified snapshot. No suppression or cache widening.

## M8-13 — normal onboarding and bounded thumbnail writes (2026-10-01)

Ordinary named Add offers photo capture/preview/retake/skip; its existing atomic product creation attaches staging and replays the saved graph after interrupted navigation. Existing temporary/named/enriched detail offers Add/Change photo through the same client.photos adapter, with keyed editor ownership, explicit preview/save, transactional replacement, rollback/retry and cancel cleanup. No new database connection, schema, dependency, gallery, upload or recognition enrollment. Product/store switches close/invalidate photo editors and old callbacks. Optional preview failure remains truthful.

NEW staging independently enforces encoded JPEG metadata long edge<=1024 and bytes<=307200; native file copying validates contents before making a durable copy, attachment/readiness/replacement also check new-write bounds. Integrity reads retain the previous8MiB/4096 legacy policy. Existing committed replacements replay before optional file availability checks; old assets remain conservatively recoverable. Camera selects the largest supported size within1024, preserves processed orientation/aspect and quality0.65, never auto-recaptures; oversized/unsupported outputs expose retry/no-photo fallback. Actual capture URI cleanup only accepts the one tracked cache/Camera/generated-UUID.jpg, including late capture/failure paths; unrelated cache and committed files are excluded.

Installed SDK57 CameraViewModule.savePictureAsync converts quality with quality.toInt()*100 and recycles PictureRef's bitmap after saving; PictureRef offers no resize. ResolveTakenPicture applies orientation and JPEG compression in ordinary takePictureAsync. FileUtilities generates cache/Camera/UUID.jpg. Therefore repeated same-capture encoding via PictureRef is not a safe supported path here; retained ordinary processed capture plus strict actual staging rejection implements the approved unsupported/oversize fallback without a native patch/new library.50–150KiB is a tuning target only; actual clarity, encoding sizes and overhead remain native acceptance evidence, not inferred from quality0.65 or fixtures.

Failing-before encoded-byte regression accepted307201bytes (cosi-m8-13-before.log). Initial after-change run found fixture-only reused IDs, Retry versus existing Try again label, and mockRestore clearing the pre-mocked AppState listener return; corrected fixtures and isolated camera case proved this cause. Existing tests retain rollback/cross-store/restart/outbox privacy coverage. Focused final results and static checks are recorded after the final product-switch guard. JPEG boundary tests use file-header/byte fixtures; they do not prove native decoding or product readability. No phone/inspector/fixture operation was performed, and the separate native cached-handle NPE remains open.
M8-13 final command: npm run test --workspace @retail/mobile -- --runInBand --testTimeout=30000 productPhotos.test.ts productPhotoUi.test.tsx productPhotoCamera.test.tsx nativePhotoFiles.test.ts passed33 tests/four suites (36.476s), including missing-module/manual named creation and product/store-switch staleness. Mobile typecheck and zero-warning lint exited0 after final runtime guard. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-13-final.log. No migration/native dependency or release acceptance.

## M8-14 — Today's discounts (2026-10-01)

Business summary adds discountsGivenMinor from existing completed-sale discountTotalMinor using sumSafeIntegers and the unchanged authorized store-local half-open-day query. Home and Today's Summary show compact Discounts given alongside Sales value (after discounts). Existing salesValueMinor sums net totals once; cost coverage/COGS/margin/expenses/withdrawals/ranking are unchanged. No schema, accounting rule, sale mutation or payment command added.

Before-change regression returned undefined for expected50 minor units (cosi-m8-14-before.log). Coverage includes discounted/undiscounted completed sales, full cash payment, credit and a partially collected receivable fixture, excluded other stores/day boundaries/voided rows, empty/DST day, exact margin and separate discount overflow with zero net sales. Actual Sell-route discounted draft is excluded, completion includes exact net/discount totals, and Summary refresh reflects a second credit sale without subtracting twice. Existing Home focus refresh is also covered. Initial fixture tried a partial CASH payment; existing schema correctly requires the payment row's amount to equal the completed sale total. Fixture now models existing CREDIT plus PARTIALLY_PAID receivable read state; this is not implementation or verification of a new partial-payment command. Existing payment/schema rules are preserved.
M8-14 final focused command: npm run test --workspace @retail/mobile -- --runInBand --testTimeout=30000 m6BusinessSummary.test.ts m6BusinessSummaryScreen.test.tsx m6Home.test.tsx passed11 tests/three suites (18.355s), exit0. Mobile typecheck and zero-warning lint exited0. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-14-final.log. Native display/refresh and independent acceptance remain pending.

## Final October packet verification — frozen runtime8efb1e0

One final root npm run validate exited0 with pinned Node24.21.0/npm11.19.0:12 contracts +150 domain +470 mobile =632 passing tests across77 passing suites. Eight opt-in live PostgreSQL tests/two mobile suites skipped; no Docker startup/repair or live backend test was attempted. All workspace typechecks and zero-warning lint passed. Mobile suite415.646s. Root uses its existing command/default test settings; focused30s setup timeouts were not added to the root configuration. Prior593 belongs to824b2af. Existing React suspended-resource/act and VirtualizedList timing warnings remain test-harness limitations with passing assertions, not native evidence. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-october-final-validate.log.

Fresh npm run mobile:doctor passed21/21, exit0. Mobile node ../../node_modules/expo/bin/cli install --check exited0, dependencies up to date; the existing Expo-core exclusion is unchanged and no new suppression/dependency was added. Logs: C:\Users\doyew\AppData\Local\Temp\cosi-m8-october-final-doctor.log and cosi-m8-october-final-install-check.log. Android source export runs after validation; its result is recorded below when completed. No runtime changes followed8efb1e0.

Final npm run mobile:export exited0 after validation:1619 modules,29 assets (including the new4.8KB neutral cue),5.3MB Hermes bundle entry-724c56fee05607e6e4d0183a3a6463c4.hbc. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-october-final-export.log. Transient export worker completed; this is not an APK/device result. No runtime edits after8efb1e0. Documentation follows separately.

Workflow-state/index AJV2020+formats schema validation passed; comparison against preserved4e1b4ba confirms all existing approvals and independent/native gate decisions unchanged. Source re-audit gate remains pending; implementer evidence does not mark its own acceptance. Git diff --check passed during handoff preparation; stopped HEAD/clean status is reported only after documentation commit and final guard. All implementation/check commands completed before stopped notification. Exception: phone utility's intentionally retained LAN Metro70408/PID12824 remains untouched; its live reload is not verification evidence. No phone/inspector/device/fixture, Docker startup/repair, new native/cloud build/spend, backend deployment/provider activation, upload/enrollment, push/merge/reset, subagent/new chat or M9 work occurred in this correction packet.

## Bounded intermittent initial-cue diagnosis — 2026-10-01

This is the separately dispatched diagnostic task after the coordinator accepted the October source scope. Runtime remains8efb1e071b259b9b7304813e320c9e89dc7dfcc2. Eight pending coordinator/native documentation files were preserved exactly at4040d39 before investigation; the independent audit and native observation are retained. Work stayed on plan/m8-unified-scanner in C:\Users\doyew\Documents\DEV 2\COSI-m8-planning, GPT-6.1 Sol HIGH, sequentially. Mode: diagnose with repair conditional on an established causal mechanism and credible regression oracle. The debugging skill and evidence/hypotheses reference guided this diagnosis. No justified source repair was found.

### Corrected symptom and evidence limits

The founder's first returned Single Fanta observation was no beep. A later direct clarification describes INTERMITTENT sound: Home -> prominent Scan -> identify product, including a new sale, sometimes sounds; header navigation back to Home -> new Scan is often silent but sometimes sounds; Android system back from matched configuration directly to scanner -> repeat sounds, including after an initially silent match. This is a useful navigation/readiness discriminator. It is founder-reported behavior, not three freshly instrumented physical passes. His earlier multipart no-beep answer does not establish all cancel/repeat outcomes.

Utility logs at17:52 local showed later app-scoped AudioTrack volume0.3 and stop2205 frames; they were not correlated to the first cue. STREAM_MUSIC was unmuted15/max15 on speaker. These facts neither prove first-cue playback nor explain audibility. No settings changed. No NPE in the limited sample is not a native storage pass. The retained utility Metro is now60684/PID31060; old70408/PID12824 was absent. This task did not inspect/control either process or the phone.

### Route, intent and player trace

GlobalScan uses router.navigate({pathname:'/sell',params:{scan:'1'}}) from the tab surfaces. SellRoute passes initialScan from that parameter and useIsFocused to SellScreen. The root stack supplies Sell's default navigation header; source contains no custom top-right Home arrow. The exact physical control/landing screen needs the later utility observation. If it removes or unfocuses Sell, the audio effect releases both players; next enabled mount/focus creates and prepares new players. Route reuse/pop timing must be observed rather than inferred from wording alone.

Focused SellScreen handles hardwareBackPress while configuring a product. A clean form calls cancelLineConfiguration; Single scanLine invokes reopenScan, ending the old intent and deliberately re-arming the scan session. A dirty form asks before discard. These changes keep the same focused SellScreen and audio hook enabled, retaining already-loaded players. ScannerPanel is remounted, but its scan-session generation is separate from feedbackIntent. Thus Home exit/re-entry can be a newly created-player path, while Android back within Sell can be a retained-player path.

On a safe Single match, configureScannedCandidate increments feedbackIntent, safely reads product/packages, opens line configuration and requests the match with that intent predicate. Switching from camera to form does not itself increment the predicate or unmount the hook. Cancel/discard/mute/unfocus/background do invalidate pending work by design. Later Add to cart remains silent. Explicit same-code re-arm and passive duplicate protection are unchanged.

useScanFeedback creates both players when enabled, sets volume0.3 and listens for load status. It permits only500ms from cue request through readiness/seek completion; expiry advances generation. If loading or seek completion crosses that deadline, no play occurs even if the asset becomes ready later. A retained loaded player can then sound on repeat. This predicts the founder's pattern but actual first-request/load/seek times are absent, so expiry is an UNVERIFIED cause. The guard intentionally prevents stale feedback after exit and must not be weakened speculatively. Initialization/seek errors are contained for nonblocking sales, leaving no diagnostic distinction in current observations.

### Installed SDK and asset checks actually performed

Inspected installed expo-audio57.0.5 primary source: ExpoAudio.ts/createAudioPlayer, resolveSource.ts, AudioModule.kt, AudioPlayer.kt, BaseAudioPlayer.kt and Playable.kt. The earlier APK source4d6521e also declared audio57.0.5; its older camera/router versions do not establish an audio incompatibility. This local SDK inspection does not authenticate every class inside the installed binary.

Numeric assets resolve to localUri or asset.uri. Default downloadFirst is false. Android selects HTTP(S) or ordinary data sources from the actual URI and prepares an ExoPlayer progressive source for WAV. Dev assets could use Metro HTTP; actual phone source scheme/load timing is unknown. Android seekTo runs on the main queue and its promise acknowledges the seek command, not rendered sound. Play invokes native playback with manually managed audio focus; defaults permit sound and audio is enabled. Focus denial/loss or native decoder/source errors remain possible. No COSI global setAudioModeAsync/setIsAudioActiveAsync override was found. Installed module player/status code exposes readiness/playing/error transitions, but these were not recorded for the silent first event.

Read-only Node RIFF/PCM analysis checked chunk bounds, declared file length, format, sample count and all sample values, using the pinned Node24.21.0 toolchain. Both files are mono signed16-bit PCM,100ms, contain nonzero samples and have no clipped samples:

| Asset | Bytes / sample rate / samples | Peak / RMS before player gain | RMS after0.3 gain | SHA-256 |
| --- | --- | --- | --- | --- |
| scan-added.wav |4454 /22050Hz /2205 |0.244140625 /0.165968649 |-26.057dBFS |695c07b99e858cbc83bcf4e611df461f6f7c9de9b0700b6082bbf610fbb393e8 |
| code-read.wav |4844 /24000Hz /2400 |0.213531494 /0.106811578 |-29.885dBFS |a8e8ad285a89672b980b7d413f0b35556ede9d80f677de4020363eacf243e37b |

The match file is byte-identical to4d6521e. A blank/truncated/malformed RIFF container or newly changed match asset is ruled out by these checks. Native decoding, speaker startup, perceptual loudness and environmental audibility are not proved. Later2205-frame log entries are consistent with this asset but are not proof that the first request rendered. No sound/gain change was made.

### Hypotheses and disposition

| Hypothesis | Assessment | Missing discriminator |
| --- | --- | --- |
| Camera-to-Single-form transition itself cancels the match | Ruled out by the inspected ownership/predicate path; unrelated real focus/AppState changes remain unobserved | Actual focus/AppState/intent events |
| Fresh entry loading/seek exceeds500ms, retained-player repeat succeeds | Plausible and navigation pattern supports investigation; unverified as actual cause | First request, ready, seek completion, deadline and play timestamps for silent/audible paired attempts |
| Optional player initialization/seek fails or caller never reaches active playback | Unverified | Initialization/request/error/drop stages |
| Play happens but100ms cue is inaudible, or native focus/routing/decoder fails | Unverified; full music volume and later frames do not decide it | Correlated play/status/error/native output/focus plus a separate founder audibility answer |

Existing scannerFeedback tests use mocked native players and fake timers, including expiry/readiness/ended replay and lifecycle guards. scannerSale mocks the entire hook, checking initial cue calls/re-arm/no later Add cue. Those are valid source oracles and cannot measure real load latency, native focus or physical sound. No new production/test code or instrumentation was added. The prior632-test validation and independent75-test review apply to unchanged runtime and remain attributed to their original runs. No repeat full/static/export/native check was performed for this no-runtime-change diagnosis.

### Proposed bounded observation; NOT implemented or authorized by this document

Coordinator should review an explicit temporary diagnostic payload/activation/removal scope before assigning instrumentation. Proposed source ceiling: feedback hook plus minimal Sell intent/entry markers, isolated verification build only, default-off opt-in EXPO_PUBLIC_SCANNER_CUE_TRACE=true additionally gated by existing isolated-build verification. Never bypass freshness, readiness, mute, duplicate or later-Add guards. No dependency, native rebuild, audio setting or database query/connection change.

Use a transient session counter, route-mount/cue-attempt counter and monotonic elapsed milliseconds. Emit at most128 locally tagged events for one bounded session, state changes only. Payload enums/booleans: entry class selected by operator, focus/AppState, enabled/muted, hook create/release and create success/failure, cue kind, requested, source scheme category(local/http/other), loaded, seek started/resolved/rejected, intent current, deadline/cancel reason, play called, playing/finished and error present. No raw error message, URI/URL/path, product/code/photo/store/user/business data. No file/database/outbox/network persistence or analytics. Utility captures only the diagnostic tag and minimal correlated app-scoped AudioTrack/AudioPlayer/focus/error metadata; existing errors must be sanitized rather than copied wholesale. Do not open a database inspector to retrieve the trace.

After founder readiness/unfinished-session consent, observe the exact header control and three Single paths: Home -> Scan/new-sale; header -> Home -> Scan; Android back from clean matched form -> same-route scanner -> explicit repeat. Use the same approved physical product. Keep matched form open at least one second before another action; ask only whether THAT initial cue was heard. No Add/payment/completed sale is needed. Capture a silent/audible paired attempt if it occurs within the bounded session; otherwise report failure to reproduce, not a fix/pass. Do not force application restart, discard existing work or alter settings merely to create a cold case.

Requested then expired before readiness/seek distinguishes a guard drop; play called plus error/no playback distinguishes downstream failure; play/playing/finished with correlated frames and no human sound shifts investigation to delivery/perception rather than a stale-cue guard. No request identifies an earlier caller/enable/init boundary. Compare player creation/release across all three paths. Native logs alone cannot prove human audibility. After this one observation, disable/remove trace and its flag/panel/log calls, verify ordinary builds reject activation, return a stopped handoff, and preserve application data. Only then select an evidence-backed repair and its smallest regression oracle. No blind timeout/gain/asset/global-mode adjustment.

Documentation-only checks passed: workflow/index AJV2020+formats schema validation; exact existing approval/acceptance-gate/owner/status invariance against4040d39; runtime diff against8efb1e0 empty; exactly the five intended evidence/handoff/state/workflow/index files changed; git diff --check. No test/static/export rerun is claimed. Final committed HEAD/clean guard is delivered in the stopped coordinator notification. Coordinator owns next assignment; accepted source scope and all open native/storage/provider/rollout gates are preserved.

## Temporary trace assignment held before implementation — 2026-10-01

Coordinator reviewed0fab44f and approved the smallest temporary diagnostic source change: existing feedback hook, minimal Sell route/focus/intent markers, at most one helper, focused tests and activation/removal documentation. Objective was sanitized evidence distinguishing suppressed requests from invoked/native/inaudible cues, not an audio repair. Highest risk is observer timing/privacy or accidentally changing playback guards. Coding/testing skills were consulted for this scoped implementation. No helper, marker, runtime/config/asset/test edit or instrumentation was applied: during read-only intake/planning, founder explicitly said "Still exploring; keep this session unchanged." That supersedes earlier exploration-ended consent. Implementer immediately held source work; no reset/revert/reload/restart/Metro/phone action occurred. No app state was inspected and draft preservation is not independently proved.

Implementation is NOT delivered. The activation flag EXPO_PUBLIC_SCANNER_CUE_TRACE has NOT been added/activated; setting it now cannot obtain the proposed trace. No new tests/typecheck/lint/export were run because no runtime/test change occurred. Earlier source audit and validation remain attributed unchanged-runtime evidence. Coordinator owns the hold and future resumption after founder completion; implementer and utility stop without polling.

### Approved implementation ceiling retained for later resumption

Activation must require literal EXPO_PUBLIC_SCANNER_CUE_TRACE==='true' AND existing isScannerVerificationBuild(Constants.expoConfig): appEnvironment==='scanner-verification', scannerVerificationBuild===true and exact isolated package com.damiyx.retailintelligence.scannerverification. Ordinary/malformed variants must remain off despite the trace flag. Existing flags/config are unchanged. Emit sanitized short local dev-log events only, maximum128 state changes across ALL hook/route remounts in one module/session; no per-mount reset, periodic-status spam, polling, extra timer, frame work or unnecessary diagnostic UI. Disabled tracing must do no buffering/logging/probing; guard/output failures cannot throw into playback/checkout.

Future payload is restricted to ephemeral counters, monotonic elapsed time and enum/boolean lifecycle/focus/AppState/enabled/muted/request/currentness/readiness/seek/expiry/cancellation/play/playing/finished/error-presence stages. Add an explicit caller category SINGLE_MATCH versus BASKET_VALIDATED_ADD versus CODE_READ; cue kind alone cannot distinguish the two match callers. Source scheme LOCAL/HTTP/OTHER/UNKNOWN is optional only if safely observable without extra probing; do not infer the phone URI. Never log raw errors, identifiers/codes/products/store/user/business/photo data, paths/URLs/URIs, arbitrary objects or stacks. No app persistence/DB/outbox/network/analytics/native policy change. Existing500ms guard, freshness, mute/background/unmount, nonblocking failure handling, duplicate protection, no later Add sound and M8-11..14 behavior must be identical.

Required future checks: guard-negative ordinary/malformed configurations;128 total cap across remounts and periodic-state deduplication; payload sanitization/log failure isolation; identical playback/drop behavior enabled versus disabled; existing focused audio/scan route regressions plus strict mobile typecheck/zero-warning lint. No redundant root632/Doctor/export unless a new failure justifies it. Mocked player timing and trace overhead cannot establish native causality or audibility.

### New exploration feedback and read-only disposition

| Founder report | Existing source evidence | Disposition after live-session hold |
| --- | --- | --- |
| Basket silent even for another product | configureScannedCandidate's verified automatic Basket branch validates/calls addDraftLine before playScanFeedback('match', intent); Single requests the same cue after safe configuration. | Audio investigation must include caller category. First-use Single-only explanation is insufficient; no causal repair/native pass claimed. Future Basket phone cases need coordinator scope rather than silently expanding the approved six Single attempts. |
| Same product requires Scan again or a different code between repeats | ScanSession.begin rejects busy/lastKey; cancel retains lastKey; repeatExplicitly clears it. ScannerPanel's Scan again is the explicit re-arm; A->B->A is permitted after each completed request. | Expected duplicate safety, with repeat-unit speed a UX finding. Keep deliberate repeat; propose making existing Scan again easier to find with clearer same-product wording and offering quantity Edit for bulk units. No timeout-repeat/ROI redesign. |
| Summary remains two lines while total increases | Scanner summary uses lines.length. insertDraftLine matches compatible product/variant/package/conversion/price/labels/zero-discount rows, sums exact quantity and recomputes/validates totals. Cart renders quantityText + packageName; Edit opens the existing quantity form. | Consistent with two compatible product rows accumulating packages; actual founder quantities not read. Propose product count plus explicit package quantities, e.g. two products/three bottles/two cans, rather than an unexplained line count. Do not sum mixed package sizes and label them physical base units, or revert to one row per scan. |
| Cannot find known-only Basket exit/payment | Back to basket is ScannerPanel's final ScrollView action after camera/results/search/create/Undo. onCancel=endScanIntent sets scanning false and preserves lines, returning to existing cart/review; cart Edit and Complete sale remain available. Android back while scanning also ends scan intent. | Handler exists; phone visibility/discoverability is unverified. Proposed follow-up: prominent review/checkout entry visible with scanner summary, using existing exit/cart flow. No unknown product should be needed. No layout/checkout rewrite made. |
| Saved temporary cleaner's barcode returns to unknown/photo flow | QuickAdd receives allowScannedAssociation=scanAssociationsVerified. With initialIdentifier and false gate it submits barcode:null while retaining lookupCode. Catalogue client forwards barcode to creation but uses lookupCode only for suggestions.remember. createTemporaryProduct creates identifier=null for empty barcode. Resolver joins active product_identifiers/store products and does not exclude isTemporary. Utility's prior scoped environment explicitly kept associations false. | This creation path explains why a saved photo/price can exist without barcode identity; no phone rows prove that individual cleaner's state. Saved photo is presentation, not visual recognition. Naming/enrichment is not the resolver prerequisite. Keep association rollout off; do not create another product/sale or silently attach a code. |

Barcode reuse prerequisites remain separate: reviewed collision/identifier-claim migration on the intended isolated test backend, existing sync/idempotency/conflict/privacy readiness and explicit scoped association enablement approval, then safe user-confirmed code attachment to the existing product and restart/replay/conflict tests. The migration is rollback-only tested, not deployed; the isolated verification profile alone does not enable associations. Do not add a second local identity/sync protocol. Even when scanned creation is permitted, this QuickAdd path creates an unbound variant identifier by default; resolver sets requiresPackageConfirmation and Single exact-package=null behavior must be reviewed/tested before promising automatic saved package/price reuse or Basket auto-add. An active identifier can identify a temporary product without recapture/name enrichment, but it does not prove package binding. No new architecture decision or rollout approval is recorded by this analysis.

### Later phone procedure and removal obligation; currently prohibited by live hold

After explicit founder completion/readiness and unfinished-session consent, utility alone may activate the implemented trace in its existing scoped Metro environment and reload the existing isolated app. That assignment must retain matching EXPO_PUBLIC_APP_ENV=scanner-verification/COSI_SCANNER_VERIFICATION=1, leave associations/provider/ordinary rollout unchanged, and verify the runtime triple guard. No activation now: source trace does not exist and founder is still exploring.

Approved observation budget is at most SIX Single match attempts TOTAL across Home->Scan, observed actual header exit/re-entry and Android-back clean form->same scanner repeat. Utility annotates route/attempt externally, keeps matched form >=1second and asks one initial-cue audibility question per attempt. No Add/payment, wipe or forced restart to manufacture a cold case. If silence does not reproduce or128 events are exhausted, report that limit, not a fix/pass. Capture only sanitized trace/minimal native metadata, then stop and hand back; Basket attempts require separately sequenced scope. Native logs do not replace human audibility.

Removal checklist for the coordinator's later source assignment: utility disables the trace flag at observation end; remove helper and hook/route/intent markers plus trace-only imports/activation/logs; remove trace-only tests/document activation as retired while preserving findings; rerun ordinary focused playback/scan regressions and mobile typecheck/zero-warning lint; confirm no trace output/flag consumption and normal rollout settings; commit a clean stopped handoff. Temporary diagnostic code must never be accepted as a finished product feature.

Held-return documentation checks passed with pinned Node24.21.0: workflow/index AJV2020+formats schemas, exact approvals/acceptance-gates/owner/status invariance against0fab44f, empty runtime diff against0fab44f and8efb1e0, exactly five intended documentation/state files modified and git diff --check. Final committed clean/branch/runtime guard and HEAD are sent in the stopped notification. No new audio/native/diagnostic implementation test result is claimed.
