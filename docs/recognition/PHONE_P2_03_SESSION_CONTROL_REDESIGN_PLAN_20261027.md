# P2-03 camera session-control redesign

2026-10-27. Planning complete; implementation and phone execution have not begun.
Founder requested this review after the main-controlled attempt also stopped.
Implementer: Sol 6.1 High. Main retains physical-test ownership unless the founder
changes it. This document is a proposal, not a new capture or screenshot allowance.

## Finding and decision

Replace the fragile host setup/session orchestration with one explicit state
machine. Reuse the installed camera app, native capture/save/export path, geometry
rules and preserved evidence. Do not rebuild the whole app or add a dependency.

The latest failure was an unmet preview-readiness prerequisite, before Inspect,
ACK, screenshots or Capture. Main restored the preview 273.640 seconds before
READY; the app pauses an idle preview after 120 seconds. The later same-process
observation showed previewMounted=false and geometryReady=false. Preview expiry
is strongly supported, not conclusively attributed to a recorded watchdog event:
the initial failed snapshot was not saved. The host/UI timing incompatibility is
visible in source regardless of that missing event.

The preceding stop was different: V3 assumed a completed input command meant the
asynchronous Inspect callback had finished. V4 now waits for actual completion,
but the latest run stopped before exercising it. Its passing fake-transport tests
are not physical verification.

Four recent stopped phone runs concern readiness/control: old pre-image age,
expired native nonce, Inspect completion observation, then paused preview. This
is not a count of all historical P2-03 problems. Older storage/export, rotation
and graphics failures are separate. A prior photo was saved and exported, so
there is no evidence that the entire capture/save implementation must be replaced.

Alternative: move orchestration into a new phone-side capture controller. That
would require UI/native changes, another source-bound APK and renewed install/
export verification. Reserve it for demonstrated inability of the bounded host
protocol to meet timing or observe state; do not choose it merely to start over.

## Evidence and preserved baseline

Read these existing records, without modifying them:

- `apps/recognition-lab/runs/phone-experiment/p203-main-host-wait-20261027-a1/MAIN_RUN_STOPPED.md`
- Its `main-setup-ready.json`, setup observations and `MAIN_TAKEOVER.md`.
- `apps/recognition-lab/runs/phone-experiment/p203-readiness-device-execution-20261027-a1/M00-A000/main-continuation-c1/stopped-result.json`
- `docs/recognition/PHONE_P2_03_READINESS_RECOVERY_PLAN_20261027.md`
- `docs/recognition/reports/PHONE_P2_03_M00_EXPORTED_IMAGE_REVIEW_20261026.md`

Source inspected: CameraOrientationPanel.tsx (idle watchdog, restore, update,
capture and controls), cameraOrientationEvidence.ts, V4 controller and main_session.
The restore control already clears nonce/ACK and awaits new geometry readiness.
Native/React completion must be observed separately from command completion.

Installed APK SHA256:
`0055ef13bbd18d363ccc6a00c4cee97925e2cef45dbb5ac0ab8a5685584eaefa`.
Bound source-index SHA256:
`3aeff06cadd724ddd7be4a8085613392fac8cde7c9cdf2a212d08351e5662b66`.
Generated export SHA256:
`b9991e85b14ecd87f868bfa888e59178830f366c84fd4b20c0963fa9e70b5ff8`.
Keep successful install, generated export and all historical photographs,
annotations, interrupted checks, journals and consumed intents. No reinstall,
new namespace, native-row reset, product photography or label work is planned.

## One coherent protocol

### 1. PREPARED: human setup is not a capture attempt

Prepare exact connection/APK/sandbox/owner proof, chart, output, remaining budget
and executable commands before asking the founder to position the phone. Give
instructions first. Do not treat an early preview restore as proof of readiness
minutes later. Idle preview expiry is a normal setup state, not camera failure.
Manual preview restore for positioning is permitted by the existing instructions;
it never arms Capture or authorizes an automatic photo.

Explain in the READY prompt that the preview may briefly close/reopen after READY.
Founder keeps the supported phone still and chart displayed for two minutes.
Nothing timed starts until fresh READY. Do not wait on another agent or write
documentation after READY. An old READY after a usage pause is invalid.

### 2. READY: establish a fresh preview epoch once

Start one monotonic human deadline at READY + 120 seconds. Persist the first
bounded observation BEFORE checking its fields. Revalidate exact package/APK,
device, sandbox, current run/case/job, generated gate (and first-export gate for
later rows), native idle state and no unresolved capture. Missing/null/UNKNOWN,
busy, changed process or unrelated focus is a stop, never permission to restore.

For an eligible idle row, normalize preview using existing fixed controls:
if mounted, issue one Close-idle intent and observe unmount; if already unmounted,
record that state without a close input. Then issue one Restore intent and await
mounted AND geometryReady AND idle/not-busy. This gives a known fresh setup epoch
rather than guessing how much of the previous 120-second watchdog remains.
No loop of close/restore commands; an uncertain command is consumed and stops.

Only these deliberate setup transitions may change view generation. Require the
same process/lifecycle/run/case/job/source/APK/layout throughout and the expected
viewport after mounting. Record old and new generations; never patch an old
binding in place. Fail on unexpected viewport/layout/provenance changes.

Allow at least 15 seconds from fresh READY AND from observed restored geometry
before shutter dispatch, inside the original human deadline. This permits the
preview to settle while the supported pose remains unchanged. Restoring preview
does not confirm framing: the real pre-image must still pass visual inspection.
After this stage, freeze the view binding. No restore is allowed in the capture
tail; backgrounding, expiry or view changes stop that attempt.

### 3. INSPECT -> ACK -> PRE -> CAPTURE -> POST

Reuse V4's asynchronous completion behavior, including one new Inspect and one
ACK, waiting only through bounded metadata observations. Inspect must yield a
fresh nonce with the frozen identity/view and valid gates; ACK must enable the
actual Capture control. Retain capture and secondary inspection errors separately.

Take one pre screenshot, inspect its actual chart/pose/markers, bind its exact
hash and dispatch Capture at most once. Preserve all independent freshness bounds:
human READY 120 seconds, native nonce 120 seconds conservatively measured from
Inspect issuance start, qualified pre-image 30 seconds. No deadline extensions,
inferred framing, automatic pre qualification or stale image reuse.

Propagate the earliest deadline through every subprocess/observation, including
preflight and screenshot acquisition; a multi-command helper must not run beyond
the available window just because each command has its own timeout. Retain the
final dispatch guard. Transport completion never proves native admission.

Preserve V4's terminal observation, single bound post image, UNKNOWN diagnosis,
20-second terminal and 10-second settled-close bounds. Only native terminal proof
establishes publication/refusal. Unknown work is not forcibly closed or retried.
The existing idle/terminal watchdogs, geometry tolerances and memory/file limits
remain unchanged. No graphics fix or total-RAM guarantee is claimed.

### 4. Every exit produces usable evidence

Use a single session-level finalizer for success, timeout, guard rejection and
exceptions. Persist phase, sanitized reason, actual command intents/completions,
monotonic times, last exact observation and whether it preceded the failed guard.
If observation failed, record that failure; never replace it with a later snapshot.
Distinguish setup timeout, host refusal, dispatched/unknown and native terminal.
Record actual shutter/screenshot counts and missing evidence without refunds.

Use bounded, typed own-app metadata (maximum 8 KiB per observation and finite
observation counts). Do not record arbitrary phone contents. Release the host
lease without claiming that release cancels an uncertain device operation.

## Implementation boundary and accounting

Implement a new versioned host session/controller under
`tools/scripts/camera-orientation-session-v5/`, with tests there. Preserve V1-V4,
frozen packets and all original execution evidence. Reuse pinned transport and
the validated capture tail where safe; do not duplicate native geometry logic.
One runner owns setup, transitions and finalization; remove manual setup-script
coordination from the new path. No mobile/native/runtime edits in this plan.

Before activating the new runner, create a reviewed, explicitly linked successor
packet for the existing unfinished M00 row. The original row-slot, Inspect and
main-continuation-c1 intents remain consumed. Verify all their hashes and absence
of Capture/screenshot intents; never delete them or rerun their entry points.
Authorize only the new bounded setup sequence, with no additional photo slot.
An unexpected input/artifact or conflicting owner blocks activation.

Existing approved recovery totals stay unchanged: eight planned future photos
and 16 future screenshots, cumulative nine host Capture commands/18 screenshots
including the earlier one command/two screenshots. Reconcile actual journals
before activation. Native count zero does not refund a dispatched host command.
No source document creates a fresh physical READY or increases these limits.

## Verification before asking for another photograph

Sol 6.1 High implements and self-checks, then supplies a stopped handoff. Audit
the final patch/tests before device execution; no simultaneous writers. Any
delegated implementation uses Sol 6.1 High as the founder requested.

Required deterministic tests exercise the real controller/adapter entry points:

1. Reproduce the old failure: mounted setup, 273.640-second human delay, auto-pause,
   fresh READY. V4 refuses; new protocol observes, restores once and reaches the
   capture tail in simulation without extending any deadline.
2. Already-mounted and already-paused READY states; delayed mount/geometry,
   delayed Inspect callback and delayed ACK control. No duplicate input.
3. Restore timeout, lifecycle/process/viewport changes, missing current export
   gates, UNKNOWN/busy/native work, disabled control and permission loss: stop
   before Capture with the original failing observation retained.
4. Integrate watchdog expiry and delayed callbacks with existing panel tests
   using fake time. Don't mock every operation as immediate success. Confirm the
   panel's existing restore clears readiness and ACK; no APK change is needed.
5. Replay realistic recorded transport delays across the full sequence, all
   freshness boundaries, pre qualification and terminal/post. Check total elapsed
   time as well as input counts. If the sequence cannot fit, report that result;
   do not quietly remove checks, lengthen windows or ask for another photo.
6. Crash/timeout at each effect boundary, journal collision, old READY, consumed
   predecessor, screenshot cap and changed packet. Every exit retains a bounded
   result; no replay or budget refund. Preserve V4's existing regression cases.

The handoff contains changed-file hashes, test commands/results, failed-before/
passing-after evidence and the exact linked packet. Keep it concise. Do not spend
another session rewriting historical reports. Code checks alone cannot pass P2-03.

## Physical completion and next phase

After source acceptance, main performs one fresh-READY M00 session on the existing
verified APK. There is no separate extra photo rehearsal or install/export repeat.
Stop after the first photo for original/pre/post/geometry and prefix-1 review.
Only a complete accepted first-row result permits the remaining seven orientations
under their own READY prompts and unchanged approved budget, followed by the
existing final export and acceptance review. Preserve the completed interruption
evidence; audit its actual scope instead of silently calling it stronger proof.

P2-04 begins only after the remaining P2-03 acceptance items are satisfied and
recorded. Its existing plan is separate; this work does not plan P2-05.

If another setup/control failure occurs, stop with the exact transition evidence;
do not improvise another physical retry. A proven host timing/observability limit
triggers review of a phone-side controller. A proven capture/storage/graphics
failure triggers diagnosis of that component. Neither result alone warrants
discarding the whole application. Preserve all working paths and historical proof.

Planning stop: no phone accessed, no new test run, no runtime code changed, no
agent dispatched. Founder switches back to Sol 6.1 High for implementation.
