# P1 phone offline gate diagnosis

2026-10-14, Africa/Lagos. Read-only diagnosis completed; no code/APK change,
radio mutation, import, replay or model execution. Host C4 acceptance and the
existing install/transfer remain valid. Preserve the same private device run.

## Confirmed observations and mechanism

Scoped selected-device reads confirm airplane_mode_on=1, wifi_on=3,
bluetooth_on=2, mobile_data=1. Live service checks report Wi-Fi disabled,
Bluetooth enabled=false/state=OFF, active default network none, tether upstream
wanted=false/current upstream interfaces null. The user correctly described the
observed airplane-mode/offline state; nonzero saved values do not prove live
connectivity. These reads do not prove an atomic OS privacy barrier or fully
audit the cellular modem/vendor implementation.

`RecognitionExperimentModule.kt` lines 151–159 checks saved WIFI_ON==0 and
bluetooth_on==0 at admission and throughout replay. Current 3/2 therefore fail
before inference despite the live OFF observations. The device runner adds an
explicit mobile_data==0 requirement matching the reviewed manual procedure.
This is a confirmed mismatch between the current offline phone state and the
test's exact saved-settings predicate. No rejected replay was attempted.

Android primary source explains the saved Wi-Fi value 3 as disabled due to
airplane mode; its explicit user OFF handler writes zero. Bluetooth value 2
preserves the ON preference while airplane mode takes priority and forces OFF.
This strongly supports the observed airplane-mode transition mechanism. The
exact Samsung vendor source was not inspected; these are Android source
explanations corroborated by live state, not a vendor binary trace.

- [Android Wi-Fi settings store](https://android.googlesource.com/platform/packages/modules/Wifi/+/refs/heads/android15-release/service/java/com/android/server/wifi/WifiSettingsStore.java)
- [Android Bluetooth manager](https://android.googlesource.com/platform/packages/modules/Bluetooth/+/refs/heads/main/service/src/com/android/server/bluetooth/BluetoothManagerService.java)

Narrow evidence: `offline-gate-diagnosis.json` and its read-only capture script
under `p1-private-portability-device-20261013-a1`; stored observations omit raw
network dumps, device names, addresses, SSIDs and selected serial. Original
`offline-settings-blocked.json` and checkpoint remain preserved. Native source
SHA captured; admission and cancellation siblings both use the same predicate.

## Next safe action; no implementation

Candidate compatibility procedure for this unchanged build: founder temporarily
turns airplane mode OFF, explicitly turns mobile data/Wi-Fi/Bluetooth OFF, keeps
hotspot/tethering OFF, then turns airplane mode ON. Do not deliberately turn
Wi-Fi/Bluetooth/data back ON. Manual changes only; no private operation active.
Return main chat to LOW after setup and confirm ready. Recheck saved values AND
live service/network state before any private operation. This order is grounded
in source but not yet physically verified; do not mark the gate resolved until
actual observation passes. No reinstall/retransfer/replay retry is needed.

If saved flags still fail, stop at the same checkpoint for HIGH review. Do not
write settings via ADB, bypass/relax the native guard or begin decoding anyway.
A future robust actual-state gate would be a separate reviewed source/security
change with regression/native checks and a new exact APK; none is authorized
or implemented by this diagnosis. Remaining private import/replay/restart/
numerical export/comparison and phone parity/quality/timing gates remain open.

## Actual manual-order recheck

Founder returned “ready”; read-only recheck at 00:31 Lagos still reports saved
airplane1/Wi-Fi3/Bluetooth2/mobile_data1. Live Wi-Fi disabled/Bluetooth OFF/no
active default network remain true. Candidate manual order did not produce a
passing state; its effectiveness is unverified and must not be claimed. Preserve
`offline-settings-order-recheck.json` and original assertion traces. No import,
replay, new radio mutation, install or transfer occurred. Stop LOW execution and
return HIGH for gate review; no further toggle loop or predicate bypass.
