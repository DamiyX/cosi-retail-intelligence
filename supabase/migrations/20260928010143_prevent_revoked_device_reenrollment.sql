-- Enrollment may register a new device, but a previously revoked device ID
-- cannot recover access simply by calling the idempotent enrollment RPC again.
create function sync_private.prevent_device_reactivation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'REVOKED' and new.status <> 'REVOKED' then
    raise exception using errcode = '42501', message = 'Revoked device cannot be re-enrolled.';
  end if;
  return new;
end;
$$;

create trigger prevent_device_reactivation
before update of status on public.devices
for each row execute function sync_private.prevent_device_reactivation();
