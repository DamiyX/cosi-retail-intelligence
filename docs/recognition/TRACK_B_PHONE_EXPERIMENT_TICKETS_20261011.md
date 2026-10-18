# Phone experiment: bounded implementation handoff

Current continuation (2026-10-14): P1 generated runtime/image checks have physical
evidence; private-photo offline replay is deferred while the phone supplies laptop
internet. P2 planning is now in PHONE_P2_PLAN_20261014.md and
PHONE_P2_TICKETS_20261014.md. Only P2-01 generated session preparation is the next
proposed dispatch after founder model switch; no native/camera gate is waived.
The original P0 packet below remains historical and must not be redispatched.

Status2026-10-11: P0 dispatched, stopped and independently accepted for generated/
source preparation. See reports/PHONE_P0_INDEPENDENT_AUDIT_20261011.md. Native
adoption/build/device and later stages remain pending. Parent plan:
TRACK_B_PHONE_EXPERIMENT_PLAN_20261011.md. Founder completed the requested
pause/model switch and approved P0 continuation. Coordinator uses GPT-6.1 Sol HIGH
for implementation and audit.
Existing sole writer:01a1051f-0777-7573-ad09-0e550a4bd56a. No new agent is needed.

Coordinator planning review: P0 is the sole detailed current ticket and unlocks
the native boundary review. P1–P5 below are dependency summaries, not simultaneous
implementation tickets. Source decisions D-018/D-019/D-022/D-030 remain in force;
no final model/runtime adoption or checkout dependency is introduced.

## P0 — first dispatch after founder review/model switch

Objective: make the proposed native adoption/build boundary concrete and reviewable,
and prepare generated-data experiment contracts. No private pixels or phone work.

Owner: same sole writer under coordinator. You are not alone in this checkout;
preserve all other work. No delegation, broad cleanup or shared-boundary edits.

Allowed local scope:
- `docs/recognition/reports/PHONE_P0_ADOPTION_PACKET_20261011.md`;
- `docs/recognition/reports/PHONE_P0_HANDOFF_20261011.md`;
- new `apps/recognition-lab/src/phoneExperiment*.ts` and matching tests/generated
  fixtures if needed for manifest/results validation and fixed four-arm evaluation;
- a new ignored generated-only run directory with explicit hashes/receipts.

Do not mutate mobile/native/config/package/lock files, domain/contracts, existing
producers/frozen label rules, old runs, project state or workflow lease yourself
unless the coordinator's later exact dispatch explicitly assigns those fields.
Do not install/download, build, start services, access a device, process private
photos, launch agents, upload or make Git effects.

Required packet:
1. Exact recommended LiteRT/model identity, artifact sources/versions, license and
   notice evidence, transitive/build/ABI/SDK compatibility matrix and unresolved
   facts. Account for current Expo57/RN0.86 and absent native validation. Bounded
   public documentation lookup is in scope; no account changes or binaries.
2. Exact proposed experiment entry/variant and file allowlist, dependency graph
   excluding business DB/sync/providers; ordinary-build module/model exclusion;
   standalone local build path, permissions, storage/import/export and cleanup.
   Show how existing scanner-verification remains intact. Do not treat its package
   ID as proof of isolation. List any missing local SDK/JDK/Gradle prerequisites.
3. Validate camera Android path from installed source, bounded capture lifecycle,
   cancellation, preview-to-image ROI mapping and generated probe design. No
   unsupported Android pictureRef assumption; document the fallback review trigger.
4. Define generated runtime/image equivalence probes and freeze proposed numeric
   thresholds before private input; flag inability to match LANCZOS separately.
5. Proposed automated trial/report schema: IDs, frame counts, references, source/
   model/recipe hashes, timing stages, failures, four arms, typed-spec provenance.
   Enforce complete denominators, max4 references/max3 query frames, deterministic
   aggregation/ties and no truth-derived selection. Missing arm results block a
   complete comparison rather than silently removing trials.
6. Show actual estimated versus unknown binary/RAM/storage costs and an actionable
   install/build/execution proposal for the next review. No unlimited setup request.

Tests: generated missing-frame/failure retention, nested reference sets, fixed
query-frame selection, cross-frame mean of per-reference maxima, deterministic
ties, late-session records, incompatible model/recipe rejection. Run affected
lab tests/typecheck/lint only. No pointless tests mirroring documentation.

Acceptance: packet is concrete enough to approve native P1; generated results are
reproducible, no private/production effects, all unresolved compatibility claims
clearly identified. P0 does not prove Android builds or recognition works.

End condition: stop with lease NULL under coordinator procedure. Send a DIRECT
completion message to coordinator01a098ef-d830-7531-bca7-2d66b0a5b587 containing
handoff path, source/hash bindings, changed files, checks/exits, limitations and
next required action. Founder explicitly requires this report-back workflow;
leaving a file or a message only in your own chat is insufficient. Report message
delivery status honestly; do not assume delivery automatically resumes the parent.

## Later stages — NOT part of P0 authorization

| Ticket | Scope after its preceding review | Evidence required before moving on |
|---|---|---|
| P1 | Approved isolated entry/native CPU adapter, bundled artifact, generated then approved frozen-image device packet | Build/manifest isolation, source audit, numerical/runtime/image equivalence, all failures retained; exact APK/source/model hashes |
| P2 | Guided enrollment, capped scan session, ROI, four visual arms and local report | Paired development/confirmation results, real-device capture timing, stale/cancel/offline checks, storage/RAM and sustained use |
| P3 | Conditional actual OCR and separately versioned specifications | New readable discriminating evidence, completeness/abstention tests, extraction errors versus ranking effects, incremental latency/privacy review |
| P4 | One justified additional visual matcher | Specific residual error hypothesis; preregistered comparison and gain/regression/cost evidence |
| P5 | Independent difficult-set protocol and evaluation | Availability first; source-family separation, unknown/calibration/holdout discipline; no relabeling same-item development as formal evidence |

Likely P1/P2 change areas, for P0 to narrow: `apps/mobile/app.config.ts`, build
entry/config, `apps/mobile/modules/recognition-experiment/`, an isolated experiment
screen/session/adapter directory and their tests. These are proposed paths, not
existing modules or write authority. Package/lock/native edits require the concrete
reviewed adoption packet. No RecognitionService/business model/schema migrations.

After each implementation the writer stops and reports directly; coordinator
independently audits before private execution. Findings go back to the same writer
sequentially. Automatic recurring work remains paused. No implicit expansion from
one stage to all later stages and no reuse of a consumed offline attempt.
