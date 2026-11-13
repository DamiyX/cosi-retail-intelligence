# P2-04 ZXing build preparation recovery

3 November 2026. Founder-selected coordinator investigation and plan, following failed A1 and A2. Planning complete; no new assembly, installation or phone action executed. Execution belongs to the SAME chat `01a18b1c-dddc-76f3-b147-610604e47e08` at Sol 6.1 High after the planning handoff. This plan does not claim APK or physical acceptance.

## Finding and evidence

The reviewed barcode source exists, but neither attempt produced its APK. These are two distinct host build-helper defects, not observed barcode/camera runtime failures.

1. A1 supplied conflicting Android preference aliases. Its retained SDK probe reproduced the conflict and resolved it with only the owned `ANDROID_USER_HOME`. A2 uses that corrected environment and its exact existing-directory SDK probe passes. Full app configuration with this correction remains unobserved.
2. A2's `prepare.py` walks the entire prior `gradle-user` tree, collects files only, and creates parents only when copying files. It thereby copies generated Gradle workspace metadata without empty output directories. The compared seed has empty `classes/cp_init`, `instrumented/cp_init` and `reports`; the destination lacks all three while retaining identical metadata. `gradle.log` rejects the workspace at `AssignImmutableWorkspaceStep`, exit 1 in 14 seconds. This strongly supports the cache-copy defect as this stop's cause; a corrected full build has not yet tested the counterfactual.

Evidence under `apps/recognition-lab/runs/phone-experiment/`:

- `p204-zxing-build-20261103-a1/STOPPED_HANDOFF.md` and `location-probe/`.
- `p204-zxing-build-20261103-a2/{prepare.py,build.py,environment.py,gradle.log,cache-workspace-diagnosis.json,sdk-location-result.json,cache-seed-before.json}`.
- `p204-zxing-build-coordinator-correction-20261103-a1/cache-comparison.json` independently confirms the missing-directory/identical-metadata comparison.

The inspected cache inventory contains 879 dependency-file entries (654,891,774 bytes) and 471 resolution-metadata entries (1,805,875 bytes). It also contains generated DSL, transform, accessor, hash and journal caches. File hashes alone did not validate that broader workspace copy. Nine previous preflight checks covered ownership/source/outputs but not this property. Inspection of the 64,870-entry Node input manifest found no paths matching `.gradle`, `.cxx`, `android/build` or `gradle-plugin/build`; this bounded pattern check is not a substitute for the actual new-stage inventory.

A1's metaspace warning is retained. No exposed OOM establishes it as either failure's cause. Do not change memory settings in this correction.

## Chosen correction

Use a fresh task-owned stage and fresh generated Gradle caches. Reuse only reviewed dependency inputs and their compatible offline resolution metadata. Do not copy the whole Gradle user home again, repair the consumed A2 stage, or restore a hand-picked missing folder and assume all other copied generated workspaces are valid.

| Input or cache | Treatment |
| --- | --- |
| Reviewed source639, accepted Android templates, Node source manifest and exact ZXing Maven bytes | Copy and verify the existing pinned inputs; no source/dependency changes. |
| `gradle-user/caches/modules-2/files-2.1` | Copy from the frozen verified seed into the fresh owned home; inventory and hash every file. |
| `gradle-user/caches/modules-2/metadata-2.107` | Copy as compatible offline dependency-resolution metadata with its directory topology. This is repository-specific metadata, not interchangeable immutable JAR content. Keep the same Gradle version and repository identities/order. |
| Locks and `gc.properties` | Do not transfer live lock/GC state. |
| `caches/9.3.1`, `jars-9`, `journal-1`, daemon/native extraction/temp/profiling state | Do not seed. Let the unchanged toolchain generate its own outputs in the fresh stage. |
| Gradle distribution/JDK/SDK and approved local Maven repository | Use the same pinned existing inputs and current read-only input boundaries. No new download or global cache repair. The existing launcher is explicit; do not copy an unused wrapper distribution. |
| Project/composite `.gradle`, build/native, Metro/Babel/Node caches | Fresh owned outputs. Do not copy prior execution state. Preserve shipped package files whose names merely resemble build folders. |

Directory-complete copying of all generated caches would address the observed empty-directory omission but retain more generated state and require broader validation. It is not the selected fallback. If the selected offline dependency seed is insufficient, report the precise missing input; do not silently copy broader caches or enable networking.

## Implementation and verification sequence

1. Reconcile that A1/A2 children have exited, the agent is the sole writer, the workflow lease is available, and no prior effect is uncertain. Acquire and maintain a live lease. Preserve branch, dirty work, all prior stages/intents and indexed evidence. Create a distinct A3 stage/evidence directory without overwriting any predecessor.
2. Implement only the task-local preparation/helper correction. Use an explicit cache allowlist above, a directory-and-file inventory, and byte/hash verification before and after copying. Retain empty directories in allowed trees. Reject unintended junctions/reparse escapes; never create writable links to previous stages. Reuse already approved Node mappings only where real paths resolve within the new owned stage.
3. Before large copying, self-check the helper in a tiny owned fixture: nested empty directories survive; a generated `groovy-dsl` sentinel is excluded; a differing existing destination refuses overwrite; paths containing spaces and already extended Windows paths normalize once and remain inside the target. Use Python 3.13-supported bounded batches, not Python 3.14's `buffersize`. Routine helper repairs before assembly belong to the agent and do not need a coordinator round trip; preserve their evidence and original preparation deadline.
4. Keep the single shared child-environment factory for probe and build. Retain owned `ANDROID_USER_HOME`; remove `ANDROID_PREFS_ROOT` and inherited `ANDROID_SDK_HOME`. Inspect inherited Gradle/Java option variables for conflicting path overrides without logging secrets. Create the actual owned preferences directory before its SDK probe. Require the resolved directory to match exactly; no mock/nonexistent-directory substitute.
5. Verify the real six package/composite resolutions (`expo`, `expo-modules-core`, `expo-modules-autolinking`, `expo-constants`, `react-native`, `@react-native/gradle-plugin`) inside the new stage. Preserve accepted templates and repository definitions. Verify the current observer/charter/source/index/lease bindings, Metro syntax and actual cache paths, exclusive output publication, negative refusal checks, and no old sealed-output bindings. Revalidate module cache inventory against the frozen seed and assert no excluded generated Gradle cache was seeded before Gradle starts. Do not invoke Gradle merely for preflight.
6. Independently self-check the prepared helper and assertions, then run ONE distinct corrective offline release assembly with the same task list, stacktrace capture, 2 GiB heap/512 MiB metaspace, in-process Kotlin, 2700-second deadline and 64 MiB log cap. Preserve the existing 2400-second preparation bound. No parallel/hidden diagnostic builds or automatic repeat. Cold generation may cost more time; expiry is a recorded failure, not permission to extend the deadline. Record the intent before dispatch, actual process/result/log, and release the lease after stopped handoff.
7. If successful, perform the existing exact APK checks and return ONE stopped handoff. Require observed 129 baseline artifacts plus exact ZXing core = 130, not the expected list alone; compilation/R8/entry/bundle/source map, model/LICENSE/NOTICE, exact baseline 19 arm64 libraries with no barhopper, CRC and 16 KiB ZIP/ELF alignment, package/signer, CAMERA/internal-signature-only permissions, internal BarcodeActivity and disabled old Activities, and APK <=128 MiB. Preserve the source639 index `a0ef1e99888ea28b9a5f8d6cfa240d6013bb80f86db2d027b9a0de08f5d2f815` and core SHA `71de5d89341b5fcf5dd89da7f44e84d825d0e084cdf3ec77c9abe26b0f0ceb13`.

## Completion and stop boundaries

Success is a built, verified artifact ready for the coordinator's existing conditional APK review. A source/helper/probe pass alone is not success. Existing D-063 allows one conditional update/setup only after that review; it does not yet authorize scanning or photos. No installation occurs as part of this plan execution handoff.

Stop on source/seed/lease/identity mismatch, missing offline artifact, unexplained cache state, deadline/output limit, or failed assembly/artifact admission. Report the exact first causal evidence and what the helper already corrected. Do not relax checks, alter application code/dependencies/permissions, enlarge resources, rearm A1/A2/A3, erase evidence, or enter another speculative build loop. If a new material issue remains, the coordinator evaluates that evidence under the founder's escalation workflow.

No phone/settings/camera/photo/screenshot/model processing/export/Git/CI/P2-05 work, new agent, new dependency or network retrieval is part of this correction. Current installed visual A2 remains unchanged. This review used existing source, logs, metadata and filesystem inventories; it ran no Gradle, build, signing or physical test.
