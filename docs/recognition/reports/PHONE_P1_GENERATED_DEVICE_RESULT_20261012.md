# P1 generated runtime phone results

2026-10-12 Africa/Lagos. Founder authorized: “phone connected; Install and run
the generated tests.” Main coordinator executed the exact reviewed
`PHONE_P1_GENERATED_DEVICE_PACKET_20261012.md`. No implementation agent was
dispatched. Original writer remains stopped.

**Result: all NINE planned phone inferences completed and passed the frozen
numerical tolerance against THREE executed laptop reference vectors.** This
validates generated-input runtime/linkage and numerical parity on the selected
Galaxy A15, not product recognition, image preprocessing or live scanning.

## Device, installation and inputs

- Samsung Galaxy A15 5G,SM-A156E; Android16/API36,arm64-v8a; reported RAM
 3,637,808KiB. Serial stays in task-local temporary selection state, not project
  memory or this report.
- Fresh separate package
  `com.damiyx.retailintelligence.recognitionverification`,version0.0.1/code1.
  Initial package absence verified. No other app was installed, opened or queried.
- Actual installed base.apk SHA256 matches the audited signed artifact exactly:
  `3227a851d3825f5362728239710fc6a5090a8e3df838b436cd1ed98da45ff630`.
  This binds the installed package to the already verified internal certificate,
  manifest, model and assets. Model SHA256
  `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.
- Only zero/gray128/gradient float32 tensors from the immutable P0/accepted APK
  were used. No image decode, private photos or JPEG reconstruction. Hashes,
  tensor signature and full1024-component outputs checked for every trial.
- Existing laptop ai-edge-litert2.2.0/Python3.12.14,one thread,
  BUILTIN_WITHOUT_DEFAULT_DELEGATES; reviewed runtime files hashed before execution.
  Phone retains the audited application-only LiteRT2.2.0/one-thread/XNNPACK-off
  configuration. No tool/runtime/model change, GPU/NNAPI delegate or download.

NEW evidence root:
`apps/recognition-lab/runs/phone-experiment/p1-generated-device-20261012-a1`.
Contains installation/package/hash/launch receipts, scoped app UI records, full
reference and phone vectors, attempt markers, runtime inventory, execution scripts,
canonical comparison and final inventory. UI extraction saves only this app's
nodes; no screenshots, unrelated apps/photos/clipboard or device serial are saved.

## Observations and comparison

Initial app launch showed “No device inference recorded.” No inference ran on
mount. For each of the three fixtures, one process-cold run and TWO repeats were
executed. Gray/gradient use an explicitly stopped/restarted experiment process;
initial and subsequent cold launch receipts report COLD. Repeats are process-warm
but each creates/closes its Interpreter. No persistent-interpreter speed claim.

UiAutomator captured complete selectable Raw vector text automatically, without
manual transcription, screenshots of partial values or additional inference.
All vectors have1024 finite components and positive norm. Displayed model/tensor
hashes match laptop references; displayed rounded norms match recomputed norms.
Every output was frozen before the next fixture/button invocation.

The actual unchanged `compareRuntimeVectors`/`runtime-normalized-v1` comparator
was executed over all NINE pairs. It agrees with independently calculated Python
values within1e-14. Its `nativeValidated:false`/`imagePipelineValidated:false`
flags remain untouched: helper output alone is not a hardware acceptance claim;
observed complete device vectors supply the generated-runtime evidence here.

| Fixture | Phone trials passed | Worst normalized component error | Worst cosine distance |
| --- | --- | --- | --- |
| zero | 3/3 | 6.81149e-7 | 9.36173e-12 |
| gray128 | 3/3 | 5.14582e-6 | 3.76038e-10 |
| gradient | 3/3 | 1.90191e-7 | 8.83293e-13 |

Frozen limits: maximum normalized component error<=1e-4 AND cosine distance<=1e-5.
Worst observed values5.14582e-6 and3.76038e-10 pass. Raw maximum/mean differences
are retained per trial. No tolerance adjustment, failure removal or extra run.

## Limited timing observations

| Fixture | Inference ms, cold/repeat/repeat | Native total ms, cold/repeat/repeat |
| --- | --- | --- |
| zero | 39.38 /12.93 /12.77 | 272.76 /71.31 /66.46 |
| gray128 | 15.98 /12.92 /12.59 | 177.56 /69.65 /66.00 |
| gradient | 11.14 /12.69 /12.66 | 116.97 /78.15 /70.40 |

Engine range11.14–39.38ms,median12.77ms. Native probe total66–272.76ms,
median71.31ms. Values are UI-rounded to0.01ms. Native total includes asset read/
hashing/model load/Interpreter/invoke/output construction; it excludes JS bridge/
UI interaction/display, camera, preprocessing, retrieval and product suggestion.
UiAutomator interaction time is not inference latency. Nine generated trials do
not satisfy the existing timing-group minimum or establish sustained/p95 phone
budget acceptance; descriptive quantiles in JSON must not be read as that gate.

## Preserved setup diagnostics

USB was initially unauthorized; founder approved the system prompt. No debugging
setting/security restriction was bypassed. A preflight assertion initially expected
adb's model display `SM_A156E`; direct getprop showed canonical `SM-A156E`.
Corrected only the diagnostic assertion before installation or phone inference.

Fresh adb install exceeded the packet's30s observation ceiling. Host subprocess
terminated; no automatic reinstall/replacement/uninstall/data clearing occurred.
Read-only package/path checks then found the installation complete. On-device
SHA256 of its base.apk exactly matched the signed source APK, and scoped package
facts verified version. This resolved completion uncertainty without erasing the
initial timeout. All NINE authorized phone inferences subsequently passed; no
inference failure, crash, timeout or excluded attempt was observed.

## Boundary and next action

Generated runtime/JNI linkage and numerical equivalence are VERIFIED FOR THIS
DEVICE/INPUT SCOPE. No private photographs were processed or uploaded; no internet
service/cloud/EAS/account/Git/business effect. No network setting was changed.
The installed audited app lacks INTERNET permission; a physical radio-off/restart
test was not performed and is not claimed.

Next implementation slice: Android image/ROI/orientation/resize preprocessing
and generated image equivalence, separately from the now-verified runtime. Then
the exact existing40-image portability test can reuse saved annotations without
redrawing, followed by planned live capture and two/four-reference/one/three-frame
comparisons. No new product photos are needed for this completed packet.

Image pipeline, real-product phone accuracy, full scanning latency, memory/thermal/
installed incremental size, ordinary-app native regression, legal/model adoption,
formal independent dataset/UNKNOWN/calibration/holdout and M12 remain OPEN.
Historical manual17/20 first-choice,20/20 top-three result remains unchanged.
