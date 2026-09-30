# PROJECT_STATE — COSI

Last updated: 2026-09-30
Current milestone: M8 source re-audit and eight live PostgreSQL cases passed; isolated Galaxy A15 pass returned native findings, so physical acceptance remains blocked.

## Active work

- Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`; branch `plan/m8-unified-scanner`.
- Accepted M7 base: `c817edb`; approved M8 planning preserved at `4105618` (D-046).
- Implementer chat: `01a0ec1c-578c-7c41-b151-e803c9e5c548`. Coordinator: `01a098ef-d830-7531-bca7-2d66b0a5b587`.
- M8 adds a local barcode resolver, guarded camera/session, full-screen Sell and global Scan, typed temporary creation, optional beep/mute, and recoverable identifier conflicts. No visual recognition, OCR or M9 work.
- See `M8_IMPLEMENTATION_EVIDENCE.md`, `M8_ANDROID_VERIFICATION.md`, active `tickets.md` and `.agents/workflows/m8-unified-scanner.json`. Final stopped-work handoff is `M8_IMPLEMENTATION_HANDOFF.md`.

## Source evidence and rollout

Six real PostgreSQL/two-SQLite collision cases reproduce the original gap and now pass rejection, quarantine, owner recovery, dependent-sale preservation, cursor progress, replay, fresh bootstrap and authorization checks. SQLite migration 24 and server migration `20260929092623_m8_identifier_claim_guard.sql` are additive. The server migration was tested inside rollback-only transactions, not deployed.

New scanner associations default off (`EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED`); enable only for a reviewed build whose backend has the migration. Automatic basket addition stays off in ordinary builds pending physical evidence/review. An isolated scanner-verification profile now permits bounded testing through the actual route. Manual selling and confirmed scanner additions remain usable. Optional beep uses playback only; native camera/audio require a rebuilt APK.

Android export and Expo Doctor 21/21 passed. Existing local pgTAP 92 assertions and Auth/Edge/PostgreSQL checks passed; the pgTAP files also passed with M8 migration injected transactionally. Exact final typecheck/lint/test results are recorded in the evidence document. Automated checks are not physical acceptance.

## Blockers and carried limits

The founder authorized one isolated scanner-verification APK conditional on no additional charge. Build 105bb294-dce0-487c-ba87-d1620a40cd82 finished from 4d6521e; native camera/audio/barcode classes and manifest were inspected, and the separate scannerverification app installed on SM-A156E Android 16/API 36. Post-build Free-plan usage confirmed zero overages and total cost zero. Existing apps/data were preserved. This development client used matching USB Metro and does not establish standalone offline cold launch.

The bounded physical pass is stopped. Real Fanta and AirPro EAN-13 scans added the correct cans at synthetic NGN 1,000/2,000 prices; AirPro unknown/cancel preserved Fanta. Torch helped after glare was avoided and the final AirPro addition beeped. Three unexpected UPC/EAN observations paused UNKNOWN without an extra basket line; stability/false-decode investigation is required. The first Fanta addition was silent; close-distance/blur findings remain. Permission denial/search/settings grant were exercised; exact settings-return refresh is unproven. Large text has partial screenshots; TalkBack tutorial blocked the intended sample. Font configuration change lost the unfinished memory-only basket.

A manually reconstructed offline sale of 2 Fanta + 1 AirPro, NGN 4,000 Cash, survived force-stop/cold reopen. Native sale/payment/snapshots/inventory/outbox checkpoints matched byte-for-byte and its receipt reopened. USB Metro was available; this is local business-data durability, not standalone or first-use offline detector proof. Device settings were restored, camera released, Metro stopped and port 8083 reverse removed. Installed isolated app/test data remain. No runtime source changed; full evidence and unperformed criteria are in M8_ANDROID_VERIFICATION.md.

M0–M7 local source remains independently accepted. M3–M7 physical flows, two-phone verification, remote CI and second-laptop reproduction remain release gates. Prior M7 audit/evidence is preserved in `M7_INDEPENDENT_AUDIT.md` and `tickets/M7_OFFLINE_SYNC.md`.

Known source limits for review: association rollout is disabled; previously acknowledged historical identifier collisions require support and are not silently repaired. The migration refuses deployment over historical accepted collisions. No production readiness or performance claim is made.

## Next action

Return this stopped evidence-only pass to the coordinator for native finding review and a bounded correction/retest plan. No second build is authorized. Source re-audit passed at c995641; independent mobile verification passed 381 tests (8 database tests skipped), and eight live PostgreSQL cases passed with rollback-only migration injection. Standalone preview needs separate compatible-build authorization; associations need a reviewed migrated test backend. Full native criteria remain unaccepted. No deployment, push, merge or M9 work is implied; existing M9 work remains separate.


Audit correction source e5b23ff clears cancelled scan intent and adds worker-boundary coverage plus an isolated verification profile. Root validation and additional focused suites produced 543 passing tests across runs; fresh typecheck/lint and verification export passed. On 2026-09-30, both live worker RPC cases and all six existing collision cases passed (8/8, two suites). No Docker startup/repair or persistent migration was performed. Edge HTTP smoke readiness was not tested. See the appended implementer response in M8_INDEPENDENT_AUDIT.md.
