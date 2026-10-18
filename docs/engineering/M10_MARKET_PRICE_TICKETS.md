# M10 market-price tickets

Coordinator verified granularity/dependencies under founder delegation. These
four sequential vertical slices are the M10 execution ledger; root M8 tickets
remain preserved. Scope/policy ceiling is the M10 plan and D-051. All physical/
live/public-release checks remain separate, with actual execution required.
Checkmarks retain implementation/self-check history. Current software source
acceptance is met after coordinator C1/C2 verification; unrun live gates remain
pending. See final coordinator acceptance at the end of this ledger.

## M10-01 — Understand and control contribution without rewriting purchases

Status:M10-01 source accepted by coordinator; live SQL remains pending. Blocked by:none within source ceiling after
main-coordinator M9 C1 acceptance. External activation/live gates remain blocked.
Delivers:owner can see OFF/disabled/online-required and acknowledged consent
state, select an approved zone and request explicit prospective enable/disable.

- [x] Consent UI/client/storage/server source preserve default OFF and disabled
 activation; immutable purchases/observations and M7 envelopes remain unchanged.
 Owner/store/device authorization, stable request-ID/body/version binding,
 conflict/stale-enable/revoke/restart/timeout and prospective cutoff cases have
 positive/negative tests; pending is visibly distinct from server confirmation.
- [x] Populated prior schema upgrade retains facts and adds only bounded market
 control/cache storage; offline actions never authorize server permissions.
 No real network contribution, persistent/server migration execution or fake
 server state occurs; disposable SQLite upgrade fixtures are required.
- [x] Focused tests/types/zero-warning lint pass. Record real results, migration
 source and protected hash comparison; unexecuted SQL/Auth checks stay pending.

## M10-02 — Admit only consenting, correctly mapped purchase-cost evidence

Status:M10-02 source accepted by coordinator; live SQL review pending.
Delivers:eligible synced restocks can produce a restricted sanitized projection;
owner sees a clear reason when identity/zone/consent is missing instead.

- [x] Server derives values from accepted private facts under current consent
 generation/cutoffs and reviewed package/zone mapping; forged body price/identity,
 names-only matching, old/revoked/estimated/zero/corrupt/future costs are rejected.
 Retry deduplicates; one-store provenance supports revocation without exposing
 supplier/retailer/customer/private purchase details through any public payload.
- [x] Active-owner/device/scope, mapping/conversion/currency/source rules and
 sanitizer exact allowlist have executable focused fixtures and authored SQL
 boundary cases. Enable never backfills/resurrects previous generations.
- [x] Focused tests/types/lint and unaffected M7/M9 tests pass; no old schema/
 costing/sync protocol change. Real PostgreSQL execution explicitly pending if
 unavailable; source defaults remain disabled and fixtures are not market data.

## M10-03 — See a truthful sparse or exact aggregate market result offline

Status:M10-03 source accepted after independent C1/C2 repair verification; live SQL pending.
Delivers:owner sees insufficient data below five independent contributors or
an appropriately labelled package/zone/currency range/median from a saved release.

- [x] Versioned aggregation takes one recent eligible sample/store; exact
 rational ordering/odd-even median/range,4-vs5 stores, device/retry inflation,
 eligibility/revocation and cohort separation cases pass. Sparse results contain
 no numeric market claim; no fake trend/high-confidence/representative coverage.
- [x] Bounded validated server-cache/UI path shows LIMITED/window/freshness/count
 meaning and saved/expired states; bad/stale responses, context/mapping changes
 and tombstones cannot resurrect a numeric release. Private history/sales still
 work with disabled/offline/error market service. Relevant routes accessible.
- [x] Focused exact/cache/UI/contracts/types/lint pass; server parity/privilege
 tests executed only in approved disposable environment or marked not run.
 No hosted jobs/activation, arbitrary cohort probing or production data seeded.

## M10-04 — Return reproducible compatibility and privacy evidence for audit

Status:M10-04 local evidence complete; writer STOPPED and lease released.
Coordinator software source acceptance met; hold after M10, no M11 work.
Delivers:another engineer can reproduce the source and see every unpassed gate
before deciding whether market sharing is ready to enable.

- [x] Full documented validation/types/zero-warning lint, Doctor/dependency and
 Android export execute with actual exits/counts/skips; populated upgrade and
 M7/M8/M9 compatibility pass. Protected scanner/lab/business/dependency/history
 content preserved; exact allowed files/new migrations and hashing limits listed.
- [x] Auth/RLS/SQL concurrency/aggregation parity, physical/native/accessibility,
 real geography/canonical mapping, privacy/activation and market-quality gates
 are truthfully passed only if executed; otherwise explicitly pending. No feature
 activation or anonymity/coverage/release claim from mocked/synthetic tests.
- [x] Current M10 ledger/workflow/state and stopped handoff contain actual evidence.
 Main coordinator owns audit; author stops all commands/edits and reports back.
 No M11 work, additional agent/auditor, model escalation, Git/external effects.

Dependency frontier:accepted M9 -> M10-01 -> M10-02 -> M10-03 -> M10-04 ->
main-coordinator source audit. Physical/live/activation gates remain carried.

M10-01 evidence: synthetic transport/disposable SQLite14 tests/two suites pass
(23.155s); all four workspace typechecks and zero-warning lint exit0 after
fixture owner-field and effect-pattern corrections. First focused run failed
12 tests plus mock setup; initial types/lint failed and were repaired. Server
SQL source authored only; PostgreSQL/Auth/concurrency NOT RUN. Baseline553
files recorded in temporary SHA256 manifest; final comparison recorded below.

M10-02 source evidence:37 synthetic domain sanitizer/exact-policy cases pass
(5.117s);48 mobile compatibility/control/UI tests across six suites pass
(61.837s); four-workspace types and zero-warning lint exit0. SQL executable
boundary source authored, NOT RUN. Coordinator authorized ONLY schema26-to27
assertion edits in catalogueLookup.test.ts:223 and m9SyncIntegration.test.tsx:
143,226; these two files are explicit protected-baseline exceptions. Original
baseline retained. M7 focused compatibility16 tests/one suite16.932s exit0.
No M7 protocol edits.

M10-03 source evidence:contracts13 tests/one suite8.238s exit0; mobile35 tests/
three suites32.094s exit0 before final equal-revision case. Final validation
includes the additional cache and exact microsecond-order cases. Source mapping
uses accepted M7 normalized nested catalogue facts and server revisions, matching
STORE_PRODUCT envelopes; no M7 edits. SQL projection/boundary files remain NOT RUN.

M10-04 first full validation exited1 solely for sales' complete history missing
migration27:contracts25/domain195 passed; mobile543 pass/one fail/eight skip;
recognition lab did not run. Coordinator authorized ONLY appending the version27
market_control_and_cache entry to sales.test.ts:145 (assertion starts118).
Existing history/fixtures/test logic retained; corrected focused sales25 tests/
one suite38.686s exit0. Original failed log retained. Doctor21/21, dependency
check0 and Android export0 (1633 modules/29 assets/5.4MB) already completed.
Final full validation exited0: 1274 passed, 17 skipped (1291 total); all four workspace typechecks and zero-warning lint passed. Doctor21/21, dependencies0, Android export0. SQL NOT RUN; all live/physical/activation gates pending.
Baseline553:543 unchanged, ten authorized original-file deltas, no deletion;
18 new source/test/handoff files. Original baseline embedded in stopped handoff.
All three test exceptions reconstruct their original hashes by reverting only
the approved expected-history deltas; migrations1–26 remain byte-preserved.
See M10_IMPLEMENTATION_HANDOFF.md for final per-workspace counts/skips, hashes
and authored-not-run SQL/real authority/privacy/physical gate limitations.

## Initial main-coordinator audit — historical corrections now closed

Independent source acceptance is withheld for M10-03 C1/C2:equal-revision
refresh loses newly requested products; result cards omit local product names.
Historical implementation checkmarks are self-check evidence, not independent
acceptance. Fresh coordinator87 focused tests pass; two diagnostic regressions
fail. See M10_INDEPENDENT_AUDIT.md and M10_AUDIT_CORRECTIONS.md. Repair only
these findings in the same implementation chat, return STOPPED, then coordinator
re-audits. SQL/live/privacy/physical gates pending. M11 remains unstarted.

## C1/C2 stopped repair return

C1/C2 repaired within ceiling;102 distinct market tests/five suites pass (mobile51/three30.924s;contracts13/one5.280s;domain38/one5.119s), no skips in these complete runs. All four workspace types/zero-warning lint passed, final mobile types/lint repeated after last test edit. Writer STOPPED; lease released; coordinator acceptance still withheld pending independent re-audit. Activation OFF; SQL/live/physical gates NOT RUN/pending.

See M10_AUDIT_CORRECTIONS.md for failures, exact commands, fresh573-file baseline and correction hashes. Previous checkmarks/full-validation/export counts are historical; this return does not self-accept coordinator gates. Hidden same-revision tombstones share the100-row bound; overflow explicitly fails without eviction. Product labels match exact local keys and never enter transport. Founder holds M11.

## Final coordinator source acceptance

M10-01..04 source accepted after stopped C1/C2 repairs and independent review.
C1 same-revision new-key/restart/tombstone behavior and C2 private local labels
verified; fresh51 market mobile tests and both original probes pass, mobile types/
lint exit0. Original review findings above are closed; historical self-check
counts stay separate. See M10_INDEPENDENT_AUDIT.md final review. Source prototype
remains OFF; SQL/live/privacy/physical/release gates pending. Hold, no M11 work.
