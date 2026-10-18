# WA-01 — stopped manual-a3 waiting correction

Date: 2026-10-10. Sole writer: `01a1051f-0777-7573-ad09-0e550a4bd56a`,
existing Sol HIGH assignment. Branch `plan/m8-unified-scanner`, unchanged HEAD
`66ea3fc22595a48d7355d1729bb879496cc98896`. Status: **STOPPED preparation;
independent coordinator review pending; no operational authorization/publication**.

## Failure and bounded correction

Consumed manual-a2 failed in `WAIT_OFF` approximately 1.154 seconds after the
founder's OFF prompt, before pixels or private outputs. The coordinator's
connected-state replay reproduced `OTHER_USABLE_IP_INTERFACE`: the unchanged
full offline predicate rejects usable bound WLAN before checking disconnected
association. The wait treated that rejection as fatal, leaving no opportunity
to perform the manual toggle. The historical offending interface was not
captured; the replay identifies the currently bound WLAN, not an independently
proved historical interface. See `EXPLORATORY_MANUAL_A2_WAIT_FAILURE_20261010.md`.

New external preparation root:
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a3-20261010`.
Future run ID: `offline-manual-20261010-a3`. Main runner SHA-256:
`633bf8a40e20fdbfe177ca4fbb98ddb97d6e7b1bac0cc135edab8d13f3e41b75`.
Compared consumed a2 SHA-256:
`485905beec51e8dfbb2257b23d760ab476bb4fcc6b13c635c7a95aec2572b604`.

Only the main wait, its new local `Get-ManualOfflineWaitState` classifier,
fixed root/ID and preview run hint changed. The classifier verifies native
record shapes, association/profile, bound adapter identity and supported state,
and active bound-WLAN routes against the frozen connected binding. It runs the
unchanged full predicate first. If that fails with one of the three WLAN/IP
transition symbols, a waiting-only projection removes exactly the bound WLAN's
IP/routes and marks that adapter disconnected. The same unchanged predicate
must then pass for every other adapter/interface/route. An unrelated usable IP,
extra UP adapter, identity drift, unsafe internal route or malformed/unknown
state remains fatal. There is no blanket retry of `OTHER_USABLE_IP_INTERFACE`.

This projection grants **waiting only**, never offline authority or pixel access.
An actual offline candidate must pass the unchanged `Assert-ActualState`, which
re-reads actual native network state and requires software radio OFF. Session,
cancel and unchanged 180-second wait deadline are checked before/after the
candidate. `MANUAL_RADIO_NOT_OFF` remains the only caught guard failure retried.
The later private-work guard remains strict: reconnection aborts rather than
returning to waiting. A state change between candidate classification and the
actual re-read can conservatively stop the attempt.

## Source boundaries

`source-check.json` and `wait-only.patch` show 31 other main functions unchanged;
`Assert-LaunchRoot` changes only its fixed root. Support, Native.cs, Preflight.py,
runtime manifest, private network binding and CMD launcher are byte-identical
copies of consumed a2 (six files). The CMD's historical a2 window title remains
unchanged; execution resolves the sibling main runner with the new a3 ID/root.
The full privacy predicate, native query, private producer/evaluator arguments,
pixel/source fingerprint, child jobs, result parsing and mandatory publication
checks are unchanged. No new implementation, migration, dependency or model.

Work remains bounded at 1500 seconds; private producer/evaluator child limits
remain 930000/60000 milliseconds. Existing 30-second stop/drain allowance,
one-shot 240-second stopped recovery, 180-second ON observation, fresh ON
receipt binding and controller terminal handling are unchanged. Recovery cannot
resume private work. Existing CF-01..03 source corrections remain intact outside
the expressly permitted WA-01 wait exception.

## Verification actually run

All network/radio states below are generated substitutes. No native network
query, WiFi mutation, real helper launch or private-photo inference was used.

| Check | Evidence | Result |
| --- | --- | --- |
| Exact consumed a2 differential | `wa01-before-final.log`; `generated-wa01-Before-b4dda685b5bb4273a3341f21d976fa9c/results.json` | 22 cases, 12 fail new expectations; 10 controls pass |
| Exact a3 differential | `wa01-after-final.log`; `generated-wa01-After-c75ea5719470493681e1b1ccaa76f505/results.json` | 22/22 pass |
| Real helper orchestration with substituted effects | `flow-final.log`; `generated-wait-flow-6be36f0b190c4880be7a4cee7b2d5380/results.json` | 2/2 pass |
| Byte-identical a2 entry regressions | `entry-final.log`; `generated-entry-a18cc787c2594325813fa3386f6fdf6d` | 30/30 pass |
| Byte-identical a2 clocks/recovery regressions | `clocks-final.log`; `generated-clocks-e5bf3c9234654347b2eb2e040172df7d` | 8/8 pass |
| Byte-identical blocked operational-entry regressions | `blocked-final.log` | 4/4 reject without publication |
| Parse/runtime/source checks | `parse-check-*.json`; `source-check.json` | Eight PowerShell files parse; runtime/source verified; C# compile only; Python AST parses |

Total final a3 generated checks: **66 passed, zero failed**. Exact a2 connected
fixture passes its original connected predicate but its wait fails on poll one
with `OTHER_USABLE_IP_INTERFACE` in 0.384 seconds; IP lag fails likewise in
0.197 seconds. Exact a3 waits through the corresponding generated transitions,
then passes the full guard and mocked radio-OFF check. The 12 before expectation
failures include differing rejection order/symbols and the old inability to
reach timeout/cancel checks; they are not 12 distinct security findings.

The 22 cases cover connected/IP/adapter lag, full-offline positive control,
route/identity/extra-interface rejection, malformed/unknown state, radio still
ON, timeout/late candidate, bound cancellation, real session deadline, and
strict later private-guard reconnection/IP-lag rejection. Only timeout fixtures
substitute the stopwatch factory/sleep with a generated clock while preserving
the literal production 180-second bound. Other transition cases use the real
500ms wait. No host clock or production deadline was altered.

Helper-flow cancellation after the simulated OFF prompt emits no offline marker
and calls the private substitute zero times. The positive flow emits an offline
marker only after the full generated offline/radio guard, then calls the private
substitute once; it performs no real inference. Real source ready/ARM/wait/result
orchestration is retained; preflight, job, network, radio and restoration effects
are explicitly substituted.

Failed/intermediate runs are preserved. The first two harness logs stopped at a
PowerShell interpolation parse error before case execution; the test harness
was corrected. Round-two before has the same 22/12 expectation result, after is
22/22; the final harness additionally records each actual wait outcome. No
runtime runner changed between those passing a3 runs. These results extend
generated coverage; they do not retroactively make the previous 63 CF cases a
native transition test.

## Preservation and stop

Fresh baseline: 656 source entries and 66343 protected entries, including the
coordinator's current failed-a2 review, all prior packages/probes/logs/reports,
14 a1 failed/package digests and 19 a2 failed/package/publication/Desktop digests.
The old a2 freeze contains 854 indexed artifacts and has SHA-256
`edb1ee6cf543fa7a2dfb5de9f5051ff5f37825a321e4edce0c4ac54baec50a7e`;
the original 845-artifact manual preparation freeze remains
`7a035f8ef90d78d754592bebd7786e77b1adcd62812f18893411537ac61f8b6a`.
All 40 approved photo hashes and all 49 private intake originals are preserved;
only hashes were read. No profile/network identifiers or photo bytes are copied
into this report.

Final `preservation.json`, `allowed-state-delta.patch` and
`frozen-handoff.json` record exact hashes/counts, unchanged Git branch/HEAD,
permitted workflow/current-state edits and released writer lease. Existing
source changes belonging to other tasks remain untouched. Repository changes
for WA-01 are only active workflow fields, the current PROJECT_STATE work line
and this new handoff. All failed/intermediate generated artifacts remain indexed.

No a3 operational approval/publication/attempt, Desktop replacement, WiFi/global
setting effect, decode/inference, installation/elevation/service, phone/hosted
effect, Git publication, agent/model change or new milestone occurred. Consumed
a1/a2 are not retried. The writer stops after one direct coordinator handoff.

## Pending review and native gates

Coordinator must independently review these stopped bytes, waiting-only delta,
generated before/after evidence and preservation before any future publication.
Any later a3 authorization must bind its new exact root, ID and runner hash.
**Actual manual OFF/native adapter-radio compatibility, visible helper
launch/close/crash/recovery, native restoration, private experiment and E05
remain PENDING.** Polling races, hostile broker/OS, power/helper failure and
association versus internet reachability remain limitations. No recognition
quality or M12 result is claimed. Keep WiFi ON; do not launch consumed or
unreviewed utilities.
