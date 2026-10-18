# P2-03 G0 decision — isolated camera proof

2026-10-15, Africa/Lagos. **Choice A approved by founder; source implementation
only. Exact build/install/generated-target physical proof remain later gates.**
October17 amendment: D-055 and the approved G3-C2 proposal permit a task-owned
camera-only derivative and the exact internal AndroidX signature receiver guard
for a fresh offline build/static packet. Installed/production inputs stay unchanged;
this does not grant installation/physical proof or waive the D-054 storage limits.

Founder requested the next phase after P1 offline confirmation and reported USB
connected with normal phone connectivity. This authorizes preparation/review;
The founder then explicitly selected “Approve this isolated camera experiment”
in response to the concrete camera-only/owned256MiB/separately measured SDK-cache
question. D-054 records that selection. No build, install, camera access or radio
change is performed by this decision document.

## Outcome and established baseline

One deliberate rear-camera request in the isolated recognition experiment must
produce a locally reviewed crop, tensor/vector and durable numerical receipt.
Permission denial, malformed/oversized input, cancellation, backgrounding and
interrupted storage must produce retained refusal/interruption facts. No product
matching, enrollment or multi-frame scanning is needed for this first proof.

P1 G1 physical/result review is closed for its frozen40-photo/80-attempt packet:
411 valid actual-OFF observations,40/40 control parity,17/20 control and19/20 phone
first choices,20/20 first-three for both, restart/export/comparator verified.
See reports/PHONE_P1_OFFLINE_CONFIRMATION_RESULT_20261015.md. It does not prove
camera capture, preview/capture geometry, live timing or camera ingress security.

Installed Expo Camera already exists in the repository; the recognition plugin
currently excludes it and the isolated app blocks CAMERA. The raw JPEG resolver
`node_modules/expo-camera/android/src/main/java/expo/modules/camera/tasks/ResolveTakenPicture.kt:185`
writes imageData into ByteArrayOutputStream and then SDK cache before returning
the URI. Consumer checks cannot impose a hard cap on those earlier allocations
or writes. Requested picture size is not proof of actual returned size.

## The two policy choices

| Choice | What is guaranteed / measured | Consequence |
| --- | --- | --- |
| A — recommended for this isolated experiment | Enforce256MiB on experiment-owned retained/staged/metadata/derivative/export storage. Track camera-SDK temporary files and observed peak separately; state that SDK producer allocation/cache has no proven hard application cap. | Evaluate the installed provider without claiming an all-inclusive cap. Keep conservative free-space checks and stop on unknown/oversize/resource failure. |
| B — require a hard total cap including SDK production | Do not use post-capture rejection as the producer bound. First prove a producer-side limit or prepare a separately reviewed bounded native/provider design. | Camera source integration waits for that design/evidence; no provider/dependency substitution is automatically authorized. |

Recommendation: **A for the isolated test only.** It is a deliberate amendment to
the original draft's all-inclusive256MiB claim, not a proof that camera-library
temporary storage or total process memory stays under that cap. Neither choice
promises115 photographs fit;115 remains only the later count ceiling. Exact
owned-write peak/reservation arithmetic must be derived from the actual storage
layout, including atomic `.new/.bak`, failure residue and export copies. Never
reuse the draft's conditional19/20 count as a guaranteed capacity calculation.

## Camera permission, privacy and input boundary requested with choice A

- Source-level opt-in to the same isolated recognition-verification variant;
  CAMERA is its only newly permitted Android permission. Ordinary business and
  original zero-permission recognition variants retain their behavior. No
  microphone, gallery/media/storage/location/network permission or upload.
- User starts permission/capture explicitly; denial remains a non-capture result.
  No automatic permission/settings navigation or capture/retry loop.
- Only a current native-issued job may ingest a regular canonical UUID JPEG
  returned by the proof UI under this app's cache/Camera directory. Reject
  content/http/foreign roots, traversal, symlinks/aliases, substitutions, stale
  or duplicate jobs. Directory membership alone is not sensor provenance: this
  experiment explicitly trusts the app's camera callback plus native path/ticket/
  opened-file identity checks; no cryptographic sensor attestation is claimed.
- Request a reported picture size<=4,000,000 pixels; independently require actual
  JPEG<=12MiB and header pixels<=4,000,000 before bitmap allocation or admitted
  copy. Keep strict observed metadata/EXIF agreement; unknown returned dimensions
  refuse or remain inconclusive under the original policy, never silently filled.
- Same pinned CPU model/settings and pixel-centre bilinear/grey128/224x224/RGB
  float32/div255 recipe, with a separate camera source/recipe binding. Do not
  relabel new camera data as P1 or alter its old pin/comparator/accepted results.
- Distinct app-private camera journal/store; reserve before each owned write,
  commit hash-bound evidence before readiness, count partial/reserved bytes across
  restart. No business SQLite/catalogue/outbox or gallery publication.
- One operation stays owned through actual capture/native/file drain. Cancel,
  background or permission loss invalidates publication; stale results cannot
  publish or release a newer job. No forced native preemption, automatic recapture,
  silent evidence deletion/eviction or lost-capacity reset.

## Source scope and execution sequence

After selection is recorded, update the decision log and active P2 documents,
freeze the24 P1 source files and accepted-result bindings, then dispatch the same
stopped implementation writer for scoped P2-03 source/generated checks only.
The source allowlist is section3 of PHONE_P2_03_CAMERA_REVIEW_PACKET_20261014.md:
camera opt-in config/plugin, isolated proof screen/validator/native adapter,
ticket-bound module integration, new camera CPU/store/geometry helpers and focused
tests/verification scripts. Narrow the exact first slice in its dispatch.

No new package/lock/native dependency/provider or node_modules change is approved.
Missing dependency/class closure returns for review rather than broad autolinking.
The original raw JPEG geometry and boundary hypotheses remain as reviewed in the
October14 packet; storage wording is superseded by the selected policy here and
PHONE_P2_03_CAMERA_PACKET_C1_CLARIFICATIONS_20261015.md.

Writer stops and returns the handoff file; coordinator audits source before an
exact task-owned build/static APK review and a separately specified generated-
target physical proof. No install or camera use from source approval alone.
Phone is not needed for source work and may stay online; later proof supplies
fresh connectivity/readiness instructions. P2-04 starts only after camera proof.

## Decision record

Founder choice: **A APPROVED**,2026-10-15. Permission/URI trust and storage-policy
approval: **APPROVED FOR ISOLATED SOURCE IMPLEMENTATION**, as D-054. The question
explicitly included the missing hard SDK temporary-storage/total-memory cap and
separate later build/install/physical packet. G1 and G0 are closed for their
stated scopes. Actual camera implementation/source audit/build/physical proof
have not passed. A fresh exact same-writer source dispatch follows this record.
