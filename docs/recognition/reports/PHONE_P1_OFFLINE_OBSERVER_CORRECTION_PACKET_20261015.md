# P1 host observer correction and bounded offline confirmation

2026-10-15. Founder requested explanation, durable image-preparation notes, and
the affected verification repeated using existing photos/boxes/annotations.
Main owns implementation, review and phone execution directly; no subagent.

Objective: repair the demonstrated host-monitor lifecycle defect and obtain
separately recorded continuous actual-OFF evidence during one complete phone
processing run. A short check cannot retroactively fill the prior51-second gap.

Change surface: new host-only observer/runner/tests and documentation. No mobile,
native, model, frozen24-file source, runtime, dependency, radio policy, threshold,
crop, annotation, ranking or business-app change. No download/install/reset.

Established mechanism: the previous runner stopped its radio-monitor thread in
`finally` after a UI observer error even though operation closure had not been
established. A second concurrent UI dump was also introduced; its role in the
command error remains unconfirmed because stderr was not retained. Offscreen
private controls and an early picker snapshot were not handled adequately.

Correction: one host UI owner across processes; command failure diagnostics
retained with identifiers/raw service data excluded. A separate bounded monitor
process survives UI exceptions and continues until positively observed owned-work
closure or its finite deadline. UI errors trigger one cancellation/drain path,
never a second import/replay. All actual-state windows<=3s and gaps<=5s remain
mandatory; any breach invalidates the run permanently, even if later reads pass.
Current cellular service-state blocks only; no historical-log POWER_OFF shortcut.

Evidence before private work: focused generated host fault tests (UI error,
monitor failure/gap/read bound, exclusive UI ownership, no early shutdown), then
a short physical non-inference check with a generated host UI-error fixture.
This check starts no model/image/picker work and cannot itself accept P1 quality.

New private attempt, only after those checks and fresh human offline readiness:
`apps/recognition-lab/runs/phone-experiment/p1-offline-confirmation-device-20261015-a1`.
Retain the prior direct run and report byte-for-byte. Verify original exported
result b72de75b.../48607330bytes both on host and exact phone Downloads path before
reusing the working cache. One reimport of exact C4 input059b6f93.../131901810bytes,
one replay of40controls+40phone records (max80actual attempts), no retransfer or
new photographs/boxes/labels. This is a distinct verification repeat, not a retry
inside the consumed prior attempt or an accuracy-selection/tuning experiment.

The installed app has one atomic working result cache. New replay completion
may replace that cache only after original numerical evidence has been preserved
and hash-verified on host and the separately named phone Downloads export.
No existing export/evidence is overwritten/deleted; no app reset/cache clearing.
Both outcomes must be reported, including any disagreement; do not select the
better score. This narrow repeat supersedes the previous no-new-replay ceiling
for this new recorded attempt only, under the founder's current instruction.

Unchanged installed C2 APKc7f04760.../38915609bytes, sourcecf0fc3c7.../24files,
modelbbbb4c51..., manifest a3c210af..., original C4 packet remain mandatory.
Full hashes come from accepted C2 source pin and prior final verification.

Import/export/transfer bounds120s each, batch1500s, per-frame60s accounting;
max80records/full20query denominators per lane, one interpreter/thread CPU,
no GPU/NNAPI/XNNPACK. Monitor actual Wi-Fi/BT/current cell/default/tether plus
saved policy continuously. Drift/unknown/timeouts/USB loss: cancel once if
reachable, keep offline, observe owned drain<=120s, no forced native preemption.
No monitor may silently end because UI is offscreen or a snapshot failed.

Observe durable result; one post-closure isolated restart/recovery, same hash/
counts. One numerical export to a new absent observed local Downloads filename,
<=48MiB/zeroimages; exact USB transfer and unchanged independent comparator into
a new directory. Never use the generated exporter, unrelated documents, gallery,
private screenshots, cloud, Git effects, or radio mutation tools.

Main source-review checkpoint precedes this run. Founder provides fresh
independent-internet/USB and actual-offline confirmation. If unavailable, finish
host checks and stop before private work. If observation fails, retain invalid
evidence; do not retry until green or silently accept/waive the offline gap.
P2-03 camera G0/physical proof and dependent P2-04 remain separate gates.

C1 continuation: a1 timed out during filename selection with ZERO inference
requests. Its existing picker was cancelled once and ownership closed;165 actual
OFF samples remained continuous/PASS. Android's shortened grid-card title was
resolved through the full accessibility filename and exact enclosing file card,
with two added selection/refusal checks (ten host checks pass). Retain a1 failed
import, then use fresh `p1-offline-confirmation-device-20261015-b1` for one reviewed
import/replay after fresh preflight/non-inference probe. All original ceilings,
inputs, human readiness and non-overwrite constraints remain. This corrects the
host selector before any new inference; it does not retry/tune a recognition run.
