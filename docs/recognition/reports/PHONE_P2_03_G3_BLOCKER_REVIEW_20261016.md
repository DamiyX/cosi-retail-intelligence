# G3 stopped build review — no APK, supported source route

2026-10-16, Africa/Lagos. **G3 NOT PASSED.** Main coordinator independently
confirms the returned blocker; G2 source acceptance remains unchanged. No native
wrapper/camera compilation, R8, final manifest or APK was produced. G4/P2-04 held.

STOP/handoff/result hashes and all539 writer inventory entries match. All213
stage entries match, including one junction target checked without traversal.
955 repository source paths,2995 installed inputs,104 native assets and75 prior
frozen bindings match. Writer stopped within lease; main released it after intake.
Exact source remains35-row360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e.

Independent evidence is in
`apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-review-20261016-a1/`.
Actual single Gradle stderr is task selection: no :expo-camera project. This is
not a Kotlin compiler or missing-artifact resolver error. Its earlier plugin
preparation tasks were up-to-date; none prove camera compilation.

## Root cause and supported correction

Installed SettingsManager.kt configurePublication:70-76 selects a publication
unless `configuration.buildFromSourceRegex` matches its Gradle project name.
ExpoCamera57.0.6 advertises local Maven publication metadata; this route bypasses
evaluation of its source android/build.gradle barcode=false compileOnly branch.
The selected publication declares three prohibited barcode/Play runtime edges.
The runner's source-task assumption was therefore wrong. Preserve that failed
attempt; do not relabel it a successful build or weaken the runtime requirements.

Installed autolinking options parser reads
`expo.autolinking.android.buildFromSource` from the app package metadata. The
coordinator's new isolated candidate package/probe loads `['^expo-camera$']`
through the actual installed loader, preserves every dependency/version and
matches no other intended module. This supports the proposed route; actual
Gradle source selection/compile/runtime closure is still unexecuted.

Choose that supported option ONLY in the next camera-only shadow build's package
metadata. Treat the explicit staged delta as part of the build recipe/source
ledger, not as byte-identical package config. Keep original repository package,
ordinary/default variants, other source/publication selections and G2 code fixed.
This is a build selection for the already approved installed camera version, not
a new camera provider or an architecture change. No node_modules patch, global
source-build regex, runtime dependency exclusion trick or R8 suppression.

## Prerequisite review and continuing authorization

The founder previously explicitly authorized downloads needed for this phone
experiment (“go ahead and download it ... regarding what we're doing”) and now
authorized the next build phase. That task-scoped authorization persists; it is
not authority for a provider/toolchain change or arbitrary dependency acquisition.
The first G3 dispatch intentionally forbade network fallback pending this review.
The next dispatch may acquire fixed-version build prerequisites for this installed
camera's source route after recording/inspecting their metadata and licences.

Main performed read-only official Google Maven metadata requests for the12
direct versions absent locally. All12 POMs parsed; artifact HEADs advertised
14,821,158 bytes in aggregate. No AAR/JAR/binary/model was downloaded by main.
The complete transitive closure/total acquisition size is NOT established.
Official URLs, POM SHA256, licences, direct dependencies and HEAD observations
are in official-metadata-review.json and official-metadata/. This is the first
declared set only, not permission to add those three scanner libraries to runtime.

All ten direct AndroidX POMs report Apache2.0 (camera-core additionally BSD3). The
code-scanner and barcode-scanning POMs report ML Kit Terms of Service; the
camera-mlkit-vision adapter reports Apache2.0. Existing source declarations make
these three compileOnly when barcode=false. They may be required as compiler
inputs, but must not become APK runtime artifacts/classes/model assets or execute
a scanner/download API. Acquire/inspect only build-required versions, preserve
notices/terms, do not claim permissive open-source licensing for ML Kit or accept
new interactive account/service agreements. Missing/restrictive/unreviewable
terms or an unexpected dependency/provider/toolchain change returns for review.

The existing configured official Google Maven/Maven Central plus installed local
Maven repositories suffice as the permitted provenance family. Fixed transitive
coordinates must be derived and recorded from actual Gradle/POM/module metadata,
with hashes/size/licence checks, no arbitrary latest/version upgrades or third-party
mirrors. Source route still may expose Kotlin/R8/classloading incompatibilities;
do not bypass them. Any actual semantic source correction requires stopped review.

## Evidence limits and next action

G3 writer helper safety7/config pairs6/mismatch4/types/lint/source-binding checks
were reviewed. Prior new-runner production-env Jest misuse and long-path setup
failures are separately retained; corrected normal environment still has a cold
default-route5s timeout. No retries/assertion relaxation; cause remains unknown.
No source/runtime quality or performance pass follows from config inspection.

Dispatch G3-C1 to the SAME writer: fresh shadow/evidence, exact camera-only staged
source selection, reviewed official prerequisites, then offline compilation/R8 and
exact APK inspection if prerequisites succeed. Stop for a material source/closure/
licence/toolchain issue; preserve all attempts. Direct stopped handoff before main
independent review. No phone/model/private pixels/install/G4/P2-04.
