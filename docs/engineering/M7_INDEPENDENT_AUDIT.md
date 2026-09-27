# M7 independent audit — open findings

**Status:** Not accepted. Docker-backed PostgreSQL integration is deferred at
the founder's request; the source findings below are independent of Docker.
**Branch at review:** `feat/m7-offline-sync`, `79b75a0` plus uncommitted audit
corrections. No M8 work or remote deployment was performed.

## Blocking source findings

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
   including multiple pages and later concurrent writes.
2. **The mobile app does not invoke sync.** `OfflineSyncWorker` and the HTTP
   transport are exported but no app route or startup path constructs them.
   There is no pilot sign-in/enrolment action, compact sync status/manual retry
   surface, or conflict-resolution path. Local transaction completion still
   works; actual cloud synchronization cannot begin from the app. The accepted
   M7-02/M7-05 requirements need an integrated, authorized pilot path before
   source acceptance.

## Audit corrections prepared, still awaiting database evidence

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
  but does **not** close finding 1.

## Evidence and boundary

The focused `m7Sync.test.ts` suite passed 14/14 after the latest local
changes. `npm run validate` passed typecheck, zero-warning lint and 492 tests
across 51 suites. After aligning two Expo patch dependencies, Expo Doctor
passed 21/21; the focused navigation/startup/sync suites passed 23/23, and
Android export passed after the patch alignment. PostgreSQL checks have not
run. Docker Desktop is
installed, WSL was updated, and virtualization is enabled, but the engine did
not start: it reported stale Unix socket rename failures. No pgTAP, migration
reset, Edge Function integration or two-device acceptance is claimed.

M9 planning may continue in its isolated worktree. M9 production execution
and M7 acceptance remain separate decisions; this audit does not authorize M8.
