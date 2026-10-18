# P2-03 G3-C4 result

2026-10-18. **Known eager ExpoAsset startup dependency repaired; signed offline APK and actual packaged JS/native static closure verified. One host rendering timeout remains open; physical startup is unverified.**

CameraProofPanel now imports a small experiment-only adapter using the real installed CameraView/ExpoCameraManager and core permission hook. Exact camera permission methods/options/recheck and all capture/ownership/math/native behavior are preserved. No added native module/permission/provider, package/lock/plugin or installed-source change.

APK `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab\runs\phone-experiment\p2-camera-build-g3-c4-20261018-a1\writer\recognition-camera-proof-release.apk`; 39,881,316 bytes; SHA256 `086ee746e8fc02a85131ed355ca8752d560ccfe51de9e11e0b8040b84a47699c`. Certificate `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`. One offline R8/lint/assemble release passed. Actual graph 532 modules + 7 premodules binds to 531-source packaged Hermes map; no Expo/Expo.fx/Asset/camera barrel/PictureRef/Camera.types value path or winter fetch module. Exact native registration, DEX, manifest/dependency closure and 104 pinned assets match C3; native differences are solely GNU build IDs. Signature/ZIP and all 17 ELF 16 KiB and 44 retained JNI checks pass.

Original targeted real-import assertion fails at the old barrel; the same assertion passes after correction with actual camera JS. Corrected suite: **6 passed / 1 first-render 5000ms timeout / 7 total**; failure retained, no warmed rerun or timeout edit. Existing UI/isolation/config: 15/15, types/lint 0. Controlled RN/native and unused Jest-fetch boundaries are explicitly documented; no physical startup claim.

Fresh source 51-row pin `30223e6d3322605f5ad9635722781418ef8970b5adbcae2029daa5135d6cadb9` covers repaired JS and pinned SDK/helper inputs. The native runtime ID `360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e` remains intentionally unchanged and does NOT certify the new JS; C4 acceptance uses the new external source index plus packaged bundle/APK binding. Model/recipe and native derivative 187019dc...d4a3 unchanged.

Preservation: source 972 under six writer/two explained coordinator metadata exceptions; installed 2995 / broad 9008; assets 104; frozen 6874; caches 866 / 893 unchanged; accepted C3 stage 2955 and current stage 2957 exact; staged 164, native derivative 806, C1 Maven 471 and toolchain. Full source/helper/stage/writer inventories and STOP bind exact hashes.

[C4 handoff](./PHONE_P2_03_G3_C4_HANDOFF_20261018.md) contains source diff, failed attempts/timing, real graph/provenance and stop contract. G4/P2-04/05/06 remain held; coordinator independently audits before any later founder-ready physical action or checkpoint. No phone/ADB/install/model/private pixels/network acquisition/radio/Git effect in this repair.
