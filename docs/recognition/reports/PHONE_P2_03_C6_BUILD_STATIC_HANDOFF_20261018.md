# C6 Gate A — offline APK build and static closure; STOP for coordinator audit

2026-10-18, Africa/Lagos. Executed only Gate A of the accepted C6-C1 build packet
under the inspected six-hour lease. Founder requested pending phone verification;
that remains active, with subsequent device gates still pending. No production
source edits, ADB/phone commands, installation, recovery, capture/model execution,
separate probe, dependency/CI change or Git commit/push in Gate A.

## Exact artifact and source

Run: apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-build-20261018-a1/writer/.
APK: recognition-camera-storage-release.apk,39,914,786 bytes, SHA256
80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713.

Reviewed C6-C1 source-index.json remains byte-exact,51 inputs, SHA256
edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d.
The build-inputs.json pin is
f5a7ecbdfd4a9807a8af482a5104044587f16f6d3ade8144d8454beecb9acef8.
It binds that reviewed index, the staged source index, fresh helper/observer/
init/charter bytes and preserved C5 source inputs. New static-a2 helper has its
own supplemental binding; the original helpers/pin and APK were not overwritten.
Legacy36004274... remains old-data identity, not repaired runtime provenance.

Both fresh run and cache cosi-p2-camera-c6-build-20261018-a1 were verified absent.
Cloned1007 source inputs from preserved C5, verified against its C4 source index,
four recorded C5 refreshes and exact reconstructed Metro configuration. Refreshed
32 reviewed application rows, including new JNI/CMake/keep sources; final1015
staged input rows bound. Package source selection and camera derivative stayed
exact; original node_modules source was not edited. Its junction was excluded
from stage traversal. Pinned model/assets/recipe and non-target source inputs
were checked before and after. No old shadow/run/STOP/APK was edited.

## Build actually run

One offline signed Gradle release succeeded in8m8s:322 tasks,294 executed,
28 up-to-date. Cached JDK17, SDK36, NDK27.1.12297006, CMake3.22.1 and existing
isolated signer only. The child deadline was1200 seconds and was not reached.
No missing input was downloaded, guard disabled or source fixed during the build.
gradle-release.json and child.json retain exact commands/times; gradle-live.log
is sanitized. Signing credentials were environment-only and are not in receipts.

New tools/scripts/phone-camera-storage-build.py and
phone-camera-storage-build-static.py implement the fresh clone/build and static
checks. They keep old helper guards immutable. Supplemental
phone-camera-storage-build-static-a2.py accounts for verified R8 service-name
renumbering described below. It does not rebuild or modify APK/runtime sources.

## Static evidence and enumerated deltas

static-review.json SHA256
1ba512c7725ece94a56bf82d490e02a95c8ce79321f5df06e1b5653180200d4e.

- Signature verifies with the same internal certificate
  48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.
  Binary AndroidManifest.xml is byte-exact C5: same package, minSdk24/target36,
  camera/signature receiver permissions, components, backup and network surface.
  This is update compatibility evidence, not an installed-device check.
- 587 ZIP payloads. Exactly one native addition:
  lib/arm64-v8a/libcamera_proof_publish.so,7656 bytes, SHA256
  c354955263c1d84280ace86bdec8aac8f30f0fbd12630611a7226a875d493e63.
  Eighteen ARM64 libraries total; each ELF load and stored ZIP payload passes
  16KiB checks. Existing17 libraries are byte-exact C5 except GNU build IDs in
  libappmodules.so and libexpo-modules-core.so. No other native change is allowed.
- New library DT_NEEDED is exactly libdl.so, libm.so, libc.so; symbol version
  requirements are LIBC. No C++ runtime, unexpected native dependency or direct
  renameat2 dynamic import. Its Android note declares API24. Expected JNI export
  Java_expo_modules_recognitioncpu_CameraProofRename_publishNative exists.
  R8 retains the static native method with exact three-String/long-array-to-long
  descriptor. Source SDK guard/lazy dlsym implementation is bound; API24 device
  loading and actual API36 rename/fsync are not proved by static inspection.
- classes.dex/classes2.dex changed with reviewed Java code/R8 output; their
  SHA256 values are in static-review.json. No scanner/GMS/MLKit/Firebase types
  or generated recovery/durability host-test classes are packaged.
- Hermes bundle changed with reviewed JS. Packaged bundle equals actual generated
  output; source-map/actual release graph closure passes,532 modules/7 premodules,
  all source hashes verified. No ExpoAsset/barrel bootstrap reintroduced.
  Default Expo serializer unchanged. Observer's old no-new-native claim was
  explicitly changed to false, with the added library separately reviewed.
- Generated ART profile files baseline.prof/profm changed and exactly match this
  build's generated outputs. All other assets/models/notices remain byte-exact C5.
- All382 scoped external dependency-coordinate/artifact-digest entries match C5.
  No new dependency version/provider/permission/model/recipe was introduced.

### R8 service descriptor counterexample and correction

The first static guard stopped because four generated META-INF/services file
names changed, in addition to the expected new library. Its counterexample is
retained in static-payload-counterexample.json; no source/APK rebuild followed.

Corrected helper proves old/new R8 mapping IDs match the respective APK DEX
markers, verifies referenced interface/provider classes exist, and requires exact
deobfuscated interface/provider/order equality for all four service descriptors:

| C5 path | C6 path | Same original interface |
| --- | --- | --- |
| META-INF/services/D6.s | META-INF/services/C6.s | kotlinx.coroutines.internal.MainDispatcherFactory |
| META-INF/services/U5.j | META-INF/services/T5.j | kotlin.reflect.jvm.internal.impl.resolve.ExternalOverridabilityCondition |
| META-INF/services/o5.b | META-INF/services/n5.b | kotlin.reflect.jvm.internal.impl.builtins.BuiltInsLoader |
| META-INF/services/y6.L | META-INF/services/x6.L | kotlinx.coroutines.CoroutineExceptionHandler |

Provider classes and their order are identical after mapping. No extra service
path is allowed. service-loader-mapping-proof.json SHA256
0d5adcdae65489c526f63ce3ffc630a6ff5c01dfc48e315e8bfd3fe877b86317
records exact old/new mapping/file/body associations. Old mapping file SHA256
683123c572aa6d2ca422891f11a6b8dee31eb436c3c6aaf5014e4b28a34d99ec;
new88507b05b1526ae0dd3ee8f0813bb2f3532b8663a704664cfbbad3b557e2e298.
Supplemental static-a2-helper-binding.json hashes the original/corrected helpers
and unchanged APK. All other manifest/native/asset/dependency guards are intact.

## Stop and decision requested

Writer STOPPED after Gate A. Review the exact source/shadow/helper/APK pins,
signer/manifest, R8/JNI/service-resource attribution and ELF/ZIP/dependency evidence.
This is direct build/static review, not independent acceptance or physical proof.

No phone data was touched. Before a data-preserving app update, Gate B still
requires a reviewed generated Android storage smoke using the actual reviewed
IO/JNI. The7656-byte library extracted from this APK is available for exact-byte
reuse. The paused old hard-link probe remains uninstalled and is not a substitute.
Per the approved packet, a separate smoke APK needs its concrete source review
and explicit bounded installation approval; general camera authorization does
not authorize extra packages. Prepare that concrete artifact before requesting
approval. Do not install the main APK or infer old-record eligibility yet.

Gates C/D follow accepted storage smoke and their reviewed packets: verify current
installed hash/UID/signer, update without data clear/uninstall/force-stop, inspect
the old group inside its owning app, classify only proven eligible interruption,
verify preserved evidence/reopen, then one founder-aimed generated-chart capture.
P2-03/G4 and later phases remain held. Physical JNI/Android persistence, geometry,
SDK cache/RAM, permission denial and cold-render limits are not resolved here.
GitHub/dependency/CI repair and push remain deferred.
