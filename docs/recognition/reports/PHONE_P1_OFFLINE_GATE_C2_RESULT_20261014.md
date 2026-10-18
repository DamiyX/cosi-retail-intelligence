# P1 offline gate C2 correction result

2026-10-14, Africa/Lagos. Scoped source/build self-checks pass. Independent
coordinator audit and physical execution remain pending; candidate is not yet
accepted for installation. D-053 and C2_CORRECTIONS define this narrow scope.

## GC-01 actual full policy

The unchanged C1 production helper passes its original 49 checks but refuses
the exact coordinator-observed strings airplane1/Wi-Fi3/Bluetooth2 and
`cell,bluetooth,uwb,wifi,wimax` with POLICY_UNSUPPORTED. Writer reproduced and
retained that failure before editing. No phone observation/settings action was
performed by the writer. C1's nfc/wimax fixture is now explicitly labelled
synthetic; its original assertions remain, alongside the actual full policy.

The only gate behavior change recognizes known optional `uwb`. Mandatory
cell/wifi/bluetooth and unknown/duplicate/malformed/missing/read/timeout/
transition/enabled/airplane/busy/closed refusals remain. No radio API or
permission was added. The Kotlin admission, worker and cancellation bindings,
no-store/no-model status API, strict adapter and private-only UI are unchanged.
Eligibility does not start replay. Saved flags remain distinct from live proof.

Actual production gate passes 108 assertions, retaining all original 49,
covering full-policy and standard supported combinations through evaluate,
reader/check and status, plus duplicate-uwb/unknown-extra/missing-required/
malformed-policy and cancellation drift negatives. The separate exact full
phone-policy regression passes. Both tests also run successfully against the
actual release-compiled production classes, with class hashes retained. This
is host execution of the pure compiled helper, not Android Binder execution.

## GC-02 exclusive finalization

New `phone-offline-gate-finalization.py` checks run/unfinished state, assigned
holder/state and valid lease before writing, rereads workflow, then atomically
claims with O_EXCL. Claim is never cleared/reused, including on later failure.
Generated disjoint fixtures pass 15 checks: valid acquisition, lease/state/
finished refusals, repeat refusal with byte/mtime preservation, and simultaneous
competition yielding exactly one acquire/one refusal without existing writes.
No actual finalizer repetition is used as a test.

Actual finalizer is invoked once; any yielded session is consumed, never
resubmitted. Successful completion freezes evidence and makes workflow stop its
last filesystem write. Actual command/result trace, exclusive claim and frozen
inventory are authoritative; no post-stop filesystem delivery record is written.
C1's overlapping-finalizer disclosure and all historical artifacts are preserved.
Coordinator's C1 audit verified all 2331 artifact/907 source and snapshot hashes,
including the two overwritten records; this correction does not rewrite them.

## Evidence actually checked

- Full actual-policy failure before / pass after, 108 gate assertions and the
  actual release-class repetition described above; shared Kotlin check/status
  bytecode binding and no private-state touches in compiled status confirmed.
- Four unchanged affected mobile suites: 12 cases pass, 23.113 s. Strict status,
  busy ownership, malformed evidence, UI readiness/no automatic replay remain.
- Mobile typecheck and affected zero-warning lint pass; ordinary config and
  isolated module/import boundaries pass.
- Original 20 packet/geometry checks, 16 expected negatives, 256 geometry
  comparisons/14,888,235 assertions; 27 generated host-emulated store checks;
  37 actual request-state checks and retained old-semantic expected failure.
- 15 generated exclusive-claim checks and 20 non-operational device-plan checks.
- ONE offline signed release build: exit0, 2m57s. Existing installed cache/signer,
  no dependency/download/service change, no lock rewriting or build retry.
- Actual APK alignment/signature/package/version/min24/target36/arm64, zero
  Android platform permissions, 104 exact assets (41+63), 15 exact native
  libraries/23,477,048 bytes, six dependency graphs/full artifact hashes, 44 JNI
  names and seven isolated app files/new source pin verified. Existing app-owned
  receiver permission declarations remain; no platform permission was introduced.
- 17 accepted generated helper class binaries remain exact. 137 meaningful
  pre-build snapshots retained; seven generated build deltas enumerated.

An initial inline pre-build review read a UTF-8 Jest log using Windows cp1252
and exited before any build invocation. Trace and `prebuild-failure-a1.log`
are retained; explicit UTF-8 fixes that setup without changing assertions,
timeouts or production code. There were no C2 test failures or build retries.
Existing Gradle deprecation/NO_COLOR warnings remain in build logs.

## Exact candidate and preservation

APK 38,915,609 bytes, SHA256
`c7f04760381e7a3bedbff14084ec12b03c51229eb0e73660be0494a0d7afc48b`;
signer `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`.
Canonical 24-file replay source
`cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d`.
Only PhoneOfflineGate.java changes in that manifest compared with rejected C1.
Comparator must require this new source; old 62890954.../426857f4... bindings
remain historical, not substituted to accept changed output.

Accepted C4 input remains 131,901,810 bytes, SHA256
`059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e`;
manifest `a3c210af479959d3223b1fda2aa69b6060fe70b050e7e062b9a5bf8e58fefa8c`.
Draft provenance supplement links original accepted-input source, rejected C1
and new C2; no consumed binding/archive/model/recipe/image/rank change.

Run only `apps/recognition-lab/runs/phone-experiment/p1-portability-audit-offline-gate-c2-20261014-a1`.
Baseline 909 source /96,384 protected /3034 external-controller /25,929 installed
input records. Final source913; three existing Java source changes and six owned
utility changes, one new claim utility and three reports. Kotlin/adapter/UI/mobile
tests and all other source are preserved; workflow changes only lease/state/date.
PROJECT_STATE/DECISION/review/charter stay coordinator-owned. Final inventories,
claim, snapshots and frozen pins verify preservation and stopped lease NULL.

No ADB/UI/settings/install/transfer/private import/decode/replay/model/rank/host
controller/cloud/Git/dependency/service action occurred. Pure host checks and
static APK evidence do not accept hardware radio privacy, Binder preemption,
Android lifecycle/durability, numerical parity, ranks, memory, latency, quality,
UNKNOWN/holdout/live/M12 or release. Next action: independent coordinator audit,
then only an accepted finite LOW device packet under existing human authority.
