# P2-03-S1-C1 independent review

2026-10-16, Africa/Lagos. **G2 source scope ACCEPTED WITH RESIDUAL RISK.**
CP-S1-C1/C2/C3/C4 are closed for source/generated behavior. This does not accept
the complete P2-03 camera proof, Kotlin/native build, Android runtime or physical
camera geometry. G3/G4 and P2-04 remain pending. No phone action or model run.

## Comparison and preservation

Main coordinator reviewed the stopped original writer's C1 handoff,13 permitted
existing-file deltas and two new Java responsibility files, against the936-path
coordinator baseline and24 exact final source copies. The original S1 review
remains historical CHANGES REQUIRED; this correction review closes its findings.
Unrelated branch work is excluded and preserved. No third-party/architecture,
dependency/provider/permission/model/recipe or P1 pin change was accepted here.

Handoff SHA256 `54f330d8cbc122573976e37ea64e6f548b76ae2a1a19e6fe3197d9dd4fd4a3be`;
inventory `7ef2ff5fb8ed552b09f3fcae2492d613cc55e1133d7db84316dfb534417bf949`;
source index `7be2b6dba66761974995196de792a9d5d4f66428550e22591a94a3be974392fb`.
All1486 C1 inventory entries match;936 baseline paths yield the13 allowed changes;
all66 prior frozen bindings match. Old S1's4167 entries were independently checked
in the initial review and rechecked by the writer in C1. Final current24 source
files/copies match. Windows reparse entries are checked as targets, not traversed.
STOP occurred within the finite lease; coordinator released it only after intake.

New audit evidence:
`apps/recognition-lab/runs/phone-experiment/p2-camera-source-c1-review-20261016-a1/`.
The earlier original-audit directory and S1/C1 writer directories remain frozen.

## Specification closure

- **CP-S1-C1:** `.done` is only a sealed candidate. Hash-bound `.resolution` is
  required for numerical publication; missing/first-byte/partial resolution keeps
  the candidate unreadable and its reservation charged. The unchanged original
  cancellation/restart probe freshly passes: ACK=true, restarted readability=false.
  Valid published results and cancelled/unresolved/fault cases are separately
  exercised through the actual production Store/Lifecycle/Durable helper.
- **CP-S1-C2:** preflight returns the SDK operation instead of invoking it. The
  run checks generation/ticket/invalidation after the await and invokes without
  another intervening await. The panel also checks the same view/key/foreground/
  permission. Both original UI counterexamples pass unchanged against current
  source. Synchronous bridge throw/non-Promise output retains unknown drain;
  it is not mislabeled NOT_STARTED or used to release ownership.
- **CP-S1-C4:** current-layout reselection is a no-op; a real change still clears
  readiness. Original assertion and expanded A/B controls pass.

## Standards closure

- **CP-S1-C3:** the Kotlin dispatch uses production Java Finalizer/Durable. Work,
  scheduling and durable-finalization failure are contained; no throwing camera
  cleanup remains in an unguarded worker finally. Primary and finalization facts
  remain separate. Success settlement follows durable resolution/local release.
  Fresh86 checks cover actual generated host IO and Executor behavior, faults,
  cancellation, duplicate/stale completions and retained ownership. This is not
  Kotlin compilation or an executed Android exception/crash claim.

Publication has a defined linearization point: a short ticket decision claims
PUBLISHING before IO; cancellation returns false once publication is claimed.
JavaScript still withholds its cancelled view result. A complete valid PUBLISHED
resolution may survive restart if later local cleanup fails; such a failure holds
the live owner blocked, but it is not an acknowledged cancellation. An exception
from the delivery sink itself is contained in Run.deliveryFailure AFTER durable
completion and gate release; it does not restore ownership. The handoff's broad
delivery-failure language must be read with that distinction. Losing bridge/UI
delivery does not undo a committed numerical result and does not trigger recapture.

The new resolution marker increases reservation B to26,009,600 logical bytes
(2x13,004,800). The256MiB owned/reservation ledger remains; SDK allocation/cache
and total RAM remain outside its proven cap under approved D-054 choice A.

## Verification actually checked

Fresh coordinator execution:

| Evidence | Result / scope |
| --- | --- |
| javac.json | actual pure source compiles; two unchanged legacy warnings retained |
| CancellationRestartProbe.json | original assertion passes; no cancelled numerical read after restart |
| CameraProofFinalizationChecks.json |86/86,23.951s; production completion/store/lifecycle with generated host IO; no Android/model |
| mobile.json |48 tests/10 suites pass,15.990s Jest-reported; no skips |
| original-ui-complete-flow.json | all original7 UI cases pass,4.477s Jest-reported; original assertions/timeouts unchanged |
| source binding check |35 rows, `360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e` matches current constant |

Retained timing risk: the preceding focused original UI harness's first test hit
its unmodified5s deadline (first case9.049s); the layout assertion passed. The
complete seven-test flow then passed, without assertion/timeout changes. Cause
of the first-use timing failure is NOT established; later success is not a timing
repair or phone-latency claim. The primary fresh48-case run also passed. Future
test-readiness/build work must keep this flakiness visible.

Writer evidence reviewed against frozen source:717 JVM assertions in one1779.855s
full filesystem run;48 mobile tests; typecheck; zero-warning mobile lint; Java
against cached Android36/LiteRT APIs; all final receipts source-stable/exit0.
Coordinator deliberately did not repeat the30-minute broad stress run, unrelated
lab tests or type/lint/API compilation: focused fresh checks directly challenge
the corrections, and the remaining source-bound receipts were inspected. These
self-checks are not represented as new coordinator executions.

## Residual risk and next gate

G3 must compile Kotlin and inspect the exact camera-enabled APK's resolved
dependencies, generated module registration, permissions/metadata, native/model
assets and variant isolation. Do not broaden autolinking or download unreviewed
artifacts to hide build failures. No G3 build/install packet was executed here.
G4 still needs separately specified generated-target Android/camera evidence:
raw metadata, descriptor/link/fsync/decoder, cancellation/drain/restart/storage,
actual preview-to-JPEG FOV, timing and memory. Geometry stays INCONCLUSIVE; no
autoaccept or live recognition-quality/device-generalization pass.

Recommended next action is exact G3 build/static preparation and review, followed
by its bounded execution and separately reviewed physical proof. P2-04 remains
held until the actual camera proof. Founder combined barcode/visual enrollment
and reuse suggestions are recorded in
`../TRACK_B_FOUNDER_REUSE_AND_ENROLLMENT_NOTES_20261016.md` as planning input only;
barcode remains disabled in this proof and no candidate library was adopted.
