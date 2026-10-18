# P1 generated device execution packet

Prepared2026-10-12; **NOT EXECUTED. Physical installation/launch and generated
model execution require founder authorization for this packet.** Existing download
and local-build continuation remains valid; no repeated build approval is needed.
The build charter deliberately stopped before physical-phone execution.

## Purpose and exact boundary

Check whether the same recognition engine runs on the founder's Galaxy A15 and
produces equivalent numerical outputs for three known generated inputs. No new
product photos, cropping, label typing, enrollment, camera, accounts, internet
service or business transactions are involved. This app is a separate internal
test installation. It does not yet scan products or produce product suggestions.

Accepted APK:
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning/apps/recognition-lab/runs/phone-experiment/p1-native-build-c1-20261012-a1/recognition-generated-c1-release.apk`

APK SHA256 `3227a851d3825f5362728239710fc6a5090a8e3df838b436cd1ed98da45ff630`;
certificate `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`;
package `com.damiyx.retailintelligence.recognitionverification`,version0.0.1/code1,
arm64,minAndroid24,target36. Model SHA256
`bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.
Source fingerprint and static acceptance are in
`PHONE_P1_NATIVE_BUILD_C1_INDEPENDENT_REVIEW_20261012.md`.

Only existing task-local platform-tools37.0.1 may operate the selected device.
Resolve one USB device and bind its serial locally; do not publish device serial
as project memory. Verify A15 model/Android/arm64 before installation. If another
device, conflicting installation/signer, unavailable USB authorization or prior
data is encountered, STOP and report; no automatic uninstall, data clearing,
security-setting bypass or tool/runtime replacement. Verify absence of a prior
package and prefer fresh `adb -s <selected-device> install <exact-apk>` without
replacement flags. Read and operate only the experiment package. User controls
USB debugging confirmation and any WiFi/airplane-mode settings.

## Founder steps

1. Connect the Galaxy A15 to the laptop using a USB data cable. Unlock it and
   approve the USB debugging prompt if already configured. Tell the coordinator
   to install and run this generated test packet. If debugging is not configured,
   the coordinator will explain the exact setup before any setting change.
2. The coordinator checks the package and installs **Recognition Generated Probe**.
   Open that test app when instructed. Expect “Generated runtime probes” with
   THREE buttons: **Run zero**, **Run gray128**, **Run gradient**. No photo folder
   or browser page is needed.
3. Run only the next named button after the coordinator records the previous
   result. Wait for “Probe completed; parity remains unverified.” If an error or
   crash occurs, report it and stop; no repeated attempts until it happens to pass.
4. Help copy the selectable **Raw vector** text if Android UI extraction cannot
   capture it completely. The coordinator validates all1024 values, model/input
   hashes, timings and norm. A cropped screenshot is a smoke-check aid only.

Coordinator performs the calculations and report. The founder does not interpret
vector numbers or compare results manually.

## Execution and evidence limits

Create NEW ignored `runs/phone-experiment/p1-generated-device-20261012-a1` only
after approval. Preserve old builds/evidence. Record exact APK/model/input hashes,
tool/runtime versions, device/OS/RAM, commands/exits, run order, failures and
bounded experiment-only evidence. Never clear device-wide logs or read unrelated
apps/photos/clipboard. UI result extraction, if used, is limited to this app;
reject truncated/missing vectors instead of inventing values or calling a pass.
No automatic model inference on mount. No arbitrary diagnostic receiver/logging
feature or new dependency is added by this packet.

Inputs are immutable bundled224x224x3 float32 tensors,602112 bytes each:

| ID | Tensor SHA256 |
| --- | --- |
| zero | ad8c5f4d30e45b2a50f7f4d1f347f64d613c6fbcd92c54ca746ab077f402d8cc |
| gray128 | 9f431255f59af2eddd112f42c666dff575d46dc45ab4da29e0e31c9085a54ab7 |
| gradient | cbdae93c587d46d692e49931bdba89acc6a1f0ac606829fc544a08decae6a178 |

Approve at most THREE laptop reference inferences using the existing offline lab
interpreter/one thread/no default delegates, and NINE phone inferences: for each
fixture one process-cold launch/run then two repeats without a restart. Each
invocation currently creates/closes its Interpreter, so repeats are process-warm,
not persistent-interpreter benchmarks. No host reboot/cache clearing. Retain raw
outputs and all failures. A30s observation ceiling per phone operation means stop
and report a hang; it is not proof of native interruption or cancellation.

The laptop inputs must be the exact bundled tensors, not JPEG reconstructions.
Inventory installed laptop interpreter version and hash its reviewed artifacts
before execution; use the accepted CPU configuration from exploratory producer.
No new download, model or delegates. Save full1024 raw components/hash/timing/norm
for all three references. Compare each complete phone vector using accepted
`phoneExperimentProbes.ts` thresholds `runtime-normalized-v1`:
maximum normalized-component absolute error<=1e-4 AND cosine distance<=1e-5;
also report raw maximum and mean absolute differences. Do not relax thresholds
after seeing results. A failure does not remove a run from the denominator.

Before installation, verify the exact APK hash. After installation, bind installed
package/version/signature to this artifact using scoped package facts. Verify the
initial no-inference state. Freeze full outputs before switching buttons. App has
no INTERNET permission; any separate physical network-state claim needs observed
device evidence, not the laptop build log. No network setting is changed silently.

Two separate conclusions: (1) all9 planned operations completed/failed explicitly,
with finite nonzero1024 outputs and expected hashes; (2) complete observed vectors
meet declared numerical tolerance against the frozen laptop references. If full
output capture fails, only the runtime smoke result can be reported, parity OPEN.
No private-image or image-preprocessing conclusion follows from these tensors.

If this passes, the next implementation slice is Android image/ROI preprocessing
equivalence, then separately authorized existing40-image portability without
redrawing, followed by the planned live phone/multiple-reference/multiple-frame
comparison. No new photos are requested in this first phone packet. Recognition
quality, end-to-end scanning speed, memory/thermal/installed-size budgets, formal
UNKNOWN/calibration/holdout and production integration remain separate gates.
