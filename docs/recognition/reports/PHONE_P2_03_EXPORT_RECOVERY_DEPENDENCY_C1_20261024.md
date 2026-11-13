# Recovery build dependency C1 — blocker review and narrow source correction

2026-10-24. Main independently verified the stopped S2 handoff/receipt/log hashes,
all600 frozen source inputs, and the reviewed cached AndroidX artifact hashes.
No APK exists. The original build failure and stage must remain untouched.

Observed cause: the new direct Activity1.8.0 module edge introduces its runtime
configuration independently of the app's dependency selection. That configuration
requests uncached Core1.8.0 and Core-KTX1.13.1; the latter is reached through
lifecycle-viewmodel-savedstate2.10.0. This is a graph-alignment defect, not evidence
of a new camera/storage/export failure. S1 direct offline compile explicitly did
not prove the Gradle graph; S2 correctly stopped rather than downloading/retrying.

Evidence: apps/recognition-lab/runs/phone-experiment/
p203-export-recovery-build-blocker-audit-20261024-a1/diagnosis.json.

## Approved correction, Sol6.1 High, existing Track B source owner

Under the founder's implementation/correction authorization, change only the local
recognition-experiment android/build.gradle dependency declarations/constraints
needed to align Core/Core-KTX with its prior reviewed module baseline1.17.0.
Both1.17.0 artifacts and their hashes are independently verified cached; the
reviewed app/Expo-camera graph already selects1.18.0, which must remain selected
there under normal conflict resolution. Keep Activity1.8.0. No force, strict
version downgrade, global resolution rule, exclusions, lock relaxation/update,
uncached library or dependency download. Do not change lifecycle versions or
broaden correction to newly encountered failures without concrete review.

Ordinary module-local declarations or constraints are acceptable; use the
smallest transparent solution and explain actual selection. No architecture or
camera algorithm change is needed. No native/UI/test implementation edits.

Regenerate only the exporter RecoverySource binding as required by this Gradle
input change, from an exact new source index. Preserve all historical capture
pins/classes/model/recipe and original source/before/after/evidence indexes. New
helpers/binding evidence belong in NEW
apps/recognition-lab/runs/phone-experiment/p203-export-recovery-dependency-c1-20261024-a1/.
Do not rewrite old frozen helpers to make their previous result appear current.
Document the actual new input count/hash; do not force it to remain600 if new
binding helpers need inclusion. Only build.gradle and derived RecoverySource may
change among existing bound runtime inputs. All other prior inputs stay exact.

Before editing: claim the null lease and freeze the exact before state/path
allowlist. You are not alone; preserve all other dirty/untracked work. No agents.
Main does not edit runtime source during this correction.

## Evidence and STOP boundary

Run ONE bounded offline dependency-resolution probe against a NEW private stage,
using the existing cached toolchain. It may configure/compile Gradle plugins but
must not compile the app or assemble/sign an APK. Explicitly resolve artifacts
(a dependencies report alone can exit0 with FAILED nodes). Prove module and app
release compile/runtime configurations select cached reviewed artifacts, record
coordinates/paths/hashes and explain changes from the old graph. Preserve normal
conflict semantics and existing lock policy. Any additional uncached coordinate
or graph incompatibility stops with the exact path/evidence; no network fallback.

Verify the two permitted binding deltas, regenerated exporter hash, unchanged
capture/runtime/test inputs and retained failed build evidence. Existing709 JVM/
28 UI checks remain evidence for unchanged implementation; no blanket repetition
is required for this declarative dependency-only correction. New actual Gradle
resolution evidence is the relevant verification. Source still needs stopped
main review before a separately authorized fresh APK build.

Allowed docs: one concise C1 handoff, current PROJECT_STATE line and workflow/
lease. No phone/ADB/install/fixture/picker/export/Save/transfer/capture/model,
Git/CI, P2-04/05, package download or global configuration effect.

End STOP, release lease and explicitly report DONE/BLOCKED with changed hashes,
actual graph-selection evidence and remaining uncertainty. Founder authorizes
one direct completion message with handoff path to main coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587. Do not finish silently or launch the next build.
