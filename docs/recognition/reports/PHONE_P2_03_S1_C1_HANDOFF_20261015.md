# P2-03-S1-C1 correction handoff — source self-check only

The four requested source corrections are implemented on `plan/m8-unified-scanner`
in `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`. Independent coordinator G2
acceptance remains pending. This report does not supersede the original S1
CHANGES REQUIRED review or make a native/device readiness claim.

Writer: `01a1051f-0777-7573-ad09-0e550a4bd56a`. Coordinator:
`01a098ef-d830-7531-bca7-2d66b0a5b587`. Finite C1 lease expires
`2026-10-16T02:09:12.717780+00:00`; no renewal performed. The authoritative dispatch
is `PHONE_P2_03_S1_C1_DISPATCH_20261015.md` and findings are in
`PHONE_P2_03_S1_SOURCE_REVIEW_20261015.md`.

All new evidence paths below are relative to
`apps/recognition-lab/runs/phone-experiment/p2-camera-source-c1-20261015-a1/writer/`.
`writer-stopped.json` is the final filesystem write; its existence and exact
hashes identify the stopped return. Coordinator-owned project state/workflow,
the old S1/audit roots and P1 pins were not edited.

## Corrections and semantics

| Finding | Change | Checked evidence |
| --- | --- | --- |
| CP-S1-C1 | `.done` seals a candidate; a separate validated `.resolution` is required to publish numerical data. True acknowledged cancellation before the publication claim cannot obtain PUBLISHED. Unresolved candidates remain unreadable across restart and retain their reservation. | Exact unchanged audit cancellation probe fails on saved old bytes and passes on current bytes; actual Store/Lifecycle/Durable fault and restart checks. |
| CP-S1-C2 | `CameraProofRun` awaits preparation, then checks current ticket/generation/invalidation before invoking the returned SDK function synchronously. Panel also checks the same mounted view/key, foreground and permission. | Old UI counterexample makes one forbidden SDK call; fixed counterexample makes none. Expanded tests include cancel, background, unmount, permission loss and synchronous bridge failure. |
| CP-S1-C3 | New production `CameraProofFinalizer.Durable` makes durable finalization precede release and settlement. Work, finalization, scheduling and delivery exceptions are contained, with primary/finalization diagnostics kept separately. Failed finalization retains blocked ownership. | Actual production completion tested with real host Store IO, zero-byte/partial/rename write faults, executor refusal and executor uncaught-exception handler, duplicate/stale run and delivery failure. |
| CP-S1-C4 | Selecting the current layout is a no-op. A real layout change still clears readiness and remounts. | Old UI counterexample disables Capture; fixed case preserves it. Additional Layout B change/reselection coverage. |

The camera-proof publication linearization is explicit. The ticket atomically
claims PUBLISHING before the IO that writes PUBLISHED. `cancel()` returns true
only before that claim; after it, including BLOCKED_PUBLISHING, it returns false
and does not acknowledge cancellation. This short ticket lock does not cover
storage IO. JavaScript withholds its own result after any local cancellation
request, and the UI no longer describes that as proof of native acknowledgement.
Repeated blocked reporting preserves the original publication phase/diagnostics.

The commit record binds source SHA, job ID, process UUID, `.done` SHA, outcome,
code and checksum. It is bounded and published through the existing exclusive
atomic file mechanism. Missing, first-write-failed or partial resolution cannot
make the candidate readable. Restart may classify an unresolved prior-process
candidate INTERRUPTED without recapture; an existing partial staging marker
remains refused for review. A valid complete PUBLISHED resolution is the durable
commit point: if subsequent local cleanup or delivery fails, the owner remains
blocked in-process but restart may recover the committed publication. This is
not an acknowledged cancellation or an unresolved candidate. Tests exercise
both sides of that distinction.

Native Kotlin camera dispatch uses the production finalizer and no longer does
throwing camera finalization in unguarded `finally`/executor-refusal paths.
Admission/setup failures retain blocked ownership where an owner exists.
Captured SDK rejection supplies a real drain signal; a synchronous throw or
non-Promise bridge result reports CAPTURE_DRAIN_UNKNOWN and cannot invent a
successful capture drain. Preflight cancellation reports CAPTURE_NOT_STARTED.

## Storage and unchanged scope

The logical owned-file/reservation cap remains 256 MiB. A fifth bounded marker
(resolution) is included in the per-job profile: 13,004,800 bytes, doubled for
stage/destination coexistence to **B = 26,009,600 bytes**. Unresolved groups charge
`max(B, retained bytes)` across restart. Valid terminal resolution releases the
reservation to retained bytes. Count, exact-cap, +1 refusal, refusal-ledger and
stage/coexistence controls remain exercised; tests were adjusted to account for
the new record, without reducing the 115-record count or capacity assertions.

This is a logical application ledger. SDK production/cache bytes, RAM bounds,
filesystem allocation/durability and real camera/OS behavior are unproved.
D-054/G0 choice A remains unchanged. Numerical recipe SHA remains
`76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522`.
No actual model, recognition, private image or camera execution occurred.
Physical field-of-view equivalence remains INCONCLUSIVE, with no autoaccept.

The current 35-row camera source binding is
`360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e`
(`source-manifest-a1.json`, `binding-final.json`). The tools accept only explicitly
assigned writer roots with coordinator dispatch and retain exclusive-output and
STOP refusal. No old frozen output was reused as a writable destination.

## Counterexamples and verification limits

`old-cancel-probe-a2.json` records the original unchanged Java probe on saved old
source: inner process exit 1, `cancelAcknowledged=true` and
`cancelledNumericalReadableAfterRestart=true`. The driver exit 0 means it observed
that expected failure. `fixed-cancel-probe.json` runs the same unchanged probe:
exit 0, acknowledged cancellation true and restarted readability false. The
expanded tests additionally construct a legitimate finalized PUBLISHED result,
so absence of publication is not merely an accidentally unreadable new fixture.

`old-ui-counterexamples-a2.json` records both actual old-code assertion failures;
`fixed-ui-counterexamples.json` passes both (five unrelated cases filtered in
that focused run). The final mobile run includes all affected suites and has no
filtered cases. Earlier `old-cancel-probe.json` extended-working-directory Java
setup failure and `old-ui-counterexamples.json` cold five-second timeout remain
visible as harness/timing history. They are not claimed as the three actual
before/after behavioral failures. No test timeout or assertion was relaxed.

New finalization checks are source-level generated host evidence. They use the
actual Java completion/store/lifecycle with host file IO and simulated process
reset; they do not execute Android IO, kill a phone process or prove an Android
filesystem guarantee. Java compiles against cached Android 36/LiteRT APIs;
**Kotlin was not compiled** and no Gradle/Expo/EAS/APK build ran. Native wiring,
permission manifest, actual SDK callbacks and physical cancellation/crash
behavior need the later authorized gates. Existing generated/private tests were
not edited. The unrelated lab suite was not rerun in C1.

## Preservation and return

`preservation.json` records the coordinator's 936 source baseline and 66 frozen
bindings, plus exact verification of all 4,167 original S1 inventory rows,
including its Windows reparse entry without traversing it. The 22 original
allowed paths and two necessary new Java responsibility files are copied and
hashed in `source-after-index.json`; the actual changed existing subset is in
`preservation.json` and STOP scope. No schema, dependency, domain, sync protocol,
recognition contract, model or P1 evidence change is part of this correction.

`inventory.json` freezes all new writer artifacts, excluding itself and the
last-written STOP receipt, and binds this handoff as an external artifact.
`final-verification.json` records the final source/frozen-binding check and exact
receipt hashes. Commands, UTC start/end, exit codes, complete stdout/stderr and
before/after source hashes are retained in each final receipt.

Recommended next action: coordinator independently review C1 and decide G2.
Only that review can accept these corrections. G3 exact build/static closure,
G4 authorized native/physical evidence and P2-04 remain pending. No next gate,
lease release, build, phone test, Git effect or external action is initiated by
this source return, except the one founder-authorized completion message to the
parent after STOP.

## Final execution receipts

| Receipt | Result | Wall time |
| --- | --- | --- |
| `jvm-final.json` | exit 0, source stable | 1779.855s |
| `mobile-final.json` | exit 0, source stable | 19.154s |
| `android-final.json` | exit 0, source stable | 10.192s |
| `typecheck-final.json` | exit 0, source stable | 20.290s |
| `lint-final.json` | exit 0, source stable | 41.716s |
| `binding-final.json` | exit 0, source stable | 0.464s |

The full JVM run was executed once on the settled source. Its individual outputs:

- `Generated Java behavioral assertions PASS 300`
- `PASS 37 production-state assertions; delayed callbacks/replay/drain/teardown. No Android/model execution.`
- `PASS 108 actual saved-policy/status assertions; no store, decoder or model.`
- `{"kind":"GENERATED_C1_DURABLE_FINALIZATION","checks":86,"nativeValidated":false,"modelExecuted":false}`
- `{"kind":"GENERATED_CAMERA_PROOF_CHECKS","checks":178,"nativeValidated":false,"modelExecuted":false}`
- `{"kind":"GENERATED_CAMERA_CAPACITY_CHECKS","checks":8,"exactOwnedCapBytes":268435456,"reservationBytes":26009600,"nativeValidated":false,"modelExecuted":false}`

The Java compiler output is retained in the first JVM record, including any warnings; Android API compilation is a separate receipt. Mobile: 48 tests / 10 suites pass, no skips. Typecheck and lint (zero warnings) exit 0. Binding: 35 rows match the current source SHA.

The preserved source baseline has 923 unchanged rows and 13 permitted existing-file changes, plus two new Java files. The final source index has 24 exact copies (including nine unchanged allowed paths). All 66 frozen bindings match; all 4,167 original S1 inventory entries match. Final inventory and STOP hashes are returned in `writer-stopped.json`.
