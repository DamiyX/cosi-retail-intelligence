# P2-02 C1 independent audit

2026-10-14. Coordinator decision: ACCEPTED for generated laptop preparation.
The same existing implementation writer returned STOPPED before this audit;
the coordinator verified its frozen artifacts and released its finite lease.
Branch remains plan/m8-unified-scanner, HEAD
66ea3fc22595a48d7355d1729bb879496cc98896. No implementation source was changed by
the reviewer. P1 remains founder-deferred because the phone supplies laptop internet.

## Correction and independently observed result

The prior audit reproduced loss of two observed frames and one usable vector when
an active generated trial was reopened and explicitly classified as interrupted.
The correction preserves the existing cloned trial frames and hashes the new
interrupted record around them; when no record exists it still uses an empty list.
It adds no capture, model execution or admission. Pending observations remain pending.

The original independent harness was copied with only the new disposable root
literal changed and imported actual current source. Its original assertions passed:
two frames before and after, one usable vector before and after, all frame bytes
equivalent. The resulting row is INTERRUPTED, complete=false, attempted=2, missing=1,
attempt denominator=3. This does not claim physical worker drain.

## Fresh verification

Evidence root:
apps/recognition-lab/runs/phone-experiment/p2-generated-02-c1-independent-20261014-a1.
Exact current source/fixtures/tests were copied into a new shadow before execution.
Installed Node24 and existing Python were used; no dependency or network installation.

| Check | Observed result |
| --- | --- |
| Fresh enrollment suite, Jest runInBand/no-cache | 20 passed; 39.68s, exit0 |
| Fresh unchanged session functional suite, Jest runInBand/no-cache | 34 passed; 4.552s, exit0; one explicit historical CLI destination case skipped |
| Original independent partial recovery harness, actual source | exit0; 2 frames/1 vector preserved |
| Actual lab TypeScript noEmit | exit0 |
| Actual lab ESLint, max-warnings0 | exit0 |
| Saved actual CLI evidence | 35 commands have expected exits; frozen receipts/hashes verified |
| Independent numerical/report checks | 14 trial rows, 56 arms, 80 candidate scores/ranks recomputed; denominators and no-autoaccept flags correct |
| Two separately created complete stores | report and source-manifest bytes identical; current20 source rows match |

The old35th session case embeds a historical output root. Its exclusion is explicit;
the current enrollment suite executes the current CLI integration. Neither its
assertions nor accepted test source was edited. Saved35-command evidence is reviewed
writer execution, not represented as35 additional fresh reviewer executions.
Logs, exit receipts, reviewed-deltas.patch, original harness output and
independent-results.json retain the exact evidence.

## Scope, preservation and completion metadata

147 baseline source rows checked:143 unchanged, precisely four authorized deltas.
enrollment.ts contains only the observation lookup/replacement; cli.ts/store.ts
contain only new-root literals; the test adds four persisted recovery regressions,
one type import and the root literal, preserving the original16 bodies.
All22 current source/test/fixture/handoff snapshots match. The accepted session,
generator, evaluator and fixtures remain exact; P1 source is unchanged.

Extended Windows enumeration verified full frozen roots, recording junction targets
without following them: current C1 writer427 entries, original P2-02 writer581,
failed independent audit135, older P2-01 roots173/45/104/48. The previously disclosed
five long-path manifests in the older48-entry root match already-frozen sibling
receipts; no old inventory was rewritten.

One completion metadata discrepancy was found: writer-stopped.json's
preservationSha256 field is stale (743aad001445e7f2b045bf5907e7088b34ddf30274846988c1d855715a3ca230).
The actual delta-and-preservation.json hash is
ad368f66dc43f3dcac2c9f4e0aebe746413e46b6fe70b77f2f67931a44bc9109.
The final inventory correctly records that actual hash and its425 entries verify;
the STOP marker binds that inventory hash exactly. File modification precedes STOP.
Thus the coordinator resolves the binding through the verified inventory and its
own fresh checks, not through the stale field. Existing frozen receipts are retained
unaltered; this report and preflight.json provide the independent correction.
This is a completion receipt defect, not evidence of poststop mutation or a recovery
failure. Future finalization must derive all marker hashes from final bytes.

## Limits and next action

Writer's retained19-pass/1-failure shadow run encountered Windows EPERM publishing
a checkpoint. This audit's fresh20-case run passed unchanged assertions; the prior
failure remains retained. Rename refusals and non-stolen stale locks remain possible;
no automatic retries or deletion were introduced.

Acceptance is limited to generated enrollment, file recovery and gallery binding on
the laptop. It proves neither Android power-loss durability nor camera geometry,
radio/offline behavior, recognition quality, live latency, UNKNOWN/holdout readiness,
M12 integration or release readiness. No private pixels/model/native/ADB/radio/build/
install/Git/cloud effects occurred. P2-03 is not dispatched.

Next is the concrete isolated-camera permission/build preparation and review gate,
with actual camera execution still dependent on P1 physical offline/result review.
Do not ask the founder to disconnect the hotspot while P1 is deferred. Keep the same
writer for subsequent approved slices, requiring STOPPED/direct handoff before audit.
