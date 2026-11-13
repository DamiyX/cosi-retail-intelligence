# C8 host probe review and device-a3 continuation

2026-10-22, coordinator High. Host/helper correction only; accepted APK/source
unchanged. Follow original C8 device packet and USB amendment except as below.

## Evidence and diagnosis

Device-a2 STOP3df5eb952a5450f9515529517e2e3d2f84ce345afdd09fff6d3c5b8daf6546fa
and all22 indexed evidence files verified. Actual USB/model/API/ABI/unlock/old
APK/UID/dataDir/storage checks passed. pidof exit1/empty means owning main process
was absent at that observation; durable saved state is not thereby verified.
Only15 read-only commands ran; zero update/launch/capture/export actions across
a1/a2. Keep all previous roots/helpers/first failures frozen.

Confirmed focus-probe mechanism: original `dumpsys window windows` subsection
returned no mCurrentFocus/mFocusedApp lines (grep exit1). A fresh selected-phone
read-only default `dumpsys window` filtered to those fields exited0 and returned
one actual mCurrentFocus. Thus a subsection-specific inspection assumption caused
the stop, not a camera/save failure or USB disconnection. No claim of a broad
Android regression is made. Current focus was outside the owning test app;
coordinator collected no UI hierarchy/screenshot of that other app.

Actual launcher resolution was read with cmd package resolve-activity MAIN/
LAUNCHER and returned the owning package/.MainActivity. Actual uiautomator help
confirms dump support. Actual prior C7 status/labels and a2 package/lock/storage
receipts were inspected for compatibility. Remaining live UI readiness is still
unknown until owning app is opened; these checks do not prove every later probe.

Evidence and reviewed helper:
apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-window-review-20261022-a1/.
device-c8-host-a3.py SHA256
1fb1cbe483a478f1b9bab928a151173b553abcdce52d5e9bee1061b8815fd8e6.

Narrow helper changes from frozen a2: default window report; parse exactly one
mCurrentFocus and require the exact owning package before UI inspection, rather
than matching any occurrence in mFocusedApp/background records. Null focus is
valid preflight metadata but never owning-app readiness. Missing/multiple/unknown
formats refuse. Existing tap guard now parses signed bounds and requires a
nonnegative nonempty button rectangle inside the actual owning app frame;
negative/clipped coordinates cannot turn into positive tap positions. All other
USB/lease/identity/package/timeout/status logic remains unchanged.

Compile plus21 checks pass: actual focus format, own/background/prefix/null and
missing/multiple/malformed focus; valid/negative/zero/malformed bounds; actual C7
status versus missing/duplicate status; enabled/disabled/negative/outside/foreign
button cases. Generated checks do not substitute for physical UI inspection.
All errors refuse before a tap. USB-only correction and prior8 cases remain
preserved; its runner implementation was not changed by this amendment.

## Precise continuation and startup clarification

Same Track B writer, Sol6.1Low, fresh finite six-hour lease. NEW absent root
apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-device-20261022-a3/.
Copy exact reviewed helper to device-a3/device.py, bind hash and new charter.
Do not run expired/stopped a1/a2 helpers or rewrite their evidence.

1. Fresh exact USB/device/old APK/unlock checks. pidof absent is an expected
   closed-app outcome, not a reason to assert that the app is already foreground.
2. To satisfy the original pre-update saved-state inspection, this amendment
   permits ONE normal launch of the exact installed C7 owning MainActivity if
   its process is absent. Use `am start -W -n
   com.damiyx.retailintelligence.recognitionverification/.MainActivity`, no -S,
   force-stop, clear-data, uninstall, reset or restart. No active process may be
   killed. If a process is present with uncertain active ownership, stop rather
   than assuming idle or forcing it foreground.
3. Inspect only owning-app UI after exact current-focus verification. Navigate
   only observed owning-app controls to isolated camera proof if required. No
   generic capture/recovery/classification/permission-change action. Existing
   camera permission may show preview, but no screenshot of an unconfirmed scene.
   ONE saved-status inspection must establish activeJob null, interruptedStorage
   empty, bytes863381/claimed863381/captureCount2 and known old source/recipe/model.
   The retained historical interrupted admission16c586fc-146b-4877-9002-1d4fb89afd78
   is expected history, not authority to run recovery or delete it. Unexpected
   durable state/refusal stops before update.
4. After verified idle state, ONE exact C8 install-r preserving data remains
   allowed under original packet, then ONE normal launch of the updated app.
   This additional OLD-app inspection launch is distinct from the originally
   permitted POST-update launch; neither admits capture or a model run.
5. Finish original C8 PhaseA slot/accounting/UI inspection, then ask for actual
   human stationary supported phone/fixed whole chart/display-mm readiness. Wait
   for actual answer. Original ONE capture/ONE export/ONE selected-public transfer,
   tightly timestamped screenshot/tap/drain/post-preview and unchanged geometry
   criteria apply. No original one-shot ceiling has been consumed so far.

If foreground is Settings/notifications/other app during an expected UI check,
ask founder to return to the owning app rather than inspect unrelated content.
No automatic fallback that guesses focus, button coordinates or active state.
Operational steps may use new unique receipt names; no repeat mutation after
failed/ambiguous update/capture/export. On further genuine failure STOP with
evidence, no Low repair. Source/APK/native/permissions/radios/GitCI unchanged.

STOP/release/direct handoff after finite work, High coordinator audit afterwards.
User authorization for remaining test already verified; no repeated generic
approval required for these reversible owning-app inspection actions. Original
physical readiness remains a separate necessary observation. P2-03/G4/geometry
stay unverified pending evidence. Founder GitHubCI deferral remains unchanged.
