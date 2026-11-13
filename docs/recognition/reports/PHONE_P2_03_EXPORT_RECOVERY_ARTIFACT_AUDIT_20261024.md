# Recovery C2 APK — independent artifact audit

2026-10-24. **Accepted for preparation of the bounded device packet.** No blocking
artifact finding. No installation, phone effect, export, Android lifecycle pass
or P2-03 acceptance follows. Source and C1 reviews remain scoped antecedents.

Exact artifact: apps/recognition-lab/runs/phone-experiment/
p203-export-recovery-build-c2-20261024-a1/recognition-camera-recovery-release.apk.
39972034bytes, SHA256
11f23281af8e9c0d7e41f2b460888a56bc28fc69d583a520d4354c414ab139ff.
Signer48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.

## Fresh main evidence

Matched stopped/handoff/verification hashes and all606 frozen source input hashes.
Fresh apksigner verification of old b83 and new APK, zipalign16KiB, aapt2 badging
and binary manifest inspection all passed. Same package/versionCode1/min24/target36
and signer support static update compatibility; actual installed UID/data remain
a device preflight/update check. Binary manifest canonical tree matches old after
removing exactly one enabled/non-exported recovery Activity with no intent filter.
CAMERA is the sole Android permission; existing package-local signature permission
and all framework components remain unchanged.

Independently checked entire ZIP CRC/unique names, all18 ARM64 ELF load alignments
and uncompressed16KiB native ZIP offsets.15 libraries are byte-identical; two
differ only in GNU build-ID descriptor payloads (main masked only those payloads,
not whole sections). The publisher is the sole meaningful native delta, retains
the same one JNI export and contains the approved exact roots/record leaves.
All105 non-bundle/non-dexopt assets match, including model/runtime inputs.

New DEX contains the reviewed exporter/capture pins, stable callback key and
closed-camera endpoint marker; recovery UI is in the actual bundle. Independently
checked old/new APK-to-stage digests and paired R8 mapping hashes: all four service
interfaces and original provider classes match despite obfuscated filenames.
Fresh javap of the actual build's pinned Activity class shows unconditional
constructor registration. This is compiled/static correspondence, not proof of
runtime callback delivery after Android process death.

Actual resolved graph bytes equal accepted C1 a13e0eac88abbdb4b5073a5c584ebb955b7e0289b01d14cc34bb0b4a1c1f856b.
Main rehashed409 artifacts and compared all8 configuration artifact multisets and
edges. Builder's actual toolchain/Metro closure/preservation records were reviewed
separately; native compilation warnings remain in its log, not waived as clean.
Certificate prose erratum affected documentation only; final digest matches both
fresh signature results and actual APK. No source/APK patch/rebuild in this audit.

Main evidence: apps/recognition-lab/runs/phone-experiment/
p203-export-recovery-artifact-audit-20261024-a1/ (fresh tool receipts,
core-result.json, native-verification.json, additional-result.json and compiled
registration disassembly). Main source/runtime mutations0, phone actions0.

## Next action and remaining scope

Prepare the finite S3 device packet/helper with an exact feasible Activity-
recreation/background-process-death method and observations, then review before
requesting the concrete installation/fixture effects. Do not assume a method
exists merely because the APK compiles; no silent lifecycle-criterion waiver or
new runtime hook. The current APK contains no new recreation/test-trigger hook.
No new photos are planned. Update must preserve the sandbox, never uninstall.

S3 generated lifecycle proof precedes separately reviewed S4 actual fixed empty
ZIP recovery. S5 original-image/phase/crop audit remains pending, with four
inconclusive preview markers and unestablished strict framing. No total RAM/cache,
installed footprint, memory-leak absence, power-loss or directory-durability claim.
P203 OPEN/P204 held; P205 and CI/Git repair remain deferred.
