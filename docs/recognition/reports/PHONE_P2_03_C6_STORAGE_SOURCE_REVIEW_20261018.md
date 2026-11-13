# C6 storage source review — changes required

2026-10-18. Independent coordinator review after writer STOP. Scope is the C6
source/generated-check slice against its saved pre-C6 C5 snapshots, not all
uncommitted changes against HEAD374286d. Source index49 rows, handoff hash and
six check-receipt hashes reverified. No production-source edits, native linking,
APK build, phone action, private-file access, recovery or Git push in this review.

## Specification finding: high, confirmed by generated counterexample

**A visible terminal resolution can release its reservation after failed
directory synchronization, without any later synchronization attempt.**

CameraProofStore.scan accepts any structurally valid final .resolution and
immediately changes its claim to actual retained bytes. recover skips groups
with a non-null resolution. Thus, when publish renames resolution.new to
resolution and then fails directory fsync, the error initially propagates but
the next status/recovery observes the final pathname as if durability had been
established. The existing restartAtEveryPublication fixture explicitly simulates
this case but only tests visible filenames/hashes, not a successful flush barrier.

Fresh reviewer fixture CameraProofDurabilityReview.java uses actual current
Store plus a generated HostIO that throws CAMERA_IO_DIRECTORY_SYNC_EIO after
resolution publication. The subsequent status releases the claim; recover(true)
performs no new publication/sync; reserve then admits another generated ticket.
No camera or native syscall is exercised. This proves the store's decision gap,
not a power-loss data-loss event on the Samsung device. A later successful
publication could incidentally flush the directory, but the earlier status and
recovery success already made the unsupported durability/capacity decision.

This violates D-056's explicit requirement that capacity be released only after
durable resolution. Correct it before accepting source or preparing an APK.

Correction acceptance conditions:

- A visible final resolution alone must not establish durable completion after
  an uncertain publication. Establish a verified directory synchronization
  barrier before accepting terminal evidence/releasing its reservation; include
  same-process retry and reopen in a new Store/process. A successful barrier may
  acknowledge an already present validated file without rewriting its bytes.
- Persistent sync failure must preserve conservative claim, report/refuse
  readiness and prevent admission. Do not fix this only with a transient flag
  that forgets uncertainty on construction/restart.
- Cover all consumers of resolved evidence, including status, reserve, recovery
  and numerical readiness, with one coherent boundary. Account for finalization
  and interrupted resolution; audit sibling done/invalidation publication cases.
- Preserve exclusive publication, canonical/owner/identity checks, primary
  errors, immutable evidence and the256MiB limit. No retry loop, overwrite,
  deletion, fsync suppression or alternate store root.
- Add a durability-aware IO fixture that distinguishes visible and durably
  acknowledged names. Prove repeated sync failure stays blocked, later success
  permits idempotent classification, old bytes/hash stay unchanged, and valid
  durable completion still works across reopen. Do not merely rename the existing
  after-publication test or count file presence as the oracle.

## Standards and other reviewed boundaries

No additional blocking issue established in the inspected source surface.
The adapter uses lazy loading, runtime symbol resolution, minSdk24, bounded
paired leaves, descriptor identity checks, file fsync, kernel no-replace rename,
post-publication identity checks and directory fsync; close errors preserve an
earlier primary failure. Actual symbol loading, API24 compatibility, final R8/
ELF packaging, Android no-replace/race/alias handling and durable reopen remain
unexecuted, not approved by syntax checks.

Strict staged reservation eligibility and drain assertion are present. Malformed
or extra staged state refuses, interrupted drafts are validated before reuse,
and no success receipt is fabricated. Bounded inspection exposes roles/bytes/
hashes rather than file contents/paths. Primary pre-ticket errors are retained.
Same-UID concurrent mutation remains a detectable race, not a proven impossible
condition. No broad security or physical camera acceptance is claimed.

## Fresh evidence and limits

Review evidence root:
apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-review-20261018-a1/

- review.py verified all49 source paths/sizes/hashes, handoff and six saved
  writer check receipts against STOP.
- Fresh javac compilation passed; actual recovery215 and finalization134 host
  assertions passed. The extra reviewer counterexample reproduced the finding.
- result.json contains exact commands/exits/output. No writer helper was run
  past its STOP guard. Reviewer root-path setup initially selected one parent
  too high; corrected only that harness path before compilation, no source or
  assertion adjustment.
- UI/types/lint/Android compile/eight NDK syntax results were inspected and
  hash-verified writer receipts, not all independently rerun. No native runtime
  or device claim follows. Historical cold-render timeout remains unresolved.

## Return to writer

Same Track B writer, Sol6.1 High, source/generated correction only under the
already approved durability-preserving repair. Fresh correction evidence and
before snapshots; preserve C6 STOP, all old source/evidence, current APK and old
phone group. Own only the storage durability barrier and necessary IO/JNI/test
seams plus source binding/handoff metadata. If correction requires a different
storage/security contract or scope expansion, stop with that decision.

Do not build/link/install, execute the separate probe, touch phone data, recover,
capture, run a model, change dependencies/CI or commit/push. STOP after correction
and directly send the handoff/receipts for coordinator audit. P2-03/G4 and later
dependent phases remain held; GitHub correction remains deferred.
