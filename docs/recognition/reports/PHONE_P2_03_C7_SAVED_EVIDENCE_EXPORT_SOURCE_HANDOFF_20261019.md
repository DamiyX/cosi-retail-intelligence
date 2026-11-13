# C7 saved generated-chart export — source handoff for independent review

2026-10-19, Africa/Lagos. Implements the founder-approved D-057 source dispatch;
no APK/native build, installation, phone action, picker, actual export, capture,
model run, permission/radio/dependency or Git/CI change. Quantitative geometry
remains INCONCLUSIVE. This source correction does not accept P2-03/G4.

## Objective, boundary and recovery limit

Add one explicit camera-only action, Export this saved test evidence, for saved
job9d763e82-2a00-42ce-9a5f-0f4b2d9fde5c. Original files/EXIF and legacy owner
36004274...b9d0e are retained. No generic job/path reader, tensor-file fiction,
private/P1 export change, decoding or inference. New source and APK provenance
are distinct from capture source/APK and data ownership.

This crosses app-private generated image data to a selected local document.
Abuse cases considered: another job/arbitrary path, unresolved/invalidated or
substituted evidence, remote provider, overwriting user data, partial ZIP over
the cap, stale callbacks releasing another owner, and crash replay after picker.
Controls are enforced natively; UI state is only presentation. Coordinator must
independently review the boundary before an artifact/device gate.

Permanent allowance16908288bytes =16MiB output +128KiB sidecar, within the old
256MiB aggregate logical bound. Camera actual/claimed sub-budget251527168bytes
is checked by common Store scan and admission/write paths. Status separately
reports camera usage/claim, camera cap, output/bookkeeping allowances and aggregate
claim. Existing oversized state refuses without eviction or rewriting. Old
reservation size and receipt semantics stay unchanged; this is not an SDK, RAM,
OS allocation or physical-disk cap.

The separate canonical camera-evidence-export-v1 directory consumes availability
as soon as it exists, including empty crash residue. An exclusive attempt file
is file-synced and its verified parent directory synced before picker authority.
Two fixed sidecar names, each<=4096bytes, are allowed. Camera Android root checks
also reject unbounded/unknown sidecar footprint. Terminal status appends a second
file; nothing is renamed, released, reset, overwritten or deleted. Unknown/torn/
reopened state never authorizes another attempt. A sync failure retains the
uncertain attempt; no transient flag makes it replayable. There is no recovery UI
or claimed automatic cleanup of a partial selected document.

## Implementation surface

- CameraProofStore: reduced sub-budget on all scan-based consumers; fixed complete
  PUBLISHED eight-role profile read, exact job, all groups resolved, no invalidation
  or residue, existing done/resolution/role cap/hash/owner checks before bytes leave.
- CameraProofFiles: separately verified exclusive sidecar directory and parent
  synchronization; existing canonical/UID/regular/single-link IO reused. JNI
  publisher is unchanged and never receives an external document path.
- CameraEvidenceExport: fixed role names plus manifest.json; original raw/preview
  SHA pins, numerical/receipt identity, strict JSON job/model/recipe/owner/header
  bindings. STORED ZIP entries preserve bytes; no ZIP staging or recompression.
  Output cap includes headers/directory/manifest and actual short-write accounting.
  Any write fault is sticky so ZIP close cannot emit more bytes. Actual count/hash,
  sync, rewind and bounded full readback must agree before READBACK_VERIFIED.
- CameraEvidenceJournal/Session: append-only attempt/terminal records, distinct
  request31007 (outside P1 codes and generated40000+), process shared busy gate,
  callback-once claim and settlement, cancellation retains pending picker/writer
  ownership. Destruction or a throwing picker dispatch may conservatively retain
  busy ownership until its callback or process ends; no fabricated drain. A stale
  ticket cannot cancel/release a later operation. Reopen refuses replay entirely.
- CameraEvidenceAndroid: exact saved Store profile, installed APK hash and source
  provenance. Only local Downloads authorities/document IDs; query/fragment/user
  info and unknown/remote IDs refuse. New document opened rw, never wt/w/truncate;
  regular/single-link/seekable/empty descriptor required. Identity checked on every
  operation; no selected-document deletion. Closing failure withholds verified
  delivery. Provider namespace/power-loss durability explicitly unproved.
- RecognitionExperimentModule: camera-only picker/callback/session integration;
  worker drain, stale callback and teardown handling. Existing P1/generated picker
  flows are untouched. CameraProofPanel/nativeAdapter/cameraEvidenceExport.ts add
  the explicit action, cancellation and bounded result validator; no bytes/paths
  cross the JS bridge. Controls gain one row; future layout/physical checks must
  use the resulting measured preview rectangle, not old screenshot dimensions.

## Source binding and preservation

Fresh writer root apps/recognition-lab/runs/phone-experiment/
p2-camera-export-c7-source-20261019-a1/writer/ contains before-index and SHA-named
snapshots of298 scoped inputs plus initial Git status. All previous dirty C5/C6/C1
changes were kept. Changed/added paths and after hashes are recorded separately;
comparison is against that baseline, not the entire pre-existing HEAD diff.

New60-row source/check index:
ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84.
The source helper deterministically renders CameraEvidenceExportSource from this
digest. Its derivative SHA is6458e69dc894f0fb3ac69a3a7966d96f6e42ba8e315f9fe9e39a17972761cf30.
The rendered constant is excluded from its own input digest to avoid a self hash;
the rendering helper is indexed and runtime-binding.json separately binds output
path/size/hash. An eventual build must include and check this derivative and the
exact source index. The original CameraProofSource owner is separately indexed
and unchanged; no historical index/STOP is rewritten.

## Checks actually run

Source/check helper uses only cached JDK/SDK/Node and local dependency artifacts.
No Gradle/native link/APK generation. Exact commands and output in named folders:

- host-a3:90 new generated export/store/journal/session assertions and existing
 188 durability,215 recovery,134 finalization controls. Host IO is an explicit
 logic seam; simulated directory failures are not Android fsync evidence.
- android-a3: all current camera and export Java sources compile against API36
 and cached runtime jars with actual derived exporter source pin. Earlier a1/a2
 used a source-check-only dummy constant; they are not runtime provenance.
- kotlin-a1: actual modified module compiles against cached API36, Expo/RN and
 old compiled CPU dependencies, with new Android source classes ahead of them.
 No stub Expo module. Classpath artifacts and module source hash retained. That
 type check used android-a2 classes; final Android Java compile checks the later
 sticky-write implementation and exact derived constant. No public signature
 changed between these Java checks.
- ui-a2:48 tests/five suites pass, including explicit export without SDK capture
 or native processing, cancel/unmount forwarding, validator negatives and the
 existing camera protocol/config/isolation/UI controls.
- types-a2 and lint-a2 pass. Source pin check and scoped diff whitespace check pass.

Failures retained: initial nested before-snapshot hit Windows WinError206 before
source edits; partial tree kept and flat hash snapshots used. host-a1 new capacity
fixture mistakenly reserved repeatedly with unresolved work, correctly refused
CAMERA_RECOVERY_REQUIRED; corrected to generated old-state records. lint-a1 found
two unused newly imported test mocks before the export UI test was added. Initial
ui-a1 passed47 tests but is superseded by48 after that added test. Short-write
sticky failure was a self-review correction, covered after correction; no claimed
observed before-fix regression execution. No weakened assertion or timeout retry.

## Residual risk and decision requested

The complete *original pinned JPEG/PNG* positive export path cannot be executed
on this host because those bytes remain in the phone's sandbox. Store positive
profile and streaming/readback tests use generated host files; original hash-pin
rejection is tested without relaxing production pins. Original-image export,
SAF picker/provider rw semantics, descriptor substitution/link/path behavior,
Android sync/close/readback faults, real Activity lifecycle and output retrieval
remain unexecuted. Existing Android path/link guards are reused and compiled,
not newly established by host mocks. No power-loss or provider-directory
durability claim. No new physical geometry measurement was performed.

Independent coordinator source/security/accounting/lifecycle audit requested.
Review entire destination/ownership path, positive original bindings and terminal
status behavior, conservative retained owner after uncertain picker dispatch,
budget/status semantics and derived provenance. If accepted, prepare a separate
bounded build/static packet; source approval alone does not install or export.
No further capture is needed or authorized by this correction. P2-04/later gates
and GitHub/CI repair remain held/deferred.
