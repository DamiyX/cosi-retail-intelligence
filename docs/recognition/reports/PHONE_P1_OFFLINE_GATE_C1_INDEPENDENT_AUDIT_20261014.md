# P1 offline gate C1 independent audit

2026-10-14, Africa/Lagos. **CHANGES REQUIRED; candidate not accepted for install.**
Writer is stopped, lease NULL; source audit performed only after the handoff.
Same branch/HEAD. Read-only selected-device settings observation is authorized
diagnosis, not a phone test; no UI/radio/import/replay/install action occurred.

## Specification finding GC-01 — actual UWB policy still refused

High/blocking. Production `PhoneOfflineGate.policy()` recognizes cell/wifi/
bluetooth/nfc/wimax only. Actual phone read again returns airplane1/Wi-Fi3/BT2,
`airplane_mode_radios=cell,bluetooth,uwb,wifi,wimax`. UWB was present in the
coordinator's earlier live policy observation too. The test substitutes a policy
containing nfc and omitting uwb, so it never tests the full captured phone state.

Independent JDK17 compile of the actual production Java helper: original 49
checks pass; new regression using the exact selected-device four strings fails
with `POLICY_UNSUPPORTED`. A control removing only uwb passes. Failure occurs
before private work and reproduces the remaining blocker without installing the
APK, triggering a replay or changing source/settings. UWB is a recognized Android
radio token; Android SettingsProvider's default airplane list also contains it.

Required scoped correction: recognize known optional uwb while still requiring
cell/wifi/bluetooth and rejecting unknown/duplicate/malformed/missing policy,
enabled/override states, transitions/read errors and expired/closed/busy states.
Add actual full-policy regression through shared admission/cancellation/status;
do not loosen unknown-token rejection or change the phone's policy via ADB.

Primary corroboration:
[Android default airplane-radio policy](https://android.googlesource.com/platform/frameworks/base/+/83bad42dad3ff47d5bdf731102926622f1a4d66f%5E2..83bad42dad3ff47d5bdf731102926622f1a4d66f/),
[Android16 Settings radio definitions](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-16.0.0_r2/core/java/android/provider/Settings.java).
Exact vendor source is not claimed; selected-device observation and actual
compiled gate are direct evidence of this rejection.

## Standards finding GC-02 — repeated finalizer violated stopped workflow

Writer disclosed an overlapping second finalizer plus one later read-only shell
inspection. First finalizer stopped at 2026-10-14T00:11:46.316Z; second rewrote
two C1 metadata records then failed before workflow mutation. Handoff/result
prose predates this disclosure; preserve the direct-message supplement and tool
trace rather than rewriting historical reports.

Independent hashes match **all 2,331 frozen artifacts, 907 live source records
and 907 source snapshots**. Both rewritten records match the frozen bytes:

- source-provenance-supplement.json:
  `3387788c0c426dde77f6687ed01a83857d35949a34888b6b1bad2c078238d6ba`
- source-diffs.json:
  `58eb9d115a6cdb5f6e1fae01acf9be5e4752fbcd2c0b45de8a3569c007f6415a`

Thus no frozen-byte discrepancy was found; this does not excuse the protocol
deviation. Next finalizer must acquire a new exclusive single-invocation claim
and check valid lease/unfinished state before any write. Do not resubmit a yielded
finalizer across compaction. Consume its existing session output; if context is
uncertain stop with evidence instead of invoking it again. Validate refusal in
generated fixtures, not by repeating actual finalization. Stop/send handoff after
one completion; no extra commands after recognizing the stopped freeze.

## Evidence and practical limits

New coordinator run:
`apps/recognition-lab/runs/phone-experiment/p1-offline-gate-c1-independent-audit-20261014-a1`.
freeze-check.json, actual-policy.json, original-49-checks.json,
actual-policy-regression.json and policy-finding.json preserve checked outcomes.
APK SHA/size and accepted input SHA/size reverified; current workflow matches
stopped.raw/lease NULL. Direct source review covers both Kotlin guard calls,
no-store/no-model diagnostic, strict scalar validation, private-only UI and
non-operational device-plan helper. Those useful source changes are preserved.

Writer's 94,029 protected/3,034 controller/25,929 installed-input preservation,
mobile/build/manifest/asset/native self-checks were reviewed, not independently
rerun in full during this blocked audit. Actual APK is not installed/accepted;
full fresh build/physical acceptance follows the correction. No claim of complete
audit/atomic radio privacy/hardware quality from generated evidence.

Preserve C1 candidate SHA3499c006...f4900 and replay source426857f4...dabf as
rejected historical artifacts. Accepted C4 input remains131,901,810 bytes,
SHA059b6f93...2f92e; old installed build and original transferred file untouched.
Continue same writer/branch for C2 under prior founder correction approval;
new evidence context/source pin/APK, zero new permissions/model/input changes.
Coordinator stops while writer works, then independently audits stopped return.
