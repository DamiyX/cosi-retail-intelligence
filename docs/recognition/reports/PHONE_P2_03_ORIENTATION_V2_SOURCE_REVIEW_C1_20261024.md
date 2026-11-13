# Orientation V2 source review C1 — changes required

2026-10-24. Independent coordinator review of the stopped Track B source slice.
**Correction required before build/device preparation.** P2-03/P2-04 remain held.

Review comparison is the writer's preserved task-start copies and exact source
packet, not the entire dirty branch against Git HEAD. Handoff SHA256
ffad711c26082a22ebc2285390a2ced4606bde15815571aec46afc01a5bcd68e;
696-input source index a44ce08a84ffcdd32797f9fbdbbd32942ccf98c49a82d7696d554ec20164abf8.
Main independently rehashed all696 indexed inputs,27 added files and149 indexed
evidence files: no mismatch. Eight original images/frozen evidence remain historical.

## Specification finding — HIGH: advertised size treated as mandatory actual size

`CameraOrientationGeometry.java` requires requestedW==actualW and
requestedH==actualH (CAMERA_GEOMETRY_REQUESTED_ACTUAL_SIZE). The UI supplies these
request fields from choosePictureSize/getAvailablePictureSizes, before capture.
`CameraProofAndroid.process` passes those request values into the validator.

The actual recovered M00 request.json is2336x1080; its numerical.json and original
JPEG are1440x1080. The new path uses the same size selector. An independently
compiled host probe constructs otherwise consistent native orientation metadata,
uses the immutable M00 JPEG header/hash and verifies:1440x1080 as request passes,
2336x1080 as request refuses with exactly CAMERA_GEOMETRY_REQUESTED_ACTUAL_SIZE.
This would consume a new physical row on an already-observed harmless SDK size
fallback. The plan explicitly requires actual dimensions independently of the
advertised/requested size. Current generated checks instead expect this refusal.

Correction: retain requested dimensions as provenance and apply their own bounded
input validation. Derive processing dimensions from verified ImageProxy/JPEG/header
and native hash attestation. Require those actual observations to agree; do not
require the advertised size to equal them. Keep actual pixel/byte/crop/EXIF/rotation
limits and all stale/native-token refusals. Add positive regression for the observed
2336x1080 ->1440x1080 fallback, with negatives for inconsistent actual observations,
oversized actual output and unsupported crop/rotation. Do not force a new picture
size policy, recompress, change limits or change old source/recipe records.

## Standards and verification disposition

No additional standards blocker established in the reviewed orientation/admission
and reproduction path. This is not blanket approval of every new export/native
lifetime boundary. Main inspected native rotation/history/token code, amendment
application, JS admission and export entrypoints; final source review follows the
bounded correction. No source was repaired by the reviewer.

Main independently compiled the pure native source and ran355 geometry assertions
and362 generated export/restart assertions, both passed. The independent probe
then reproduced the specification failure despite those passes. Evidence/scripts:
apps/recognition-lab/runs/phone-experiment/p203-orientation-source-audit-20261024-a1/
(integrity.json, independent-compile.json, both check receipts,
requested-actual-probe.json, RequestedActualProbe.java, review.py).

Writer's full legacy storage stress timeout at180s remains UNVERIFIED, not a pass.
Focused legacy suites and the freshly passed generated export suite give narrower
evidence; no timeout increase, repeat-until-green or claim of full storage coverage.
The reported raw/hash/token and fixed-size export boundaries still require final
review; APK/R8, actual Android transitions, generated device export/restart and
physical FOV/scene geometry remain later gates.

Next: same Track B writer Sol6.1High makes only the stated source/test correction,
refreshes the affected source pins and evidence, stops/releases lease and directly
reports a concise handoff to main. No APK, phone, new photo, Git/CI or P2-04 action.
