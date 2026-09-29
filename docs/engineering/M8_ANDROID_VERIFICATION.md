# M8 Android verification — pending

No device was connected during implementation (`adb devices -l` returned an empty list). Java was unavailable in the task environment. No APK was built or installed, no app data was cleared, and the carried Galaxy A15 launch failure was not reproduced or diagnosed. Android export is a JavaScript/asset check, not a native-build or physical acceptance result.

## Build identity and rollout

- Expo 57.0.22, expo-camera 57.0.5, expo-audio 57.0.5; native rebuild required.
- Development: com.damiyx.retailintelligence.dev; preview: com.damiyx.retailintelligence.preview. Config version 0.0.1 / versionCode 1; record actual build ID and source commit when built.
- Automatic basket addition defaults off and has no release environment switch. Only test injection enables it until camera evidence and independent review satisfy the approved gate.
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
