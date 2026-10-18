# P1 separate test executor — first bounded assignment

2026-10-15. Founder explicitly requested a separate Sol6.1 Low test agent so the
coordinator can handle P2 audit/corrections. This authorizes a bounded test executor,
not a second implementation writer. Parent: main coordinator. Existing Track B
writer owns only a separate document clarification; it may not touch P1 source,
phone/build/config or test evidence. One phone owner only.

First assignment is READ-ONLY DEVICE PREFLIGHT, followed by STOP/direct return.
Do not ask the founder to change radios and do not begin diagnostics/import/replay.
Those need fresh human readiness and the coordinator's next bounded continuation.

Checkout: C:/Users/doyew/Documents/DEV 2/COSI-m8-planning.
Current authoritative packet: PHONE_P1_OFFLINE_GATE_C2_FINITE_DEVICE_SUPPLEMENT_20261014.md,
with accepted C2 audit and PHONE_P2_PREPARATION_BRIEF_20261014.md installation checkpoint.
The original October13 runner has obsolete C1 APK constants and old human answers:
read it for selected-device/tools locations only; do NOT invoke its actions or import
it as executable code. C2 was already installed and the C4 input transferred.

Expected installed base.apk SHA256:
c7f04760381e7a3bedbff14084ec12b03c51229eb0e73660be0494a0d7afc48b.
Expected C4 input: /sdcard/Download/cosi-p1-private-portability-c4-20261014-a1.zip,
131901810 bytes, SHA256
059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e.
P1 current24-file replay-source pin:
cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d.
Selected Galaxy A15 SM-A156E/API36/arm64; private selection JSON/installed adb path
are named in the existing device-runner.py. Never print/persist the serial, SSID,
MAC, account/device identifiers or raw connectivity/telephony dumps.

## Allowed scope

- Read the approved packet/checkpoints and verify the24 current P1 files.
- Use existing ADB against ONLY the selected device to observe USB authorization,
  model/API/ABI, selected isolated package path/base.apk hash, exact C4 archive
  hash/size, and minimal radio settings if connected. No install/retransfer/reset.
- If no selected USB connection, stop with that concrete blocker. No wireless
  connection setup, service installation, dependency download or repair.
- Do not launch/force-stop/click the app, call its native gate, open a picker,
  screenshot/dump private UI, decode any photo, read unrelated phone files or run
  inference. Do not change radios, host networking or any app/source/config.
- Do not assume that being home proves independent laptop connectivity. Report
  that fresh founder confirmation is still required; leave the phone online.

Only write new receipts/helper/handoff under the NEW ignored root:
apps/recognition-lab/runs/phone-experiment/p1-private-portability-device-20261013-a1/
offline-gate-c2-replacement/parallel-preflight-20261015-a1.
No overwrites or writes elsewhere, including workflow/PROJECT_STATE/old evidence.
You are not alone in the checkout; preserve other work. Do not delegate further.

Use finite timeouts and retain command exit failures. No automatic retries,
fallbacks, tuning, native diagnosis or implementation at Low. Report command failures
as failures even if a later shell command succeeds. No unbounded service loops.

## Return and end condition

Return PASS only for observed preflight fields; pending USB/radio/human readiness
must stay pending. Create a sanitized preflight.json, exact command/exit summary
and handoff.md. Stop all commands/edits and return the absolute handoff path and hash,
checks/limitations and next manual step to the parent through the subagent return.
If blocked, return promptly instead of waiting for the founder. Do not mark P1
accepted, consume native status-check limits or begin the80-record replay. Parent
reviews and issues the next finite test assignment after human readiness.
