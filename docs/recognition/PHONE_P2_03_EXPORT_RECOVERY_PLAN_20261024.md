# P2-03 saved-evidence export recovery — implementation plan

2026-10-24. Planning complete; implementation/build/device execution not started.
Founder requested this plan after switching the planning model. Stop for the
founder to switch back before dispatch. P2-04 remains held; P2-05 and CI deferred.

## Outcome and established failure

Retrieve the already sealed twelve-case evidence, preserving all eight original
JPEGs and their metadata. No new photo, model execution or recognition score.
Android reports LOW_MEMORY process death four seconds after the export picker
opened. Durable export consumption survived; the in-memory callback ticket and
prepared CameraMatrixEvidence did not. The selected Downloads ZIP is zero bytes,
exportConsumed=true and exportResult=null. Exact callback delivery through Expo
was not traced. System-wide RAM pressure's cause and a memory leak are unproven.

Evidence: runs/phone-experiment/p203-matrix-export-device-20261023-a1 under
apps/recognition-lab; diagnosis in p203-export-recovery-plan-20261023-a1/handoff.md.
Current native state: SEALED, idle, count18 including six historical admissions,
owned=claimed10469268. These are native observations, not independent original
content verification. Preserve the empty output and every old receipt.

## Chosen approach and alternative

Use one small, non-exported native Android recovery Activity, with a durable
recovery journal and a read-only adapter for the fixed sealed run. It selects the
existing empty ZIP with ACTION_OPEN_DOCUMENT. Its Activity Result callback is
registered on every Activity creation, independently of React/JS promises and
Expo module initialization. On return/restart it reconstructs state from disk.
The JS bridge launches the screen and reads persisted status; it owns no export.

This is preferable to patching the current Promise ticket: that would leave
result delivery, prepared-evidence recreation and new-build owner validation
unresolved. Alternative is to retain the current evidence and stop; repeating
the old Export or trying to keep Android permanently alive is not a repair.

Use ComponentActivity/Activity Result APIs already resolved as
androidx.activity:activity:1.8.0 in the reviewed build graph. Confirm the module
compile classpath offline; an explicit declaration may use only that already
resolved artifact/version. No framework upgrade or download is part of this plan.
Do not hand-edit generated MainActivity or rely on late JS registration. Add the
non-exported Activity in the local module manifest, gated to the isolated variant.

## Fixed evidence identity and preservation

- Package: com.damiyx.retailintelligence.recognitionverification, same signing key
  and sandbox; update in place, never uninstall/clear data.
- Run: p203-matrix-20261023-c1-r2; matrix root camera-matrix-20261023-c1-r2-v1.
- Capture source: 08d1f1f319765a12ebc98b1805d5d83056d620c466b0561e607a41f6926ce19b.
- Capture APK: b83a2b2d6cc744345c46106c3d76c9c1a52eddddeecb7c2535394230f3512674.
- Camera owner source: 360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e.
- Original model/recipe, registry/targets/case UUIDs, raw EXIF and all old limits
  remain the existing values; freeze these in the source review packet.
- Output: primary:Download/p203-matrix-20261023-c1-r1.zip (r1 filename is correct).

The current CameraMatrixAndroid constructor supplies the NEW source/APK to the
old owner validator and therefore cannot be reused unchanged after an update.
Add a fixed read-only historical reader with the above capture pins. Neither UI
nor a caller supplies arbitrary source, job, path, root or hash. Validate owner,
registry, retained initializer, seal, export-attempt and absence of old terminal;
check all twelve sealed terminal hashes, exact profiles and provenance before
output. Record a fingerprint of every input and verify it again after writing.
Reject missing/torn/unresolved/mismatched input; do not classify, initialize or
repair it as a side effect of reading. Read-only IO must reject every mutation,
including the existing CameraProofStore constructor's create/init branch.

Keep old records byte-identical. Original exportResult remains null; recovery
has a separate result. New recovery source/APK hashes identify the exporter only.
Keep original ZIP entries/manifest meanings and false/inconclusive claims. Add
one bounded recovery provenance entry if necessary, included in the recomputed
manifest and entry cap; never replace original source fields with new values.

## Destination and lifecycle contract

1. Preparation validates the fixed historical reader and reserves the operation;
   no picker or output write starts merely because the app opened. Unmount camera
   preview before launching recovery; recovery does not construct CameraView,
   decode pixels or initialize the model runtime.
2. Persist one selection intent before opening ACTION_OPEN_DOCUMENT. Register its
   callback unconditionally with stable ordering/key before Activity start.
   Rotation/recreation must not launch a second picker. A missing callback/grant
   stops visibly; no timeout-driven relaunch. Duplicate callbacks are idempotent.
3. Ask the operator to select Internal storage > Download > the fixed ZIP. Require
   content://com.android.externalstorage.documents and the exact document ID above,
   correct display name, no query/fragment/userinfo and an opened regular,
   single-link, zero-length file. Reject cloud/tree/numeric Downloads aliases for
   this recovery instead of guessing their path. No CREATE_DOCUMENT or truncation.
   Historical inode was not recorded: claim exact current path/selected descriptor,
   not proof of its inode at the original Save. Hold and recheck descriptor identity.
4. Take only offered read/write persistable URI grants, persist bounded URI and
   grant facts, then reconstruct the reader and evidence plan from immutable disk
   inputs. No raw URI or grant becomes an arbitrary-file export interface. Missing
   persistable access fails before writing. Grant obtained but not journaled cannot
   trigger a write; reconcile/release only this fixed document's grant.
5. Compute deterministic expected ZIP bytes/hash through a bounded counting/hash
   sink using the SAME serializer, metadata and entry order as the real writer.
   Do not stage another ZIP or load all profiles together. Pin serializer metadata
   so locale/timezone/restart cannot change the intended byte stream unnoticed.
6. Under one process-wide owner plus an OS-held exclusive journal lock, validate
   input/output/free-space again and durably consume WRITE before the first byte.
   Only the execution that created that durable claim may write. Restored code
   seeing WRITE already present MUST NOT write, even if output is still empty.
7. Stream <=90MiB once, fsync, then hash/read back the opened output and compare
   with expected size/hash. Persist verification and terminal. After process death
   with WRITE present, allow READ-ONLY reconciliation: an exact complete expected
   ZIP may be verified/finalized; empty/partial/different output stays unverified.
   No automatic rewrite, append, truncation, second destination or second recovery.
8. Before WRITE exists, a restored selected operation may continue from its durable
   state with valid grants/identity; it does not need a second selection or JS
   promise. Show simple stages and final status. Release the narrowly held grants
   after terminal; crash cleanup may release only the fixed recorded grant.

State: OWNER -> SELECTION_INTENT -> DESTINATION -> WRITE -> VERIFIED -> TERMINAL.
Cancellation/invalid selection can publish terminal before WRITE. Disk records
bind owner, ordered predecessor hashes, fixed run and recovery source/APK.
Any torn publication fails closed and is preserved. Exclusivity must outlive
Activity recreation; an old Activity's onDestroy is not an export cancellation.
No foreground service, new permission, all-files access, wake lock or RAM-cap claim.

## Storage accounting and bounded amendment

The original90MiB output+192KiB bookkeeping reserve stays fully charged inside
256MiB; old C7/C8/C9 allowances are not reclaimed. Use a distinct fixed recovery
journal root with six named records <=2KiB each and one <=2KiB publication temp;
include its lock file (zero payload bytes) and directory entries in count checks.
Reject oversized URI/schema rather than grow limits. Retain original matrix
maximum172KiB + failed initializer4KiB + recovery14KiB =190KiB <=192KiB.
This arithmetic requires proof of actual names/schema/serialized sizes and no
simultaneous original-root writer; no uncounted logs/staging/temp files.

Extend the native publisher only for the exact new root/record allowlist, preserving
no-follow, UID, single-link, no-replace and directory-sync checks. Never broaden
old roots' admitted names. Validate the new footprint in aggregate accounting.

A small generated lifecycle test needs a separately declared <=64KiB permanent
allowance (its journal, <=4KiB output and any staging combined), charged inside
the same256MiB camera-owned total in addition to the unchanged old reservations.
No silent exclusion because it is test data. Source review must prove this bound
and current actual capacity before the device packet is approved.

This document proposes the additional fixed-document read/write recovery and
generated lifecycle check; D-059's consumed one-export authorization is not reset.
Founder planning authorization is not device execution approval. Present the
reviewed build and exact bounded device packet before installation/recovery.

## Implementation ownership and files

Same Track B implementation agent, Sol6.1 High; one source owner, then STOP and
explicit handoff to coordinator. Coordinator independently audits before build
and device execution. Routine test execution later uses the existing Medium
policy and talks directly to the founder; no coordinator relay for filenames.

Expected existing seams:
- RecognitionExperimentModule.kt: recovery launch/status only; avoid invoking old
  matrix constructor for recovery. Ordinary original matrix endpoints stay closed.
- CameraProofPanel.tsx/nativeAdapter.ts: recovery-only screen/status and camera
  unmount; no generic capture/export retry controls.
- CameraProofFiles.java, camera_proof_publish.c: exact journal footprint/publisher.
- CameraProofStore/CameraMatrixStore/CameraMatrixEvidence: narrowly expose/reuse
  read-only validators and the bounded serializer; preserve original format guards.
- module AndroidManifest.xml and, only if required, existing-version dependency
  declaration; existing generated source/artifact binding scripts.

New focused modules: CameraMatrixRecoveryPlan (fixed pins/caps), recovery store
(journal/state/locking), historical reader, recovery Android Activity/controller.
Keep platform lifecycle out of pure state/serialization tests. Do not modify
business code, database/schema, recognition algorithm, scoring or P2-04/05.

## Finite verification and handoff

S1 — source and generated evidence. Reproduce the old lost-ticket AND lost-prepared-
evidence failures. Cover both independently in the correction; reconstruct with a
new instance/process token. Test death at selection, grant/journal boundary, WRITE
claim, first/middle/last byte, readback and terminal. Check wrong pins, altered
profiles/seal, wrong URI/nonempty output, missing grants, duplicate/stale results,
concurrent owner, second recovery, torn/oversized records and short writes. Require
unchanged originals, exact cap arithmetic, and honest partial/unknown results.
Existing camera/native publisher and UI tests must still pass. No blanket full
suite repetition unless an actual changed boundary justifies it.

S2 — stopped source review then one offline build/static review. Pin new source/APK,
same signer/UID/package/update path, merged non-exported Activity, unchanged
permissions, unchanged model/recipe, resolved dependency hashes and native-library
delta. Review actual Activity registration at creation; no mock can establish it.

S3 — approved generated phone check, no camera. Use the fixed tiny fixture lane
through the SAME Activity/state engine: recreate Activity once with picker open,
then terminate only this background test process once while picker remains open
(not force-stop/clear-data), select the prepared generated empty document, and
observe exactly one validated write after restart. Reopen completed app once and
verify read-only durable receipt/content. Record actual process change and result
delivery independent of JS; no repeated trials if inconclusive. Budget: one fixture
selection/write, one Activity recreation, one background process death, one completed
restart. No actual-photo recovery begins unless this check passes independently.

S4 — approved actual recovery. Inspect fixed existing empty ZIP, update-preserved
run and counts, then one selection of that document and one recovery operation.
No timed human-readiness countdown while reading the selection instructions.
After exact native readback verification, transfer that exact ZIP once; verify host
bytes/hash, entry caps/CRC/manifest/profile bindings. Preserve every original failed
export observation. Any uncertain effect is reconciled read-only, not replayed.

S5 — finish the existing evidence audit. Freeze original-image annotations before
comparison with the already frozen preview annotations. Verify geometry/crop,
permissions/control phase evidence and claims. Preserve four inconclusive preview
markers and strict scene/framing issues; export success cannot close them or imply
P2-03 acceptance. No new photo budget or tolerance change follows from this plan.
Coordinator issues an explicit P2-03 disposition before P2-04 can start.

Return one handoff with changed files, original/new pins, exact checks/results,
failure cases, preservation hashes, remaining uncertainty and STOP. Notify main
directly when done. No implementation dispatch or phone action in this planning turn.

## Sources checked

Existing native implementation, frozen build resolved-artifacts.json, D-059,
the export failure receipts, and the preview-only audit were inspected.
Android documents unconditional Activity Result callback registration after
recreation and separately saved operational state:
https://developer.android.com/training/basics/intents/result
Single-document access and persistable grants:
https://developer.android.com/training/data-storage/shared/documents-files
These API facts inform the design; device verification remains required.
