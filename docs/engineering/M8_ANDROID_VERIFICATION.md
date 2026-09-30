# M8 Android verification — isolated native pass returned with findings

## Authorized isolated native pass — 2026-09-30

This pass supersedes the compatible-build blocker below. Physical acceptance
is still blocked by native findings and outstanding criteria; the older stopped
observations are retained as history. The bounded utility pass is stopped.

The founder authorized one scanner-verification build conditional on no
additional charge. The authenticated EAS account API reported the Free plan,
September allowance of 6/15 Android builds used, 6/30 total builds used, no
overage metrics and total cost zero before submission. Installed official
EAS CLI 24.3.0 states that Free accounts are blocked at their limit rather than
charged. No subscription, upgrade, overage or second build was requested.
Post-build authenticated usage at 2026-09-30T02:03:38.205Z showed 7/30 total
builds used, zero overage count and total cost zero. No additional charge was
observed for this one build.

| Artifact | Observed value |
| --- | --- |
| EAS build | 105bb294-dce0-487c-ba87-d1620a40cd82 |
| Source | 4d6521e66e1b43641fe93e69791b779bcf727baa |
| Profile | scanner-verification, internal development client |
| Android package | com.damiyx.retailintelligence.scannerverification |
| Version / code | 0.0.1 / 1 |
| Finished | 2026-09-30T01:29:55.291Z; native Gradle succeeded |
| APK bytes | 264,484,039 (four native ABIs; development build) |
| SHA-256 | 76f6d2ed882b3e89bb2d234ac00927728fc1d72944f11d2fb73cff8e114692dd |
| Device | Galaxy A15 5G SM-A156E, Android 16 / API 36 |

Binary archive inspection found CAMERA permission, native CameraViewModule,
AudioModule and ML Kit BarcodeScanning classes. RECORD_AUDIO and background
audio permissions are absent. The manifest is debuggable and permits cleartext
traffic, as expected for this development client; it is not a release artifact.
The effective build environment had no remote environment variables and
scanner associations remained off. One scoped cloud signing keystore was
generated as part of this build; signing secrets were not printed or committed.

adb install succeeded into the previously absent separate package. Existing
development and preview packages were not overwritten, uninstalled or cleared.
Metro was started from this checkout on port 8083 with scanner-verification
environment, explicit verification opt-in and association flag false. USB
reverse connects the phone to that Metro port. The native cold launch returned
Status ok / MainActivity / 2430 ms, then the app loaded and displayed the actual
verification banner. This is development-client launch evidence, not standalone
offline cold launch evidence.

An isolated local store, M8 Scanner Verification Store, was created using the
normal UI with synthetic owner M8 Test Owner. Fanta — M8 TEST was prepared
through the existing native catalogue application API using the development
inspector, guarded by the exact app package and store name. Its can barcode
5449000011527 is explicitly base-package-bound, its test price is 100,000 minor
units (NGN 1,000), and its PRODUCT_CREATED outbox is PENDING. No camera callback
was injected, resolver was stubbed or rollout flag enabled. An initial fixture
operation ID failed canonical UUID validation before writing; the corrected UUID
succeeded. AirPro barcode 6922420651355 was initially absent for the unknown-code check.
The founder corrected its spelling to AirPro; Fanta is unchanged.

Permission checks: first Allow camera request was denied and product
search remained usable; the second denial used Android's permanent-denial
button and the app opened its own settings. Camera was granted while using the
app in Android settings. Subsequent fresh Scan entry mounted the rear camera,
confirmed by camera-service client inspection. The exact same-screen settings
return is unproven: rapid back events returned to Home, so that sequence
does not establish permission-hook refresh behavior.

Basket mode was selected. The founder presented Fanta's printed barcode and
reported that it decoded only when brought close; roughly arm's-length scanning
did not succeed. No measured distance or timing was collected. Native UI then
showed one line / NGN 1,000 / Last added Fanta — M8 TEST. The basket confirmed
exactly 1 can at NGN 1,000. This is a real camera-driven known-item addition;
the founder reported no audible feedback on this addition.

The same scanner observation also showed UNKNOWN for upc_a 388502011527 and
Camera paused, without a second addition. The founder confirmed that Fanta was
the only product/barcode presented. This is a possible detector false decode;
root cause and reproducibility remain unresolved. A floating video remained on
screen. Do not infer a clean stationary-code suppression pass or decode accuracy
from this sequence. Back to basket preserved the Fanta line and camera-service
inspection showed no active camera client.

The founder confirmed no audible beep on Fanta addition despite Sound on. Audio
inspection showed media volume 9/15, not muted, on speaker; system and ring
streams were muted. No audio setting was changed. The missing beep remains a
physical finding, not a proven code root cause. A USB reconnect changed the adb transport and removed the port reverse;
the app process and Fanta basket survived. The task restored its port 8083 reverse.

AirPro subsequently decoded as exactly ean13 6922420651355 and paused with
UNKNOWN while the original Fanta line/total remained. Founder confirmed the
unknown message and again reported blurry longer-distance view, low indoor
night lighting, close/rotated presentation needed and desire for focus/flashlight.
The existing UI has a torch control but no manual focus control. Silence on
UNKNOWN is expected because feedback is for successful basket addition.

The unknown Add product form displayed the exact EAN and explicitly explained
that barcode saving was unavailable with associations disabled. A synthetic
name was typed; keyboard screenshot showed the focused field reachable. Cancel
opened Discard product? / Keep editing / Discard. Discard returned to the same
basket with 1 Fanta. Native catalogue inspection confirmed only the Fanta fixture,
no inventory events and no completed sales before further preparation.

AirPro — M8 TEST was then prepared through the same guarded existing native
catalogue API as a separate fixture, with its can code base-package-bound and
price 200,000 minor units (NGN 2,000); its outbox is PENDING. This is fixture
preparation, not a scanner-association rollout test. No server/backend or flag
was changed. Basket scanner re-entered; Torch on changed its label to Torch off.
Founder confirmed physical torch illumination and improvement when the
reflective steel can was tilted to remove glare. That attempt paused UNKNOWN
for unexpected upc_a 919020651355 without adding AirPro. A final controlled
attempt added AirPro correctly: UI showed 2 lines / NGN 3,000 / Last added
AirPro — M8 TEST; founder heard the beep. It then paused UNKNOWN for unexpected
ean13 6922420651690. Camera screenshots and basket detail captured 1 Fanta can
at NGN 1,000 and 1 AirPro can at NGN 2,000. No unintended additional line was
observed, but stable-code/false-decode acceptance is not passed. No accuracy
rate is inferred. Audible feedback worked once; the earlier silent addition
still needs a controlled retest without the earlier floating video.

Changing font_scale from 1.0 to 2.0 recreated the screen and returned to Home.
Fresh scanner entry showed an empty unfinished basket and Single item mode.
Completed transactions were not involved. The source deliberately keeps the
unfinished M3 cart in memory (SaleDraftNavigationContext.tsx); this observed
configuration-change loss is a carried usability limitation, not completed-sale
durability evidence. Native 200% screenshots show wrapped scanner/banner text
and readable line fields. Scroll reaches later controls. No complete accessibility
pass is claimed from screenshots alone.

Samsung TalkBack was enabled temporarily with its discovered native service.
The service was bound and enabled, but its first-use tutorial appeared before
the intended field selection. Bounded tutorial dismissal did not establish a
field announcement. TalkBack reachability and announcements remain unverified.
The initial field-announcement question was corrected when the tutorial was
observed; do not treat that question as evidence of a selected field.
Original font_scale 1.0, accessibility_enabled 0 and
enabled_accessibility_services null were restored and read back directly.

### Completed offline sale and restart

After the configuration change discarded the unfinished basket, the test sale
was reconstructed through the normal manual Sell UI: 2 Fanta cans at NGN 1,000
each and 1 AirPro can at NGN 2,000, total NGN 4,000, paid with Cash. This was not
completion of the original scanned basket. The phone was in airplane mode with
Wi-Fi disabled; USB Metro remained available for this development client.
Sale completion showed Saved on this device. No cloud backend was configured.

Sale 70c46569-05e2-423f-84ed-e9276c0ef6c6 completed at
2026-09-30T02:08:31.109Z. Guarded native SQLite reads captured one completed sale,
400,000 minor-unit cash payment, package/price/quantity snapshots, explicit SALE
inventory events (-1 AirPro and -2 Fanta base units), and its PENDING
COMPLETED_SALE_CREATED outbox alongside the two PENDING product creations.
Both products started with zero recorded stock; negative stock requires
reconciliation. Cost coverage was UNAVAILABLE; no profit claim is made.

After force-stop of only the isolated package and cold reopening through the
same dev-client deep link, Status ok / MainActivity / 2253 ms was observed.
The before/after JSON evidence files were byte-identical, both SHA-256
150808148a92498814e8c0f3c7b74c135e499622bc826bcd072120901e43d9d5.
Normal Recent sales showed exactly one NGN 4,000 sale; its reopened receipt
displayed the correct quantities/prices and Sync pending. This proves local
completed-sale survival in this tested path. It does not prove standalone
offline cold launch, first-use offline detector availability or cloud sync.

A later USB reverse loss produced DevLauncherErrorActivity with an explicit
ECONNREFUSED connection to port 8083. Restoring the scoped reverse and matching
deep link recovered the app. This observed Metro transport failure is distinct
from the historical launcher-redirection failure whose root cause remains unknown.

### Returned findings and remaining gate

- Known EAN-13 Fanta and AirPro additions, exact AirPro UNKNOWN result with basket
  preserved, unknown-form cancellation, physical torch and one audible addition
  beep were observed. UNKNOWN silence is expected.
- Unexpected UPC/EAN values paused the scanner on three captured occasions.
  No unintended extra basket line was observed; detector root cause remains
  unproven. Stationary suppression/continuous stability and automatic rollout
  acceptance are not passed. Investigate using these native observations.
- The first correct Fanta addition was silent. A later correct AirPro addition
  beeped; consistent feedback still needs a controlled retest.
- Founder reported close-distance decoding and blurry distant view in low light;
  torch helped after glare was avoided on the reflective can. No distance,
  autofocus capability or performance benchmark is inferred.
- Configuration change discarded the unfinished memory-only basket. Large text
  screenshots provide partial layout evidence; TalkBack tutorial blocked the
  intended sample. No full accessibility pass is claimed.
- Exact settings-return refresh, EAN-8/UPC-A/exact QR, carton/package-less,
  inactive/missing-price paths, explicit repeat, Undo, background/resume,
  temporary-product enrichment, mute, scanner-disabled flow and standalone
  preview remain unperformed. The repeated-unit completed sale was manual.

Ordinary automatic additions and new associations remain off. The reviewed
server migration remains rollback-tested only, not deployed. Coordinator owns
review and remaining gates; no milestone acceptance or second build is implied.

### Cleanup and evidence checks

Original airplane_mode_on 0, Wi-Fi enabled, mobile_data 1, font_scale 1.0 and
accessibility settings were restored and verified. Audio levels were unchanged.
The isolated app was force-stopped with its synthetic data and installed APK
preserved; Metro was stopped and only the port 8083 reverse was removed.

Screenshots, APK and utility scripts are outside Git under
C:\Users\doyew\AppData\Local\Temp\cosi-m8-native-verification. Key captures include
fanta-first-decode.png, airpro-unknown.png, unknown-keyboard.png,
airpro-torch-unexpected-upc.png, airpro-added-then-unexpected-ean.png,
scanner-text-200.png, line-editor-text-200.png and receipt-after-restart.png.
sale-before-restart.json and sale-after-restart.json contain the matching
synthetic sale checkpoints. Production source remains unchanged. Workflow
schema validation and git diff --check are recorded in the final handoff;
ordinary production tests were not rerun for these evidence-only edits.

## Historical pre-build device utility handoff — 2026-09-30

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
