# Actual manual a2 failure: waiting-state defect

2026-10-10. Founder supplied final controller screenshot. Coordinator read actual
attempt records and reproduced the source failure using current connected state.

**a2 is consumed and must not be reopened or cleared. E05 NOT RUN.**
This supersedes a2 readiness as a launch option; prior source review remains
historical evidence with the newly discovered waiting-state coverage gap.

## Actual facts

Root: `C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a2-corrected-20261010`.
Run: `offline-manual-20261010-a2`.
Source SHA: `485905beec51e8dfbb2257b23d760ab476bb4fcc6b13c635c7a95aec2572b604`.

Connected preflight passed. Helper readiness/ARM and OFF prompt were recorded.
OFF prompt: 08:11:10.6845223 UTC; WAIT_OFF failure:
08:11:11.8384560 UTC, about 1.154 seconds later.
Failure: `OTHER_USABLE_IP_INTERFACE`; private exit null. No offline-observed
marker, private producer/evaluator log or output exists. No private inference
started. Forty approved photo hashes match.

Stop receipt binds this exact session/nonce/helper and recovery phase, with
one connected-preflight child job created/drained and zero active
children. ON prompt followed confirmed-empty proof. Result reports original
WLAN/route present; current read-only connected binding also passes. Actual
controller/helper PIDs 15532/30080 are absent. This supports stopped child
lifetime/recovery for the failed preflight-only attempt, not native OFF/privacy
or recognition success.

External `cosi-exploratory-manual-a2-coordinator-20261010\a2-actual-failure-review`
retains exclusive failure/package/publication/Desktop digests and read-only
diagnosis. Current-network detail stays private outside repository. No network
setting/toggle/service/private pixels occurred in the coordinator investigation.

## Confirmed mechanism and limits

`Support-ReadOnly.ps1` `Assert-NetworkState` excludes the bound WLAN from allowed
connected IP indices for Offline=true, then checks connected interfaces BEFORE
checking that WLAN is disconnected. An ordinary still-connected bound Wi-Fi
therefore throws `OTHER_USABLE_IP_INTERFACE`. Main `Wait-ManualOffline` catches
only its enumerated transition errors; this symbol is fatal. It calls the full
offline check immediately after requesting OFF, while the user may still be
reading the prompt. It can exit instead of waiting the intended 180 seconds.

Fresh actual connected snapshot passes the connected predicate. Connected IP
indices outside the offline allowed set consist solely of the bound WLAN index
18. Replaying that snapshot through the actual predicate and WAIT_OFF source
reproduces fatal `OTHER_USABLE_IP_INTERFACE` in 0.147 seconds. Only session/native
boundary inputs were substituted for orchestration; no real OFF/ON occurred.
Thus this source mechanism is **confirmed** and **strongly supports** the actual
failure. Original diagnostic captured only the symbol, not its offending index;
we cannot claim historical exact-interface capture or rule out an unrecorded
transition. The saved error alone does not establish an extra external uplink.

The earlier 63 CF-focused tests passed but mocked native state in helper paths
and did not cover the real connected-wait transition. Passing those checks did
not justify a claim that manual OFF compatibility had passed; it remained pending.
This is an implementation/coverage defect, not a reason to weaken the privacy
predicate or change laptop networking settings.

## WA-01 scoped correction

Same Sol6.1 HIGH writer, sequentially; new external
`cosi-exploratory-manual-a3-20261010`, new future run ID
`offline-manual-20261010-a3`. Preserve consumed a1/a2 records, authorizations,
frozen handoffs, source, tests, reports, Desktop files and failed probes. No a3
approval/publication/attempt/private execution by writer.

Explicit narrow source exception: main `Wait-ManualOffline` and a necessary
local waiting-classification helper may change, plus fixed new root/ID. Preserve
`Support-ReadOnly.ps1`, full offline/network predicate, native query, actual
private guard and private arguments/limits. Do NOT blanket-add the OTHER symbol
to the retry list or ignore other connected interfaces. A waiting phase may
recognize only the expected bound WLAN still connected/transitioning under
reviewed identity/state checks, without granting pixel execution. Full original
offline predicate AND actual software-radio OFF must pass before returning.
Any genuinely additional usable uplink, changed identity/unknown state or
subsequent connection during private work remains a rejection. Keep finite
180-second waiting, session/cancel/deadline and current drained recovery guards.

Require failing-before/passing-after differential coverage against exact old
and new sources: valid connected wait; bound-WLAN IP lag/transition; actual
mocked offline-plus-radio-OFF acceptance; truly additional connected uplink;
radio ON despite disconnected association; malformed/changed identity;
no manual OFF timeout; cancellation/deadline; no private entry while waiting;
and strict later live guard still rejecting any reconnection. Tests use explicit
generated network fixtures, not claims of actual native OFF. Retain failed old
expectations and positive controls. Independently audit STOPPED return before
new exact publication; no automatic run or retry.

No profile/autoconfig/firewall/adapter/global settings, downloads/dependencies/
services/elevation/phone/hosted/Git/model/recipe/recognition strategy/M12 change.
Source/runtime/setup and actual manual/native/photo gates remain distinct.
Founder keeps Wi-Fi ON and does not open consumed a1/a2 launchers.
