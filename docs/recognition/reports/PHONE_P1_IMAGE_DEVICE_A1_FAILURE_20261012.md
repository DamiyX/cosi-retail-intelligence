# P1 image device a1: completed batch, failed export after process death

2026-10-12. Founder explicitly requested fresh audit and phone testing. The fresh
re-audit passed source/build/host scope; see PHONE_P1_IMAGE_PIPELINE_REAUDIT_20261012.md.
This actual device attempt does NOT pass image-stage equivalence or export.

Same Galaxy A15 SM-A156E/Android16/arm64. Exact new audited APK installed with
adb install -r,exit0,35.172s; installed base.apk hash
`5bfb3c9c0d37ec5f43d85b1f1e63c6b8bd09cb18dc3c602bc730a768c11b33a8`.
No reset/uninstall/permission or global-setting change. Fresh mount showed no
automatic model/image work. One image batch completed42 cases; ZERO model calls.

Observed app receipt before export:
- 42 cases,211 output entries,8,087,458 ZIP bytes,4289.69ms displayed batch total.
- Generated ZIP SHA256
  `87d56ecf39b9cc85cb76b64f90de9309d0d507d2eb959555ecebe714541bb23c`.
- Visible first cases reported exact upright/phone bilinear comparisons but
  different Pillow tensors. These partial UI summaries do not replace full-byte
  independent comparison. No42/42 stage acceptance is claimed.

One export requested, system DocumentsUI observed in local Downloads with the
exact new filename generated-image-evidence-v1.zip. Exact target absence checked
before SAVE. After SAVE the app returned to its initial state: “No generated
image processing recorded.” No complete export acknowledgement was observed.
Read-only check of that exact file found ZERO bytes and empty SHA256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
No pull/comparison succeeded; the transfer command rejected missing success
state before any transfer. No delete, repeat batch/export or alternate destination.

## Root cause and confidence

Scoped dumpsys activity exit-info for ONLY the experiment package records its
latest exit at2026-10-12 16:16:43.661 device-local time, reason3 LOW_MEMORY,
importance400/background,59MB RSS. This falls during the open document picker;
host capture/SAVE timestamps are15:16–15:17 UTC (+1 local). Android developer
always_finish_activities is0, read-only; no setting was changed. Do not infer that
the planned200MiB memory budget was exceeded from this process-exit record.

Source retains Result.bundle/summary and export Ticket only in native/JS memory.
No durable bundle exists before launching external CREATE_DOCUMENT. OS process
death destroys both result and pending request; new root has no recovery path.
System picker creates an empty destination before callback; killed app cannot
write it. Confidence HIGH for this observed mechanism. It is normal that a
background Android process can be killed; keeping all completed evidence solely
in memory is a functional reliability gap, not a reason to alter phone settings.

Classification: implementation reliability defect at completed-result/export
lifecycle boundary. Severity HIGH for the experiment's complete-output claim.
Host geometry/export tests did not exercise process death. Earlier source/build
acceptance remains historical within its scope; operational acceptance withheld.

## Evidence and diagnostics

Immutable consumed run: p1-image-device-20261012-a1. Includes before/after installed
hashes, launch/no-auto-work, one consumed batch marker, complete visible ZIP
receipt, scoped picker controls, export/reset UI, selected filename/empty-file
facts and app-exit-info.txt. No private images/camera/business/network/model work.
User did not redraw or transcribe anything.

Host capture diagnostics: first completed view lacked the offscreen ZIP receipt;
scroll/capture recovered the SAME completed batch, no reprocessing. First picker
hierarchy capture was invalid XML; continued read-only inspection of the same
open picker succeeded. Neither caused a repeated native request. Export UI reset
and empty file are separate real device failures and are not relabelled passes.

Next bounded C1 correction: durable generated-only result before picker, verified
recovery across process restart, and orphan/stale export request safety. Preserve
this run and empty selected document; do not reopen/retry a1. Source/build review
then NEW exact device attempt including deliberate same-package restart testing.
No private40-image replay/live scanning until complete output survives this gate.
