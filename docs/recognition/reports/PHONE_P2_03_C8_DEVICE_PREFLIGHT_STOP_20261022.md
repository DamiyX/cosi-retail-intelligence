# C8 fixed device execution — stopped at host transport preflight

2026-10-22, UTC20:46. Same Track B writer executing accepted coordinator packet
PHONE_P2_03_C8_ARTIFACT_REVIEW_AND_DEVICE_PACKET_20261022.md, fixed Low scope.
Founder remaining-test authorization retained; no new generic approval requested.

## Actual observations and first failure

Fresh ignored root p2-camera-geometry-c8-device-20261022-a1 was absent and created.
Packet SHA93216d54c474fd2d03dc4ab68ae28a27d03a134d44714d2c88ffe2cd6dc82c46,
APK fea1596df345e7aa75ca47dc7004bbe322370cbdbb20e43c53b5e3fbd1958f6c /
39944046bytes, all72 accepted current source inputs and source index
67b2e7bb9272e7a64a9380f18246d651dcdb3a12856b8b8964318821ccde0874
were freshly verified before any device command. Charter records active lease,
exact fixed job/target and ceilings. Host commands used login:false.

Only these three selected-serial, read-only ADB commands ran:

1. adb -s RZCX22H432K get-state: exit0, stdout device.
2. adb -s RZCX22H432K get-serialno: exit0, stdout RZCX22H432K.
3. adb -s RZCX22H432K get-devpath: exit0, stdout unknown.

Each receipt records wall and monotonic start/end and exact arguments. Task
execution helper device.py required the get-devpath result to contain usb;
that assertion failed before model/API/ABI/lock/package/storage/UI preflight.
The command succeeded but did not provide the USB evidence the helper expected.
This is a host preflight verification failure, not evidence of a camera/save/
export/storage-space failure or proof that the founder's physical USB cable is
absent. Device connection and expected serial are positively observed; USB-path
classification remains UNKNOWN. No alternative route or guard relaxation tried.

## Scope and preservation

ZERO install attempts, launches, UI taps, captures/inference, exports/transfers,
screenshots, private-file access, root/run-as, permission/radio changes, source/
build/dependency repair, Git mutation/push or CI actions. No browser/chart display
attempt. No phone mutation command. Existing APK/signer/UID/dataDir/current owning
state/slot availability were NOT reached and remain unverified this run.
No C8 slot was consumed by this writer; current slot state was not inspected.
No old camera evidence, C7 export, host run or frozen helper was overwritten.

The new operational helper and first failed guard remain intact. No repeated
preflight or retry at Low; no production correction. The initial three commands
are fully drained, with no admitted capture/export/native operation to cancel.

## Stopped return

Writer stops all commands/edits and releases the lease at writer-stopped.json.
Coordinator High should review this concrete host USB-evidence guard and specify
the permitted fixed continuation or correction. Do not rerun the three receipt
names or recreate this root; preserve failure and remaining one-update/one-capture/
one-export ceilings. No inference about transport should be hidden as a pass.

Physical support/framing/display-mm readiness has not been requested yet because
PhaseA stopped before update. No capture is allowed without that later actual
human answer and chart-only framing confirmation. Precise geometry remains
INCONCLUSIVE; P2-03/G4/later held. GitHubCI deferral remains unchanged.
