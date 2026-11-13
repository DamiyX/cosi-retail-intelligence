# C6 functional checks accepted; original-image evidence gap

2026-10-19, Africa/Lagos. Coordinator High review of stopped Track B fixed
verification: ACCEPT its bounded findings. Capture/process/commit/reopened-store
observations succeed. Quantitative geometry remains INCONCLUSIVE, not failed.
No further phone action, capture or source implementation in this review.

## Independently reviewed facts and missing capability

Read the complete stopped report and fixed result, rehashed all55 handoff inputs,
and inspected the actual CameraProofStore/Android/Panel capabilities. The approved
method is docs/recognition/PHONE_P2_03_CAMERA_REVIEW_PACKET_20261014.md, lines170–186:
independent preview/upright-original-JPEG landmarks, <=2physicalpx annotation
uncertainty, <=1% upright-dimension registration residual, <=1sourcepx crop rounding,
observed content extent/motion and no per-capture corrective transform fitting.
The first-capture packet retains this gate and its one-shot ceiling.

Store retains raw.jpg/preview.png/receipt.json/numerical.json/request and commit/
resolution markers. UI exposes candidate Image and numerical text, not original
JPEG or pixel data export. Native exposes numerical(id) and preview URI only;
existing generated/P1 exporters have different data/ownership contracts and
cannot be repurposed by invoking them on camera files. No raw camera tensor is
retained; do not claim there is an original tensor file ready to export.

Scaled candidate screenshot and metadata cannot independently supply original
JPEG landmark coordinates or prove the physical FOV mapping. Qualitative upright
chart/all-eight-markers evidence stands. Damaged display colour/banding remains
separate. Missing evidence is a tooling gap; no new camera-save defect observed.

## Recommended next correction — proposed, not approved/implemented

Provide an explicit isolated **Export this saved test evidence** action for only
the existing accepted generated-chart job9d763e82-2a00-42ce-9a5f-0f4b2d9fde5c.
Use the existing installed Android local-document picker approach, no new
permission/provider/dependency/network path, and no production RecognitionService
or business-data change. The exported original photo includes its full captured
scene and original EXIF; founder approval is required before this new data path.
It is local evidence, never automatic Git or cloud content.

Required finite contents: exact raw.jpg, exact224px preview.png, existing numerical
and receipt JSON, request/commit/resolution/reservation facts and a hash manifest.
No arbitrary app/cache paths, P1/private-product data, directory dump or unresolved
job. Verify valid PUBLISHED resolution, complete profile and every bound hash via
the owning Store before export. Keep target job and original capture APK80e71788...
/source51 edaab3d4... explicit. A later exporting APK must be bound separately;
legacy36004274... owner must not be rewritten or claimed as current provenance.

Use a bounded plain ZIP with a fixed safe entry allowlist, <=16MiB total and
per-entry existing caps (raw<=12MiB, preview<=256KiB, JSON/marker bounds retained).
Stream without another full decoded bitmap or model inference. No EXIF editing,
image recompression, silent correction, new capture or re-inference. No numeric
vector/model-copy embellishment. Original files stay immutable.

The implementation plan must explicitly reconcile export staging/progress/
retained partial-document accounting with D-054's aggregate256MiB owned bound,
shared busy gate and restart ownership. No claim that streaming, an external
document URI or a process-local flag automatically meets that bound. Prefer one
explicit export for this diagnostic job and conservative reservation rather than
a general-purpose export service. Any needed durable export bookkeeping/format
amendment must be specified and coordinator-reviewed before coding it.

Cancellation, destination rejection, short write, fsync/provider error, activity
destruction and reopen must retain truthful partial/incomplete status and block
unsafe overlapping work. No deletion of a user-selected document, retry loop or
release of uncertain ownership. Local Downloads must be selected explicitly;
an arbitrary remote document provider is not permitted. Do not add a debug
bridge returning arbitrary file bytes or use root/run-as/private extraction.

Likely code boundary: isolated Store bounded committed-job reader, small separate
CameraProofEvidenceExport helper/state, existing RecognitionExperimentModule's
explicit camera-only native/picker integration, CameraProofPanel/nativeAdapter
and focused export tests. New state ownership must remain separate from P1 exports
and normal business data. Source changes require Sol6.1 High and stopped handoff.
The prior Low execution preference covers fixed tests only, not this correction.

## Validation and return to fixed testing

Before implementation, finalize exact state/journal/cap accounting amendment and
source scope under founder approval. Tests must cover wrong/unresolved/other-job
reads, hash mismatch, symlink/path/destination rejection, cap boundary, concurrency,
cancel/partial write/reopen, original bytes preserved and zero capture/model calls.
Then stopped source audit; separately exact offline build/static update preserving
all old app data, manifest permission surface and current native dependencies.
No build/install or new export action is granted by this proposal alone.

After a reviewed explicit user export, verify exported JPEG/PNG/numerical hashes
against the existing receipt before any image measurement. Inspect actual JPEG
header/EXIF and annotate original landmarks through the already approved method.
The224PNG can support recovery of the quantized tensor values only if independent
reconstruction hashes exactly match the original tensor hash; no silent assumption
that screenshots or a different JPEG decoder reproduce Android pixels.

First analyze the existing capture; no new photo is presumed necessary. Missing
original timing/motion or excessive landmark uncertainty may still leave geometry
INCONCLUSIVE even after export. If another observation is needed, prepare a finite
packet with stable mounting/readiness/timing and approval, not automatic retries.
Do not lower the <=1%/2px/1px criteria to make an existing image pass.

## Decision and carry-forward

Recommended: approve bounded evidence-export specification/source correction,
using same Track B writer Sol6.1 High, independent stopped audit, then Low for
fixed approved execution. This is a test-tool correction, not a new recognition
algorithm or permission to progress P2-04. No founder aiming is needed now.

Pending founder approval for this new evidence/data path. Writer remains STOPPED,
lease null. No further capture/model/device/source/build/install/CI/Git action.
P2-03/G4 quantitative acceptance and later prerequisites remain held; GitHub/CI
repair remains deferred until camera test satisfactory, as founder requested.
