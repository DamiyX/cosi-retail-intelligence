# M8-06..09 stopped source handoff — independent audit pending

Latest handoff date: 2026-09-30. Frozen source review target: **bcd9e16**.
Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`; branch `plan/m8-unified-scanner`.
Read the **Superseding amendment handoff** at the end for current results/gates. Earlier handoffs below are preserved historical records and do not describe the final amendment state. The final documentation HEAD/clean status is delivered in the coordinator notification after commit/checks.

---
# M8 correction handoff — independent re-audit pending

Date: 2026-09-29
Implementer chat: 01a0ec1c-578c-7c41-b151-e803c9e5c548
Coordinator: 01a098ef-d830-7531-bca7-2d66b0a5b587
Checkout: C:\Users\doyew\Documents\DEV 2\COSI-m8-planning
Branch: plan/m8-unified-scanner
Correction source commit: e5b23ff
Previous handoff/review target: 4ad4a84
Accepted M7 base: c817edb; approved M8 planning: 4105618.

## Corrections returned

- Cancel, discard and new-sale paths clear scan intent and scanner resume state. Explicit search selection retains its intended association; existing basket contents remain preserved. The auditor regression is retained and strengthened with persisted identifier assertions; scanner-sale coverage now passes 9 cases.
- Two ordinary OfflineSyncWorker tests exercise full parsed acknowledgement envelopes, conflict recovery, retained outbox payloads, dependent-sale retry, second-client convergence and restart using real SQLite and fixture transport. These do not substitute for live PostgreSQL evidence.
- Two opt-in live worker tests use the actual sync_push, sync_pull and sync_reference_context RPC envelopes in rollback-only PostgreSQL transactions. They are implemented and typechecked, but execution was blocked before the first RPC by the unavailable Docker engine.
- An isolated scanner-verification profile enables automatic basket addition through the actual Sell route, with a visible banner and checks for the environment, opt-in flag and separate Android package. Ordinary builds retain the default-off behavior. The physical procedure is documented; no native build was submitted.
- Active routing, design summaries, project state, tickets and workflow now describe the implemented M8 source. The original independent audit is preserved with a clearly separated implementer response.

## Verification evidence

Root npm run validate passed: contracts 12, domain 150, mobile 377 = 539 tests; 8 opt-in PostgreSQL tests skipped. Two new ordinary worker tests and two actual-route verification tests passed separately after root test discovery: 543 passing tests across these runs. Fresh mobile typecheck and zero-warning lint passed after those files were added. The existing product-list act(...) console warning remains without failed assertions.

Verification configuration resolved the isolated package com.damiyx.retailintelligence.scannerverification and enabled flag. Production with that flag was rejected as expected. Verification Android export passed with 1587 modules, 28 assets and a 5.2 MB Hermes bundle. Export is not an APK or physical-device result.

The previous six live PostgreSQL collision cases and 92 pgTAP assertions are historical initial-implementation evidence, not rerun evidence for this correction. See M8_IMPLEMENTATION_EVIDENCE.md for the complete trace.

## Remaining gates

The two live worker cases remain unverified: Docker's dockerDesktopLinuxEngine pipe was unavailable. One bounded startup attempt timed out; the coordinator took over recovery and directed no further implementer attempts. No startup or repair session remains active in this chat.

Physical Android/native acceptance remains blocked: no connected device and Java unavailable. Camera lifecycle, first-use offline detection, beep/torch, accessibility and durable completed-sale force-stop behavior need the documented device procedure. Automatic addition stays off in ordinary builds; scanner associations remain separately default off pending reviewed backend migration deployment.

M8 is not independently accepted. No push, merge, deployment, reset, data deletion, build spend, subagent or M9 work was performed.

## Repository continuity and next owner

Under the clarified handoff instruction, this handoff and all correction evidence are committed before stopping. The implementer performs the final Git checks, stops edits and commands, and sends the authorized coordinator notification with the resulting documentation commit. The coordinator owns independent re-audit and the remaining live/device gates. No acceptance gate is self-approved.

## Superseding live database handoff — 2026-09-30

Resumed only the authorized live database verification at c995641. Both new worker RPC cases and all six existing collision cases passed: eight tests, two suites, exit 0 (40.551 seconds). See the exact command and limits in M8_IMPLEMENTATION_EVIDENCE.md. No implementation changes were needed. Rollback-only migration injection used the existing disposable PostgreSQL container; no persistent deployment or Docker utility work occurred.

The previous Docker blocker is resolved for this test scope. Coordinator source re-audit passed before this run. Physical/native verification remains pending and sequential; the coordinator reports a connected SM-A156E Android 16, but this task did no phone work. Edge HTTP readiness was not tested.

Coordinator's pending audit, workflow/state changes and DEVELOPMENT.md workaround are preserved in the evidence commit. After final commit/status checks the implementer stops all commands and edits and sends branch/HEAD/status to the coordinator. No push, merge, reset, spending, new milestone or self-acceptance.

## Stopped isolated native utility handoff — 2026-09-30

This supersedes the earlier absent-compatible-build gate. The founder authorized
one scanner-verification build conditional on no additional charge. Build
105bb294-dce0-487c-ba87-d1620a40cd82 from source 4d6521e finished and installed
as separate com.damiyx.retailintelligence.scannerverification on Galaxy A15
SM-A156E Android 16/API 36. Authenticated post-build usage confirmed zero
overages and total cost zero. See M8_ANDROID_VERIFICATION.md for exact binary
hash, manifest inspection, fixtures and observations.

Returned evidence: correct Fanta/AirPro EAN-13 additions, exact AirPro UNKNOWN
and cancel preserving basket, denial/search/settings grant, torch and one
audible addition beep. Native finding: three unexpected UPC/EAN values paused
UNKNOWN without extra lines; stable continuous scanning is not accepted.
First Fanta addition was silent; low-light distance/blur and reflective-can glare
remain usability findings. Large text is partial; TalkBack tutorial prevented
announcements. Font recreation lost the unfinished memory-only cart.

Offline manual sale NGN 4,000 Cash (2 Fanta + 1 AirPro) survived force-stop/cold
reopen with byte-identical native sale/payment/snapshots/events/outbox evidence
and a reopened receipt. USB Metro remained available, so standalone offline
launch/first-use detector are not proved; original scanned basket was not sold.
Broader native criteria remain unperformed. Associations and ordinary automatic
addition stay off; no migration deployment, runtime edit or second build.

Cleanup verified: original font/accessibility/network settings restored;
isolated app force-stopped with test data preserved; no active camera clients;
Metro session exited, port 8083 listener absent and scoped reverse removed.
Workflow schema validation and git diff --check passed for this evidence-only
return. No production test suite rerun. The utility commits only documentation,
tickets and task state, then stops all commands/edits before the authorized
coordinator notification. No push, merge or milestone acceptance.

Next owner: coordinator reviews these native findings and defines bounded
corrections/retests. No second build is authorized. A separate standalone
build and migrated isolated association backend still require their respective
approval gates. Checkout remains C:\Users\doyew\Documents\DEV 2\COSI-m8-planning,
branch plan/m8-unified-scanner. Existing app data and unrelated work are preserved.

## Superseding amendment handoff — 2026-09-30

Original implementer resumed on the same checkout/branch after the model switch. Coordinator planning was preserved at 8a3c15b. No new branch/chat/subagent, phone work, build/spend, backend deployment, push/merge or destructive reset.

| Slice | Source commit | Delivered | Remaining |
| --- | --- | --- | --- |
| M8-06 | b0baf90 | Price-only temporary selling, editable quantity, generated labels, same basket/replay, unchanged later sale snapshots | Independent review; amended native journey |
| M8-07 | 0ecfecf | Explicit private product photo, device document storage, local migration 25, list/detail fallback, transactional attachment and conservative recovery | Native capture/file retention/display; no backup/restore |
| M8-08 | e71674c | Decorative four corners/ready sweeping line, reduced-motion static framing, lifecycle cleanup and honest detector-scope status | Native appearance/accessibility/continuous basket |
| M8-09 | d87597b + bcd9e16 | Unconfirmed GTIN-only suggestions, migration 26, explicit editable acceptance, store/stale/lifecycle guards, cache/budget/backoff; confirmed foreground only | LIVE DISABLED: public contact, licence/reuse review, native transport and provider smoke |

Source is frozen at bcd9e16. Later edits are evidence/routing/handoff documentation only. SQLite migrations 25/26 are additive and tested, including schema25->26 retention of existing product/photo/sale/inventory/outbox rows. No new server migration or business sync protocol/RecognitionService change. Declared existing locked MIT expo-file-system 57.0.7 directly for M8-07; no transitive upgrade, other new package or native build. No private photos, URIs, lookup provenance or provider cache enters business operation JSON.

Final verification:

- `npm run validate`: exit 0, contracts 12 + domain 150 + mobile 427 = 589 tests passed, 75 suites passed. Eight opt-in PostgreSQL tests/two mobile suites skipped. All workspace typechecks and zero-warning lint passed after the last source guard. Mobile suite 205.935 seconds. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-amendment-foreground-validate.log.
- Lookup/lookup UI focused 21 tests passed; final root includes those and the added unknown-foreground/abort guard. Prior photo 109 and scanner 17 focused results are retained in M8_IMPLEMENTATION_EVIDENCE.md and superseded by root coverage for final source.
- Final `npm run mobile:export`: exit 0; 1615 modules, 28 assets, 5.3 MB Hermes bundle entry-9c7b05be418614f05d6562341462e9da.hbc. Log: C:\Users\doyew\AppData\Local\Temp\cosi-m8-amendment-final-export.log. This is not an APK or physical result.
- `npm run mobile:doctor`: 20/21, exit 1 for current remote patch recommendations: camera~57.0.6 vs57.0.5, constants~57.0.20 vs57.0.19, router~57.0.24 vs57.0.23. Installed SDK bundled ranges admit current versions. No suppression/upgrade/waiver; coordinator reviews discrepancy before native changes.
- Workflow state/index validated against repository JSON schemas; git diff --check passed. Final Git HEAD/clean status is checked after this document is committed and reported in the stopped notification.

Own fresh source review checked price/domain invariants, client forwarding, outbox exclusion, explicit acceptance, store and stale predicates, foreground lifecycle and migration retention. This is self-check, not independent audit. Jest sale suites emitted suspended-resource act warnings without failed assertions; these are harness limitations. Native camera/files/network are mocked. Real SQLite and actual temporary-file photo-port tests prove local behavior, not Android invocation.

Provider review: M8_CATALOGUE_LOOKUP_PROVIDER.md records OFF/GS1 comparison, API v3.6/spec discrepancy, free read/account expectations, uncertain Nigerian/nonfood coverage, licence/attribution, minimum barcode-only exposure and rates. No real barcode lookup/staging smoke, signup/form/email, image fetch/upload, private data sharing or paid API. Application defaults are disabled without an environment switch. Contact/licence/native fetch buffering/redirect/User-Agent/endpoint compatibility must be resolved before live activation; separating local cache does not establish an ODbL exemption.

Prior native findings remain open: three unexpected detector UPC/EAN values, first silent beep, incomplete permission/settings-return/large-text/TalkBack/continuous/offline-first-use criteria and unfinished-cart loss on font recreation. Only the manually reconstructed completed NGN4,000 sale survived restart with USB Metro available; do not call it the scanned basket or standalone offline proof. New photo flow and the sequential knownA->knownB->stationary repeats->unknown photo/price->next known->edit/Undo->combined payment->restart procedure remain unperformed. No root cause or acceptance is asserted.

Read-only APK module/hash inspection found camera/filesystem classes in the existing zero-charge isolated binary, supporting a later existing-client test but not proving compatibility. No second APK, installation, Metro/dev server or physical interaction during this amendment. New associations/default automatic rollout remain off; original server guard migration was rollback-only tested. Earlier eight live PostgreSQL/92 pgTAP results are historical and were not rerun here.

Documentation updated: D-048, M8 plan, DESIGN, backlog, tickets, PROJECT_STATE, project/app-flow/stack contexts, workflow state/index, provider review, implementation evidence, Android retest procedure and this handoff. Existing audit/native history is preserved; coordinator-owned gates remain pending/blocked without self-waiver. Ticket source implementation is delivered; full milestone acceptance is not passed.

Next owner: coordinator 01a098ef-d830-7531-bca7-2d66b0a5b587 independently audits the stopped branch, decides the Doctor/provider gaps, then schedules separately authorized native retests. No extra source scope, build charge, persistent backend migration, deployment, Git push/merge or M9 is authorized. The implementer finishes all processes and final commit/status checks, then stops repository commands/edits before the authorized notification.
