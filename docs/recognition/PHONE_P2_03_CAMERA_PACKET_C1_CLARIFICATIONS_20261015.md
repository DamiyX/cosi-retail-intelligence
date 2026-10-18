# P2-03 camera packet C1 clarifications

2026-10-15. Document-only addendum to the frozen October14 camera draft; read with
the [coordinator review](</C:/Users/doyew/Documents/DEV 2/COSI-m8-planning/docs/recognition/reports/PHONE_P2_03_CAMERA_PACKET_REVIEW_20261015.md>).
This resolves CP-D1/CP-D2 wording, not G0 or implementation approval. The original
draft/review and all prior evidence remain unchanged. No storage budget is waived.

## CP-D1 — producer exposure is distinct from admitted storage

Observed source: [raw JPEG resolver, skipProcessing](</C:/Users/doyew/Documents/DEV 2/COSI-m8-planning/node_modules/expo-camera/android/src/main/java/expo/modules/camera/tasks/ResolveTakenPicture.kt:185>)
writes imageData through ByteArrayOutputStream to SDK cache before returning to
the proposed consumer. It has no consumer-defined12MiB write bound. Resolution
fallback may exceed the requested picture size, as the review records. Therefore
4MP/12MiB admission constrains accepted processing/evidence, not earlier SDK
allocations, encoded bytes or temporary disk peak. The separate memory caveat
remains: pre-admission camera/imageData buffers are not bounded by native decode
checks. No current stock raw API hard producer-byte guarantee is claimed.

| Enforcement point | Proposed rule and limit of the claim |
| --- | --- |
| Before request | Reserve owned-write/metadata space and conservative device headroom; no concurrent job. A24MiB reservation is not a producer cap. |
| SDK capture/cache write | Measure observed bytes/peak separately. App admission occurs too late to prevent an oversized allocation/write. Unmeasured peak remains unknown. |
| Native admission | Before full decode/copy into admitted evidence, reject bytes>12MiB or header pixels>4,000,000, bad/missing metadata and changed files. No automatic downsample, re-encode or retry. |
| Owned write/commit | Under a journaled reservation, bound every staged/retained/derivative/metadata/export byte in the selected store budget; fail before an owned write would exceed it. No readiness before durable hash-bound commit. |
| Failure/restart | Preserve bounded refusal facts and reservations; no vector, silent deletion, zeroing usage or automatic recapture. Reconcile actual owned files before new admission. |

**Two policy choices remain PROPOSALS requiring an explicit G0 design decision:**

1. **Recommended only for evaluating the installed path:** hard256MiB bound on
   experiment-owned retained/staged storage, with SDK producer/cache peak separately
   exposed, measured and reported as currently unbounded by this application.
   Keep conservative headroom and retain oversize failures. This changes the
   draft's proposed all-inclusive budget; it is not approved or effective here.
2. **If hard256MiB including the producer is required:** first prove a producer-side
   upper bound and reserve it, or return a separately reviewed bounded adapter/
   provider proposal. Stock post-capture refusal and requested size do not prove it.
   No provider/dependency replacement or code change is authorized by this choice.

Until G0 selects a policy, the draft's hard total is unproved; do not dispatch
implementation by relabelling SDK cache as excluded or treating headroom as proof.
Neither choice relaxes the12MiB/4MP accepted-input limits or115-record count ceiling.

Original19/20 arithmetic is conditional: N existing12MiB JPEGs, no residue/extra
artifacts, SDK temporary<=12MiB, one owned12MiB copy, metadata<=1MiB. Then
12N+12+12+1<=256MiB: N=19 gives253 and permits the20th request; N=20 gives265
and refuses the next. After commit20 JPEGs+metadata use241MiB. The unproved SDK
assumption prevents this arithmetic from guaranteeing the total. Under choice1,
define owned staging/derivative/export terms separately; do not silently reuse
this count as a new bound. 115*12MiB=1380MiB, so115 captures are never guaranteed.

Oversize or partial producer output: retain the job binding, observed byte/pixel
facts, stage/error, admission refusal and available producer-file identity in a
bounded pre-reserved failure journal. Do not copy an oversized file into admitted
storage or decode/hash it through an unbounded admission operation. Track any
owned staged bytes and unresolved reservation across restart. SDK leftovers remain
reported producer exposure; preserve available failure evidence pending separately
reviewed owned-file cleanup. Cache durability is not promised: missing/evicted
output is an explicit evidence loss/unknown, not a valid image or a free retry.

Later implementation evidence needed, **not tests implemented or run here**:

- Exact12MiB/4,000,000-pixel boundaries and one-unit-over refusals before decode;
  requested-small/returned-large producer, including oversized SDK cache output.
- Owned usage at/below/above256MiB with reservations, partial writes, derivatives,
  metadata and export copies accounted; low disk space and failed SDK/owned writes.
- Injected interruption before/after reservation/copy/commit and actual restart:
  no duplicate capture, leaked-free capacity, ready partial state or lost facts.
- Producer peak measured independently of final file size; inability to measure
  is reported inconclusive. Show an oversized file can exist despite refusal.
- A choice2 hard-total claim additionally requires producer-side negative/boundary
  proof through every capture/write failure path; a consumer-only pass is insufficient.

## CP-D2 — P2 confirmation and P5 are different stages

| Stage | Correct outcome / prerequisite |
| --- | --- |
| P2-01 / P2-02 | Generated session/enrollment preparation independently accepted. |
| P2-03 | Camera plan reviewed; actual source implementation, build and physical one-shot proof have NOT passed. |
| P2-04 | Guided phone enrollment; cannot start until P2-03 physical proof/review. |
| P2-05 | Live scan comparison after enrollment and camera/ownership gates. |
| P2-06 | Frozen later-session paired confirmation and feasibility decision; **P2 ends here**. |
| P3 | Conditional OCR/specifications, justified by residual distinguishing evidence. |
| P4 | One justified extra visual cue, with its own comparison/cost evidence. |
| P5 | Independent difficult-set protocol/evaluation, with source-family separation and unknown/calibration/holdout discipline; NOT P2 same-item confirmation. |

P2-06 follows PHONE_P2_TICKETS_20261014.md; the parent
[phase ledger](</C:/Users/doyew/Documents/DEV 2/COSI-m8-planning/docs/recognition/TRACK_B_PHONE_EXPERIMENT_TICKETS_20261011.md:89>)
defines P3/P4/P5. This addendum supersedes only the draft's ambiguous final-roadmap
wording, not its frozen bytes, and dispatches none of those implementations.

P1 read-only preflight and already-authorized finite tests may proceed beside
these document corrections: tested code/APK/input and phone resources do not
change. The separate P1 executor is sole phone owner; this writer has no device
role and touches none of its evidence. Native P2 source/build must await reviewed
P1 outcomes and G0/security/CP-D1 approval, then a fresh exact dispatch. Document
clarification does not close P1, accept camera proof or authorize P2-04.
