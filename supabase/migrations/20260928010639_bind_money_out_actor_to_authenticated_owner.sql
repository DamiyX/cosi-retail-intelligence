-- The actor embedded in an immutable expense/withdrawal is not authority.
-- Bind the fact to the verified request subject and its store/device envelope.
create or replace function sync_private.validate_finance_payload(p_store_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_operation_type text := p_payload->>'operationType';
  v_record jsonb;
  v_user_id uuid;
  v_amount numeric;
  v_currency text;
begin
  if v_operation_type = 'EXPENSE_CREATED' then
    v_record := p_payload->'entities'->'expense';
    if p_payload->'entities'->'withdrawal' is not null
       or p_payload->>'entityType' <> 'EXPENSE' then
      raise exception using errcode = '22023', message = 'Expense envelope has the wrong fact type.';
    end if;
  elsif v_operation_type = 'OWNER_WITHDRAWAL_CREATED' then
    v_record := p_payload->'entities'->'withdrawal';
    if p_payload->'entities'->'expense' is not null
       or p_payload->>'entityType' <> 'OWNER_WITHDRAWAL' then
      raise exception using errcode = '22023', message = 'Withdrawal envelope has the wrong fact type.';
    end if;
  else
    raise exception using errcode = '22023', message = 'Unsupported money-out operation.';
  end if;

  if jsonb_typeof(v_record) <> 'object' then
    raise exception using errcode = '22023', message = 'Financial operation payload is missing its immutable record.';
  end if;
  if v_record->>'id' is distinct from p_payload->>'entityId'
     or v_record->>'storeId' is distinct from p_store_id::text
     or v_record->>'deviceId' is distinct from p_payload->>'deviceId' then
    raise exception using errcode = '22023', message = 'Financial fact identity does not match its envelope.';
  end if;

  v_user_id := (v_record->>'createdByUserId')::uuid;
  v_amount := (v_record->>'amountMinor')::numeric;
  v_currency := v_record->>'currencyCode';
  if v_amount is null or v_amount <= 0 or v_currency is null or not exists (
    select 1 from public.stores s where s.id = p_store_id and s.currency_code = v_currency
  ) then
    raise exception using errcode = '22023', message = 'Financial operation amount or currency is invalid.';
  end if;
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    where sm.store_id = p_store_id and sm.user_id = v_user_id
      and sm.role = 'OWNER' and sm.status = 'ACTIVE'
      and au.status = 'ACTIVE' and au.auth_subject = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'Only the authenticated active store owner can create money-out facts.';
  end if;
end;
$$;
