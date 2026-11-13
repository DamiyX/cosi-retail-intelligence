# Orientation V2 C1 correction handoff

2026-10-24. Bounded requested/actual correction complete; Track B stopped for review.

The advertised2336x1080 ->actual1440x1080 fallback now passes native geometry admission.
Requested dimensions retain their independent4MP bound and requestedSize provenance.
Actual buffer/JPEG/header/hash/EXIF/full-crop/rotation/generation/token restrictions
remain. Archive and TS receipt consumers preserve the distinction. No picture-size
policy, model/pixel recipe, native camera amendment, ownership, limit or V1 change.

Exact packet: `apps/recognition-lab/runs/phone-experiment/p203-orientation-source-c1-20261024-a1/HANDOFF.md`.
700-input source index `5df65a511d61d63cb798a7a844628a49d636306bb8a82b2967c8741282c19716`;
7-file delta patch `0777e2c38f702df7c73a3c8910ee413e0f9a6db1945dd6155029cc263a1ed303`.
Six source/test files and new V2 derived source pin changed. Prior packet/audit preserved;
all149 original evidence bindings verified. No historical profile or recipe relabeling.

New positive regression failed before correction. After:369 geometry +364 generated
export/restart assertions; immutable M00 header/hash probe accepts the observed
fallback with generated native metadata; all Java sources compile offline;17
unchanged compiled native-token checks;77 Jest/9 suites, types and zero-warning lint
pass. Exact command and source/test hashes in packet. Kotlin/C/amendment source
unchanged, not recompiled in C1. Prior180s full legacy storage timeout remains
UNVERIFIED and was not rerun.

No APK, phone, new photo, private-photo inference, Git/CI or P2-04 action. Source
self-check is not independent or physical acceptance. P2-03 remains CHANGES REQUIRED;
P2-04 held. Main reviews the stopped C1 delta before any build/device packet.
