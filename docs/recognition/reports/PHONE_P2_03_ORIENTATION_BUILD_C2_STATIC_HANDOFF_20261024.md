# Orientation build C2 — static checks complete

2026-10-24. One offline release built; Track B stopped for independent artifact review.
APK40030950 bytes/SHA256ba5cffdb4b143e89e2412637dc8670e3ece40090ba7493836801cb5f4a3710c2.
Exact packet: `apps/recognition-lab/runs/phone-experiment/p203-orientation-build-c2-20261024-a1/HANDOFF.md`.
Source700 pin5df65a511d61d63cb798a7a844628a49d636306bb8a82b2967c8741282c19716 unchanged.

C2 restored the hash-pinned accepted camera base manifest in new private staging,
then applied reviewed V2 metadata. Full source-to-stage exception/diff retained;
no workspace/source/permission-policy change. Two camera exclusions remain removed.
Actual local autolink and Gradle project/dependency graph prechecks pass. BEFORE
release, full semantic merged manifest equals accepted CAMERA/isolation baseline
plus only V2 metadata/non-exported Activity. Relative Activity-name verifier issue
was corrected with namespace expansion only; original failure/helper preserved.

One offline release exit0 in6m36s. Fresh actual C2 APK checks:364 conditions pass;
CAMERA present/no network/audio/storage/location permission or vendor declarations;
correct signer48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83;
actual R8 registry public-static methods/property/event/job binding; V2 release entry
bound to packaged HBC; fixed model;18 arm64 libraries/16KiB alignment. Only publisher
meaningful native delta/new fixed namespaces/same JNI export. Actual graph matches
accepted recovery a13e0eac88abbdb4b5073a5c584ebb955b7e0289b01d14cc34bb0b4a1c1f856b;
capture baseline comparison retained. No artifact pass inherited from blocked C1.

All700 sources/derived pin/private-stage inputs/old source/APKs/graphs/original ZIP
preserved. No dependency/network/device/ADB/install/photo/export/private inference/
Git/CI/P204/P205/agent action. Old180s full-storage timeout remains unverified.
Physical scene/FOV/camera/native lifecycle/grant/RAM/drain/durability checks remain.

Next: main independently audits C2 APK, then separate update-in-place/generated
export device packet before any new photo. P203 physical acceptance/P204 held.
