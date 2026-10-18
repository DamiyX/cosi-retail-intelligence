# P1 native build handoff — blocked, writer stopped for audit

2026-10-12 Africa/Lagos. Writer01a1051f-0777-7573-ad09-0e550a4bd56a;
coordinator01a098ef-d830-7531-bca7-2d66b0a5b587. Same
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
Exact authority: `PHONE_P1_NATIVE_BUILD_DISPATCH_20261012.md`.

**No APK was built.** The actual release pipeline reached
`:recognition-experiment:compileReleaseKotlin` and failed because LiteRT API2.2.0
contains Kotlin metadata2.3.0 while the installed Kotlin2.1.20 compiler expects2.1.0.
This is independently confirmed by the24-byte module header and hash in
`kotlin-metadata-blocker.json`; it is not a conjecture from source versions.
No model/device inference, install/launch, camera/private-photo processing,
cloud integration, SDK/runtime/model substitution or compiler-skip flag occurred.

APK path: **null**. APK SHA256: **null**. R8/signing/DEX/ZIP16KB/installed-size
acceptance: **not reached**. P1 APK acceptance criteria **FAILED / INCOMPLETE**.

## Completed within the approved slice

- Guarded `recognition-verification` config/plugin and separate AppRegistry entry;
  ordinary `expo-router/entry` and every ordinary config variant remain exact.
- Local Expo module outside ordinary discovery; generated-only CPU adapter,
  fixed model/tensor guards, one worker, invalid/busy/closed rejection, safe close,
  bounded diagnostics, explicit linkage-error rejection. Kotlin adapter compilation
  is blocked; its native checks are unexecuted.
- Isolated root/JS adapter/result validation and three targeted tests. No camera,
  decoder, file UI, enrollment, recognition classifier or business initialization.
- Official verified JDK17/SDK/NDK/CMake/Gradle archives, task-local licenses,
  a new ignored local test signer, reproducible setup/build/evidence wrappers.
- Same public model and accepted generated P0 assets copied and hash-verified,
  with full LiteRT notices; model hash remains
  `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.

Reviewable changes: `apps/mobile/app.config.ts`, root `.gitignore`, new
`recognition-entry.js`, `plugins/withRecognitionExperiment.js`,
`recognition-native/recognition-experiment/`, `src/recognitionExperiment/`,
matching `recognitionExperiment*` tests, `tools/scripts/phone-native-build-*`,
this handoff and `PHONE_P1_NATIVE_BUILD_PACKET_20261012.md`.
Generated app Android, binaries/assets/keys/caches remain ignored. No npm
dependency/version/package-main change, Git stage/commit/push/branch/worktree,
extra agent or core/domain/contracts/database/sync edit.

## Actual checked evidence

| Check | Result and boundary |
| --- | --- |
| Mobile TypeScript | exit0, `typecheck-final.log` |
| Affected lint | exit0, `lint-final.log`, final plugin lint after manifest/ABI fixes |
| Targeted mobile tests | 3 suites /3 tests passed, `jest-final.log`; no native execution |
| Config/search/resolve/entry | ordinary dirty-baseline values identical; mismatched guards reject; ordinary module absent; exact generated Gradle-command resolve includes experiment; ordinary entry resolves to Router |
| Generated registry | fetch/constants/experiment, core adapters; no camera/storage/dev-client/updates/UI registrations |
| Final generated merged manifest | isolated ID, min24/target36; only app-private signature dynamic-receiver permission; no Android hardware/network/storage/FGS permissions, providers/receivers, NPU feature or optional vendor declarations; backup/cleartext off |
| Hermes release bundle | 1,050,524 bytes; SHA256 `2158351943ebf02501083fc89abbf712e304cde996ccff23abb7e061e4f0f3ac`;521-source map, no mobile business/Router/Supabase sources |
| Resolved runtime graph | 111 coordinates /288 archive+metadata records; both accepted AAR sizes/hashes match; no Play/GMS artifacts |
| App compile graph | 83 coordinates /215 records; no Play/GMS; own experiment Kotlin compiler still directly sees incompatible API metadata |
| Retained legal evidence | 215 POM/module/notice records,24 packaged full notices; full SDK/JDK/Gradle texts/archives retained; rights/legal review remains open |
| Native intermediate inspection | 15 stripped arm64 files /23,477,048 bytes; every ELF PT_LOAD16KB compatible; GL/EGL retained; not packaged/ZIP-aligned APK evidence |
| Source assets | 41 public/generated/notice copies /19,452,129 bytes; includes4,117,670-byte pinned model; no private images decoded |

The successful `evidence-a1`/`evidence-a2` task runs only merged manifests,
bundled Hermes JS and resolved dependencies. They do not bypass the failing
compiler or establish a successful release build. The final ABI packaging filter
is explicitly arm64; old all-ABI intermediate files remain preserved.
Standalone APK size, installed/incremental size, model runtime numerics, native
latency/RAM/thermal behavior, JPEG/ROI/Pillow equivalence, recognition quality,
model rights and all phone ceilings remain unverified. Ordinary isolation is
verified at config/discovery/entry boundaries; no ordinary APK was built.

## Retained attempts and corrections

All logs live in the new ignored run
`apps/recognition-lab/runs/phone-experiment/p1-native-build-20261012-a1`.
The SDK/JDK/signing cache is `C:/Users/doyew/.cache/cosi-p1-20261012-a1`;
the final shorter Gradle/CMake cache is `C:/p1g-20261012-a1`.

| Attempt | Exact failure / bounded correction |
| --- | --- |
| Setup initial | Windows long command-tools path; retain partial extraction, use new shorter SDK/JDK cache |
| Prebuild | exited0; dependency/package bytes unchanged; pinned installed template |
| Releasea1 | Expo libraries implicitly required build-tools35; explicitly apply approved36 |
| Releasea2 | receipt task requested ambiguous Gradle artifact variants; use resolved component graph and original archive hashes |
| Module discovery | Kotlin command builder placed search paths after variadic exclusions; absolute path plus `--` fixes actual resolve; independently checked |
| Releasea3 | new Expo module lacked required versionName; set version metadata and nonpublishable flag |
| Releasea4 | CMake ZIP has no common root prefix; add correct root layout without deleting old misplaced files |
| Releasea5 | JS entry resolved underAndroid rather than mobile root; use projectRoot |
| Releasea6 | Ninja prefab-header path over260 chars; new short Gradle cache,1182 files hash-verified, original cache preserved |
| Releasea7 | Ninja cached old absolute dependency paths; fresh task CMake staging |
| Releasea8 | staging hook executed after eager child configuration; register before root plugins |
| Releasea9 | genuine LiteRT Kotlin metadata2.3 /compiler2.1 incompatibility; STOP at this boundary |
| Evidencea1/a2 | exit0; final manifest/registry/dependencies/Hermes evidence, no APK |

Initial Jest mock/renderer attempts and the preservation checker's Windows
reparse-point correction are retained. All215 old junction targets were explicitly
verified unchanged; no missing private files or cleanup was inferred from them.

## Recommended next scoped decision

Approve a narrowly isolated **Java-only CPU helper submodule** under this
experiment. Keep LiteRT2.2.0 as its implementation dependency and expose only
Java/Android types to the Expo Kotlin wrapper, preventing LiteRT Kotlin metadata
from entering that wrapper's compile classpath. Preserve the exact model,
fixtures/options, worker/lifecycle behavior, AAR hashes and ordinary exclusions.
This is a proposed fix supported by Gradle's documented dependency boundary and
the observed app compile/runtime separation; **not implemented or proven**.
The packet links primary documentation and specifies the new compile/R8/classpath/
APK/manifest/signing/ELF/ZIP checks. An experiment-only Kotlin2.3 alignment is the
broader alternative requiring separate tooling review. Never downgrade the pins,
strip metadata or add skip/suppression flags to obtain an apparent success.

## Preservation and stopped state

Baseline:751 source records and76,808 protected records. Final preservation
receipts compare all captured bytes/link targets, exact branch/HEAD and allowed
new paths. Existing changed files are limited to the guarded config, narrow ignore
exception and the three authorised workflow fields. `PROJECT_STATE.md`, root and
mobile package/lock files, all stopped P0/P1/coordinator audit runs, private data,
business/domain/contracts and installed protected package sources stay unchanged.
Complete source/native/run inventories and task-owned cache archive receipts are
frozen in the run, with signing secrets and mutable lock/log files excluded from
public cache inventory. No password/key content is recorded in the handoff.

At handoff, lease=NULL and current_state=
`phone-p1-native-build-writer-stopped-await-audit`; only those and updated_at change.
No writer build/test work remains active. Coordinator owns PROJECT_STATE and every
other workflow field. Direct completion delivery is authorised and required;
delivery acknowledgement alone does not mean an audit has started. No P2/device
or private-image action follows from this handoff.
