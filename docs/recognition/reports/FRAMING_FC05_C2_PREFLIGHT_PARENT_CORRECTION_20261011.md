# FC05-C2 — connected preflight output-parent correction

Status: implementer STOPPED with lease null in the frozen handoff; C2 source checks pass, coordinator independent acceptance pending. The controller remains unpublished and its fixed run ID remains unconsumed.

The coordinator reproduced an integration failure: the connected command targets `private-framing-manual-20261011-a1/producer` before its immediate parent exists. The offline adapter intentionally creates that parent later, after OFF, and rejects an existing output root. `crop_runtime.prepare` previously required the parent before the preflight early return, causing `INPUT_UNAVAILABLE` while connected.

The authorized correction changes only that parent validation. Exact `preflight is True` permits one absent immediate parent when the grandparent is an existing directory under framing RUNS. Unchanged `checked_path` checks the complete future output, missing parent, and grandparent. Existing parents remain valid. Normal production still requires its parent to exist. There is no directory creation, generic ancestor fallback, broad exception handling, or change to producer/numerical/native/offline/jobs behavior.

## Evidence checked

- A fresh real CLI regression failed before the repair with exit 1 / `INPUT_UNAVAILABLE`. Its negative receipt/log remain in the new evidence root.
- The final generated Python suite passed **70 tests**, zero failures/errors/skips, including eight new C2 tests. Its 12 real CLI subprocess cases cover one missing parent, an existing parent, two missing levels, normal production with a missing parent, a file parent, outside ceiling, occupied file/directory outputs, actual junction and dangling junction, a Windows case alias, and the actual fixed command-plan layout. The successful missing-parent cases leave both output levels absent. Generated originals remain 40 hash-identical assets; source/recipe/ranking denominator checks remain 40 encodings / 20 queries.
- C2 preflight subprocesses execute the actual script/main/parser/prepare with imports of PIL, tflite_runtime, and tensorflow forbidden. All 12 receipts show zero forbidden imports. Normal production with an existing parent is checked through prepare without calling produce. Five non-boolean/false preflight values cannot relax the missing-parent check.
- The fixed-layout regression parses and invokes only the actual fixed-package and command-plan functions, verifies their `--out`, preflight/producer argument relationship, absent output parent, and existing RUNS grandparent, then exercises the equivalent fresh generated layout through the real CLI. It does not run the controller/helper or private stage.
- **24 Node framing tests passed**, zero skips. Existing numerical/orientation/crop equivalence, preservation, provenance, query/gallery failures, ranking, and denominator checks passed using generated pixels/vectors and mock inference.
- Actual read-only source-binding functions and PowerShell syntax checks pass for all **49 execution sources**. No controller/library entry, native query, helper, or private processing ran.

Initial focused logs retain two test-harness errors, the native symlink privilege failure, and a later generated key-comparison error. The path expression, extracted parameter handling, and comparison parentheses were corrected; original production/test bodies were preserved. Windows denied native symlink creation with **WinError 1314**. The symlink and dangling-symlink guard branches are tested with simulated filesystem metadata; actual junction, dangling junction, and alias rejection are tested through the CLI. Native symlink execution is **unverified**; no privilege or host setting was changed and no test was skipped.

## Candidate bindings and immutable revision

The new immutable five-file revision is `apps/recognition-lab/runs/framing-comparison/execution-preparation-20261011-a1-c2`. Comparison and founder annotations are copied byte-identically. The prior five-file revision remains unchanged. New source/setup/producer templates bind the revised source; every approval/review/publication remains draft.

| Binding | SHA-256 |
| --- | --- |
| Revised framing source | `dd68bc1f2a4b1bfd899363ad3223f15c74e2d393db612a609703dc65b7e6999d` |
| Revised controller | `8c93179dd2971b7464fcc005b57ca6a25190490ddfe33e2958cba12def62ee81` |
| Revised controller source manifest | `afd059c8b552bc5c4eea7d9f2abe6ee48897840053817487372905217cd3be66` |
| Revised runtime metadata | `b44d58d6cdeb0128a4143e0790577ffb39d77869fd48259cb0d7c1d1d8da19ce` |
| Unchanged C1 launcher | `c13d58ed5c439b2f5d8b962f09c2518ea3c6f7d9e1f555c9b303c3f7ed3a4618` |
| Unchanged annotations | `94dc350fad86fbac717de276970cd1fe1a78edbe9bf60cdd8a49952689bbb134` |
| Unchanged comparison | `e39e28e9af82e5798884767854f745369b23cd18e7c24d140bf8faa00799d6d4` |
| Historical C1 freeze | `146cb955bffac3a5abafa3811abcbf3cb1dec573acf5da61a710ba0716e49edc` |
| Historical pre-C1 freeze | `0a79e0b5fc90c085ebf04ad4eff4a8ccf583cab33d35654e4f208d4a34221797` |

Ten live candidate files change: builder, framing bindings, input validator, generated controller, runtime framing metadata, source index, execution-authorization/network-review/publication templates, and preparation result. The controller differs only in its new runtime and binding digests; its body is identical. Runtime differs only in framing source/preparation metadata. Native/jobs/offline/recovery controls, old producer, model, installed software, numeric recipe, photos, annotations, and ranking code remain unchanged. Source coverage stays 49, with three preparation paths replaced and seven common records updated. The C1 command and saved-exit/pause behavior remain byte-identical.

Evidence root: `C:\Users\doyew\AppData\Local\Temp\cosi-framing-fc05-c2-20261011`. Before mutation, all **74 live candidate files** were copied hash-identically to its `pre-c2-live`, with both prior crop/test source files saved under `pre-c2-source`. Historical C1 53-file and pre-C1 73-file freezes remain unchanged. The C2 freeze binds these archives, all new evidence, candidate/source copies, generated-lab inventory, new preparation inventory, report, workflow, and state. Its final hash is sent directly to the coordinator.

Of 696 baseline repository files, **692 remain unchanged**; only crop runtime, its generated test file, workflow fields, and current-work state change, plus this new report. Of 79,233 protected baseline records, **79,223 remain unchanged**; exactly ten permitted live candidate deltas account for the remainder. Newly created lab records are limited to generated test fixtures and the new immutable preparation revision. Original A1–A5/FC04/C1 evidence and all historical consumed attempts remain preserved. Git branch/HEAD remain `plan/m8-unified-scanner` / `66ea3fc22595a48d7355d1729bb879496cc98896`.

The refresh helper initially emitted an incorrect preparation-path label in its receipt. Actual builder/runtime/package paths were correct; the initial receipt is retained as `refresh-result-initial.json` and the corrected receipt is independently bound by source checks. All failed proofs and harness logs are retained.

## Limits and next action

No operational E04/setup/producer approval/network review/publication, Desktop change, attempt, actual private output, real helper/controller, private pixels/inference, or network effect was created. Real connected/private/OFF processing remains untested. Formal unknown/holdout/Android/enrollment/OCR/production gates, M9 timing, M10 OFF, and M11 real-staff gates remain unchanged; FC06 is pending.

Coordinator independently reviews the frozen C2 bytes, exact parent-validation delta, prior archives, source/controller/runtime/template bindings, actual fixed-plan regression, preservation, and native-symlink limitation. Any fresh generated tests must use a new evidence directory via `FC_EVIDENCE_ROOT` and pinned venv Python `-B`; run `test_crop_producer.py` directly for the full generated suite or `-m unittest test_crop_producer.PreflightLayout -v` from its directory. Do not write into this frozen writer root, rerun its preparation builder, or start the real controller/helper. Later operational preparation/publication and founder manual OFF/empty-jobs/ON participation remain separately coordinator-owned.
