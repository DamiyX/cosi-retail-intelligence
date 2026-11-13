# Orientation build C1 — inherited camera exclusions

2026-10-24. Main independently inspected stopped build evidence: all40 indexed
evidence hashes match; no APK was produced. No phone/camera action occurred.

Confirmed staging defect: private staged android/settings.gradle SHA256
42379161e6ea4e845a68a3941b5fb4f9edd7709a1daaccfa3db97e58f72931f1
explicitly excludes expo-camera twice: Expo exclusion list at line26 and RN command
exclusions at line32. The builder copied the recovery-only scaffold, then replayed
only dangerous/manifest mods. Package-level searchPaths/buildFromSource cannot
override these explicit Gradle exclusions. Expo's installed settings extension
passes its exclude list to SettingsManager. This explains the missing project.
Workspace withRecognitionExperiment.js already omits camera from both exclusion
lists when camera-proof is enabled; no runtime/source repair is required.

Same Track B Sol6.1High may prepare a NEW build-C1 packet/private stage and make
only this staging/settings-generation correction, then one offline release build
under the unchanged original build/static packet. Preserve both failed invocations,
old stages and all source pins. No edit to700 reviewed workspace inputs.

Generate the two settings exclusion lists from the reviewed plugin's camera-enabled
policy, or use an exact old-hash/occurrence-count-checked staging amendment removing
only camera from these lists. Compare every other exclusion and settings statement.
Retain the separately recorded included-build :app guard correction. No unrestricted
settings search/replace, source fallback, ignored missing task or manual project
inclusion bypass of Expo registration.

Before Gradle release invocation, run a read-only local autolinking resolution with
the actual staged settings arguments; assert the exact private patched expo-camera
derivative and recognition experiment are selected, and excluded modules stay out.
Freeze that result plus inputs/helper. The Gradle projects check must also establish
camera registration; do not run another release build if the module is still absent.

Expected camera dependency inclusion may differ from recovery-only graphs. Compare
to the last accepted camera-enabled capture graph as well as recovery baseline;
require existing approved/cached versions and artifact hashes. No new dependency,
network resolution or unexplained version drift. All actual artifact checks from
PHONE_P2_03_ORIENTATION_V2_BUILD_PACKET_20261024.md still apply; R8/manifest/JS/model/
ABI/signature/update results remain unrun until an APK exists.

New output root p203-orientation-build-c1-20261024-a1 under the same phone-experiment
runs directory; new exact task-private staging root recorded before use. Claim lease,
build alone, STOP/release and directly send main one completion handoff. No device,
install/new photo/export, Git/CI or P2-04 action. Broader source/dependency problems
still stop for review. Main source acceptance remains valid for its declared scope.
