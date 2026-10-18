# P1 portability C1 implementation result

2026-10-13, Africa/Lagos. Dispatch and artifact names retain 20261012.

The private portability cancellation defect is repaired at source/build level.
Independent acceptance and physical Android verification remain pending.
Scope follows `PHONE_P1_PORTABILITY_C1_DISPATCH_20261012.md`; this is not a new
recognition phase or a private-data execution result.

## Repair

`PhonePortabilityState.java` is the pure production ownership helper consumed by
`RecognitionExperimentModule.kt`. Every captured callback checks opaque ticket
identity under the same lock before cancellation, settlement, mutation, cleanup or
gate release. Import/export, replay and recovery share the existing busy gate.
Writing cancellation retains ownership until the worker drains. Explicit user,
activity and module cancellation still intentionally targets current work.
Document request IDs remain durable, monotonic and disjoint. Duplicate callbacks
cannot settle or start writing twice; stale finalizers cannot release newer work.

The before regression compiles a mutant of this helper that reproduces the old
global cancellation semantics: queue A, cancel A, admit B, deliver A. It fails at
`queued A must not cancel B`. The corrected actual production helper passes 37
checks, including invalid/nonlocal/exception callbacks, duplicate success,
replay/recovery isolation, writing drain, teardown, admission/cleanup failure and
a bounded two-thread schedule. Compiled Kotlin bytecode calls the tested helper.
These are host production-state checks, not Android callback execution.

Changed source: the Kotlin wrapper, regenerated `PhonePortabilitySource.java`,
ten narrowly scoped build/check/controller wiring scripts; new production helper,
its Java checks, the host state-check script and these two C1 reports. Workflow
writes are limited to lease/current_state/updated_at. No schema, dependency,
business feature, numeric recipe, model, manifest, cap, offline predicate, native
graph, permission or generated-path behavior was changed. PROJECT_STATE remains
coordinator-owned.

## Checked evidence

All fresh evidence is in
`apps/recognition-lab/runs/phone-experiment/p1-portability-c1-20261012-a1`.

| Check | Result and limit |
| --- | --- |
| Production ownership regressions | Before expected failure; after 37 passed |
| Original Java admission/geometry | 20 checks; 16 expected negatives; 256 byte comparisons / 14,888,235 assertions |
| Actual store class with host Android/JSON emulator | 27 passed; not Android execution |
| Host generated preprocessing/numerical checks | 35 passed; no model/interpreter execution |
| Controller checks | 61 passed, including unpublished refusal; native definitions compiled, no native controls executed |
| Mobile tests | 5 suites / 13 tests passed, 25.976 s |
| Lab tests | 1 suite / 5 tests passed, 12.415 s |
| Mobile/lab TypeScript and affected zero-warning lint | Exit 0 |
| Offline signed Java/Kotlin/R8 release | Exit 0, 4 m 40 s; existing Gradle deprecation diagnostics retained |
| Static APK isolation | Same signer, 104 accepted assets, 15 native libraries, six graphs, 44 JNI methods; seven isolated app sources, no business/router/Supabase import or added permission |

The finalizer rechecks all 83,710 protected records, 25,929 installed inputs,
original controller files and 17 accepted compiled generated helpers. Exact final
counts, preservation results and stopped workflow bytes are in
`preservation-final.json`, `stopped.json` and `source-final.json`. Original
preparation/audit/device evidence is preserved. No assertion or timeout was
relaxed. No private image decode, private tensor/vector materialization, model
inference, device/ADB command, radio action, operational approval, publication,
service, dependency download or Git mutation occurred.

## Exact candidate bindings

| Binding | SHA-256 |
| --- | --- |
| Signed APK, 38,911,301 bytes | `d19a1181da0111f408b989f3c7222a889fe0a093f49d611185af255b3bd4511e` |
| Signing certificate | `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83` |
| Canonical replay source index, 23 files | `628909548dc059465388005e4aa062c9b56c6e31d6f9809b11baca1e9081b1b7` |
| Unchanged private manifest | `a3c210af479959d3223b1fda2aa69b6060fe70b050e7e062b9a5bf8e58fefa8c` |
| New host controller source index, 17 files | `f0eb45d8f0e3f3161a06888461bc1da3182ed4c9344f2c52aabba1f520b7737e` |

Final inventory, whole-checkout source fingerprint and report hashes are recorded
after these reports are saved in `frozen-inventory.sha256.json`. That sidecar
binds `frozen-inventory.json`, which excludes only itself and the sidecar.

## Separate generated-export finding

The unchanged generated picker branch calls global `cancelExport` when its
captured ticket is cancelled. Queue generated A (40000), cancel A, admit generated
B (40001), then deliver A: that branch cancels B. A host probe against the actual
unchanged `GeneratedExportState` reproduces it; the source branch and compiled
private-helper integration are recorded in `sibling-finding.json` and
`compiled-wrapper-javap.log`. This is a separate reliability finding, not physical
Android reproduction. The dispatch explicitly requires reporting sibling issues
instead of broadening C1; no generated-path fix was made. Coordinator review and
a separately scoped correction are needed before claiming generated-export
readiness.

## Remaining boundary

C1 source/build checks pass; independent audit must decide acceptance. Earlier A15
generated CPU 9/9 and image 42/42 evidence stays historical and does not verify
this APK or private portability. SAF lifecycle/process death, actual private
packet execution, physical cancellation schedules, cross-device equivalence,
quality/holdout and performance gates remain open. The writer stops with lease
null and sends one authorized direct completion; the coordinator owns next review
and project-state updates.
