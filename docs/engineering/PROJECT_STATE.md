# PROJECT_STATE — COSI

Last updated: 2026-10-01
Current milestone: M8-10..14 founder feedback is source implemented on frozen runtime8efb1e0. Fresh632-test validation, Doctor21/21, dependency check and Android export passed. Coordinator source re-audit and physical/provider/rollout acceptance remain pending. M8 is not accepted. D-049/D-050 and PC-14 apply.

## Active source and ownership

- Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`; branch `plan/m8-unified-scanner`. Continue this task branch across model changes.
- M0–M7 local source accepted at M7 basec817edb. Original M8 plan4105618, earlier returned source correctionsadc8b8f and SDK57 alignment824b2af are preserved.
- Coordinator planning/native packet preserved exactly in4e1b4ba; founder model/handoff policy packet separately preserved inf9f78bf. Implementer is now GPT-6.1 Sol HIGH per coordinator/founder continuation.
- M8-10 bc8ba86: deliberate same-code re-arm, Single cancellation back to scanner, bounded optional match/neutral-code feedback and no later form-add beep.
- M8-11 a5646c9: centralized compatible draft accumulation, exact totals and incremental Undo; edits replace and invalidate old Undo. Completed-sale/inventory/outbox/replay facts retained.
- M8-12 8e6602c: private photo/name presentation for all products in catalogue/search/cart/detail, enlargement/Close/back and bounded mounted-item verification. Generated cart labels compact; saved receipt labels unchanged.
- M8-13 4aad10a: optional named Add photo/preview/retake and existing-product Add/Change through client.photos. New JPEG long edge<=1024/bytes<=307200 at staging and attachment; legacy8MiB-valid photos still read/replay. Tracked capture-cache cleanup, old-photo rollback/cancel and committed replay retained.50–150KiB remains a tuning target; unsupported/oversized captures expose honest no-photo fallback, not a large-original fallback.
- M8-14 8efb1e0: compact Discounts given from existing completed-sale totals; Sales value is labeled after discounts and never reduced twice. Existing cost/margin/expenses/withdrawals unchanged.
- Implementer chat01a0ec1c-578c-7c41-b151-e803c9e5c548 owns source until stopped handoff; coordinator01a098ef-d830-7531-bca7-2d66b0a5b587 audits afterward. No additional agent/phone lane is active under this source assignment.

## Evidence and gates

Focused ticket suites passed25/30/19/33/11 tests respectively, with per-ticket mobile typecheck and zero-warning lint. These counts overlap and must not be added as a unique total. Final root validation against8efb1e0 passed632 tests (12 contracts,150 domain,470 mobile) across77 suites; eight opt-in PostgreSQL tests/two suites skipped. All workspace typecheck and zero-warning lint passed. Android export passed:1619 modules/29 assets/5.3MB Hermes bundle. This is a source bundle, not a new APK. Fresh Expo Doctor21/21 and dependency check pass; existing Expo-core exclusion is unchanged. Prior593 tests belong to824b2af and are historical for this newer source. Source mocks/file-header fixtures do not establish native decoding, clarity, performance, audio or accessibility.

No new schema, dependency, RecognitionService contract, sync protocol or costing/accounting change. Existing schema26 retained. Business sync includes no photo URI/bytes. Installed PictureRef save API recycles its bitmap and has no resize; repeated same-capture encoding is not implemented. Supported bounded picture-size selection plus actual-byte rejection is the approved fallback. Native size/clarity/overhead measurements remain required.

Live catalogue provider remains disabled: authorized public contact, ODbL reuse/attribution, native HTTP compatibility and representative provider smoke are unresolved. Scanner associations and ordinary automatic basket addition remain default off. Server migration20260929092623_m8_identifier_claim_guard.sql was rollback-only tested, not deployed. Earlier eight live PostgreSQL cases/92pgTAP assertions are historical; no new persistent backend effect.

## Carried native findings

October1 default/cached connection failed NativeDatabase.prepareSync with NullPointerException; separate connection returned quick_check=ok and retained original sale/products/outbox plus one unattached photo. Repeated debugger opens are a possible contributor, not an established cause. Clean-process catalogue/scanning recovered and founder reports temporary creation works, but the controlled photo/no-photo discriminator remains incomplete. App initializer ownership inspection established no concrete app-owned cause; no useNewConnection workaround or data reset was introduced. Native storage gate remains open.

Existing isolated APK105bb294-dce0-487c-ba87-d1620a40cd82 came from4d6521e on SM-A156E Android16. It contains older native patches; source exports are not rebuilt APK evidence. Prior Fanta/AirPro additions, unknown cancel, torch and one beep were observed; three unexpected codes and silent first addition leave decoder/beep stability unresolved. Large-text/TalkBack and standalone first-use offline detector gates remain unverified. Font recreation loses the memory-only unfinished draft under D-037.

A separately reconstructed offline NGN4,000 completed sale survived restart with receipt/snapshots/inventory/outbox, with USB Metro available. This does not pass the original scanned-basket or standalone gate. Photo capture/normal onboarding/replacement/retention/clarity, current audio and 200% text/TalkBack require the later coordinator-owned phone procedure. M3–M7 broader physical checks, two phones, remote CI and second laptop remain release gates.

## Next action

After final checks/documentation, implementer stops all edits/commands and sends the authorized stopped handoff. Coordinator independently audits M8-10..14 source, then routes a separate controlled phone retest and Fanta/AirPro thumbnail fixture preparation. Preserve application data. Utility intentionally retained scoped LAN Metro70408/PID12824; source work does not control it or claim its reload as native verification.

No new cloud build/spend, backend deployment, live provider/rollout enablement, push/merge, destructive reset or new milestone was authorized/performed. Overnight automation remains paused. PC-10/11/12 catalogue/targeting/structured-QR proposals and TrackB/M12 multi-view recognition enrollment remain deferred; one thumbnail is not a recognition reference set. Docker startup/recovery remains routed through LOCAL_DOCKER_WORKFLOW; no startup/repair was performed.
