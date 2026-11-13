# Orientation C2 artifact — independent disposition

2026-10-24. **Verified for build/static scope.** Prepare the bounded installation/
generated-export device procedure. P2-03 physical acceptance and P2-04 remain held.

Exact APK40030950bytes/SHA256
ba5cffdb4b143e89e2412637dc8670e3ece40090ba7493836801cb5f4a3710c2;
700-input source index5df65a511d61d63cb798a7a844628a49d636306bb8a82b2967c8741282c19716.
Main independently rehashed all700 source inputs and82 indexed C2 evidence files,
then verified actual APK size/hash, apksigner signature/certificate,16KiB ZIP
alignment, package/version, CRC,18 arm64 libraries and fixed model hash.
Signer48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.

Main independently parsed the actual packaged binary manifests via aapt2. The
new APK has only CAMERA plus the existing application signature receiver permission.
Full semantic comparison to accepted recovery APK matches after removing exactly
one V2 metadata entry and the non-exported orientation recovery Activity. Vendor
camera query and three optional library entries are absent. Both inherited
settings and manifest staging blockers are resolved in this artifact.

Main freshly reran the builder's instruction-aware DEX parser against this APK,
redirecting output to reviewer evidence: all7 registry/public-static claim/discard,
type linkage/property/event/job-field checks pass. This reuses the reviewed parser;
it is not a claim of an independently authored DEX oracle or Android execution.
Builder's remaining364-condition artifact, packaged HBC/source-map, ELF/native
delta and exact graph/precheck evidence was reviewed through its sealed packet.
Do not describe all364 conditions as independently rerun by main.

Reviewer evidence: apps/recognition-lab/runs/phone-experiment/
p203-orientation-artifact-audit-20261024-a1/ (independent-artifact-review.json,
signature/zipalign/badging/manifest receipts, fresh-dex-parser.json and actual
DEX binding proof). C1 APK/failures and all original evidence remain preserved.

This is static update compatibility, not installed-device identity verification.
No phone connection/install/picker/camera/model/export was performed by main.
Generated export/restart on the updated device precedes any photo. Capacity and
actual CameraX/SAF behaviour need device evidence; all8 fresh physical geometry/
scene rows require a separately reviewed packet and fresh readiness. Existing
180s full-storage stress timeout remains unverified, alongside declared SDK
cache/RAM, hardware-drain and power-loss/provider-directory durability limits.

Next: same Track B High prepares the minimal bounded host helper and expected
generated ZIP for an in-place update plus one generated metadata export/restart.
No additional camera feature or repeated interruption matrix is needed here.
