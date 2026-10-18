# P1 C2 actual phone replay — numerical result and evidence limit

2026-10-15. Main coordinator took over the stopped Low executor by explicit
founder instruction. No second import, replay, replacement build, radio change,
private image preview, or private image export occurred during this continuation.

## Decision

**Numerical portability, completed-result restart recovery, and numerical export
are verified for this frozen packet. The complete physical offline gate is
UNVERIFIED because actual-state observation was interrupted during the batch.**
Neither the earlier import timing failure nor this monitor interruption is
waived. No replay retry is authorized or performed. P1 as a whole is not marked
passed, and P2-03 actual camera implementation/proof and P2-04 remain held.

## Observed result

| Lane | Correct first | Correct in first three | Query denominator |
| --- | --- | --- | --- |
| Frozen laptop baseline | 17 (85%) | 20 (100%) | 20 |
| Phone runtime, exact control tensors | 17 (85%) | 20 (100%) | 20 |
| Phone JPEG/crop/bilinear preparation | 19 (95%) | 20 (100%) | 20 |

All 80 scheduled records produced vectors; 80 actual inference attempts,
40 control and 40 phone records, 10 candidate products, no failed references or
queries. One worker/interpreter/thread, application CPU runtime, XNNPACK/NNAPI/GPU
false. This is a comparison of 20 correlated views of 10 known physical items,
not independent market accuracy, live camera feasibility, UNKNOWN calibration,
model selection, production acceptance, or proof of general improvement.

The control retained all 20 baseline candidate orders. With phone preparation:

- Airpro Cherry blossom 300ML, `p02-explore-2`: correct rank 3 → 1.
- CWAY ultra 600ml, `p05-explore-1`: correct rank 2 → 1.
- CWAY ultra 750ml, `p04-explore-2`: remains rank 2, behind CWAY ultra 600ml.
- Other 17 correct ranks remain first. No correct-rank regression occurred;
  lower candidate ordering changed in all 20 queries and is retained in full.

The unchanged comparator independently agreed with every native core score/rank.
All 40 control vectors passed frozen normalized tolerances: maximum component
error 0.0000030770064541260633 (limit 0.0001), maximum cosine distance
0.00000000015077961101894743 (limit 0.00001). Phone tensors/vectors differ from
the laptop LANCZOS recipe; they are not treated as runtime-parity failures.
Full tensor differences, near-tie annotations, and all 10 candidates per query
remain in `comparison/comparison.private.json` below.

## Restart, export, and pins

After completed-result UI/promise closure was observed, one isolated app
force-stop/relaunch and one explicit private recovery returned the same 80
attempts, lane counts, 48,607,330 bytes and result SHA256. Input/result association
was validated by the frozen native recovery contract and then by the independent
numerical receipt. UI evidence alone was not called direct native telemetry.

One export request wrote a new absent local Downloads destination,
`private-portability-10001.zip`; device and transferred host hash/size matched.
Its 161 ZIP entries are 80 tensors, 80 vectors and one receipt, with zero JPEGs
or other image entries. Original export observation completed in 67.945 seconds;
one scoped transfer completed within its 120-second bound. The first picker
inspection was premature; a later observation resolved the same request, not a
new export. The earlier original import observation remains expired/incomplete.

- Installed APK: `c7f04760381e7a3bedbff14084ec12b03c51229eb0e73660be0494a0d7afc48b`.
- Frozen 24-file replay source: `cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d`.
- Input: `059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e`.
- Result: `b72de75bbf1195a3c0cd4d3f649e45f190e7709894b394da85b9fe452e84e80e`.
- Manifest: `a3c210af479959d3223b1fda2aa69b6060fe70b050e7e062b9a5bf8e58fefa8c`.
- Model: `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.

Native batch time was 498.248 seconds. Summed inference calls were 477.379 ms
for controls and 453.844 ms for phone records; maximum per-record total was
6.594 seconds, with no 60-second row timeout. These are instrumented batch/stage
measurements, not live scan latency or a phone performance acceptance result.

## Physical observation interruption and diagnosis

Three prior planned native status diagnostics remain accepted. The direct
replay retained 311 passing actual-state observations: read windows at most
1.813 seconds, observed gaps at most 1.094 seconds, last observation
12:06:27.849507 UTC. No radio/network drift was detected in those windows.

At 12:06:21.561792 UTC the UI observer recorded a selected-device command
failure. A concurrent coordinator UI inspection also failed. The coordinator
had introduced a second `uiautomator dump` while the first observer was active;
this is a host execution defect and a plausible interference mechanism, not a
confirmed native/model failure. The failed commands did not retain stderr,
so their exact OS-level cause cannot be established from the saved receipts.
No automatic command retry or inference rerun followed.

The observer could not initially see the cancellation control because the
screen was on cached generated-report content. No cancellation tap or force-kill
was made. Main HIGH review then used one bounded navigation/observation sequence
to locate the existing private result; both lanes were already complete and no
active cancellation was present. Only after closure was the planned restart run.

Actual OFF evidence resumed at 12:07:18.801487 UTC, approximately 50.952 seconds
after the previous observation. This exceeds the prescribed five-second gap,
and overlaps the expected tail of the native batch. Subsequent OFF readings do
not prove the intervening state. Native saved-policy checks and the APK's lack
of INTERNET permission do not replace this missing physical observation.

## Evidence and next action

Run root (relative to repository):
`apps/recognition-lab/runs/phone-experiment/p1-private-portability-device-20261013-a1/offline-gate-c2-replacement/direct-replay-20261015-a1/`.

Key receipts: `coordinator-admission-review.json`, `replay-start.json`,
`replay-observation-failure.json`, `offline-monitor-summary.json`,
`observer-resolution-result.json`, `observer-resolution-monitor-summary.json`,
`salvage-review.json`, `recovery-result.json`, `device-export-verified.json`,
`numerical-transfer.json`, `export-result.json`, `comparison/independent-checks.json`
and `comparison/comparison.private.json`. All earlier failures remain intact.

Phone work is closed; no model, picker, or cancellation operation remains owned
by this executor. The founder may manually restore normal phone settings.
No tool changed those settings. Candidate source and input remain frozen.

Next: review the physical-evidence gap and propose a separately bounded observer
correction using one UI owner, retained command errors and robust panel
navigation. Any new private replay requires an explicit new reviewed packet;
do not reset/retry this consumed attempt or silently clear the offline gate.
After P1 disposition, resolve the documented P2-03 G0 policy/budget decision
before actual camera implementation; P2-04 still depends on its physical proof.
