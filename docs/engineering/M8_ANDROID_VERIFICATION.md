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

## Required sequential basket retest after M8-06/07/08 — not executed

Use the reviewed source in the existing isolated verification client only after coordinator approval. Record the source and build identity. Choose Basket; scan known A then B into the same cart without checkout between them. A-A-A stationary must yield one addition; explicit repeat or quantity handles another identical unit. Insert unknown C -> explicit whole-product photo -> price -> return to the same basket -> scan the next known item -> review/edit/Undo -> one explicit combined payment -> force-stop/reopen its receipt. Photograph a useful whole-product frame without a forced distance. Verify the device-local photo after restart in Temporary/detail/Complete details; rename and check unchanged receipt snapshots. Deny permission and exercise storage/missing-photo fallback without blocking selling. Verify active corner guides/line, processing and UNKNOWN pause, reduced motion, background/focus return and large text/TalkBack. These are future steps, not completed evidence. Existing unexpected detector values, first silent beep, unfinished-cart recreation loss and incomplete continuous/permission/accessibility checks remain open.

## Daytime amendment device pass — 2026-09-30, in progress

Authorized sequential utility resumed on plan/m8-unified-scanner at HEAD
9ec7449, frozen runtime 824b2af. Four coordinator-owned pending documentation
edits are preserved; only this native evidence document is editable in this lane.
No source/config/dependency edits, new APK job, installation or data clearing.

Installed package com.damiyx.retailintelligence.scannerverification remained
0.0.1/code1 on SM-A156E Android 16/API36. Device base.apk SHA-256 directly
matched 76f6d2ed882b3e89bb2d234ac00927728fc1d72944f11d2fb73cff8e114692dd:
original build105bb294 from4d6521e. Existing camera/audio/filesystem classes
and locked filesystem57.0.7 were checked; current camera57.0.6 changelog fixes
iOS behavior, not a proven Galaxy correction. Native File/Directory construction,
document/cache paths, available space, exists and copySync/moveSync/bytesSync
API presence worked in this older binary. Actual capture/copy remains a separate
check. This pass is current JavaScript on an older native APK, not a patched APK
or standalone preview. Matching USB Metro8083 started; cold launch returned
Status ok/MainActivity/2722ms and bundle1807 modules/10736ms.

Native SQLite now records additive migrations25 local_product_photos and26
local_catalogue_suggestions. Existing two fixture products, original completed
sale70c46569-05e2-423f-84ed-e9276c0ef6c6, its two inventory events and three
PENDING outbox operations remain. No photos existed at this baseline.
An initial read-only utility query used a nonexistent sales column and failed;
corrected utility query succeeded. No application defect or mutation is inferred.

Authenticated read-only EAS usage at2026-09-30T11:26:25.418Z: Free, total
BUILDS7/30, LOCAL_BUILDS0/10, zero overage count, total cost0. This aggregate
allowance is not new build authorization or proof of remaining Android-specific
allowance. The prior single included-job permission is consumed.

Founder clarified that this phone supplies the laptop's internet by hotspot
while away from home. A brief airplane-mode attempt was undone by the founder;
readback was0. No further network/airplane/hotspot changes will be made. Offline
checks are explicitly deferred for this session; online connectivity does not
activate the disabled catalogue provider or associations. Initial Wi-Fi setting
was0, mobile_data1, font_scale1.0, accessibility_enabled0, servicesnull.

First controlled Fanta presentation in Basket mode: founder reported more than
14 seconds of the green line moving up/down, no audible beep and no perceived
successful scan. Native screenshot/UI nevertheless recorded exactly one Fanta
line, NGN1,000, Last added Fanta, then UNKNOWN for unexpected EAN13
5020001011527 and Camera paused. No additional line was observed. The ready
preview had four white corners and a green line; paused result removed that
preview and camera-service active clients were empty. This is an unresolved
decode/feedback observation, not a clean stationary-repeat/continuous pass.
Fresh UI dump could not idle during the animated ready preview, so screenshots
were used; paused UI dump succeeded. Screenshot helper buffer was increased
outside Git after a camera PNG exceeded its old1MB buffer; no source changed.

Founder subsequently presented AirPro and heard its beep. Native screenshot
confirmed the same basket at2 lines/NGN3,000/Last added AirPro with camera still
active. Remaining open is expected in Basket mode. The user resumed/presented
it after the Fanta pause; exact intervening button actions are not proven, so
this is not an uninterrupted A-to-B detector-stability pass. The current known
basket was not manually reconstructed. Corner guides/green line were visible
while active and absent in the earlier paused result.

The original completed-sale checkpoint was reread after migrations25/26:
SHA-256150808148a92498814e8c0f3c7b74c135e499622bc826bcd072120901e43d9d5,
identical to the prior pre/post-restart evidence before further fixture writes.
Known-QR fixture M8-KNOWN-FANTA-20260930 was then attached to the existing Fanta
can using the guarded existing native catalogue API, producing a PENDING
PRODUCT_IDENTIFIER_ADDED. This is synthetic fixture preparation, not scanner
association rollout or physical QR evidence; flags/provider remain off.
Known/unknown QR images were generated outside Git using the existing QR
encoder. Physical scanning remains a separate step.

Third physical product was Whiteboard Cleaner, founder-reported printed code
6920583012563. The current ready scanner decoded that exact EAN13, paused
UNKNOWN/No safe product match, and retained2 lines/NGN3,000. Sell this item
opened the separate explicit photo preview, with Take product photo enabled,
Continue without photo, device-only/no-backup wording and barcode-saving-disabled
warning. The barcode preview was no longer mounted. Capture remains pending.

### Proposed standalone test build path — not applied or submitted

The existing development client cannot prove standalone launch. A concrete
candidate for coordinator/founder review is a new EAS profile extending
scanner-verification with developmentClient:false (internal APK), inheriting
scanner-verification environment and explicit opt-in. It would keep exact package
com.damiyx.retailintelligence.scannerverification and use the existing EAS project
and matching Android signing credential. This proposal changes no configuration
in this utility pass and needs one new Android build job; prior one-job permission
has been consumed. Ordinary preview has a different app ID and verification off,
so it is not a substitute for this isolated automatic-basket test.

Verified allowance is aggregate Free BUILDS7/30, zero overage/cost at11:26:25Z;
Android-specific remaining allowance and eligible free-build availability must
be confirmed before approval/submission. No cost guarantee or new approval is
inferred. Before an authorized update, inspect new APK package/source/version,
compare signer certificate with the installed package, and use a data-preserving
same-package update only if compatible. Stop on a signing/version mismatch;
never uninstall/clear data as a workaround. Retest embedded-JS launch without
Metro and native patch behavior separately from the current older-APK evidence.

## Home Wi-Fi continuation — 2026-10-01, in progress

Founder explicitly paused the office session before photo capture. Last observed
state was Whiteboard Cleaner photo preview with Take product photo enabled;
no staged photo, and the scanned Fanta/AirPro basket atNGN3,000 was unfinished.
The intervening preparation message did not authorize device activity. Founder
explicitly resumed with continue on2026-10-01.

Git remains plan/m8-unified-scanner/9ec7449, runtime824b2af. Four pending
coordinator-owned documents retain their prior hashes; this evidence appendix
is the only workspace edit in the utility lane. No commit or native build.
At preflight no device was connected and no Metro8083 listener existed. Laptop
is on home-router Wi-Fi. Enabling Android Wireless debugging made the expected
RZCX22H432K device's TLS-connect service discoverable, but sharing a router does
not itself establish paired adb control. Local ephemeral QR pairing was offered
without requesting a pairing credential in chat. Scoped LAN Metro8083 was
started with matching isolated environment/opt-in and associations false.

Actual app/cart/photo retention remains to be recovered after pairing; the prior
unfinished basket is not assumed durable across this interruption. Router Wi-Fi
replaces the office phone-hotspot dependency. Connected LAN Metro checks remain
online/development-client evidence; standalone offline cold launch and native
patch acceptance still require their separate reviewed build path. No further
airplane/mobile-data/hotspot changes are made in this continuation.

### Home-router recovery and first continuous basket observations

Ephemeral QR adb pairing succeeded with the same RZCX22H432K / SM-A156E device.
The pairing helper exited and removed its temporary QR image. No pairing secret
was requested in chat or retained in evidence. LAN Metro8083 runs current frozen
JS824b2af with the existing isolated APK4d6521e. No USB reverse or new build.
The native app process was absent at recovery; launcher opened the actual LAN
server. The unfinished office basket did not survive: scanner showed0 lines/NGN0.
That is the known memory-only draft limitation, not completed-sale data loss.
An unprompted Single-item AirPro recognition opened Add to sale; utility cancelled
without adding it, then opened scanner and explicitly selected Basket.

Read-only runtime inspection initially closed WebSocket1006 with the old loopback
Origin. A bounded helper probe exposed the origin requirement: Metro explicitly
reported expected http://192.168.1.3:8083. Matching that configured origin restored
Runtime.enable and evaluation1+1=2 over loopback. Only temporary helpers changed;
no app, dependency, Metro policy or origin guard was changed. Native SQLite read
then succeeded: migrations1-26, original completed sale70c46569 unchanged in count,
no media rows, and four PENDING outbox rows including prior known-QR fixture.

At approximately10:40 Lagos, founder presented only Fanta and held it for10 seconds
without Scan again. Founder and native screenshot agree1 line/NGN1,000/Last added
Fanta, with ready camera still active. Founder heard no beep. At10:41 founder then
presented only AirPro without Scan again and reported a beep; native screenshot
and founder agree2 lines/NGN3,000/Last added AirPro and active preview. No duplicate
line or intervening utility resume action was observed in this controlled A-to-B
sequence. This supports these two additions and bounded stationary observations;
it does not establish general decoder accuracy or reliable first-addition audio.
At10:42 native screenshot showed exact Whiteboard Cleaner EAN136920583012563,
UNKNOWN/No safe product match/Camera paused, retaining2 lines/NGN3,000. Human
confirmation and photo step continue next. No checkout or photo capture yet.

Founder confirmed Whiteboard Cleaner paused the camera, displayed No safe product
match and retained2 lines/NGN3,000/Last added AirPro. Utility opened Sell this item;
at10:43 separate whole-product photo preview was ready with Take product photo
and truthful device-only/no-backup wording. Explicit human capture was requested;
no camera tap is inferred from preview alone. Pre-capture read confirms media[]
and fileCount0. Read-only comparison of original completed-sale detail and its
inventory events against the retained pre-QR checkpoint is exactly equal; outbox
count changed3->4 only with the previously recorded PRODUCT_IDENTIFIER_ADDED.
Four coordinator document SHA-256 hashes remain unchanged. Photo prompt pending.

### Founder self-directed continuation and native storage failure — 2026-10-01

After the photo prompt, founder independently reported first whole-product/front
capture advanced to price/quantity with Retake/Continue without photo options.
Founder observed one image only and suggested optional additional barcode/back
photos as an observation, not an approved scope change. Single identification
photo remains the implemented D-047 behavior; multi-view recognition is not proved.
Founder then entered price/quantity, attempted Add to basket and repeated Retry;
Not saved / Could not finish adding this item / basket preserved persisted.
Exact typed values were not captured. Founder discarded the entry, repeated the
flow, observed Photo unavailable / Photo could not be saved, and continued without
photo. Price/quantity/retry still failed. Subsequent known Fanta/AirPro scans did
not add or beep and displayed Product could not be read / basket preserved, then
Local store unavailable. UNKNOWN intentionally has no successful-addition beep;
these later known-item failures are separate from the earlier first silent beep.
No successful combined checkout is claimed. Founder discard effects on the
unfinished basket are not reconstructed as continuity evidence.

At approximately11:00 Lagos, scoped Metro8083 still listened (PID12824) and the
paired SM-A156E remained connected, app PID17726. Therefore active chat sampling
was not required for the existing LAN server connection. Screenshot showed
Products behind the native development menu, not a captured Local-store-error
screen; the detailed UI failure sequence above is founder-reported evidence.
Phone /data had2,101,508KiB available (99% used). No files were removed or storage
reset performed. This does not establish low-space as the failure cause.

Read-only default adapter access reproduced NativeDatabase.prepareSync rejected
with java.lang.NullPointerException while resolving the existing store. A bounded
comparison opened only a separate useNewConnection:true native SQLite connection,
performed SELECTs/PRAGMA quick_check, and closed that separate connection in
finally. It succeeded: quick_check=ok, exactly the original two fixture products,
original completed sale70c46569, four existing PENDING outbox operations and one
unattached media row. Photo692afb8d-eae8-470f-a280-c4a003d6e1e5 is131945bytes,
1080x1440, with matching actual/row checksum b409862cf36e5937280f387351302505;
store_product_id=null and photoFileCount1. This proves first photo staging and
file verification occurred; product attachment, checkout/restart retention and
second capture remain failed/unverified. No new temporary product or completed
sale appeared in this read.

Classification: reproduced native connection/handle failure; database-file
corruption is not supported by this bounded integrity check. Cached native handle
lifecycle is a hypothesis, not an established source bug. Earlier runtime helpers
repeatedly opened default adapters, which share cached native database behavior;
verification instrumentation may have contributed. Native source shows cached
NativeDatabase reuse and sharedObjectDidRelease closing its binding. No controlled
clean session without such debugger opens has yet distinguished instrumentation
from app lifecycle/old-native-binary behavior. No code fix or native mismatch claim.

Stop business writes/retries at this material native failure. Frozen runtime824b2af
and old native APK4d6521e remain; coordinator owns diagnosis/repair assignment.
Next evidence: data-preserving clean native session with no diagnostic reopening
of the app's cached connection, using separate read-only handles only if needed;
then repeated photo/no-photo creation and independent use without active chat.
This utility does not grant new build/dependency/source-change permission.

Founder asks to explore independently and report issues. No additional app access
permission is needed. Existing development client requires the laptop LAN Metro
server for loading JS; active assistant replies/debugger are unnecessary. A
standalone embedded-JS APK remains a separate, unapproved build path. Scoped
Metro8083 is intentionally retained for the explicitly requested independent
session; it is not a stopped/standalone/offline result. Pairing trust remains,
network/airplane/mobile-data/hotspot/font/audio/accessibility unchanged this turn.
No reset, uninstall, clear data, source edit, installation, build, deployment or
commit. No helper continues running. Utility commands/edits stop after final
Git/hash verification and authorized coordinator notification.

### UI-only restart and founder scanner observations — 2026-10-01

Coordinator assigned a bounded clean-process discriminator and froze source edits.
Founder explicitly answered Ready—restart the test app after notice that unfinished
cart would be discarded. Scoped force-stop affected only scannerverification.
First launcher command used a wrong activity namespace and returned Error type3;
package resolver supplied actual .MainActivity, which launched COLD successfully
in2259ms, new app PID2247. This was utility launch correction, not an app defect.
At11:08 Lagos the development launcher listed the retained LAN server; utility
tapped it. At11:09 native screenshot showed existing store Products with Fanta
and another partially clipped existing product card. No inspector/CDP/runtime
imports/SQLite adapter opens occurred in this fresh process. Metro status endpoint
read once returned packager-status:running. No standalone/offline claim.

Founder then explored scanner directly and supplied the following observations.
These are human-reported steps, not scripted controlled reproductions or an exact
sale count. Correct product name is AirPro despite voice transcription variations.
Founder refined their audio observation: first Basket-mode addition is silent for
either product; subsequent additions beep. Scan again can make a later scan beep.
Earlier product-specific explanations were revised by founder to this first-use
pattern. Native audio readiness root cause remains unresolved. Single-item scan
opens Add to sale without beep, and Add to cart emits a beep. Founder wants a beep
at initial successful recognition instead. Current approved M8 plan/design specify
feedback after successful basket addition, so that requested timing is a product
behavior change rather than evidence the existing single-item timing violated it.
UNKNOWN/failed lookup still must not give misleading successful-addition feedback.

Single-item cancel returns to Sell/Scan next item; founder requests return directly
to scanner. More materially, reopening Scan next item will not detect the same
prior product unless Scan again is pressed or a different barcode is presented.
This also occurs after confirming an addition and then reopening for the same
product. Read-only source inspection supports the mechanism: persistent ScanSession
begin rejects lastKey; cancel clears busy/generation but preserves lastKey;
repeatExplicitly clears lastKey. endScanIntent uses cancel, and Scan next item calls
endScanIntent then setScanning(true), without repeatExplicitly. This source path
explains preserved-key suppression across an explicit new scan action. Any fix
must distinguish explicit reopening from stationary/focus/background suppression;
no code was changed and no current automated test was run.

Founder reports each intentional scan appends another cart line. Single item Fanta
quantity10 then another Fanta scan quantity1 gives separate10/1 rows; alternating
Fanta/AirPro produces many rows. Desired behavior: one row per matching product,
with quantities accumulated (10+1=11; five can scans=5). Read-only source confirms
configureScannedCandidate appends a new generated line and commitLine appends unless
editing an existing line. Consolidation behavior needs coordinator/implementation
review, preserving product/package identity, conversion snapshots, differing price
and discount semantics, safe money/quantity arithmetic and meaningful Undo/edit.
This is a founder change request, not permission to silently merge unlike lines.

Founder authorizes routing all observations to coordinator and asks where broader
app feedback belongs. This utility records evidence and routes repairs; coordinator
can assign the implementation agent and owning non-scanner modules. No multi-photo
or beep-timing/cart grouping implementation is authorized in this evidence-only lane.

Controlled clean-session storage discriminator remains incomplete: catalogue list
reopened and founder reports subsequent known additions/scanning, but no exact
no-photo unknown input/result, fresh photo attachment, background/resume, combined
checkout or reopened receipt/photo was supplied. Therefore failure not reproduced
across the full clean sequence is NOT claimed, and cached-handle/instrumentation
causality remains unproved. No diagnostic DB session was run after this UI sequence.
No material native exception from this fresh process was reported/captured. Prior
NPE/photo and preserved historical data evidence remain. Further scripted phone
operations stop to hand the new findings to coordinator; do not interrupt founder's
independent exploration with more resets or retries.

Stopped handoff: same plan/m8-unified-scanner/9ec7449; frozen JS824b2af/native4d6521e.
Only this evidence appendix changed. Five pending files remain; four coordinator
files preserved, including current PROJECT_STATE hashFED0B988A4BCC43128419B1C189DC7A6DAA8B1DC776AAFF797675CEB7C9AF541.
No commit/source/dependency/config/domain/schema/build/backend effect. Scoped Metro
session70408/PID12824 intentionally retained for founder's independent session;
no diagnostic helper or debugger remains active. Phone network/settings unchanged.
Next owner coordinator: sequence a narrow re-arm/audio/cart behavior review and
complete UI-only storage reproduction; no root-cause or M8 acceptance self-waiver.

### Founder ends independent exploration — 2026-10-01

Founder explicitly said feedback is complete, work may resume, and the utility
may restart the app to show new changes. Read-only Git/project/coordinator status
inspection found runtime still824b2af/HEAD9ec7449; D-049/D-050 and M8-10..13 are
planned/unimplemented. All pending changes are documentation/planning/evidence,
not a new app version. No restart/reload was performed to imply changes existed.
Founder exploration hold is released; notify coordinator to sequence the approved
implementation and stopped independent source audit before changed-app verification.
Existing build/provider/deployment/reset constraints remain. Utility stops commands
and edits after this note/final Git state and notification. Metro intentionally
retained for the development client; no debugger or diagnostic helper activated.

## Reviewed October correction packet — 2026-10-01, in progress

Coordinator stopped after independent source re-audit of M8-10..14 (75 tests/10
suites); implementer632/static/Doctor/export are attributed source evidence,
not device results. Checkout plan/m8-unified-scanner, HEADa1bcffa73875ca749fc7c6ec9e77b06056bb47d3,
frozen runtime8efb1e071b259b9b7304813e320c9e89dc7dfcc2. Seven pending coordinator
context/workflow/audit/state/ticket files are preserved; evidence appendix only
is editable here. Founder model policy requests phone verification Sol medium;
no self-setting/model switch is claimed by this utility.

Readiness: actual paired adb device SM-A156E available, isolated package installed
version0.0.1/code1, existing native provenance4d6521e unchanged. No app PID or
Metro8083 listener existed at preflight; laptop Wi-Fi192.168.1.3. Founder explicitly
answered Ready—no basket needs preserving and has all three physical products.
Scoped Metro started in apps/mobile with scanner-verification environment/opt-in,
associations false and LAN host192.168.1.3:8083, session60684. Existing .MainActivity
launcher opened, then advertised development-client URL loaded current checkout.
No new APK/install/clear/reset, USB reverse, database/runtime inspector import,
fixture-writing helper or network/settings mutation. Ready UI confirms reviewed
summary label Sales value(after discounts) and Discounts given.

At approximately17:49 Lagos, initial Today UI in isolated store shows3 completed
sales, Sales value NGN47,705 and Discounts given NGN100. These are observed UI
baseline values from founder's exploration, not an audited native ledger query.
At17:50 Scan opened and founder presented Fanta before the next prompt. Screenshot
shows Single Add to sale/Fanta, Product matched/Review and add to basket, default
quantity1, priceNGN1,000, recorded stock-18, no typed discount. Recognition cue,
Cancel-to-camera and same-code repeat human confirmation requested. No new line
or checkout is inferred from opening this form. Earlier negative inventory is
not repaired by this scanner utility.

### First Single recognition cue not audible — stopped finding

Founder answered no beep to the first Single Fanta match/cancel/same-code question.
This explicitly establishes the reported missing audible initial cue; it does not
fully answer the multi-part Cancel/repeat question. At17:52 passive screenshot
shows Single ready camera, Sound on,0 lines/NGN0. Return to camera is observed,
but exact human cancellation/repeat actions and subsequent cue outcomes were not
confirmed. Do not convert this into a full Single re-entry or dirty-back pass.

Read-only app-scoped logcat PID7017 contained AudioTrack setVolume0.3 and stop
with2205 delivered frames at17:52:12 and17:52:21, plus later volume entries. Those
later entries cannot be unambiguously assigned to the first Fanta scan and do not
prove audibility. No prepareSync/NPE exception appeared in the limited filtered
sample; no local-storage pass is inferred. STREAM_MUSIC readback: unmuted, internally
unmuted, volume15/max15, speaker selected. No volume/audio setting was changed.
Physical first audible recognition criterion remains failed despite source mocks.
Root cause is unestablished; existing older native APK remains a provenance limit.

Per assignment, stop further scan/retry/business-write testing and return evidence
for coordinator technical review. No technical repair/source/native/dependency
change or model self-escalation. Controlled Basket accumulation/Undo/quantity10+1,
commercial distinctions/combined discounted checkout, unknown barcode/QR neutral
cue, photo/no-photo creation/attachment/replacement/bytes/clarity/restart, and
accessibility/standalone/provider checks are unperformed in this reviewed-source
pass. Today summary wording and baseline were observed only, not arithmetic or
completed-sale persistence verification. No manually rebuilt sale or native DB
inspection/handle opens occurred. Earlier evidence remains historical.

Cleanup: utility used Android back from the ready scanner to release that preview,
without resetting app/data. Scoped LAN Metro session60684/PID31060 intentionally
retained for the reviewed development client and next coordinator-owned action;
prior70408/PID12824 is no longer live and was not assumed. No other helper/debugger
runs; network/font/audio/accessibility settings unchanged. Same branch/HEAD/runtime;
appendix is the only new utility edit, seven pending coordinator files preserved.
No commits/push/build/installation/backend or ordinary rollout. Stop all commands
and edits after final status/hash/check and authorized report-back.
