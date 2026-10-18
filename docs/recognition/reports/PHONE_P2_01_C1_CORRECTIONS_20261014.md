# P2-01 C1 bounded correction charter

2026-10-14. Founder-authorized P2-01 implementation includes its stopped audit
and necessary corrections; original audit reproduced A1/A2, source not accepted.
Same writer01a1051f-0777-7573-ad09-0e550a4bd56a, Sol6.1 HIGH. No new agent/thread.
Coordinator stops source work and audit while writer active. P2-02 not dispatched.

Read PHONE_P2_01_INDEPENDENT_AUDIT_20261014.md and original plan/ticket/dispatch.
Objective: production controller passes the actual A1/A2 counterexamples while
preserving all existing limits, generated labels and honest drain semantics.

New assigned run (coordinator precreates its immutable baseline):
`apps/recognition-lab/runs/phone-experiment/p2-generated-01-c1-20261014-a1`.
Old writer171-record run and independent audit root remain byte-exact; never add
CLI/test/finalizer outputs there. No old-source/handoff/receipt rewriting.

Allowed existing changes ONLY:
- apps/recognition-lab/src/phoneCapture/session.ts: A1 reservation and A2 valid
  safety-gate observation semantics, minimal supporting ownership transitions.
- apps/recognition-lab/__tests__/phoneCaptureSession.test.ts: regressions and exact
  new assigned evidence-root literal for CLI checks.
- apps/recognition-lab/src/phoneCapture/cli.ts: exact new assigned evidence-root
  literal only; no CLI/schema/budget/scoring/admission/output-policy redesign.

New files: exclusive evidence/tools/snapshots in assigned C1 root and
docs/recognition/reports/PHONE_P2_01_C1_HANDOFF_20261014.md. No generated.ts/old10
fixtures/P0/P1/mobile/native/config/package/locks/plans/workflow/state edits.
Coordinator owns lease release after stopped return; do not renew/edit authority.
If these bounds are insufficient stop with concrete evidence.

Requirements:
1. Preserve exact original A1/A2 failing results and source hash. Use independent
   counterexample's actual source/control flow, not a rewritten passing scenario.
2. Reserve a single operation before any external factory callback; reentrant
   request/Start cannot allocate another frame/resource. Factory throws, cancel
   during creation, deadline crossing inside creation and synchronous completion
   must remain honest. If a resource is returned after invalidation, signal cancel
   safely and drain/release according to actual completion; no unowned factory work.
3. Valid current offline:false or permission:false observation while busy invalidates
   publication and keeps ownership until real drain; process before admission return.
   ready:false alone never cancels work. Repeated observations/cancel callback races
   must not double signal/release, publish late vectors or clear newer ownership.
4. Add meaningful failure-before/pass-after regressions plus original24 cases,
   virtual2999/3000/3001 boundaries, create/start/release failures, stale/cancel/
   never-finishing and normal generated CLI/report determinism. No timeout/config/
   assertion relaxation or retry-until-green. New output destinations only.
5. Focused Jest, actual source types/zero-warning lint, actual C1 CLI complete/
   incomplete/malformed/overwrite/determinism evidence. Hash source/config124
   protected records and24 P1 pins; old171 frozen artifacts and independent audit
   preservation match, with no additions. Generated.ts and10 fixtures unchanged.

Stop contract: exclusive C1 writer-stopped.json and exact final inventory/source
snapshots, then stop ALL edits/commands. Send ONE founder-authorized direct completion
to coordinator01a098ef-d830-7531-bca7-2d66b0a5b587 with handoff path/hash, command
exits, preserved failures, limits and STOPPED. File alone is insufficient. No
post-stop filesystem receipt; tool trace records delivery. Do not self-accept.

No phone/radios/private photos/model inference/build/install/dependencies/services/
cloud/Git/automation effect. Physical/camera/private P1/quality/UNKNOWN/M12 remain
pending. This correction addresses generated controller bugs only.
