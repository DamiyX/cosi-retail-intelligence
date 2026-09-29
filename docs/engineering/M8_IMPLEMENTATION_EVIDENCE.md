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

EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED defaults off; reviewed deployment must apply the server migration before enabling it. Automatic basket addition defaults off, with only an explicit test injection; camera evidence and independent review are still required. Scanner can be disabled with EXPO_PUBLIC_SCANNER_ENABLED=false without removing manual sales.

adb devices -l found no device; Java unavailable. No rebuilt APK, physical A15 launch diagnosis, native permission/torch/beep observation, first-use offline detector check, 200% text/TalkBack check, APK size or timed-selection comparison. See M8_ANDROID_VERIFICATION.md. Carried M3–M7/two-phone/second-laptop/remote-CI release gates stay open.

Historical acknowledged identifier collisions require support; the migration refuses accepted server collisions, and the client never silently reassigns an already acknowledged mapping. Claim lookup scans accepted facts within the store; scale/performance remains unbenchmarked. Coordinator independently audits source and migration; no acceptance gate is self-approved.

Final source correction commit: e10ca70. Expo install --check passed (the intentionally pinned Expo package remains excluded by existing configuration). Expo config --type introspect generated CAMERA, INTERNET, MODIFY_AUDIO_SETTINGS, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW and VIBRATE, with no RECORD_AUDIO; this is configuration evidence, not an inspected APK. Final Android export passed again after corrections (5.2 MB Hermes bundle, 28 assets).

## Final verification result

On final source e10ca70, npm run validate exited 0: environment check, strict workspace typecheck, zero-warning lint, contracts 12/12, domain 150/150, mobile 368/368 (56 passing mobile suites). Six opt-in PostgreSQL tests are skipped by the ordinary root run and passed separately with M8_POSTGRES_TESTS=1: total 536 executed passing tests across those runs, plus 92 pgTAP assertions. No snapshot tests. The existing product-list VirtualizedList act(...) console warning remains; no failing assertion was ignored. Workflow/index schema checks and git diff --check passed.

All local commands and test sessions finished before final handoff. No physical/native acceptance, deployment, push, merge or independent audit occurred. Final handoff is written last and intentionally remains the only untracked file, because the dispatch instruction requires stopping all edits and commands immediately after writing it.
