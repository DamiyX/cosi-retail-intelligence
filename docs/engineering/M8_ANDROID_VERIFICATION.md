# M8 Android verification — compatible build blocked

## Superseding device utility handoff — 2026-09-30

This observation supersedes the historical no-device/tooling report below. The
sequential utility pass started on clean branch plan/m8-unified-scanner at
59ad39c2c113f6674ef5f871e72b716e7156a0a3 in C:\Users\doyew\Documents\DEV 2\COSI-m8-planning.
Runtime source remains the reviewed e5b23ff correction. This pass inspected
the phone and existing builds; it did not perform scanner acceptance.

### Observed device and tools

- The authorized Galaxy A15 5G SM-A156E was the single connected/authorized
  USB device. Android 16 / API 36 were read directly through adb.
- adb 37.0.1, Node 24.21.0 and npm 11.19.0 were available. Java, javac, Gradle,
  aapt/apkanalyzer and Maestro were absent from PATH. JAVA_HOME/ANDROID_HOME/
  ANDROID_SDK_ROOT were unset; the usual Android Studio JBR/SDK/Java locations
  checked were absent. A local native build is not feasible with the inspected
  tools, and installation of toolchains is outside this assignment.
- Host C: had approximately 122.9 GB free. Phone /data reported 2.2 GB free
  (98% used). No space was reclaimed.
- No APK/AAB or generated Android project was found in this checkout. The
  existing external m1m2-apks cache contains old development (350,371,940 bytes)
  and preview (104,391,805 bytes) artifacts dated September 14; these were not
  installed or treated as M8 binaries.
- Read-only EAS history succeeded using the existing signed-in team. The newest
  finished Android builds are preview 7a36d34d-6217-461d-a1d3-88c937f13d3d
  and development 3e75f2cc-5f93-4f38-8caf-e07bf5c634e3, both created September
  28 from 1b2b10041fec8935d61a6c95b1365acfff0083b0. The history returned eight
  jobs and no M8 or scanner-verification build. That source predates camera
  introduction at 512352e and audio at e10ca70.

### Existing-app launch diagnosis

The phone has com.damiyx.retailintelligence.dev and
com.damiyx.retailintelligence.preview, each version 0.0.1 / versionCode 1.
Their last update times are September 28. The isolated
com.damiyx.retailintelligence.scannerverification app is absent.
Installed APKs were not cryptographically matched to an EAS artifact; their
exact source provenance remains unverified. The development package's complete
requested-permission section contains no CAMERA permission, so it is unsuitable
for the M8 camera procedure.

| Check actually performed | Observation and limit |
| --- | --- |
| adb devices, model/OS/API, df, package inspection | Authorized target present; app identities and storage recorded. |
| Existing preview am start -W with MainActivity | Status ok; screenshot showed Home in the existing device-verification store. Its old Sell tab was visible. This is existing-app launch evidence only. |
| Existing development am start -W with MainActivity | Status ok; Android reported DevLauncherActivity; screenshot showed the development-server connection screen. No Metro session or application JS was started. |
| Bounded crash-buffer inspection without clearing logs/data | September 28 dev crashes say Unable to start activity, caused by Activity could not be started for Expo's DevLauncherActivity, through DevLauncherController.navigateToLauncher. |
| Current dev process log inspection | No matching fatal/exception/error lines in the inspected 300-line window. The historical launch failure did not recur in this one launch. |

The historical failure is localized to development-client launcher redirection;
its underlying cause remains unverified. No repair or repeated restart loop was
justified. Existing preview launch and current development launcher availability
do not prove Metro connectivity, M8 native compatibility or standalone M8 operation.
Screenshots remain outside Git in the task's temporary artifact directory;
raw logs, account identity and app data are not committed.

### Checks deferred

No M8 camera callback was exercised. Permission denial/grant/permanent denial
and settings return; physical EAN-8/EAN-13/UPC-A/exact QR; active/inactive,
zero-stock, carton/package-less and missing-price cases; unknown
create/search/cancel with the same basket; A-A-A/A-B/explicit repeat;
background/resume; beep/mute/torch; Undo/edit; Android/header back;
200% text/TalkBack/keyboard/insets; completed-sale force-stop/receipt survival;
temporary-product enrichment; scanner-disabled manual flow; first-use offline
detection; standalone preview without Metro; and M8 APK size/timing are all
unperformed. They remain blocked by the absent compatible binary. No physical
scanner success, false-add rate, accessibility pass or milestone acceptance is claimed.

New association checks have an additional gate: the reviewed server migration
must be applied to an isolated test backend before explicitly enabling
EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED. The existing migration evidence is
rollback-only. This utility pass did not enable the flag or provision/deploy a backend.

### Minimum next action for the coordinator

1. Review this stopped evidence pass, then arrange a newly authorized native
   build from this branch's reviewed source. The existing dedicated profile is
   an internal development client with a separate application ID and automatic
   additions enabled only for verification:

       npm exec --workspace @retail/mobile -- eas build --platform android --profile scanner-verification

   This command is prepared only, not executed. It creates one new EAS Android
   build job for project 737ed99c-2c20-4612-ac80-a8a868b827cb; it is not a
   standalone preview. Remaining account quota/credits and potential charges
   were not established by build history. Confirm them and authorize submission
   before running it. Verify association remains disabled in the effective build
   environment until the test-backend migration gate is satisfied.
2. Record the resulting build ID, exact Git source, APK checksum/size, native
   camera/audio modules and manifest; install only the isolated verification
   package. Use matching scanner-verification environment/opt-in for Metro as
   documented below, then resume physical tests with isolated fixtures.
3. Arrange a separate compatible standalone ordinary-preview build for offline
   first-use/Metro-free evidence. Current preview configuration uses the already
   installed .preview ID. Under this assignment's no-overwrite ceiling, a
   separate isolated standalone identity/profile or explicit authorization to
   update that app is required before installation. No such configuration was
   changed here.

Only evidence documents/workflow were changed. No APK/build submission,
installation/uninstall/data clearing, dependency/global installation, Metro,
Docker action, persistent migration, deployment, push, merge or production code
change occurred. Coordinator-owned gates remain pending/blocked. This utility
task stops after its local evidence commit and sends the authorized completion/
blocker notification; further device/build work belongs to the next approved session.

Evidence-only checks passed: workflow JSON validated against its schema
(PowerShell Test-Json returned True), and git diff --check exited 0. Production
tests were not rerun because this utility changed no runtime source.

## Historical implementation observation — retained

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
