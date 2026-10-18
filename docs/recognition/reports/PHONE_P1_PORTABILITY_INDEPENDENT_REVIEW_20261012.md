# P1 portability independent source/APK review

2026-10-12. Decision: CHANGES REQUIRED before private host assembly, phone install
or replay. This is the coordinator's fresh stopped-source review at HIGH. No
phone/private processing occurred. The founder may keep the phone unplugged.

## Specification finding — medium, blocks this reliability gate

`RecognitionExperimentModule.kt:41` cancels the currently registered private
request without an expected request identity. The delayed picker runnable for
request A at line59 captures A but calls global `cancelPrivate` at lines60/67;
the cancelled/nonlocal callback at line249 also calls that global method.

Allowed interleaving: A reserves10000 and posts its main-thread picker runnable;
user cancellation settles A and releases busy; B reserves10001 on Expo's async
module queue; A's delayed runnable sees A.cancelled and cancels current B.
Cancellation also sets the shared replay cancellation flag before checking
identity. Thus an old callback can invalidate a newer picker or replay operation,
even though durable IDs prevent writing to a stale URI. This violates the required
old/new operation isolation and causes a false failure of the new session.

Installed Expo source confirms DEFAULT async functions dispatch on a separate
`expo.modules.AsyncFunctionQueue` HandlerThread; runOnUiThread posts to the main
queue. The source-bound schedule probe reproduces the wrong transition. This
is a structural source counterexample, not an Android race reproduction. See
audit run cancellation-counterexample.json. Source refs and queue facts were
checked independently; passing store-counter tests do not exercise this wrapper.

Required correction: request-specific callbacks/runnables/catches cancel only
their captured request, atomically verifying ownership before changing ANY
current request, promise, busy state, shared cancellation flag or durable marker.
Explicit user cancellation and module/activity destruction may intentionally
cancel current owned work. Preserve drain/single-settlement semantics. Test
queued-A/cancel-A/admit-B/deliver-A and stale invalid/success/exception branches,
including new replay cancellation isolation, against the actual production
admission/cancellation state helper where feasible. Inspect sibling callback
branches. A fresh APK/source freeze and independent re-audit are required.

## Standards and evidence checked

No additional material scope/architecture/isolation finding identified in the
reviewed packet, ZIP/JSON parser, image transform, ranking, numerical validation,
private storage, offline host stage, native settings checks or UI summary paths.
Native settings/polling are not an atomic OS privacy barrier; actual offline
evidence remains required. Existing source/generated CPU and image math remains
unchanged. Separate recipes, complete denominators and post-score truth reporting
are preserved; no inheritance of17/20 success or private pixels in APK.

Fresh coordinator preservation:1304 frozen writer artifacts,846 stopped source
and846 snapshot records,82,222 protected,25,929 installed inputs and810 unchanged
baseline source records match. HEAD remains66ea3fc22595a48d7355d1729bb879496cc98896;
writer changed only7 approved existing paths including workflow plus29 additions.
Independently reconstructed all40 manifest frames, roles/identity/JPEG sizes/
hashes/dimensions/orientation/effective boxes and control-tensor hashes against
the immutable historical comparison/annotations/vector bundle; all match.

Fresh checks:20 Java admission/geometry/result checks including16 expected
negatives and256 exact geometry comparisons;27 host-emulated store checks;35
host preprocessing/numerical comparison checks; mobile13 tests/5 suites29.982s;
lab5 tests/1 suite14.474s; both types and affected zero-warning lint pass. Fresh
controller61 generated checks pass; unpublished launchers refuse before effects.
Host AtomicFile/Android/JSON emulation does not prove actual device durability.

Actual frozen signed APK75a81454be500b183503f6c8cd8fe628a0f9f0a04f64dcbd690a999e35075bc4
(38,911,301bytes) independently re-inspected: same signer/16KB ELF+ZIP alignment,
15 byte-identical native payloads/23,477,048bytes,41 original+63 generated assets,
six unchanged dependency graphs,44 TFLite JNI methods,524 source-map entries
with7 isolated app files. No permissions, providers, services, business/router/
Supabase/private image assets. Source/API24 runtime still awaits physical check.

Audit harness diagnostics retained: first Jest invocation used repository root
without workspace config and ran zero tests; corrected working directories,
without source or test changes, produced the18 passing executions above.
First controller wrapper returned inherited LASTEXITCODE1 from expected negative
child exits despite61 passed checks; a fresh explicit process-exit wrapper in a
new controller-audit directory verified normal completion. Neither is an APK bug.

Evidence: apps/recognition-lab/runs/phone-experiment/p1-portability-audit-20261012-a1
and p1-portability-audit-20261012-controller-a1. No new whole-app/security/release/
accuracy/speed/memory/UNKNOWN/live gate accepted. Original failed/historical
attempts remain immutable. Same writer receives one focused correction next.
