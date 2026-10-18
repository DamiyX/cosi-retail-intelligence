# FC05-C1 — launcher status retention

Status: implementer STOPPED; lease released in the frozen handoff. C1 self-checks pass; coordinator independent acceptance remains pending. The controller remains unpublished.

The independent FC05 review identified that a double-clicked launcher would disappear after the controller exited, losing its final status. C1 changes only the new preparation builder and generated launcher. The launcher prints the fresh `framing-manual-20261011-a1` ID and start/end instructions, captures the child exit code immediately, displays it, waits for a key, then returns that saved code. It says to keep both windows open, retain the helper message, avoid retry/relaunch, and request coordinator assistance. WiFi ON still requires the helper proof.

The original pinned PowerShell command is byte-for-byte unchanged. `Invoke-FramingExperiment.ps1`, runtime, guards, existing generated tests, accepted framing source, original photos, annotations, and comparison are unchanged. Four consequential files were refreshed: `controller-source-manifest.json`, `execution-authorization.template.json`, `publication.template.json`, and `preparation-result.json`. Source coverage remains the same 49 paths, with only builder and launcher entries changed. Draft publication and authorization remain unapproved.

## Evidence checked

Actual Windows `cmd.exe` ran copied launchers with only the controller path replaced by harmless generated PowerShell children returning 0, 2, and 1. The pinned PowerShell executable/options and command structure were retained. No real controller or helper ran.

| Check | Before C1 | After C1 |
| --- | --- | --- |
| Harmless cases | 3 | 3 |
| Retention checks passed | 0 | 3 |
| Child returned 0/2/1 | Yes | Yes |
| Final code visible before key | No | Yes, all three |
| Parent held after child exit | No | Yes, all three |
| Key releases parent with saved code | No retention | Yes, all three |

The negative before-test exit 1 is expected regression evidence and is retained. The after-test exit is 0 with zero failed cases. Python syntax, exact command placement, 49 source hashes, consequential draft bindings, workflow schema, and scoped whitespace checks pass. No Explorer GUI/double-click, private inference, or real controller compatibility is claimed by these tests. The earlier coordinator review remains historical evidence; C1 does not rerun its controller probes or native checks.

## Frozen bindings and preservation

Evidence root: `C:\Users\doyew\AppData\Local\Temp\cosi-framing-fc05-c1-20261011`. Its `frozen-handoff.json` binds the new evidence, six candidate copies, current 49-source inventory, this report, and the bounded workflow/project-state changes. The final digest is reported directly to the coordinator.

| Binding | SHA-256 |
| --- | --- |
| C1 builder | `9b03fe48156331e2c127eaf2827b4a1c4594257fb440a4f7a6e9d6e993c5a96e` |
| C1 launcher | `c13d58ed5c439b2f5d8b962f09c2518ea3c6f7d9e1f555c9b303c3f7ed3a4618` |
| C1 source manifest | `5fc28d9747c1214d387eac9a550c71077aa1c8699730e27087d6692b8ce97bcc` |
| Unchanged controller | `32ee9dd1d76e5587e56991b7956c49c2f0c17751c946c328cc3f353999720e5e` |
| Unchanged accepted framing source | `a04100836e7d4dace169eb2e194c051e427311bf8b9a4bb5bb5c3e5761fb6312` |
| Historical FC05 freeze | `0a79e0b5fc90c085ebf04ad4eff4a8ccf583cab33d35654e4f208d4a34221797` |

The historical 73-file freeze and its exact bytes are preserved at `C:\Users\doyew\AppData\Local\Temp\cosi-framing-fc05-review-independent-20261011\pre-c1-freeze`. The original live freeze is also untouched; it describes the pre-C1 candidate and is not a current-source authorization. C1 verifies all 73 archived records and allows exactly six live deltas listed above. Of 694 baseline repository files, 692 remain unchanged; only the workflow and current-work state fields change, plus this new report. Of 79,095 protected baseline records, 79,089 remain unchanged; the six permitted candidate deltas account for the remainder. Git branch and HEAD remain `plan/m8-unified-scanner` / `66ea3fc22595a48d7355d1729bb879496cc98896`.

No operational E04/setup/producer approval/network review/publication, Desktop change, attempt, private output, network effect, or inference was created. The five lab preparation files remain unchanged. FC06 and formal unknown/holdout/Android/enrollment/OCR/production gates remain open; M9 timing, M10 OFF, and M11 real-staff gates are unchanged.

## Coordinator next action

Independently verify the C1 freeze, candidate hashes, exact six live deltas, prior archive, preservation, and lease null. For fresh harmless tests, copy the frozen `Test-Launcher.py` byte-identically into a NEW local Temp directory named `cosi-framing-fc05-c1-review-<unique-suffix>`; verify its hash against the C1 freeze, then invoke that copy with the pinned venv Python `-B` and `--before` / `--after`. The script derives the same sibling candidate/archive paths and writes only fresh generated evidence under its own directory. Expect before 0/3 retention passes (exit 1), after 3/3 (exit 0). Do not run the test inside the frozen writer root, the real controller/helper, or the preparation builder after freezing.

C1 acceptance permits only closing the launcher finding. The coordinator retains ownership of any later separately authorized operational preparation, publication, and founder manual OFF/empty-jobs/ON participation.
