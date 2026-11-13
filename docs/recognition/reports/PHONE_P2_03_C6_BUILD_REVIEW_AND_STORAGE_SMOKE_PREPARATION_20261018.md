# C6 Gate A accepted; Gate B artifact preparation

2026-10-18. Independent coordinator decision: ACCEPT exact build/static scope.
APK SHA25680e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713,
39,914,786bytes. Physical Android behavior remains UNVERIFIED; current phone app
and old record have not been changed by this gate or this review.

## Independent evidence

Review root apps/recognition-lab/runs/phone-experiment/
p2-camera-storage-c6-build-review-20261018-a1/ contains the fresh reviewer script
and actual command receipts. Verified51 current source rows,1015 fresh staged
source rows,1007 preserved C5 source rows and31 evidence entries, plus STOP-bound
report/source/build/static/service-proof/helper pins. Fresh signature verification
and16KiB zipalign pass. Independently compared all587 ZIP payloads to C5: manifest
exact,18 ARM64 libraries, one exact new library, existing native payloads exact
except parsed GNU build IDs in two libraries, other assets/models/notices exact.

Four renamed R8 service resources independently resolve to identical original
interface/provider order using old/new mappings associated with APK R8 markers.
All DEX files parsed with the existing reviewed binary parser; forbidden classes
remain absent. Changed payload set matches the bounded writer inventory.
Fresh llvm-readelf confirms JNI export, dependencies libdl/libm/libc and absence
of a direct renameat2 dynamic import. Existing source/runtime-loader limits still
apply: this is not API24/device startup or actual rename/fsync proof.

Source/JNI method/static observer closure/dependency evidence reviewed from the
hash-bound writer reports and helper logic. Source-level537-check acceptance
stands; tests were not rerun in this packaging gate. No production source changes
or physical commands by coordinator. No broad release/security acceptance.

## Gate B preparation dispatch — no phone execution

Same stopped Track B writer, Sol6.1 High, six-hour exclusive lease. Prepare one
small separate SDK-only storage smoke APK and handoff for source/static review.
Package com.damiyx.retailintelligence.storagesmoke, no shared UID, zero requested
permissions, no camera/network/model/analytics/provider/service or private-data
access. One explicit launcher activity only; backup/cleartext disabled. It tests
only newly generated files in its own app sandbox. No source change to the main
app or the accepted Gate A APK.

Fresh root apps/recognition-lab/runs/phone-experiment/
p2-camera-storage-smoke-c6-20261018-a1/writer/. All harness sources/compiled outputs
remain there; new bounded tools/scripts/phone-camera-storage-smoke* helpers allowed.
Verify absent before creation. Reuse byte-for-byte the7656-byte ARM64 native library
extracted from Gate A, SHA256c354955263c1d84280ace86bdec8aac8f30f0fbd12630611a7226a875d493e63.
Do not compile/link a second native library or relax its checks. Copy only exact
required reviewed production Java source dependencies (including current Files,
Store, Rename and pure helpers); index them before SDK javac/d8 packaging. No ML
runtime/dependency required or permitted merely for constants/pure helpers.
Use cached SDK/JDK/d8/aapt2/apksigner and the existing isolated signer; no download,
secret exposure or new credentials. Verify signer/manifest/DEX/library/alignment.

Harness requirements:

- Explicit generated batch startup is one-shot with durable guard created before
  work. On crash/reopen, report retained incomplete state; never replay tests or
  delete prior fixtures. Successful second launch may read/verify prior durable
  data without creating another batch. Result is bounded JSON in UI/log with
  no private paths/raw contents, plus build/source/library hashes for binding.
- Use exact production IO plus JNI for publication and directory sync. Test
  absent-destination success, source/destination identity/bytes, and reopen of
  a generated store. Existing-destination native no-replace must be exercised
  at the native adapter, not solely refused by Java's precheck. Both sentinel
  files must remain unchanged on that refusal.
- Include canonical/symlink/type/substitution/destination-race negative cases
  within own generated sandbox where feasible; carefully bounded concurrency,
  no indefinite FIFO open or uncontrolled thread. If a hard-link fixture cannot
  be constructed because Android prohibits it, report unavailable separately;
  do not bypass policy or label it passed. Do not fake native errno or successful
  fsync. Separate Java-guard refusal from actual JNI/syscall result.
- Exercise exact staged reservation recovery on generated files only, its
  interrupted completion/claim accounting, hashes retained and no readable
  success receipt. Test restart/reopen durability through actual Store/Files.
  A successful fsync/reopen is not proof of power-loss persistence.
- If multiple fixtures need the production root name camera-proof-v1, use a
  bounded ContextWrapper whose getFilesDir points to separate owned generated
  fixture parents; preserve all production root/UID/type checks. Document this
  test-only context boundary and every copied class. No fake Android syscall IO.
- Inapp start does not invoke a camera, model or the main package. New SDK Java
  harness classes are clearly separate test scaffolding and must not enter the
  main APK or claim binary Java equivalence to production R8 output. Native bytes
  are exact; Java sources must be exact but SDK packaging is separately bound.

Stop if exact-source reuse needs production changes, broader privileges or
additional dependencies. No main-app instrumentation/private sandbox bypass.
Construct and statically inspect this concrete artifact before requesting any
installation. Writer STOP/direct handoff with source/manifest/APK/library/signature
hashes, finite test counts/deadlines, unavailable cases, screenshots/results
collection design and explicit expected install footprint.

## Approval and later steps

This dispatch authorizes local source/artifact preparation only. NO ADB/device
command, app install/launch, camera/model, old-record access/recovery, paused
hard-link probe execution, CI/dependency/Git change. The separate smoke package's
installation needs explicit founder approval after its artifact is reviewed.
Do not re-ask generic camera test authorization or imply it covers this package.

After approved smoke passes, coordinator sequences the existing main isolated
app's data-preserving update, owning-app old-group inspection and conditional
classification, then founder-aimed camera proof. Exact Gate A APK is held until
those gates. General phone verification request remains active. P2-03/G4 and
P2-04/05/06 remain unaccepted; GitHub/CI correction remains deferred.
