# M7 independent audit — source corrections and open integration gate

**Status:** Local PostgreSQL and endpoint tests now pass, including the stale-reconciliation correction. M7 native-device evidence remains open.
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

Native-device verification still needs a development APK rebuilt for
`expo-secure-store`, then real sign-in, offline/restart and sync recovery on the
Galaxy A15. The connected phone has not been used to claim M7 acceptance.
