# P1 offline gate C1 implementation result

2026-10-14, Africa/Lagos. Scoped source/build self-check complete; independent
audit and physical diagnostic/private execution remain pending. D-053 authority
and exact charter govern the change; no device/settings action occurred.

`PhoneOfflineGate.java` is the actual pure production rule consumed by Kotlin:
airplane exactly 1, recognized comma-separated policy containing cell/wifi/
bluetooth (optional recognized nfc/wimax), Wi-Fi only 0/3 and Bluetooth only 0/2.
Missing/malformed/unknown/duplicate/unsupported policy or values, enabled/override
states, exceptional reads, differing snapshots and late reads refuse. Native
reads four public Settings.Global strings twice, accounting for a 1 s elapsed
bound; Binder calls are not forcibly preempted. Special 3/2 values are accepted
only in that coherent airplane/policy context, not as an unconditional whitelist.

The same helper is used before private request/store admission, again in the
worker, and in repeated cancellation. Human confirmation, existing ownership/
drain, packet/result checks, one 80-attempt replay and numerical algorithms remain.
`Check private offline gate` reads only saved policy, returns strict scalars/
reason, respects busy/closed state before/after reads and never clears another
operation. No private store/journal/picker/decoder/interpreter/result/output or
generated request is touched. The panel shows actionable refusal separately from
packet/result state; eligibility never starts/enables replay by itself. Diagnostic
pending exposes no private-operation cancellation button.

Existing changed files are exactly Kotlin module, PhonePortabilitySource.java,
nativeAdapter.ts, phonePortability.ts, PhonePortabilityPanel.tsx and relevant
recognitionExperimentPortability.test.tsx. New gate/helper tests, offline-gate TS
test and `phone-offline-gate-*` utilities are charter-scoped. Existing generated
mode and all other source/config/dependencies remain unchanged. PROJECT_STATE,
DECISION_LOG, review and dispatch were not edited.

## Evidence checked

- Actual Java gate: old exact-zero semantic mutant fails captured 1/3/2; corrected
  production helper passes 49 assertions including standard 1/0/0, all negative
  policies/states, transition/read/timeout and busy/closed races without release.
- Compiled Kotlin bytecode calls tested check/status; status has no store/replay/
  journal/busy-release call, admission precedes request/store work, repeated
  cancellation uses the same helper. Source generated branches are byte-identical.
- Four affected mobile suites: 12 unique cases pass across focused executions
  (10 cases in original three suites plus final 2-case gate suite). UI/status
  readiness, malformed/busy results and real adapter ownership are exercised.
- Original private checks: 20 packet/geometry checks with 16 expected negatives,
  256 exact geometry comparisons/14,888,235 assertions; 27 host-emulated store
  checks; actual production request-state 37 checks and expected before failure.
- Mobile typecheck and affected zero-warning lint pass. 20 generated non-operational
  device-observation/monitor checks pass. Ordinary config and isolated import
  boundary checks pass. No unrelated full suite was run.
- One local offline signed Java/Kotlin/R8 release build passes, 5m 27s. Existing
  cache/signer only; no downloads/services. New build wrapper omits lock rewriting
  to preserve source/config; actual six dependency graphs and full artifact hashes
  still match. No new unapproved source lock files appear.
- Actual signed/aligned APK retains zero Android platform permissions, same
  package/version/min-target/arm64/signer, 41+63 exact assets, 15 exact native
  libraries/23,477,048 bytes, 44 JNI names, seven isolated app source files and no
  business/router/Supabase imports. Gate retained in R8/DEX; new source/manifest
  pins embedded. Manifest uses the unchanged app-owned permission declarations,
  with no Android platform permission added. 17 accepted generated helper class
  binaries remain byte-identical. Prior 132 meaningful build snapshots retained;
  61 changed build artifacts are enumerated.

Initial Jest config filename, unsupported dynamic import and native mock setup
failures are retained; the new test was corrected to the existing static mock
pattern with unchanged assertions/timeouts. Initial lint cwd did not locate its
existing config; corrected mobile cwd passes. No build retry/source correction
or assertion weakening occurred after the one build. These are setup failures,
not hidden passes. Java/status checks are host/compiled evidence, not Android
Binder or physical radio execution; store AtomicFile remains host emulation.

## Exact candidate and preservation

APK **38,915,609 bytes**, SHA
`3499c006e8a01a6e79f152cae6e45323e3897973a94c7d7e3e009df5fa9f4900`;
signer `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`.
Canonical 24-file replay source
`426857f410ad96d1891b6f7a269ebedd90a0ddbaed5e78f57010a6fa7bc0dabf`,
excluding its embedded self-reference. Old 23-file index 62890954... is preserved.
Input **131,901,810 bytes**, SHA
`059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e`;
manifest `a3c210af479959d3223b1fda2aa69b6060fe70b050e7e062b9a5bf8e58fefa8c`.
All input/model/recipe/JPEG/control/box/baseline/rank code remains unchanged.

Evidence run `apps/recognition-lab/runs/phone-experiment/p1-portability-audit-offline-gate-c1-20261014-a1`.
Baseline 894 source / 94,029 protected / 3,034 existing external-controller /
25,929 installed input hashes. Final inventories, source/build deltas, frozen
report/APK/input pins and stopped workflow bytes are authoritative in
`preservation-final.json`, `source-final.json`, `frozen-inventory.sha256.json`.
All consumed controllers, failed C3, accepted actual C4 archive/closure and phone
install/input-transfer checkpoint receipts remain intact. No private bytes enter
build/assets; no private decode/model/rank, host recovery/launcher, phone/ADB/UI/
settings/install/transfer, publication, Git/cloud/global/dependency effect.

`source-provenance-supplement.json` is DRAFT, linking unchanged accepted archive/
manifest/old evidence to new source/APK without rewriting historical host bindings.
Comparator must require actual new replay source, not old fingerprint. Draft
device packet and command-free utility preserve human/live-radio/network/tether
requirements; saved mobile-data preference is diagnostic only. Saved policy is
not a hardware oracle. No universal/atomic privacy or native preemption claim.
Writer stops/releases lease and sends one authorized direct completion. Tool
receipt/final response records delivery status; it does not guarantee audit wakeup.
