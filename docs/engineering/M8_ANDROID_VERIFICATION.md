# M8 Android verification — pending

No device was connected during implementation (`adb devices -l` returned an empty list). Java was unavailable in the task environment. No APK was built or installed, no app data was cleared, and the carried Galaxy A15 launch failure was not reproduced or diagnosed. Android export is a JavaScript/asset check, not a native-build or physical acceptance result.

## Build identity and rollout

- Expo 57.0.22, expo-camera 57.0.5, expo-audio 57.0.5; native rebuild required.
- Development: com.damiyx.retailintelligence.dev; preview: com.damiyx.retailintelligence.preview. Config version 0.0.1 / versionCode 1; record actual build ID and source commit when built.
- Automatic basket addition defaults off and has no release environment switch. Only tests or the isolated scanner-verification build enable it until camera evidence and independent review satisfy the approved gate.
- Scanner association defaults off. EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED=true is for a reviewed build only after migration 20260929092623_m8_identifier_claim_guard.sql is applied to that build's backend. It was tested transactionally, not deployed.
- EXPO_PUBLIC_SCANNER_ENABLED=false preserves manual selling.
- No microphone or background-audio permission is requested by camera/audio plugins. Inspect the generated manifest in the rebuilt APK to confirm the final permission set.

## Next physical pass

1. Record device model/Android version, APK/build ID, source commit and application ID. Capture launch logs from the existing app without clearing data; distinguish development-client Metro connectivity from preview standalone launch.
2. Rebuild approved development and preview profiles. Verify cold launch, deny/grant/permanently deny camera permission, settings return and unavailable camera fallback.
3. Provision the store, then use airplane mode. Scan known EAN-8/EAN-13/UPC-A and exact QR; carton, variant-only, missing-price, inactive and zero-recorded-stock examples. QR contents must never open a link.
4. Verify A-A-A stays latched, A-B adds intentionally, explicit repeat/quantity edit handles identical units; background/focus changes never rearm the same code. Do not enable automatic addition until false-add observations support it.
5. Exercise unknown-code search, explicit association, temporary creation, no-code creation, cancel/dirty-form guard and return to the same basket. Complete one sale; force-stop/reopen and verify receipt, package/price snapshots and stock events. Enrich the temporary product without changing historical facts.
6. Check beep/mute, visual feedback, torch, Undo/edit, Android/header back, route replacement, payment/history, 200% text, TalkBack, keyboard and system insets. Check preview without Metro and first-use offline detector availability.
7. Record actual APK size and manual-versus-scan timing. No speed, accuracy or size improvement is currently claimed.

Owner: coordinator/user device session. All physical criteria remain pending; this checklist is not evidence of execution.

## Audit correction: isolated automatic-basket verification build

Ordinary development/preview/production builds still keep automatic addition off. The dedicated `scanner-verification` EAS profile extends the internal development profile and sets both `EXPO_PUBLIC_APP_ENV=scanner-verification` and `COSI_SCANNER_VERIFICATION=1`. Its app ID is `com.damiyx.retailintelligence.scannerverification`, display name `COSI Scanner Verification`, and its separate sandbox does not overwrite the normal app. Configuration rejects opting in on an ordinary app environment. The real `/sell` route checks the environment, explicit config flag and isolated app ID before passing the verification prop; it displays a persistent verification banner.

No build was submitted or installed during this correction. After a separately authorized internal build/device session:

1. From this checkout, use `npm exec --workspace @retail/mobile -- eas build --platform android --profile scanner-verification` only after build authorization. Record commit/build ID and install the resulting separately named verification app.
2. For its Metro session, set `$env:EXPO_PUBLIC_APP_ENV='scanner-verification'` and `$env:COSI_SCANNER_VERIFICATION='1'`, then use `npm run mobile:start`. The identical environment must generate the bundle and native app configuration. This is a development-client profile, not standalone-preview evidence.
3. Use an isolated test store with exact package-bound active barcodes and known prices. If preparing new scanner associations, first provision the test backend with the reviewed M8 migration, then explicitly enable `EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED=true` in that test build/bundle. The verification profile does not enable association or deploy a migration by itself. Do not use a live retailer store or an unmigrated backend.
4. Open Scan and confirm the verification banner. Switch to Basket, scan A-A-A (one addition), A-B (two), explicit repeat, missing package/price, unknown/cancel, background/resume, Undo/edit and beep/mute. Capture actual false-add observations; results remain pending until performed.
5. Rebuild/run ordinary preview with verification opt-in absent; confirm no banner and confirm-each-item behavior. Do not promote the verification profile or its configuration to release. Standalone preview and physical acceptance remain separate gates.

Source evidence includes a real-route test with both ordinary and isolated config; it is not a phone or native-build result.
