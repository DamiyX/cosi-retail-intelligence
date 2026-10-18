# M11 source foundation implementation handoff

Date: 2026-10-03. Status: STOPPED; source self-check passed, independent acceptance pending.
Sole implementation chat: `01a100e8-66eb-77f2-a3bd-26100a36f8de`.
Coordinator: `01a098ef-d830-7531-bca7-2d66b0a5b587` owns acceptance.

Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch: `plan/m8-unified-scanner`.
HEAD: `66ea3fc22595a48d7355d1729bb879496cc98896`.
Work remains uncommitted. No new milestone, live activation or release claim.

## Result and scope

M11-01: shared current actor checks require present ACTIVE account, store,
membership and exact bound ACTIVE device. Missing/ambiguous identity fails.
Omitted device uses the selected store's exact existing local enrollment when
present; invalid enrollment never falls back. Otherwise only a legitimate
singleton context resolves. Captured discovery clients reject enrollment changes
and retained methods recheck their original identity. Local device provenance
does not prove remote Auth identity. Explicit identity remains fixed.

Sales, purchase, inventory, finance, catalogue and M9 private reads use these
checks. Relevant direct commands also check before replay.
Sales, purchases and affected catalogue commands capture the validated member
identity and recheck current authority at the start of their existing write
transaction before any mutation. Transaction placement, calculations, replay,
business envelopes and historical facts remain unchanged.
Callable method proxies preserve function properties/replacements and separately retained nested
clients. Async private results recheck before delivery. Sale/purchase/money-out/
inventory transaction commands remain synchronous with their existing atomic
durable commit semantics; a result-access denial is not a transaction rollback
or evidence of an uncommitted transaction. Optional async lookup-cache work
already initiated while authorized may finish; it confers no business permission.

Existing active-member inventory stock reads remain available internally.
Factory-wide and stock-only projection OWNER restrictions were considered and
**not adopted** after coordinator review. `listReviewProducts` and
`getBatchProjection` expose stock/management provenance, not money fields.
Existing OWNER management commands and finance/reconciliation/M9/M10 boundaries
remain. No staff session, role picker, permission grant or shared-owner login.

The pilot resolver uses the one store's recorded `sync_store_state.deviceId`
after reference restoration; invalid enrollment cannot select a remote device.
Its existing creator-owner rule remains. Only resolver plumbing changed; no
business envelope, protocol, worker, feed or materialization change.

M11-02: More -> Staff and activity provides owner-only saved members/devices,
bounded keyset pages, member/action/half-open UTC date filters, real recorded actor
and device labels, and stock-check attempts/first counts/recounts/closers/reasons.
Queries derive existing facts without a second business ledger. Current labels
are distinguished from historical role claims; local recorded time is not global
ordering. Access loss/focus changes clear private views. No fraud/profit claim.

M11-03: strict separate staff-control contracts and SQLite28 persist immutable
pending requests, terminal receipts and monotonic response cache. Shipped
transport is DISABLED; injections are explicitly SYNTHETIC. Owner confirmation
is required. Targets are existing same-store non-OWNER members or their bound
devices. Requests never create accounts/invites, change roles/owners, manage self
or re-enroll revoked devices. Timeout/offline/restart retain honest pending state.
Matching fresh confirmations can restrict local access atomically with receipts.
Reactivation never sets local membership ACTIVE; authoritative current references
must restore account/member/device eligibility first. Cache/receipts are not
membership authority. Delayed/foreign/conflicting responses cannot revive access.

Server migration `20261003090209_m11_staff_control_source_prototype.sql` and
`supabase/tests/m11_staff.sql` are SOURCE ONLY, authored and **not executed**.
Configuration defaults OFF. Source uses Auth subject plus ACTIVE owner/store/
bound device, exact targets, expected versions, operation/body/actor binding,
transactional review trail, restrictive private tables/RLS/grants and empty-search-
path RPCs. Actual PostgreSQL syntax, RLS execution, Auth and contention remain
unverified. No database deployment or persistent migration was performed.

## Exact source footprint

Added: `src/storeContext/access.ts`; `src/staff/{client,control,migration}.ts`;
`src/screens/staff/{StaffActivityScreen,StaffControlsPanel}.tsx`;
`app/staff-activity.tsx`; contracts `src/staff.ts` and `__tests__/staff.test.ts`;
mobile `__tests__/m11{Access,Activity,Commands,Context,Control,ControlsUI,Upgrade,
PilotContext,EnrolledContext,TransactionAuthority}.test.*`; the server migration/test above; this report.
Mobile paths in this paragraph are under `apps/mobile/`; contracts under
`packages/contracts/`.

Guard-only changes: mobile sales/client+completeSale, purchases/client+recordPurchase,
finance/client+businessSummary+recordExpense+recordOwnerWithdrawal,
inventory/client+adjustInventory+attention+classifyBatches+guidedChecks+
reconcileInventory, catalogue/client+createTemporaryProduct+manageLifecycle+
managePackages+updateProductIdentity+updateReorderLevel, priceIntelligence/client,
sync/pilot resolver. Additive registry changes: db/migrations and contracts/index.
More contains the new route link. M11 tickets/workflow and only the M11
PROJECT_STATE section are updated. Plan/D-052 and independent audits preserved.

Coordinator-approved old-test exceptions, all assertions otherwise preserved:

| Path / call | Exact compatibility change |
| --- | --- |
| m9SyncIntegration receiver factory/restarts | Existing intended receiverDeviceId explicitly supplied to M9 and reopened finance factories |
| m9SyncIntegration two latest-full-schema assertions | Explicit 27 -> 28 |
| m9SyncIntegration INACTIVE/SUSPENDED restart case | Only this existing parameterized test uses15000ms; all fixtures/assertions/cleanup unchanged, repeated full-run5000ms timeouts retained |
| sales complete migration history | Append only version28/staff_control_intent |
| catalogueLookup full-current upgrade | One latest schema expectation27 -> 28 |
| catalogueLookupUi unsaved-offline case | Only this existing it uses15000ms, conditionally approved after unchanged focused6/6 pass; target2713ms, suite15.04s, fixtures/assertions/cleanup preserved |
| m10MarketControl populated26 -> 27 | Pin both opens to MIGRATIONS.slice(0,27), preserve27 assertions/title/history |
| m5Reconciliation staffClient | One bound synthetic STAFF device for that client only; direct role and package/finalization assertions unchanged |

All old tests listed above are in `apps/mobile/__tests__/`.
Existing nonexistent-device error wording was restored through the helper, not
by editing the classification test. The coordinator approved the narrow M9
timeout exception after repeated full-run resource timeouts and focused passes;
it is a test-run tolerance, not native/performance evidence.

## Executed evidence

Pinned Node24.21.0/npm11.19.0; no install. Run commands from the checkout above
after prepending `C:\Users\doyew\.cache\cosi-toolchain\node-v24.21.0-win-x64`
to PATH. Logs and original baseline are in
`C:\Users\doyew\AppData\Local\Temp\cosi-m11-source-20261003`.
Counts overlap; focused counts are not an additional unique total.

`npm run validate`: exit0 against final source; all four workspace typechecks and zero-warning lint passed. 1373 tests passed across 123 passing suites; 17 opt-in tests/2 suites skipped. Source-only environment validation deliberately skipped adb/java/docker probes. Existing React act/suspended-resource console notices remain. Log: `m11-final-validate10.log`.

| Workspace | Tests | Suites | Jest time |
| --- | --- | --- | --- |
| contracts | 38 passed, 38 total | 4 passed, 4 total | 6.802 s |
| domain | 195 passed, 195 total | 7 passed, 7 total | 7.753 s |
| mobile | 8 skipped, 630 passed, 638 total | 2 skipped, 89 passed, 89 of 91 total | 430.724 s, estimated 510 s |
| recognition-lab | 9 skipped, 510 passed, 519 total | 23 passed, 23 total | 476.863 s, estimated 494 s |

Other executed source evidence:

- Contracts:13/one staff suite passed,7.867s (`m11-03-contracts.log`).
- Focused control/UI/access:22/three passed,24.364s (`m11-final-extra.log`).
- Final stock role + existing Sell/attention compatibility:45/three passed,
  53.379s (`m11-final-role-compatibility.log`); final full run supersedes earlier
  helper bytes.
- Final enrolled context/pilot/upgrade/access/catalogue guard/scanner worker/M9:
  40/seven passed,38.174s (`m11-resume-context-final.log`).
- Populated27 -> 28 includes real M10 control/cache data created through its
  synthetic transport/client, exact cost/facts, pending business outbox, device
  provenance and restart/idempotent retry; all old tables are compared byte-value
  for value. M7 inactive provenance/replay and M8/M9/M10 checks are included in
  focused/full tests. Actual Auth/network/native behavior is not thereby proven.
- `npm run mobile:doctor`: exit0,21/21 (`m11-final-doctor.log`).
- `npm exec --workspace @retail/mobile -- expo install --check`: exit0, up to
  date, with existing expo-core exclusion unchanged (`m11-final-dependencies.log`).
- `npm run mobile:export`: exit0 against final source (`m11-final-export5.log`); Android Bundled 39475ms node_modules\expo-router\entry.js (1641 modules); _expo/static/js/android/entry-ea811830c9f8c88d6833ba5215b3c76e.hbc (5.4MB); source bundle only.
- M11 workflow/index schema/DAG/artifacts and final byte comparison are verified by the final read-only return check. Original576-file baseline SHA256 `d2cce82421308f97046bafdcf7e1e837c5e942c1b069f9607385fd5dfb136ef4`. Exact changed/new path before/after hashes are in `preservation-final.json`; inverse checks confirm ONLY the six approved old-test path deltas, and removing the two additive registry lines recovers exact migrations1–27 bytes. Final source hashes must equal `validation10-input-manifest.json`. Final footprint:34 authorized original paths changed,542 of576 original paths byte-unchanged,22 new paths, zero missing; final read-only return verifies these counts and exact source hashes.

No phone/browser UI, physical/accessibility, second laptop or live SQL verification was performed. No service/Docker/hosted account/cloud build/deployment/Git mutation/spending effect occurred. Export is a one-shot source bundle, not an APK/native result.

## Retained failures and interruption

Before repair, actual file-backed SQLite regressions failed8/8 account/access
cases (`m11-01-before.log`),5/5 catalogue/M9 context cases
(`m11-context-before.log`) and8/8 otherwise-valid direct commands/replay
(`m11-direct-before.log`). Direct repro removed only newly added guards and
restored repaired bytes in finally; original business inputs were valid.

Intermediate logs retain syntax/message/ambiguity/new-fixture failures and their
corrected runs. `m11-final-validate.log` stopped at one new-test lint warning
(fixed). `validate2` was interrupted for approved role correction; its partial
Sell failures exposed method-spy compatibility (fixed; old tests unchanged).
`validate3`/`validate4` failed on a new typed role fixture (fixed).
`validate6` was interrupted for captured membership identity validation.
`validate7` passed types/lint/contracts38/domain195; mobile618 passed/one failed/
8 skipped,492.67s. Only the existing INACTIVE M9 case exceeded5000ms; the root
chain did not reach the lab. It is not a final full pass.
`validate8` stopped at the new transaction-test adapter constructor's missing
third argument; the test fixture was corrected.
`validate9` passed types/lint/contracts38/domain195 and mobile629/88 suites;
one test failed and8/two suites skipped,490.696s. Only catalogueLookupUi's
unsaved-offline case exceeded5000ms; M9 passed. The unchanged UI suite then
passed6/6 (target2713ms, suite15.04s), with no assertion/cleanup failure
(`m11-ui-timeout-unchanged-focused.log`). Coordinator conditional approval
then permitted only that case15000ms. Final documented validation uses10;
no further timeout increases or full-run retry loop is authorized.
`validate5` passed types/lint/contracts38/domain195 then mobile594 passed,
8 failed/8 skipped,475.854s: three schema compatibility cases, the invalid
STAFF-device fixture, nonexistent-device wording, two pilot collisions and one
existing5000ms M9 suspension timeout. The coordinator approved the exact
compatibility exceptions above; M9 timeout was rerun unchanged. The new pilot
missing-device fixture attempted an invalid foreign key; the corrected case
asserts that integrity rejection (`m11-resume-pilot-upgrade.log`:11/two passed).

The initial three before-BEGIN SQLite probes failed before the transaction
guard repair and passed after it. The first focused command also referenced a
nonexistent catalogueTemporary test filename; all84 executed tests passed, but
the command failed and is retained as `m11-transaction-after.log`.
Expanded-probe fixture failure (`ORDER BY id` on a table with another key) was
corrected using stable full-row snapshots; its log is retained separately.
Expanded before probes failed11/11 with otherwise-valid inputs because the
commands did not reject suspension (`m11-transaction-expanded-before.log`,
13.003s); repaired before-BEGIN probes plus legitimate atomic/replay/catalogue
compatibility passed108/eight suites (`m11-transaction-expanded-after.log`,
44.679s). Full snapshots prove denial leaves business/outbox rows unchanged.

An API usage interruption left no completed handoff. On founder-authorized
resume the surviving validation result was collected, no task process remained,
the original lease/branch/HEAD/hash baseline were reconciled, and work continued
in this same chat/checkout. No source restart or new chat was created.

## Remaining M11 gates and next action

Whole M11 is OPEN. Source self-check is not independent acceptance. Implementation,
independent review and later workflow gates remain pending for the coordinator;
the prior M9/M10 source and M11 plan-review gates remain met.
Shipped staff transport remains OFF.

1. Approve and implement real authenticated STAFF enrollment/session/device
   ownership and permitted tasks, with revocation and current account/membership
   checks. A local bound device or injected synthetic actor does not pass Auth.
2. Design and authorize a least-privilege cashier bootstrap/feed and local read
   surface. Current whole-store graphs/owner money history are not approved for
   cashiers. Verify server/RLS and transport content before activation.
3. Approve an assignee-bound stock-check model and blind first-count/recount
   submissions, with offline atomicity, immutable evidence and idempotent sync.
   Existing creator/closer IDs are not assignee permissions. OWNER review,
   costing and reconciliation remain separate from staff submissions.
4. The existing active-member attention output exposes `items.balanceBaseMicros`,
   remaining-quantity detail, and latest discrepancy difference (`attention.ts`
   around683–685). Batch/stock review exposes expected balance, unknown residual,
   watermarks and receipt/inspection provenance. Preserved current internal
   semantics do not satisfy blind counting. The future API/UI must prevent
   expected-stock/prior-count disclosure before permitted submissions; verify
   this explicitly rather than reusing those owner/store-wide projections.
5. Execute approved disposable PostgreSQL migration/rollback tests, actual role/
   Auth/grant/RLS checks, same-ID/body and different-operation contention,
   revocation/late reference races and staff-visible privacy checks. Synthetic
   duplicate-client tests cover local receipt handling, not server concurrency.
6. Verify actual multi-device/offline/native/accessibility/TalkBack/large text,
   second laptop and release behavior. Local offline revocation only sees saved
   state until authoritative changes arrive. No release/activation gate waived.

Next action: coordinator independently audits one stopped source state and
arranges any founder-authorized audit chats. This implementer does not create
auditors or continue M12. Any corrections require a new explicit scoped handoff.

Skills actually read/used: coding, testing, security, supabase and
supabase-postgres-best-practices. No implementation/audit subagents were spawned.
Adjacent GLOBAL_MEMORY/.agents/GLOBAL_MEMORY was unavailable; routing used the
discoverable skill catalogue and repository truth. Bounded Supabase function/RLS
official docs informed source review; changelog fetch was unsupported. Neither
documentation nor source review proves live execution.

Stopped return recorded: 2026-10-03T12:31:54.169Z. No source/acceptance gate self-marked met. Lease returned to main coordinator; final verification is read-only before direct report-back.
