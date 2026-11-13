# C4 physical camera test — first chain failed; diagnostic review required

**Current outcome:** startup/permission-grant/preview worked. The automated
capture attempt returned CAMERA_OPERATION_FAILED; no completed photo/receipt
is verified. Founder reported one additional manual capture-button tap. Saved
status still has one interrupted record and no active owner, and one existing
recovery/classification action refused. Do not equate captureCount1 with a saved
photo. Further operator captures are held for diagnostic review. Proposed next
scope: PHONE_P2_03_G4_STORAGE_DIAGNOSTIC_PROPOSAL_20261018.md (not implemented).

Founder returned October18, explicitly requested resuming the test and reported
the USB phone connected/unlocked. GitHub status was answered before phone work:
remote plan/m8-unified-scanner freshly matched374286dd87e22703ea90f1cd7a978020e32a8903.
The714-file source checkpoint is f76f0df10388ab034de63c0eb12d55494c8d98f8;
private images, runs, APKs and the photo PDF remain local.
Fresh read-only comparison during this resumed test also confirmed all14 local
branch tips match GitHub; receipt github-fresh-remote-status.json. New test
documentation/evidence from this session has not been committed or pushed.

Fresh evidence root: apps/recognition-lab/runs/phone-experiment/
p2-camera-device-g4-c4-20261018-a1/. Earlier failed C3 attempt and stopped C4
writer evidence are preserved. No source correction/build/dependency acquisition.

## Observed so far

- One authorized physical Samsung SM-A156E, serial RZCX22H432K, Android16/API36,
  arm64-v8a. The test app was not running at preflight; existing C3 base.apk was
  preserved and its device/local SHA256 matched6097b9d5...d0a99.
- Fresh C4 APK SHA256086ee746e8fc02a85131ed355ca8752d560ccfe51de9e11e0b8040b84a47699c,
  39,881,316bytes, signer48550aec...a7e2d83 independently reverified before update.
  External51-row source30223e6d...cadb9 binds this C4 build; native runtime source
  36004274... is legacy and does not cover repaired JavaScript.
- One update using install -r --no-streaming; no uninstall, data clear, grant
  flags or downgrade. Existing app UID/data directory retained; installed device
  SHA256 matched the exact C4 APK.
- One explicit startup, COLD, Android am TotalTime1184ms/WaitTime1250ms. The
  isolated proof UI rendered and PID10005 survived the later permission-stage
  observation. The C3 missing-ExpoAsset startup crash has not recurred in this
  startup. These timings are launch observations, not capture/exposure timing.
- Camera permission was denied before/after update and initial startup. Founder
  confirmed allowing access immediately, without choosing denial. The read-only
  observation showed granted=true with USER_SET. Permission-denial behavior was
  **not exercised**; no scripted permission grant/revoke or repeat prompt.
- The UI reports selected size2336x1080 (2,522,880pixels), enabled capture, disabled
  cancellation, and "No camera capture recorded." No capture action has been
  issued by this test operator. Radios remain unchanged.
- Existing UI saved-status inspection reports captureCount0, interrupted[],
  activeJob:null, ownedBytes/claimedBytes65,765, ownedCapBytes268,435,456,
  sdkHardCap:false and nativeValidated:false. Legacy source/recipe/model fields
  match their expected pins. This is the pre-capture baseline, not acceptance.

## Framing preparation and display limits

Founder confirmed the whole generated chart fits the guide. One pre-capture
preview screenshot was recorded (1080x2340, SHA256622aa5ba...5392). Visual inspection
found the chart plus chat/viewer controls/desktop around it, a magenta cast and
a horizontal brightness/color band. Cause is unestablished. Capture was held:
zero capture-button actions or JPEG requests. The initial framing record's
generatedOnlyView field represented the requested scope, not the actual view;
preview-review-a1.json explicitly supersedes that assumption. No screenshot is
published. Founder was asked to make the picture fullscreen and confirm only
chart/black surround before a fresh pre-capture observation. This is preparation,
not a consumed camera capture; the ceiling remains ONE, with no recapture.

Automatic local-file
browser opening was rejected by browser URL policy; founder was given direct
local chart links for manual opening. No workaround browser/server was created.
The approved capture is followed by saved/drained status and one restart inspection.

Founder subsequently reported a faulty laptop screen that distorts colours,
consistent with the observed tint/band but not independently isolated as their
sole cause. This display is not a representative colour/recognition-quality
target. A bounded camera capture/persistence check may still provide functional
evidence; no colour calibration, image correction, recognition accuracy or
geometry acceptance is inferred. The generated source image remains unchanged.
Founder confirmed the chart is inside Codex; official Windows shortcuts were
checked (F11 full-screen, Ctrl+Shift+F tab full view) and supplied for manual use.
These controls alone left Codex's address bar visible. Founder manually opened
the original target-a2.html in Chrome and used F11; no automated alternate
browser action bypassed the earlier URL-policy rejection.

## Executed first chain and follow-up

Founder explicitly selected a30second positioning interval, then Chrome. The
fresh preview-b1 screenshot showed all eight fiducials/chart edges inside the
yellow guide, with no chat/address bar/desktop controls. Faulty-screen tint,
band and ghosting remained visible. PNG1080x2340 SHA256
bbc09ef04a9753f0b8fd29691bd83df5e84e36e71ac2463db15c93e263dd0e7b.
One operator tap of the freshly observed enabled Capture control was issued.
The UI returned CAMERA_OPERATION_FAILED with PID10005 still present.

Readiness-to-tap73.015113s and preview-to-tap27.312894s were measured from actual
receipts. Founder reported leaving the fullscreen chart before the tap while
waiting for feedback. The positioning instruction did not provide an on-phone
finish cue; that coordination failure was acknowledged. The preview is not
exposure-time evidence. No geometry/correspondence result is inferred.

Saved status after the error: ownedBytes65913, claimedBytes26075365,
ownedCapBytes268435456, interrupted[16c586fc-146b-4877-9002-1d4fb89afd78],
captureCount1, activeJob:null, sdkHardCap:false, nativeValidated:false. This is
an interrupted reservation, not verified capture success. Relative to baseline,
actual bytes increased148 and the reserved claim26009600. The existing Classify
interrupted camera storage action was invoked once and returned "Recovery
refused: an owner may still be draining or storage is corrupt." Its wording
does not establish a specific cause.

Founder authorized a repeat and subsequently reported manually pressing Capture
once; exact time and resulting UI were not independently observed. A later saved
status matched the first failed state exactly, with no second admitted group or
completed receipt. No second operator capture was issued, and no restart,
force-stop, data clear, permission revoke/grant, storage bypass, fix or rebuild
was performed. Model invocation and raw JPEG existence are unverified.

Target-only diagnostics retained no concrete underlying exception or matching
target audit denial. All51 exact C4 source files were freshly rehashed unchanged.
Source/status support admission/storage failure before SDK capture, but the exact
OS call/errno remains unknown; a generic message is not a root-cause diagnosis.
See result-summary.json and the separate diagnostic proposal.

Founder requested a finish signal: a250ms vibration command returned0 but was
not clearly felt; an explicitly requested repeat with two500ms pulses/250ms gap
returned0 and founder confirmed "Yes—two vibrations." These were signal tests,
not capture-success signals. No app beep/audio was requested or played by these
commands, no DND override or settings change. Future cue means attempt finished;
success still requires the actual committed result.

## Founder storage question — read-only checks

Fresh phone df reports1,111,949,312bytes available (1.0356GiB), versus laptop
81,359,720,448bytes (75.7721GiB). The phone manufacturer storage monitor reports
WARNING, with OEM low threshold1,073,741,824bytes, and historical LOW/OK broadcasts
including LOW during installation and OK afterward. File-node state is FN_NORMAL;
df-i reports remaining nodes, not exhaustion. This is a pressured device, not a
claim of healthy free-space headroom.

The app's reserve26009600 +24MiB check requires51,175,424bytes (48.8047MiB),
well below the current shell-visible free bytes. That initial threshold alone
does not explain the generic error. Per-app usable space/quota, OS write failures
and SDK peak cache remain unmeasured; ENOSPC has not been observed. Storage
pressure is a plausible contributor, not a confirmed or ruled-out cause.
No data was removed, settings changed or additional photo attempted. See
space-question-summary.json and its raw phone receipts. A founder-controlled
increase in free space followed by the existing storage readiness check is a
smaller next discriminator than immediately modifying/rebuilding the app.

Physical geometry, JPEG/EXIF/crop/tensor/vector correspondence and durability are
unverified. Host first-render5000ms timeout remains unresolved. SDK cache/total
RAM hard bounds remain unproved. P2-03/G4 are not accepted; P2-04/05/06 remain held.
