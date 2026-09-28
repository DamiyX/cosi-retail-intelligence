# M7 independent audit — source corrections and open integration gate

**Status:** Concurrent-costing correction and one-device Galaxy retry passed. M7 independent acceptance remains open while the remaining M7 ticket criteria are reconciled against implementation and test evidence.
**Branch at review:** `feat/m7-offline-sync`, `1b2b100` plus uncommitted audit
corrections. No M8 work or remote deployment was performed.

## Source findings and corrections

1. **Fresh-device bootstrap loses creation data after a mutable edit.**
   `sync_bootstrap` selects only the latest
   `sync_entity_document_history` row for `(store, entity type, entity ID)`.
   `PRODUCT_CREATED` contains the variant, base package, store product and
   optional identifier, while a later `PRODUCT_IDENTITY_UPDATED` for the same
   `STORE_PRODUCT` contains only the updated store product and variant. The
   bootstrap therefore omits the base package/identifier. A fresh SQLite
   store may fail the preferred-package foreign key or reconstruct incomplete
   catalogue data. Sorting the selected documents by server revision does not
   restore omitted history. M7 needs a complete, bounded, snapshot-consistent
   reconstruction protocol and tests covering create -> edit -> bootstrap,
   including multiple pages and later concurrent writes. **Correction:** an
   additive server migration now pages the immutable `sync_change_log` through
   a fixed revision; SQLite migration 20 stages every operation occurrence and
   replays them atomically. The two-page fresh-database create/edit regression
   passes. A pgTAP test for same-entity history and a later concurrent edit is
   written but has not run against PostgreSQL.
2. **The mobile app does not invoke sync.** `OfflineSyncWorker` and the HTTP
   transport are exported but no app route or startup path constructs them.
   There is no pilot sign-in/enrolment action, compact sync status/manual retry
   surface, or conflict-resolution path. Local transaction completion still
   works; actual cloud synchronization cannot begin from the app. The accepted
   M7-02/M7-05 requirements need an integrated, authorized pilot path before
   source acceptance. **Correction:** the owner can sign in or create a pilot
   Supabase account from More → Cloud sync, enrol the existing local owner/store
   IDs, run the worker, see status/pending/conflicts, retry, and explicitly
   resolve supported mutable conflicts. A foreground scheduler retries cloud
   work without blocking local transactions. Sessions use Android SecureStore;
   the app receives only the public project URL/key. Local integration tests
   cover the entry point, owner IDs, conflict decisions, and preservation of
   rejected work. No real account, hosted backend or device run is claimed.

## Earlier source corrections (database evidence follows below)

- Bootstrap pages are staged locally and materialized with the cursor in one
  transaction only after the final page. A failed page leaves the prior cursor
  and business rows intact.
- Client checks store, operation and entity identities, pagination order and
  server metadata before acknowledging work or advancing a cursor. Push and
  pull share the active-run guard and permanent pull errors remain visible.
- An additive Supabase migration requires the request device to belong to the
  authenticated application user for push, pull and bootstrap. The new pgTAP
  test is written but has **not** run against PostgreSQL.
- Bootstrap staging now retains server revision for ordering. This is useful
  but only the complete operation-history replay closes finding 1 in source.
- Pull and bootstrap leave an unresolved local edit intact while retaining the
  latest cloud version for review. Pilot auth failures persist their status in
  SQLite so a foreground retry does not silently hide them.

## Earlier source-only evidence (superseded below)

The final local `npm run validate` passed environment check, strict typecheck,
zero-warning lint and 503 tests across 52 suites (7 contracts, 150 domain,
346 mobile). The focused pilot suite passed 9/9, including the bootstrap
conflict and auth-status regressions. Expo Doctor passed 21/21, the Expo
dependency check passed, and Android export succeeded. The full Jest run
still emits an existing React `act(...)` warning from the guided-checks
screen test; its assertions pass. PostgreSQL checks have not run. Docker Desktop is
installed, WSL was updated, and virtualization is enabled, but the engine did
not start: it reported stale Unix socket rename failures. No pgTAP, migration
reset, Edge Function integration or two-device acceptance is claimed.

The 2026-09-27 correction validation is recorded in `PROJECT_STATE.md` once
the full run completes. PostgreSQL migration, pgTAP, Edge Function and real
sign-in/transport behavior remain unverified. A new Android build is required
for the SecureStore native dependency. A second-device discovery/linking UI
remains outside the first-owner pilot path and needs a separate product review
before claiming real multi-device recovery.

M9 local source work now exists in its isolated worktree. M9 integration and
M7 acceptance remain separate gates; this audit does not authorize M8.

## Local PostgreSQL and endpoint verification — 2026-09-28

Docker Desktop now runs. A disposable local Supabase reset applied every M7
migration, including additive corrections for pgcrypto's `extensions` search
path, revoked-device re-enrolment, and forged expense/withdrawal actors. The
security corrections have failing-before and passing-after pgTAP regressions.
No original migration was rewritten and no hosted project was touched.

- `npm exec -- supabase db reset --local --no-seed --yes`: pass.
- `npm exec -- supabase test db --local`: pass, 9 SQL test files and 81 assertions.
- `npm exec -- supabase db lint --local --schema public,sync_private --fail-on error`: pass.
- `npm exec -- supabase db advisors --local --type security --level warn --fail-on error`: pass.
- `npm run test:sync:local`: pass against local Auth, Edge Functions and PostgreSQL. It covers enrolment/replay, nonmember denial, duplicate operation ID, pull/bootstrap, second-device recovery, stale mutable edit, sale/purchase writes and replay without duplicate graph rows.
- `npm run validate`: pass, 503 tests across 52 suites (7 contracts, 150 domain, 346 mobile), strict typecheck and zero-warning lint.
- `npm run mobile:doctor`: pass, 21/21. Expo dependency check and Android export: pass.

### Cross-device stale stock reconciliation — corrected in source

`M7_OFFLINE_SYNC_PLAN.md` requires a reconciliation finalization to be rejected
when inventory or batch state has changed since the physical count. The client
currently includes only device-local inventory `rowid` and batch application
order watermarks in the reconciliation facts. The server's
`validate_m5_payload` previously checked only JSON shape, so `apply_one`
accepted the operation as an immutable append even after a second-device sale.
The expanded live integration script reproduced this failure against the old
server (`APPLIED` instead of `CONFLICT`).

The additive correction records the last fully materialized server revision and
a bounded list of same-device predecessor operation IDs in the finalization
envelope. A narrow PostgreSQL wrapper checks product inventory movements and
batch facts after that revision under the store lock. It accepts verified
same-device predecessors, but returns `CONFLICT` without committing the count
if another device changed the product. Missing/legacy baselines, forged
cross-device predecessors and oversized/incomplete lists also fail closed.
The local row-ID watermarks still guard the count-to-finalization interval.

For offline counts, a single store-wide cursor alone is insufficient: the
same device may have completed unsynced sales/restocks before counting. The
count baseline should include its last known server revision and the IDs of
local inventory/batch operations already reflected in the counted projection.
At apply time, the server compares authoritative product movements/facts after
that revision, allowing only verified same-device predecessor IDs. Any other
intervening change or missing baseline yields a conflict. The expanded live
test passes stale, valid-predecessor, forged-predecessor, legacy and replay
cases after the migration, and checks rejected operations left no server
operation row. `apps/mobile/__tests__/m5Reconciliation.test.ts` checks the
offline envelope carries its predecessor. D-044 records the approved contract.

## Galaxy A15 device check — 2026-09-28

The delegated phone-verification chat installed the rebuilt development APK in
place (`adb install -r`: `Success`), without uninstalling COSI or clearing app
data. After creating a disposable local store and account in the local Supabase
environment, it enrolled the phone and recorded two restocks. The phone was
cold-started without the local Supabase USB forward. Sync then showed a
retryable connection error, one waiting operation and zero needing review;
the queued restock remained. Restoring the forward and using Sync now returned
the app to idle with zero waiting and zero needing review. The temporary ADB
forwards were removed and Metro stopped. This is one-phone, local-backend
evidence; no physical sale, second-device pull or hosted-service check ran.

The audit also corrected remote purchase and sale materialization: actual
outbox `entities.items` now map to the respective line tables; exact rational
cost fields materialize into SQLite columns; batch operations are sealed only
after their entries arrive. The two new pull tests use real local transaction
envelopes, verify graph reconstruction and replay, and check malformed cost
payload rollback. The subsequent root `npm run validate` passed environment
check, strict typecheck, zero-warning lint and 505 tests across 52 suites
(7 contracts, 150 domain, 348 mobile). Jest still emitted a React `act(...)`
warning in the Products component suite; the suite passed.

## Concurrent costing — corrected and independently checked

Two disconnected devices can each assign the same local `application_order`
to a cost movement for one product. Before the correction, pulling the peer's
valid sale failed the SQLite uniqueness constraint and rolled back the page;
the cursor stayed at revision 1. Additive SQLite migration 22 preserves the
existing rows and source-line uniqueness while allowing equal local orders.
Movement replay uses `(application_order, id)` for a stable tie-break. Remote
mutable `costStates` are no longer copied over a receiver's local projection;
the receiver rebuilds and persists it from accepted immutable movements. Sale
snapshots and inventory events remain immutable. This implements the existing
D-038/M7 plan without changing the costing method or historical transactions.

The new two-database regression starts from the same purchased stock, completes
separate offline sales, and pulls both operations onto each device. It proves
both sale graphs survive, cursors advance, cost states converge at two base
units/200 minor units, derived inventory and batch-group balances also equal
two units, and both original sale-cost snapshots remain unchanged. The upgrade
test proves an existing movement survives migration 22. Focused tests passed
after the coordinator added the stock/batch assertions (2/2); strict typecheck
and zero-warning lint also passed. The delegated full `npm run validate` passed
507 tests across 52 suites (7 contracts, 150 domain, 350 mobile) before those
extra assertions. The local PostgreSQL/Edge checks above predate this
client-only correction; no server migration or function changed. This is
independent-database automated evidence, not a physical two-phone run.

## Remaining ticket gates under audit

The cost correction alone does not close M7. The latest delegated pass added
a local Supabase CI job (no remote CI run yet), a conflicting-owner enrollment
denial, and an M5 pull regression covering receipt versus physical evidence,
unknown batch residual, snooze and expired-stock removal. The expired
adjustment test first failed the cost-source trigger, then passed after
operation-specific dependency ordering in the materializer. Focused M7 tests
passed 28/28; root validation passed 508 tests (7 contracts, 150 domain,
351 mobile), strict typecheck and zero-warning lint. Local reset, 81 pgTAP
assertions, scoped lint, security advisors and live Auth/Edge/PostgreSQL
integration passed. The fresh-device bootstrap gate remains open.

### Fresh-device actor/device history — reproduced blocker

The M7-07 multi-page bootstrap test reached `PRODUCT_CREATED`, then failed on
`COMPLETED_PURCHASE_CREATED` with `purchase device does not belong to store`.
The new SQLite installation held the correct user/store/member IDs and its own
new device ID, but did not hold the originating device row referenced by the
immutable purchase. Removing that reference or inventing an `ACTIVE` row from
client-supplied transaction JSON would falsify provenance and authorization.
The broader fresh-device path also needs authoritative store/member context;
the current owner pilot starts from an already provisioned local store.

Recommended smallest durable correction: fetch store-scoped user, membership
and device reference metadata through an authenticated, membership-checked
server contract before replay; stage it with the bootstrap and expose the
reconstructed store only after the complete snapshot commits. Keep all
historical device IDs, including later-revoked devices. Local immutable-fact
triggers should require that a referenced device exists in the same store;
current active-device checks stay in local business commands and the server
push authorization boundary. This permits legitimate old facts without
reactivating a revoked device. An additive SQLite migration and new server
contract/security tests are required. Test a different new-device ID, a
later-revoked origin device, multiple pages, M1–M6 facts, failed/interrupted
restore and cross-store denial. The founder approved this correction as D-045;
implementation and verification remain outstanding. The uncommitted audit work remains preserved; no M9
integration or M8 work is claimed here.

## D-045 implementation audit — 2026-09-28

The approved correction is now implemented in uncommitted source. The
authenticated reference-context endpoint returns authoritative same-store
user/member/device rows, including inactive historical actors, only to a
currently active member using an active device bound to that user and store.
Bootstrap stages the reference context with a pinned, paginated operation
snapshot and commits the reference graph and facts in one SQLite transaction.
Subsequent non-empty pull pages fetch a fresh server context and apply it with
the page transaction, so newly registered origin devices and delayed facts from
later-revoked actors materialize without falsifying attribution. Existing
ACTIVE insert triggers are satisfied only inside the synchronous transaction;
authoritative statuses are restored before commit. This is the bounded legacy
trigger compatibility allowed by D-045, not an ongoing permission change.

The coordinator traced the source and independently ran `npm run validate`
(515 tests/57 suites, typecheck, zero-warning lint), `npm run test:sync:local`
(local Auth/Edge/PostgreSQL, including revoked/cross-store-device and nonmember
denial) and `npx supabase test db` (92 pgTAP assertions/10 files); all passed.
Luna also reported local database lint and security advisors passing. The
earlier fresh-database failure is covered by a different-device, multi-page
M1–M6 restoration test, interruption/rollback tests and two new delayed-pull
regressions. No remote CI or new physical-device check ran after D-045.

Source review found no remaining D-045 blocker. M7 closure still needs the
M7-08 scenario ledger and clean Git handoff; generated root `app.json` is not
part of the change. The user reports that the installed Galaxy app no longer
opens, so phone readiness is not claimed. A physical sale, two-phone
convergence, broader M3–M6 Galaxy flows and second-laptop setup remain open.
