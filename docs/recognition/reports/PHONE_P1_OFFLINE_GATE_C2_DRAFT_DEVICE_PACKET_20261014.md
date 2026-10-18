# P1 offline gate C2 DRAFT device packet

2026-10-14. NON-OPERATIONAL preparation only; no phone command/installation/
radio/UI/private action has been executed or newly authorized by this packet.
Coordinator must independently accept C2 source/APK/provenance first. C1 APK
remains rejected; accepted C4 archive and original installed/transferred receipts
remain intact. Current phone state is not inferred from host tests.

Candidate is C2 run/recognition-portability-release.apk,38,915,609 bytes,
SHA c7f04760381e7a3bedbff14084ec12b03c51229eb0e73660be0494a0d7afc48b.
Expected replay source cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d.
Accepted input131,901,810 bytes,
SHA059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e;
manifest a3c210af479959d3223b1fda2aa69b6060fe70b050e7e062b9a5bf8e58fefa8c.
Signer/package/version/SDK/arm64 and zero-platform-permission profile unchanged.
No stale original62890954... or rejectedC1426857f4... source acceptance bypass.

The coordinator-observed saved policy is exactly
`cell,bluetooth,uwb,wifi,wimax`; saved airplane1/Wi-Fi3/BT2 is eligible with that
coherent supported policy. Optional uwb is recognized, no UWB radio API added.
Unknown/duplicate-uwb/missing-required/malformed policy and enabled/transition/
read/time/busy/closed states refuse. The nfc/wimax fixture is synthetic, never
labelled the actual phone policy. Host-compiled success does not prove current
device eligibility, physical radios, Android lifecycle or private parity.

After independent acceptance and within existing approved LOW authority, verify
the exact candidate/input/source/device receipts. Later replace via -r only;
no uninstall/reset/data clearing. Keep the original transferred input; no
retransfer/reconstruction unless a concrete byte-identity failure is reviewed.
Do not touch consumed host launchers. Coordinator/human own device actions.

Before private work, explicitly confirm human airplane/radios/tether OFF and
read scoped actual state: Wi-Fi service disabled, Bluetooth STATE_OFF, cellular
POWER_OFF, no usable default network and no tether upstream. Saved mobile_data
is diagnostic preference only. Use `Check private offline gate` before a busy
operation; require strict eligible/coherent/modelCalls0/privateStateTouchedfalse.
Positive and negative diagnostic checks must create no private journal/store,
picker/decode/model/result/export or replay readiness. No automatic replay.
Unknown observation refuses; no repeated toggle workaround or policy write.

Only then follow the remaining original finite protocol: import, exactly one
80-attempt replay /20 queries per lane, restart/durable recovery and exactly one
numerical export/comparison, preserving scheduled denominators and failed status.
Replay bound1500s; import/export/drain observation bounds120s; existing per-frame
60s lateness accounting remains. Native/Binder calls are not forcibly preempted.

Host retains initial diagnostic/source/device binding and monitors CURRENT
saved/live state independently during private work. Do not call busy diagnostic
status repeatedly during replay. DRAFT read window<=3s, observation gaps<=5s,
session<=1500s. `phone-offline-gate-device-plan.py` validates generated/provided
observations without executing subprocess/ADB/UI and does not duplicate the
native policy parser. Twenty generated monitor/binding checks pass; no actual
host device monitor has been executed or accepted by this writer.

Any unknown/enabled/drifting/timeout/disconnect state: stop admission or request
native cancellation once, keep offline, observe owned drain within120s and preserve
artifacts. If drain/observation bounds cannot be confirmed, stop and return HIGH
for review; no reset/replay/export retry. Polling/vendor/OS/broker/power-failure
limits remain. This packet provides no atomic privacy/native interruption claim.

Comparator acceptance requires new C2 source, exact APK/input/manifest/model,
actual result SHA/bytes and unchanged numerical recipes. Preserve source-history
chain in DRAFT provenance supplement rather than rewriting accepted C4 records.
Physical privacy/lifecycle/parity/ranks/memory/latency/quality/UNKNOWN/holdout/
live recognition/M12/release gates remain separate and open.
