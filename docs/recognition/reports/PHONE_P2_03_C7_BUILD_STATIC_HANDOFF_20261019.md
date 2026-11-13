# C7 APK built; static acceptance withheld — stopped handoff

Founder-approved one-build/static slice. Mode: build/static only. One offline
signed release succeeded in9m48s,322 tasks/294 executed/28up-to-date. Actual child
deadline1200seconds, timedOut:false, exit0. No rebuild, source fix, phone/ADB,
installation, launch, picker, export, capture/model, radio/dependency or Git/CI.

## Exact reviewable artifact

APK apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-build-20261019-a1/writer/recognition-camera-export-release.apk
SHA256 4eee45f910ff9cc1ceb127f8707d5a4420c0c1b743982019f60e0556326b6827; size39918298bytes.
Source60 ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84.
Derived exporter source6458e69dc894f0fb3ac69a3a7966d96f6e42ba8e315f9fe9e39a17972761cf30.
Build inputs49bfa3a06447ce9c40980f6ccd748544d7f85b845e2569b3ffb46e102af275d0.
Original C6 APK80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713
and legacy source owner36004274...b9d0e remain distinct/unchanged.

Fresh roots checked absent. Cloned1015 preserved C6 stage source inputs,
refreshed40 reviewed source rows including the separately bound derivative;
new stage1023 source rows. Source60, derived constant, helper/Metro/init inputs,
old stage source1015 and55 original capture-evidence rows reverified after build.
Scope excludes generated/shared build caches; no claim that every cache byte is
immutable. Old stage source, old APK/STOP/indices and original chart remain intact.

## Completed static observations and retained failures

Official signature check passes: same internal certificate
48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.
Official ZIP16KiB alignment and badging SDK/ABI checks pass. Manifest byte-exact
C6, same package/min24/target36/ARM64 and permission/component/network/backup
surface. Both DEX files parsed, forbidden dependency types/test-harness references
checked; JNI retained signature count1. Fixed18 native-library names, all ELF/ZIP
alignment and byte-equality outside GNU build IDs pass in the second checker.
Model/assets are exact except the expected bundle/generated ART profiles; ART
profiles and actual release bundle equal generated build outputs. Four R8 service
interfaces/providers/order are semantically identical, with mappings tied to APK
DEX pg-map IDs. Detailed generated-only delta list is payload-deltas-after-a2.json.

First checker stopped on an extra *whole-file* JNI adapter hash assertion after
its preceding exact-outside-build-ID comparison had passed. Independent binary
counterexample proves its7656bytes differ only within the20-byte GNU build ID;
old SHA c354955263c1d84280ace86bdec8aac8f30f0fbd12630611a7226a875d493e63,
new SHA a016a7e281e0309845dc2a1c7d19fe1d03d831eacb297ff0fbcb36c3a2f21dcf.
All offsets/IDs/canonical hash are in adapter-build-id-counterexample.json. A fresh
static-a2 helper applies the packet's approved build-ID-only criterion to that
adapter too; original helper/failure remain immutable, supplemental helper and
same APK are separately hash-bound. No native code or APK rebuild occurred.

The second checker then stopped at the overall payload-delta guard because
resources.arsc changed. That guard was NOT relaxed and no third checker ran.
The complete decoded resource tables from cached SDK aapt2 show exactly one
value difference, same resource ID/name:

0x7f0d0054 string/react_native_dev_server_ip
C6:192.168.1.3; C7:192.168.1.13.

resources.arsc length remains351080bytes. Old SHA
a673d93b01f616a4fbb40460f47897ddbe036790dd9f4f020710a1580b585e75;
new SHA0bd96545786bc462ef63da59f4f5d56068021f46dcfaa93bb458bd9517264190.
resource-semantic-diff.txt is the sole decoded value diff; resources-values-c6.json
and resources-values-c7.json retain full official output/commands/exit0. The first
CLI probe incorrectly supplied --values (unsupported); its exit1/help receipts
are preserved. Cached aapt2 emits values by default; the corrected invocation
adds no suppression/filter. No resource/source/configuration was changed.

Cause is visible in installed React Native Gradle source:
node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt
configureDevServerLocation uses project property reactNativeDevServerIp, otherwise
getHostIpAddress(), and writes this defaultConfig resource. This is an environment
generated value, not a C7 source edit. Network permission surface is unchanged,
but its runtime reachability/acceptability has NOT been independently concluded
here. No suppression, blanket resource exception, IP pin or second build applied.

## Incomplete checks and decision requested

Static acceptance is WITHHELD. Post-guard checks did not run: final current-vs-C6
dependency-coordinate equality, actual DEX exporter/legacy pin assertions, full
readelf dynamic/import/version inspection and Metro/source-map startup closure.
Preflight did verify391 cached external artifact rows (including repeated scopes),
but that is not a substitute for final post-build equality. No static-review.json
success record or fabricated complete inventory was produced. Initial/supplemental
checker failures and all successful partial receipts are retained.

STOP for coordinator High artifact review and a concrete decision on the single
auto-detected React Native resource difference. Determine its consumer/release
reachability and whether a narrowly proved generated-resource criterion is
acceptable, or whether a separately approved deterministic config/build is needed.
No permission to silently normalize resources or retry a build is inferred.

No physical update/startup/SAF/readback/original-positive export or geometry result.
C7 source acceptance stands within its scope; P2-03/G4/later and GitHub/CI remain
held/deferred. Source ownership is released; this writer will not install/export
or continue artifact acceptance until the coordinator returns a reviewed packet.
