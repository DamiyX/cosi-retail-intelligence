# P1 image lifecycle C1 correction

2026-10-12 Africa/Lagos. Implementer self-check; independent acceptance pending.
Authority: PHONE_P1_IMAGE_LIFECYCLE_C1_DISPATCH_20261012.md. Same
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, plan/m8-unified-scanner,
HEAD66ea3fc22595a48d7355d1729bb879496cc98896. No branches/worktrees/agents.

Completed generated evidence is now committed in fixed app-private files before
completion or picker admission, recoverable by verified read, and exported from
the committed file. Picker identity is allocated from a durable monotonic journal.
This repairs the source lifetime assumption exposed by the actual a1 LOW_MEMORY
exit. It does **not** claim an Android process-death/export pass: writer executed
zero phone commands, Android decodes, private images, model calls or picker actions.

## Actual candidate

NEW run: `apps/recognition-lab/runs/phone-experiment/p1-image-lifecycle-c1-20261012-a1`.
APK: `recognition-image-lifecycle-c1-release.apk`,38,863,285 bytes/about37.06MiB.
SHA256 `3fd8690cfb9c3b2b2a777eb855687191c6b546d8bc533c62873a0420a2b312f8`.
Same test certificate48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83,
same isolated package/version/min24/target36/arm64. Actual release/R8 a1 exit0,
4m16s. No new downloads/dependencies/compiler/runtime/model/permission/config.

All original generation pins remain exact. Spec:
001741899a70a9b6b6d2f06d710ac46e26a6b47714c51c113093f33981c80bfc.
Generation source identity:
bf3911c75490a519ef89de299b5f4f7324bab9798a00b3d788a47c8bcd332071,
derived from unchanged geometry, pipeline, generated pins and CPU helper source
hashes in generation-source-pins.json. CPU helper remains
e99622339605583258cb979041d0c3937893a9323d29d900d9c8e782dc81f7e4.
No math/kernel/fixture/spec/tolerance/options or three-runtime-probe API changes.

## Persistence and recovery

New GeneratedEvidenceStore/GeneratedEvidenceAndroid/GeneratedEvidencePins and host
checks live inside the existing internal Java helper. The native wrapper stores
only verified metadata in memory after publication; the ZIP is streamed from disk
for export. There is no foreground service, wake lock, largeheap or keepalive.

Fixed directory: experiment Context.filesDir/recognition-generated-evidence-lifecycle-v1.
Package owner must exactly match the isolated experiment. Canonical directory and
every exact owner/requests/completed/lock file and .new/.bak path are checked;
links, wrong owner, malformed metadata and unowned existing directories fail.
No directory enumeration or unrelated cleanup. Only exact atomic staging/backup
files can be replaced/rolled back by the existing Android AtomicFile facility.

One completed envelope contains owner, format, source/spec/recipe pins, ZIP size/
SHA256 and bounded metadata/hash plus the exact ZIP bytes. ZIP<=48MiB,
metadata<=256KiB, envelope<=48MiB+256KiB+4KiB. Small journal/owner files are bounded;
one current result plus bounded atomic staging/backup, no growing result history.
These are caps, not a measured memory/storage-budget pass.

Publication validates before writing, flushes and syncs the descriptor, commits
through AtomicFile, then reads back and verifies the exact newly requested bytes.
Completion is not reported for an interrupted/failed/mismatched commit. A previous
valid result can survive a failed replacement; an interrupted first result is
not complete. This is disposable generated evidence, not business/SQLite/sync data.

Recovery verifies envelope identity/hash/length/EOF and complete ZIP count/paths/
per-entry CRC, expected byte sizes, all210 receipt hashes,42 source/geometry pins,
summary/receipt consistency and bounded finite metadata. Wrong source/spec/owner,
truncation/corruption/excess or malformed content fails explicitly. Original211
entries/42 cases remain unchanged. Native full JSON validation/Android AtomicFile
are compiled/source-reviewed, not executed by these host tests.

Root automatically requests only bounded private evidence verification on mount,
then clearly shows recovered verified evidence and any interrupted export session.
No automatic batch, model or export. An explicit Verify and recover button can
classify a retained pending marker after failure; a new batch is always deliberate.
Only durable:true results expose export readiness. No orphan URI is persisted.

## Callback identity and export

requests.dat durably stores next16-bit request ID and pending marker with hash and
atomic readback. New IDs start40000, distinct from the known consumed legacy24071,
increase across new module/process instances, never wrap, and fail explicitly at
exhaustion or corrupt/missing journal. A pending interrupted request requires
explicit recovery/abandonment before a new allocation; abandonment preserves next.
An old completion cannot clear a newer pending marker. No random-collision premise.

Every new module starts with no RAM ticket/exportCode=-1. It ignores orphan
callbacks; it never resumes an old URI or picker/promise. New deliberate export
uses a newly committed ID and filename generated-image-lifecycle-c1-ID.zip. Local
provider enforcement is unchanged. One-worker/busy/closed gate and one settlement
remain. Export reads the committed envelope matching its exact hash/size/metadata,
copies in8KiB chunks with cancel/closed checks, verifies full source hash/EOF, closes
the selected stream and finishes the journal before success. Blocking I/O is not
claimed interruptible. Empty/partial selected documents may remain on failure;
no automatic phone deletion/retry. Restart only offers recovered bytes and a new
explicit action, never resumed writing. No core/private/gallery/path import API.

AtomicFile supplies publication, not locking; a process mutex and owned file-channel
lock serialize access across instances/processes. API17 AtomicFile and descriptor
sync were checked against installed SDK and primary [AtomicFile documentation](https://developer.android.com/reference/android/util/AtomicFile),
[descriptor sync](https://developer.android.com/reference/java/io/FileDescriptor#sync()),
and [Android process lifecycle](https://developer.android.com/guide/components/activities/process-lifecycle).
Normal process death is the target; sudden power-loss/filesystem/hardware failure
is not physically verified. Independent storage/URI/lifecycle review is required.

## Evidence and limits

- Before: actual a1 completed42 cases with8,087,458-byte ZIP then LOW_MEMORY exit
  during picker; root reset and selected file0bytes. That run/empty phone file
  remain immutable. Host compilation of exact old export source reproduces request
  ID reuse24071 after reconstruction; desired assertion fails as expected.
- After:4701 host assertions pass over real files, full fixture hash/content reopen
  and export, interrupted first/replacement publication, actual JVM halt13 before
  rename and subsequent recovery, corrupt/truncated/stale-source/spec/oversized/
  mismatched cache, owner/path boundaries, pending isolation/new instance IDs,
  stale/duplicate settlement and partial-copy cancellation. Uses host NIO atomic
  move and a known complete generated fixture validator; not Android AtomicFile,
  Android JSON, hardware process death or picker execution.
- Existing geometry/export300 assertions pass, unchanged generation source pins
  verified. Nine complete-packet comparator counterexamples pass with RUN redirected
  before setup. No frozen fixture writer was invoked into its original directory.
- Fresh no-cache Jest4 suites/10 tests PASS58.264s; original no-work assertions/
  timeout limits retained. Cold root setup26140ms recorded; no performance pass.
  Types and zero-warning lint exit0. One expanded-test failure retained: host
  fixture validator threw AssertionError instead of a validation exception on
  deliberately invalid metadata; corrected test boundary, no production/APK change.
- Actual Java/Kotlin/release/R8/signing succeed. Signature/aapt2/ZIP and every15
  native ELF16KB checks pass;23,477,048 native bytes identical to C1. All41 original
  and63 generated assets/model/notices unchanged; model SHA256bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40.
  Six dependency scopes exactly unchanged/no Play-GMS references;44 original JNI
  methods/reflection names and actual storage helpers retained. No new dontwarn,
  skip or metadata stripping; inherited upstream rules remain.215 metadata/notice
  records and24 full notices retained; no rights clearance.
- Manifest/package/isolation unchanged; no network/hardware/storage/service/provider
  additions. Actual522-source map/five experiment app files, no business/Router/
  Supabase root. Ordinary config/discovery comparison passes; no ordinary APK pass.

Before edits:807 source/80,806 protected records,33 old source snapshots and25,929
selected installed inputs captured. Final inventories/preservation/source/APK/
stopped-workflow bindings are in the NEW run, including unchanged generation/assets.
Generated Gradle locks are retained as build receipts outside source. No other
contributor, package/npm-lock/app.config/shared/contracts/domain/business/schema/
permission/Git/cloud/global/service changes. PROJECT_STATE remains coordinator-owned.

End condition is stopped direct return, not acceptance. Next: coordinator audit,
then NEW bounded restart/recovery/orphan/local-export device packet. Full exported
phone bytes, image-stage equivalence, memory/thermal/latency, private40 replay,
camera/accuracy/UNKNOWN/holdout/legal/M12 remain OPEN. Do not reuse consumed a1.
