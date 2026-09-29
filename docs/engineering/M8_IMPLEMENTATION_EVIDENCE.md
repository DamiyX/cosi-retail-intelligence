# M8 implementation evidence (in progress)

Objective: approved barcode scanner and global sale entry, preserving local atomic sales and catalogue identity.
Non-goals: M9, visual recognition, OCR, image retention, new sync protocol or release.
Risk: R3 persistence/identity and native camera boundary. No production changes or data reset authorized.
Review base: accepted M7 c817edb; approved planning preserved separately at 4105618.

## M8-01

Expo resolved expo-camera 57.0.5 for pinned Expo 57; MIT license confirmed in installed package. Camera API and permission configuration checked against official SDK 57 documentation on 2026-09-29. Native rebuild required. recordAudioAndroid and microphonePermission disabled. No image/recording API used. One adapter contains the native import, loaded lazily with failure fallback. No playback dependency installed; audible feedback remains unimplemented.

Initial evidence: npm ci passed; camera install passed; workspace typecheck passed; recognition contract 2 tests passed; real SQLite resolver/latch 2 tests passed; existing sale UI 21 tests passed. Initial lint found ref lifecycle handling, corrected; fresh checks underway.

Barcode additions currently require confirmation. Basket mode resumes the same scanner after line entry. Automatic addition remains disabled pending required physical verification; this is incomplete fast-path scope, not an acceptance claim.

Device: adb devices -l returned no connected devices. Docker 29.8.0 is available. No physical check or A15 launch diagnosis performed. Local Supabase is running; no database changes made yet.

## M8-02

Moved /sell from tabs to the root stack, using the established usePreventRemove guard. Global Scan is allowlisted to Today/Products/More and hidden for keyboard/focused routes; its reserved layout space avoids obscuring content. Added manual selling from More. Navigation tests 10/10 passed; shell/startup tests 7/7 passed in the prior combined run; typecheck and zero-warning lint passed. Native header/system behavior remains unverified without a device.
