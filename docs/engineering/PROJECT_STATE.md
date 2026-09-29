# PROJECT_STATE — COSI

Last updated: 2026-09-29
Current milestone: M8 source implementation submitted for independent audit; native acceptance blocked.

## Active work

- Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`; branch `plan/m8-unified-scanner`.
- Accepted M7 base: `c817edb`; approved M8 planning preserved at `4105618` (D-046).
- Implementer chat: `01a0ec1c-578c-7c41-b151-e803c9e5c548`. Coordinator: `01a098ef-d830-7531-bca7-2d66b0a5b587`.
- M8 adds a local barcode resolver, guarded camera/session, full-screen Sell and global Scan, typed temporary creation, optional beep/mute, and recoverable identifier conflicts. No visual recognition, OCR or M9 work.
- See `M8_IMPLEMENTATION_EVIDENCE.md`, `M8_ANDROID_VERIFICATION.md`, active `tickets.md` and `.agents/workflows/m8-unified-scanner.json`. Final stopped-work handoff is `M8_IMPLEMENTATION_HANDOFF.md`.

## Source evidence and rollout

Six real PostgreSQL/two-SQLite collision cases reproduce the original gap and now pass rejection, quarantine, owner recovery, dependent-sale preservation, cursor progress, replay, fresh bootstrap and authorization checks. SQLite migration 24 and server migration `20260929092623_m8_identifier_claim_guard.sql` are additive. The server migration was tested inside rollback-only transactions, not deployed.

New scanner associations default off (`EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED`); enable only for a reviewed build whose backend has the migration. Automatic basket addition stays off pending physical camera evidence and independent review. Manual selling and confirmed scanner additions remain usable. Optional beep uses playback only; native camera/audio require a rebuilt APK.

Android export and Expo Doctor 21/21 passed. Existing local pgTAP 92 assertions and Auth/Edge/PostgreSQL checks passed; the pgTAP files also passed with M8 migration injected transactionally. Exact final typecheck/lint/test results are recorded in the evidence document. Automated checks are not physical acceptance.

## Blockers and carried limits

No Android device is connected and Java is unavailable in this environment. No APK was built or installed; the Galaxy A15 launch issue could not be reproduced or diagnosed. Camera permissions/lifecycle, first-use offline detection, beep/torch, 200% text/TalkBack, standalone preview and completed-sale force-stop behavior still require the device procedure.

M0–M7 local source remains independently accepted. M3–M7 physical flows, two-phone verification, remote CI and second-laptop reproduction remain release gates. Prior M7 audit/evidence is preserved in `M7_INDEPENDENT_AUDIT.md` and `tickets/M7_OFFLINE_SYNC.md`.

Known source limits for review: association rollout is disabled; previously acknowledged historical identifier collisions require support and are not silently repaired. The migration refuses deployment over historical accepted collisions. No production readiness or performance claim is made.

## Next action

Coordinator independently reviews the stopped implementer handoff and returns corrections to the same chat. Then schedule the physical Android procedure and authorize any backend deployment/build separately. The implementer does not accept its own work, deploy, push, merge or start M9. Existing M9 work remains separate in its own checkout; coordinate shared sync/catalogue boundaries before integration.
