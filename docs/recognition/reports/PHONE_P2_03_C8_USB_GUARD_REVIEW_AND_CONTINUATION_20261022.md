# C8 host USB guard correction and fixed continuation

2026-10-22. Coordinator High diagnosis/host-helper correction. No app source,
APK, model, permission, radio, capture/save/export behavior changed.

## Confirmed mechanism and scope

Stopped device-a1 helper asserted that selected-serial get-devpath contained
the string usb. Actual command succeeded with unknown. Device-path output was
mistakenly used as a mandatory transport classifier. The failure therefore
occurred before update or camera execution; it does not demonstrate a cable,
capture, save or storage failure. Preserve the original helper/three receipts/
STOP and report PHONE_P2_03_C8_DEVICE_PREFLIGHT_STOP_20261022.md without rewriting.
Its redundant false noAdmittedOperationOrUnknownDrain field is not evidence of
an active native job: the actual three commands were read-only and drained.

Fresh main evidence:
apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-usb-review-20261022-a1/.
All9 stopped evidence entries and STOP hash verified. Cached adb help explicitly
documents -d as use USB device/error if multiple connected. Main then observed
adb -d get-state => exit0/device and adb -d get-serialno => exit0/RZCX22H432K.
Commands/exit/stdout/stderr/wall/monotonic timestamps retained. This establishes
current USB selection/identity; it does not establish future connection or app
readiness. No adbd restart, server mode, radio change or camera operation occurred.

Prepared host helper device-c8-usb-a2.py in that review root, SHA256
f686d0dab59f525383ede2a83c0b4ee57f9485d676f70e1c85b8fef433bd2167.
Only changes from frozen device-a1: command runner supports explicit USB-only -d;
preflight replaces the path-substring assertion with ready USB-only state and
exact expected USB-only serial, recording proof. All other preflight/lease/
command failure/timeout/package/UI logic preserved. No production-app edit.

Eight generated regression cases pass with actual runner argument inspection:
expected device accepted; different USB serial, unknown serial, offline,
unauthorized, ambiguous USB command error, serial error and timeout all refuse.
Refusal is retained before later operations; no failed case writes transport
proof. Compilation passes; original helper hash unchanged. This is a small host
verification correction with generated negative evidence, not physical-camera
acceptance. No claim about why this Windows ADB returns unknown is needed.

## Bounded continuation

Same Track B writer, Sol6.1Low, fresh finite six-hour lease, same task/branch.
Existing founder remaining-test approval and exact APK acceptance still apply.
Follow PHONE_P2_03_C8_ARTIFACT_REVIEW_AND_DEVICE_PACKET_20261022.md unchanged except:

1. Use NEW absent root
   apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-device-20261022-a2/.
   Preserve a1 completely. Copy the exact reviewed helper above to a2/device.py;
   bind hash and new charter to fresh lease. Do not run the stopped a1 helper or
   rebind its charter. Use exact reviewed code; no Low repair or extra fallback.
2. Fresh read-only preflight uses -d USB-only state/exact serial instead of
   get-devpath substring. Device changes/errors/multiple USB devices stop. Keep
   the remaining model/API/ABI/unlocked/package/idle/free-space checks; do not
   turn a verified transport into permission to skip another check.
3. All update/capture/export ceilings remain ONE, with ZERO used in a1. No other
   test or retry authority is added. Current C7 install and idle/slot/accounting
   remain unverified until live checks. No generic approval loop is necessary.
4. Before any capture require actual founder supported-phone/stationary-chart,
   whole-eight-marker framing and measured display-mm response. No screenshot
   of a non-chart scene or capture from a stale readiness/connection claim.
5. First failure stops. STOP/release/direct handoff after bounded execution;
   High coordinator audits afterwards. No concurrent coordinator mutation or
   polling. Geometry/P2-03/G4/later gates remain pending; GitHubCI deferred.

Rollback is selection of no new helper/no further execution; never modify
historical receipts, clear a one-shot slot, reinstall an old APK or erase data.
