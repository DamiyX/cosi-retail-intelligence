-- pgcrypto is installed in Supabase's extensions schema. The existing
-- security-definer function must resolve digest() there to persist an
-- accepted operation and its idempotency hash atomically.
alter function sync_private.apply_one(jsonb, uuid)
  set search_path = public, auth, extensions, pg_temp;
