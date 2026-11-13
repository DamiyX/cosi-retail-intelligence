# P2-03 export recovery — source implementation dispatch

2026-10-24. Founder switched back and explicitly instructed the existing agent
to begin implementation. Implementing agent: Track B real-photo experiment tool,
01a1051f-0777-7573-ad09-0e550a4bd56a, GPT-6.1 Sol High. Parent: main coordinator,
01a098ef-d830-7531-bca7-2d66b0a5b587. One source writer, then stopped review.

Workspace: C:/Users/doyew/Documents/DEV 2/COSI-m8-planning.
Branch plan/m8-unified-scanner. Preserve all dirty/untracked work; do not restart
the old interrupted matrix implementation. The current installed artifact and
completed physical run supersede the agent's older chat state.

Implement S1 of docs/recognition/PHONE_P2_03_EXPORT_RECOVERY_PLAN_20261024.md
(reviewed plan SHA25619b4bfce66a42bf9a044db64e08d712e7b4e730db89dacafd799f4aa436eea07).
Objective: durable native recovery of the fixed existing sealed evidence, including
process-independent Activity result handling, read-only historical provenance,
at-most-once bounded output and read-only reconciliation. The source approval
covers the proposed isolated recovery boundary. It grants no phone operation.

Before source edits: read applicable instructions/current project state/plan and
diagnosis; verify current Git state. Claim the null Track B lease and record a
compact before-hash/path manifest. No giant documentation exercise. Protect
historical evidence and all unrelated files; you are not alone in this codebase.
No agents or parallel source writers. Coordinator does not edit source during S1.

Allowed existing runtime seams, only as necessary for this plan:
- apps/mobile/src/recognitionExperiment/CameraProofPanel.tsx and nativeAdapter.ts;
- apps/mobile/recognition-native/recognition-experiment/android/src/main/java/
  expo/modules/recognitionexperiment/RecognitionExperimentModule.kt;
- the local module's AndroidManifest.xml/build.gradle;
- cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofFiles.java,
  CameraProofStore.java, CameraMatrixStore.java, CameraMatrixEvidence.java;
- cpu-runtime/src/main/cpp/camera_proof_publish.c, and necessary fixed source
  binding integration. Preserve historical capture pins; do not regenerate them
  to label old data as new. No capture/model/recipe implementation changes.

New focused recovery Activity/controller, plan, journal and historical-reader
modules within those existing native module directories are allowed. New focused
recovery UI helper/tests and native tests, plus narrowly required existing camera
regression assertions, are allowed. A declaration of the already resolved
androidx.activity:activity:1.8.0 may be added only if the module requires it and
the existing offline artifact is verified; no dependency installation/upgrade.

Evidence/helpers output only in NEW
apps/recognition-lab/runs/phone-experiment/p203-export-recovery-source-20261024-a1/.
Documentation: one concise final handoff in this reports directory; current
PROJECT_STATE line and active workflow/lease; a narrowly scoped source-approval
decision entry if needed, clearly distinguishing source approval from device
approval. Do not rewrite prior decisions or planning documents.

Local generated checks/TS types/zero-warning affected lint/native JVM tests and
offline compile-only Android/Kotlin checks are allowed. Meaningful failure-before
and boundary evidence is required; do not spend tokens repeating broad checks
that passed without a changed boundary. Plan arithmetic is an assertion to prove,
not permission to weaken guards. Preserve honest four-marker/scene limitations.

No APK build/sign/install, ADB/phone command, file picker, capture/model run,
actual evidence export/Save/transfer, reset/deletion, dependency download, Git/CI,
remote upload, P2-04/P2-05 or unapproved architecture expansion. A blocked design
assumption must be reported concretely; do not substitute a general export API.

End: stop commands/source writes, release the lease and return handoff with exact
changed paths/hashes, actual check commands/results, original failure evidence,
unchanged-input proof and residual platform/device uncertainty. Explicitly
announce DONE or BLOCKED. Founder authorizes one completion message directly to
the main coordinator chat01a098ef-d830-7531-bca7-2d66b0a5b587 after stopping,
including the handoff path. Do not finish silently. Main audits after the stop;
build/static review and device packet are later gates.
