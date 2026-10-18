# P1 private offline gate review and proposed correction

2026-10-14, Africa/Lagos. **CHANGES REQUIRED; review only.** No source/APK,
permission, radio, input, model or device-operation change applied. The current
failed predicate prevents the private experiment; no private replay was started.
Host C4 recovery and the exact accepted/transferred archive remain valid.

Read PHONE_P1_OFFLINE_GATE_DIAGNOSIS_20261014.md, its actual recheck, original
finite execution packet and PRIVATE DEVICE CHECKPOINT together. Review covers
private admission, cancellation, manifest privileges, host admission utility,
source provenance and safe continuation. Core retail/scanner/live recognition,
generated export race and unrelated dirty files are excluded.

## Findings

**Specification: high, blocking false rejection.** The Kotlin admission at
RecognitionExperimentModule.kt:151 and repeated cancellation at :157 require
saved WIFI_ON=0 and bluetooth_on=0. Actual saved values are 3/2 in airplane mode;
the reviewed live reads show Wi-Fi disabled, Bluetooth OFF, no default network
and no tethering upstream. Additional read-only telephony service dump contains
four voice service POWER_OFF markers; no raw telephony data was retained. Android
source defines Wi-Fi3 as disabled by airplane mode, Bluetooth2 as remembered ON
with airplane mode taking precedence. Native predicate demonstrably rejects
the observed OFF state. The attempted manual-order candidate left saved values
unchanged; do not ask the founder to repeat that workaround.

**Standards: boundary change needs review and evidence.** A repair must preserve
fail-closed private admission and repeated cancellation before decoding/model
work. A host-only bypass would still fail native admission and is not acceptable.
Unknown readings, missing policy or enabled/override state must refuse. A saved
flag is not independent live hardware proof; retain founder confirmation and
scoped live USB radio/network/tethering evidence with documented polling/OS limits.
The current APK has no Android platform permissions, including INTERNET. Do not
broaden permissions or add hidden APIs to unblock this particular experiment.

**Provenance: medium, mandatory correction companion.** The Kotlin module is
included in the 23-file canonical replay source fingerprint. Any actual change
requires a new truthful source manifest/embedded source SHA and replacement APK
binding. Do not reuse the old 62890954... output source pin for changed code.
Archive metadata is comparison.json/annotations.json/bundle.json; it does not
contain that replay source manifest. The exact input archive/manifest can remain
unchanged if image, tensor, gallery and numerical algorithms remain unchanged.
Preserve the old live/frozen C1/C2/C3/C4 bindings as historical evidence; no rerun
of those consumed controllers after source changes.

## Recommended bounded correction, pending implementation approval

Use a single tested Android saved-policy interpretation in both native admission
and cancellation. Require airplane=1, supported policy includes cell/Wi-Fi/
Bluetooth, Wi-Fi only 0 or 3, Bluetooth only 0 or 2. Reject missing/unknown values,
airplane OFF, Wi-Fi1 or2, Bluetooth1 and unsupported policy. Values 3/2 are only
eligible in that airplane-mode/policy context, never an unconditional whitelist.
Missing/exceptional reads fail closed. This is a policy predicate, not a claim
that saved flags alone prove live hardware isolation.

Keep explicit human offline confirmation and scoped live checks: disabled Wi-Fi,
Bluetooth service STATE_OFF, airplane enabled/cellular POWER_OFF, no active
default network/tethering upstream. Record mobile-data saved preference as
diagnostic; its observed 1 with airplane ON must not be called a live data
connection. The approved requirement remains actual cellular/network OFF.
Update the host utility/procedure to the same interpretation, with evidence
before replay and monitored state during execution; unknown/drift stops work.
No ADB settings writes, global toggles or test replays to probe the gate.

Provide a bounded non-inference guard status check so hardware positive/negative
admission can be verified before the first private replay. Error text should
identify airplane/policy/radio/unknown-state refusal rather than a generic failed
recognition message. Keep cancellation/busy/request ownership and the one-batch
80-inference/20-query constraints unchanged. Do not silently fix generated mode.

Likely source scope: one narrow pure gate helper and tests, Kotlin private
admission/cancellation/status binding, private-only status UI/adapter validation
if needed, source-pin generation/build checks and a new device utility/procedure
supplement. No schema, dependency, framework, recognition-service contract,
numerical recipe/ranking/model changes. No INTERNET/camera/gallery/location/
Bluetooth-connect permission additions. Require exact approved file charter
before the sequential sole writer begins; stop with a direct handoff afterward.

## Validation required for acceptance

Real shared predicate failure-before/pass-after for captured 1/3/2; standard
1/0/0 remains eligible. Negative and cross-boundary cases cover airplane OFF,
Wi-Fi ON/airplane override, Bluetooth ON, unknown/missing/malformed/policy
exclusion/reader error, changes between snapshots and cancellation using the
same rule. App binding tests must prove no private store/decode/model start on
refusal; non-inference guard check must not reserve a replay or clear evidence.
Do not weaken tests, assertion limits or admission to obtain success.

Independent stopped-source review, focused existing private lifecycle tests,
one exact local Android build/signature/manifest/assets/native payload check and
truthful source fingerprint are required. Preserve all old APKs/evidence and
model/JPEG/tensor/box/baseline hashes. Installing the new candidate is a separate
LOW step after independent audit, using -r with no reset/uninstall; existing
transferred input may be reused after scoped hash/size verification. Physical
non-inference positive/negative guard checks need their own finite approved
manual procedure; the 80-inference experiment must not become a guard probe.

Hardware source semantics may differ by vendor, transitions have races, public
Bluetooth state APIs can mask LE-only state, and OS/broker/power failure remains
unproven. No universal/offline privacy guarantee is created by the correction.
An actual-state API design would be separate scope: WifiServiceImpl's state
read enforces ACCESS_WIFI_STATE; some public Bluetooth state calls report internal
LE-only states as OFF. Do not assume those APIs are permission-free full-radio
oracles or broaden permissions automatically.

## Primary evidence and next action

- [Android Wi-Fi saved-state semantics](https://android.googlesource.com/platform/packages/modules/Wifi/+/refs/heads/android15-release/service/java/com/android/server/wifi/WifiSettingsStore.java)
- [Android Bluetooth airplane policy and enable transition](https://android.googlesource.com/platform/packages/modules/Bluetooth/+/refs/heads/main/service/src/com/android/server/bluetooth/BluetoothManagerService.java)
- [Android16 Wi-Fi service read permission](https://android.googlesource.com/platform/packages/modules/Wifi/+/refs/heads/android16-release/service/java/com/android/server/wifi/WifiServiceImpl.java)
- [Bluetooth public state/LE mapping](https://android.googlesource.com/platform/packages/modules/Bluetooth/+/refs/heads/main/framework/java/android/bluetooth/BluetoothAdapter.java)

Live observations are in the existing diagnosis/recheck records and coordinator
read-only traces; Android source corroborates semantics, not exact vendor source.
No patched predicate, APK or negative hardware check has yet executed. Founder
approval of this gate change precedes implementation, per AGENTS.md section10
security-boundary review rule. Then sole writer Sol6.1 HIGH -> stopped direct
handoff -> coordinator independent HIGH audit -> finite LOW device validation.
Keep phone as-is until new manual instructions; import/replay remains held.
