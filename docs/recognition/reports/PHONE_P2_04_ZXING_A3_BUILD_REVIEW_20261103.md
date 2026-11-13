# P2-04 ZXing A3 stopped build review

3 November 2026. Independent Sol 6.1 coordinator review. Result: no APK; build preparation remains blocked. Further assembly held for founder-selected Astra review under the founder's recovery escalation policy. No phone action required.

## Actual evidence checked

- SAME implementation chat is idle after completed stopped handoff; workflow lease is null.
- Handoff SHA `e688223af8304f256a028eb4e3a5115556ef74d9fc81e0850594c8c98cda9104` and evidence-index SHA `5ba0397d3d2caaa6634242c177f320e22842e47d86fde67dae9e2dee84d2ce81` independently match.
- All 639 current source file hashes independently match the reviewed final source index. Branch remains `plan/m8-unified-scanner`, HEAD `374286dd87e22703ea90f1cd7a978020e32a8903`.
- `assembly-result.json` records exit 1 without deadline/log-cap stop; `gradle.log` records UnknownPluginException resolving the Foojay convention plugin before app compilation. Agent reports 1m7s. No current APK/130-artifact graph or physical result is established.
- Independently read the exact original marker POM through extended Windows path syntax: 277-character ordinary path reports is_file false, extended path reports true, SHA `f133249a18754ae6a1d2701d00d849b1afba7b0683ddb5fc1b18a70071cec2fa`. It is absent under extended checks in A1, A2 and A3.
- Independently read the descriptor: original cache has SHA `6cd9704aab4dcf475dc98f04f233dbc92b259c0ee10e5676bfde9c86b47a73c9`; A1 has identical bytes at a 277-character path missed by ordinary is_file; A2/A3 lack it under extended checks.

Inputs inspected are under `apps/recognition-lab/runs/phone-experiment/p204-zxing-build-20261103-a3/`: STOPPED_HANDOFF.md, STOPPED-receipt.json, evidence-index.json, assembly-result.json, gradle.log, offline-plugin-input-diagnosis.json and helper-independent-review.json. The current dependency input source is existing `C:/p1g-20261012-a1/caches/modules-2`; no network retrieval occurred during this review.

## Finding

The confirmed omission and matching resolution failure strongly support incomplete offline plugin input preparation as the immediate A3 cause. Windows long-path handling explains why ordinary enumeration/checks omitted existing files. A corrected build counterfactual has not run, and resolving this omission does not prove the entire dependency closure is complete.

There is also a preparation acceptance gap: A3 encountered an unindexed long-path input before assembly, then selected the older frozen 1350-file snapshot. Matching that snapshot's bytes and topology did not establish completeness for cold plugin resolution. The initial unexpected input was evidence that the snapshot could be incomplete; it should have blocked assembly until explained. The prior plan required path normalization, but its fixture did not demonstrate discovery/read/copy of real paths exceeding 260 characters. The cold-generated-cache plan exposed an inherited omission that warm generated caches could bypass; application source failure is not established.

A1 preference aliases, A2 generated cache topology, and A3 incomplete plugin inputs are distinct host preparation faults. No new camera/GPU/barcode runtime failure was observed. Original metaspace exposure remains unproved as a causal failure. Installed visual A2 is unchanged by these build attempts.

## Focused Astra review brief

Challenge and plan one correction to dependency input admission, using this evidence and the prior PHONE_P2_04_ZXING_BUILD_RECOVERY_PLAN_20261103.md. No new build or application rewrite during review.

1. Inventory BOTH permitted modules-2 trees from the existing approved original cache using extended-path-safe traversal/stat/read throughout, with traversal errors fatal. Do not rely on ordinary rglob/is_file or the inherited 1350-file manifest as the completeness oracle. Preserve that manifest as historical evidence.
2. Review the exact delta against the frozen inputs, including missing marker/descriptor and the referenced existing Foojay implementation inputs. Pin every newly discovered existing file's identity and provenance before copying; do not silently approve arbitrary new coordinates/versions. Distinguish plugin/build inputs from the app's unchanged 129+core runtime admission.
3. Require a representative >260-character fixture that exercises the actual discovery, hashing, copying and destination verification functions. Demonstrate the previous false-negative path check and the repaired positive result. Include empty-directory preservation and fatal traversal-error behavior. Inventory destination through extended paths too; include all supported Node/source/template handling where the same defect pattern can occur.
4. Decide whether short task-owned paths materially help Java/Gradle consumers in addition to fixing Python enumeration; do not conflate these two boundaries. Preserve the separate owned stage, offline repositories, corrected SDK environment, six composite roots and fresh generated caches. No global long-path setting change, downloads or generated-cache restoration.
5. Produce a finite execution plan for SAME Sol 6.1 High chat with original source/toolchain/memory/2400s preparation/2700s assembly/64MiB log/resource/manifest/lease/observer/artifact assertions. Explicitly refuse any unresolved unindexed input before assembly. Preserve all A1/A2/A3 consumed intents and failures. Any further build requires the reviewed bounded plan under existing founder authority; this review dispatches none.

Review scope: existing logs/source/filesystem only. No Gradle/signing/build/phone/install/scan/photo/screenshot/export/network/Git/CI/P2-05/new-agent effect. After successful artifact and independent APK review, existing D-063 conditional update/setup remains applicable; it has not been reached. No claim that every prior evidence file or current global cache file was rehashed in this coordinator review.
