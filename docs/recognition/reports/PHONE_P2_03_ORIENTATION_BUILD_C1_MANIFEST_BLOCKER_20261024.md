# Orientation build C1 — APK built, manifest blocked

2026-10-24. Track B stopped; APK retained for review, DO NOT INSTALL.
Packet: `apps/recognition-lab/runs/phone-experiment/p203-orientation-build-c1-20261024-a1/HANDOFF.md`.
APK40031070 bytes/SHA25635991c9d655ccbf0e558023c331e0568fa122785eed826e426fbd6572094a62a.
Accepted source700 pin5df65a511d61d63cb798a7a844628a49d636306bb8a82b2967c8741282c19716 unchanged.

C1 removed only the two camera exclusions. Actual local Expo/RN arguments and
Gradle projects/graph prechecks selected exact private camera/recognition paths.
Graph/artifact hashes match accepted recovery; app/camera/CPU match capture baseline.
One offline release passed in8m25s. No second release or source correction followed.

Blocking static finding: CAMERA permission is absent because a recovery-generated
workspace AndroidManifest overlay retained tools:node=remove. Vendor camera query
and3 optional vendor uses-library declarations also returned. The new V2 metadata
and non-exported Activity are present. Runtime source/config policy is not repaired
in this build slice. The broad generated Android overlay needs a bounded staging
correction and merged-manifest semantic precheck before another release attempt.

Other artifact checks pass for scope: correct signer48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83;
actual R8 registry public-static claim/discard, camera property/event/job binding;
release V2 selection bound to packaged HBC; fixed model;18 arm64 libraries and16KiB
alignment; only publisher meaningful native delta/new namespaces/same JNI export.
Original dotted-class-string verifier failed because R8 emitted const-class;
corrected read-only instruction proof passes, original failure retained. Manifest
findings remain failures; no overall static acceptance or phone usability claim.

All700 sources/derived pin/private-stage inputs/old source/APKs/graph/original ZIP
preserved. No runtime/dependency/permission/model edit, network, device/ADB/install,
photo/export/private inference/Git/CI/P204/P205/agent action. Full legacy180s storage
timeout remains unverified. P203 physical acceptance/P204 held. Main reviews the
stopped failure packet before any separately authorized manifest/build correction.
