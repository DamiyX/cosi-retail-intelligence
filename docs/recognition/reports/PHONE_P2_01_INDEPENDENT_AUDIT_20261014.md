# P2-01 independent audit — changes required

2026-10-14. Scope: stopped P2-01 source additions and generated evidence, compared
with coordinator's124 protected records and writer's15 additions/exact snapshots.
Direct completion received; writer idle/STOPPED verified. Coordinator released
lease before audit. No source repair by reviewer; no phone/private execution.

## Decision

CHANGES REQUIRED. Fresh24 authored tests/one suite20.623s, lab typecheck and
whole-lab zero-warning lint pass. Two independent behavioural challenges fail.
Generated source acceptance withheld; P1 offline deferral and P2 native gates
unchanged. Repair limited to findings below and fresh evidence-root plumbing.

## Specification findings

### P201-A1 — high: resource factory invoked before single-operation reservation

`session.ts` request invokes adapter.create after recording a frame but before
assigning owned work. An injected factory calling controller.request once observes
no owner and is admitted. Actual unchanged source creates2 resources and begins
both job-2 and job-1; outer assignment overwrites inner owner. The displaced job
cannot confirm release through the controller. This violates one job/zero queue
and can orphan resources; typed Adapter does not prohibit this re-entry.

Expected: reserve admission before invoking external adapter code. Nested request
and Start are blocked, no second frame/resource/work exists, and cancellation,
deadline, factory throw, synchronous begin/completion/release all retain truthful
ownership. A reservation is not proof a resource exists or that work drained.
Audit the sibling factory-cancel/Start paths; no forced clearing of active work.

### P201-A2 — high: busy-request guard ignores observed safety-gate loss

request returns at its owned-work guard before inspecting permission/offline
gates. Actual sequence: job captures at10ms; request reports offline:false at20ms;
completion at30ms publishes a USABLE vector[1,0], terminal staysnull. The gate-loss
observation should invalidate the active session irrespective of admitting new
work. Explicit cancel tests alone did not cover this path.

Expected: process a valid current offline/permission-loss observation before the
busy admission guard, invalidate publication and signal cancellation once as
appropriate; retain owned resource until actual completion/release, block replacement
Start through drain, preserve earlier partial frames. Ordinary ready:false is
capture readiness, not automatic cancellation of an existing valid job. Duplicate
observations and races must not create extra jobs or invent physical drain.

## Standards and evidence findings

Frozen171 artifact entries plus excluded stop/inventory records all match;15
current additions match snapshots; all124 protected records remain exact.
Handoff/stop/source/frozen inventory hashes match direct report. No P2-02/mobile/
native/config/package effect found within the checked source boundary.

CLI hardcodes the assigned evidence root; fresh authored tests would otherwise
write into frozen writer evidence. Reviewer created an exact source/fixture/test
shadow in a NEW independent directory, ran its original tests there and captured
fresh logs. No production or fixture edits to make tests pass. Fresh types/lint
target actual source. A correction needs a NEW root and matching CLI/test root
literal updates only; do not reopen the old frozen run.

Low follow-up: complete V21/V41 arms intentionally select one frame but are labelled
ONE_FRAME_FALLBACK. Rankings/counts are explicit and correct in the inspected
normal report. Distinguish planned single-frame from multi-frame fallback before
real P2 reports; this presentation issue is not added to current correction scope.

## Reproduction and limits

Independent evidence root:
`apps/recognition-lab/runs/phone-experiment/p2-generated-01-independent-20261014-a1`.
`ownership-challenges.ts` directly imports unchanged real session.ts, fake adapter
only. Exit1; factory-reentrant-request-keeps-one-owner=false,
busy-offline-loss-invalidates-current-frame=false,
synchronous-begin-completion-releases-once=true. Full generated states retained
in ownership-challenges.json, without private data. Source hash reviewed:
4b37169336aeb0b637f0456126712ad359a3a1468ec63a3aa478efc7a25dc046.

Fresh tests: exact copied authored suite24/1/20.623s exit0; actual-source lab
types/lint exit0. setup-verification.json and fresh-*.log retained. This is
generated behaviour review, not Android/camera/network/privacy runtime evidence.

Next: same sole writer fixes only A1/A2 under PHONE_P2_01_C1_CORRECTIONS_20261014.md,
preserves original frozen run/audit/source snapshots and returns STOPPED direct
handoff. Coordinator audits afterward. No P2-02/native advancement yet.
