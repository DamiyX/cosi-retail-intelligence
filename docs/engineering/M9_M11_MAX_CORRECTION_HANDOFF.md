# M9–M11 MAX correction handoff

2026-10-03. **STOPPED SOURCE RETURN; COORDINATOR VERIFICATION PENDING.**

F1–F4 and reproduced photo/market siblings repaired within the seven-path runtime ceiling.
ONE final npm run validate passed: source-only environment, four-workspace types/zero-warning lint and all workspace tests.
Whole M11/source acceptance remains OPEN. Original timing failures remain unexplained.

## Source identity and scope

Checkout: C:/Users/doyew/Documents/DEV 2/COSI-m8-planning; branch plan/m8-unified-scanner;
HEAD66ea3fc22595a48d7355d1729bb879496cc98896 unchanged. One existing implementation writer:
01a100e8-66eb-77f2-a3bd-26100a36f8de. Coordinator01a098ef-d830-7531-bca7-2d66b0a5b587
owns independent review after this stopped handoff. No subagents/model escalation.

F1 uses the existing precise domain comparator for both full purchase-history reads.
The already-full returned collections sort by purchase occurred instant, purchase
created instant, then observation ID; a private SQL alias preserves the original
purchase-created tie rule even when observation creation differs. No history/time/
amount normalization, M7 acceptance or public return shape change. Tenant predicates
are retained; other generic history functions are outside this repair. Full history
remains a full read; no new scale/native/query-performance claim is made.

F2 carries optional captured actor/member/enrollment only from catalogue/sales into
the shared photo service. Existing member roles, explicit device policy and ID
providers remain. Replacement checks first in its existing transaction. Stage
checks after staging/metadata computation before its single metadata write; denial
cleans newly created files under the existing reported-after-write rules. Discard
rechecks before metadata deletion and file removal; orphan recovery rechecks before
unlink. Low-level unbound utility and historical attach/sync semantics are retained.
No transaction/staging/storage/native/media-protocol redesign. Legacy reads/retries,
conservative grace, committed attachments, rollback and thumbnail bounds are covered
by unchanged compatibility tests. Fake files plus real migrated SQLite prove these
source boundaries, not physical filesystem/camera behavior.

F3 puts current authority guards first inside existing result, request, disable,
refresh and cache invalidation callbacks. Unknown-outcome message, retry-fence
intent and foreground expiry writes now use narrow guarded cache/control callbacks.
Pending body/epoch/revision/generation/mapping/tombstone/expiry/capacity100/exact
numerics and OFF shipping behavior remain. No business/outbox/consent/server/
protocol/schema changes. Denials compare full non-reference business/cache/control/
outbox state, excluding deliberately changed authorization references.

F4 leaves the global listRequests contract intact and adds member/status SQL
selection before LIMIT, with owner/store/device scope and stable created-time/ID
keyset pages. Maximum result page50, SQL at most51. Actual panel has separate
pending and terminal pages and See more/First navigation. Pending retry calls
sendPending on the original immutable operation/body; no deletion, replacement,
fabricated receipt or role grant. Bounded read paging works locally while live
controls remain unavailable. Actual-panel tests cover22 members,23 newer terminal
and23 pending device requests, same-ID retry, forced timestamp ties and owner/
device/store isolation. No whole-history JS materialization for this new query.

## Changed source/test paths

- `apps/mobile/__tests__/m10MaxAuthority.test.ts`
- `apps/mobile/__tests__/m11MaxPending.test.tsx`
- `apps/mobile/__tests__/m11MaxPhotos.test.ts`
- `apps/mobile/__tests__/m11MaxSupport.ts`
- `apps/mobile/__tests__/m9MaxHistory.test.ts`
- `apps/mobile/src/catalogue/client.ts`
- `apps/mobile/src/db/repositories/priceObservations.ts`
- `apps/mobile/src/market/client.ts`
- `apps/mobile/src/media/productPhotos.ts`
- `apps/mobile/src/sales/client.ts`
- `apps/mobile/src/screens/staff/StaffControlsPanel.tsx`
- `apps/mobile/src/staff/control.ts`

## Executed checks and retained failures

Pinned installed Node24.21.0/npm11.19.0. Every command uses the checkout above.
New evidence exclusively in C:/Users/doyew/AppData/Local/Temp/cosi-m9-m11-max-corrections-20261003.

| Check | Result | Evidence |
| --- | --- | --- |
| Initial permanent regressions before source repair |23 fail/5 valid controls pass;4 suites;35.577s|permanent-before.log|
| Initial repaired permanent tests |32 pass/4 suites;32.572s|permanent-after1.log|
| New + affected compatibility, before final stage-metadata guard ordering |168 pass/16 suites;110.124s|compatibility-focused.log|
| Final photo guard ordering + protected photo compatibility |30 pass/2 suites;23.398s|final-photo-focused.log|
| Final affected mobile types/lint |exit0 each, zero-warning lint|repair-typecheck3.log;repair-lint.log|
| Unmodified MAX F1/F2/F3 probes + canonical positive |4 pass/2 suites;41.095s;4 filtered|original-probes-after.log;original-probes-after-results.json|
| ONE original-limit timing diagnosis |INACTIVE fails15626ms>15000ms; rational passes1635ms<5000ms;2 filtered;suite45.065s|m9-timing-diagnosis.log;m9-timing-results.json;m9-timing-measurements.jsonl|
| ONE final repository validation |exit0|final-validate.log;final-results.json|

Final permanent coverage is34 cases in four new regression files plus one helper.
The original F4 probe models the OLD global-limit/panel expression and is preserved
as historical failed evidence, not contorted into green. The three invalid compact-
offset/omitted-second hypotheses and that old F4 expression are filtered from the
unchanged-probe replay; four filtered cases are NOT passing verification. Corrected
F4 is verified through the actual client and panel. The later stage metadata-order
check is covered by final photo and full validation, separate from earlier probe
execution. Intermediate type diagnostics for new fixture signatures/types remain
in repair-typecheck.log/repair-typecheck2.log; no protected test was altered.

| Workspace | Tests | Suites | Time |
| --- | --- | --- | --- |
| contracts | 38 passed, 38 total | 4 passed, 4 total | 7.173 s |
| domain | 200 passed, 200 total | 8 passed, 8 total | 8.762 s |
| mobile | 8 skipped, 737 passed, 745 total | 2 skipped, 95 passed, 95 of 97 total | 561.193 s, estimated 566 s |
| recognition-lab | 9 skipped, 510 passed, 519 total | 23 passed, 23 total | 484.137 s, estimated 495 s |

The bounded diagnostic adds external setup instrumentation only, retaining original
15s/5s limits. INACTIVE wall15406ms in the hook, approximately789ms across measured
SQL methods; CPU user16063000us/system2578000us. Rational wall1633ms in the hook.
Most first-case delay lies outside measured SQL; no exact remaining cause is
established. This does not justify an adapter/config patch. MAX's original25182ms
and5888ms failures and the earlier timing failures remain evidence. Any final pass
does not explain them. No repeated diagnosis/full-green loop or limit relaxation.
Jest React act warnings are retained in logs; zero-warning lint is not a claim of
a warning-free Jest console.

## Preservation and stopped state

MAX audited605-path fingerprint7700e38e41516cfcfa9b88a5af44137af7205b1a33c44aa775c5f4217e68eab0.
NEW repair baseline605 fingerprintee81d7230f8bd07afd9fa5c41ce011a081a3e33a56c17e76ee467d948a1d068a
matches dispatch exactly. Coordinator's five intervening documentation deltas are
recorded separately in coordinator-documentation-deltas.json. Older598/604 freezes
and their handoffs stay historical; repaired bytes are not an old audit freeze.

baseline.json and before-source capture exact bytes. validation-input-manifest.json
freezes final-run source; corrected-source-manifest.json is the stopped final source/
doc inventory. preservation-check.json lists every allowed changed/new path and
before/after hashes; runtime-repair.diff preserves exact runtime edits. All130
pre-existing test/helper files, original configs/thresholds, migrations1–28/domain/
contracts/server/dependencies/other shared work, original handoffs and194 prior
external evidence artifacts are byte-checked. No missing or unexpected paths.
return-verification.json checks schemas/index/DAG/artifacts, source freeze, pending
gates, released lease, original report hashes, Git identity and diff hygiene.
PROJECT_STATE changes only its current-work line/M11 section; workflow index unchanged.

New documentation: this handoff; append-only current correction ledger/tickets;
current M11 workflow/state. Coordinator is lease owner again. Source commands and
edits STOP before direct report-back. Main coordinator independently verifies the
new corrected freeze; no self-acceptance or new independent reviewer dispatch.

M10 remains OFF/provisional D-051; staff management transport/config OFF. Whole M11
and real staff Auth/session/least-privilege feed/blind assignments, actual SQL/Auth/
RLS/concurrency/privacy/native/physical/accessibility/offline/multiple-device/second-
laptop/release gates remain OPEN. No Doctor/dependency/export repetition, service/
Docker/Metro/browser/phone/account/hosted SQL/job/build/spend/dependency/Git effect,
new milestone or M12. Previously unverified expiry-screen/query-scale/SQL-parity
follow-ups are not promoted to reproduced bugs or additional scope here.
