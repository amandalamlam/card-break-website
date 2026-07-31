-- Phase 4: 8-minute slot locking with row-level locking (SELECT FOR UPDATE)
-- Run in Supabase SQL Editor after schema.sql

create or replace function public.release_expired_slot_locks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released_count integer;
begin
  update public.break_slots
  set
    status = 'available',
    user_id = null,
    locked_at = null,
    updated_at = now()
  where
    status = 'locked'
    and locked_at is not null
    and locked_at + interval '8 minutes' <= now();

  get diagnostics released_count = row_count;
  return released_count;
end;
$$;

create or replace function public.lock_break_slot(p_slot_id uuid, p_user_id uuid)
returns table (
  slot_id uuid,
  break_id uuid,
  locked_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.break_slots%rowtype;
  v_break public.breaks%rowtype;
  v_expires_at timestamptz;
begin
  perform public.release_expired_slot_locks();

  select *
  into v_slot
  from public.break_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'SLOT_NOT_FOUND';
  end if;

  select *
  into v_break
  from public.breaks
  where id = v_slot.break_id;

  if v_break.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'BREAK_NOT_ACTIVE';
  end if;

  if v_slot.status = 'sold' then
    raise exception using errcode = 'P0001', message = 'SLOT_ALREADY_SOLD';
  end if;

  if v_slot.status = 'refunded' then
    raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
  end if;

  if v_slot.status = 'locked' and v_slot.locked_at is not null then
    v_expires_at := v_slot.locked_at + interval '8 minutes';

    if v_expires_at > now() then
      if v_slot.user_id = p_user_id then
        return query
        select v_slot.id, v_slot.break_id, v_slot.locked_at, v_expires_at;
        return;
      end if;

      raise exception using errcode = 'P0001', message = 'SLOT_LOCKED_BY_OTHER';
    end if;
  end if;

  update public.break_slots
  set
    status = 'locked',
    user_id = p_user_id,
    locked_at = now(),
    updated_at = now()
  where id = p_slot_id
  returning * into v_slot;

  v_expires_at := v_slot.locked_at + interval '8 minutes';

  return query
  select v_slot.id, v_slot.break_id, v_slot.locked_at, v_expires_at;
end;
$$;

create or replace function public.release_slot_lock(p_slot_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.break_slots
  set
    status = 'available',
    user_id = null,
    locked_at = null,
    updated_at = now()
  where
    id = p_slot_id
    and user_id = p_user_id
    and status = 'locked';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- Only the service role (API routes) should call these RPCs — not exposed to anon client.
revoke all on function public.lock_break_slot(uuid, uuid) from public;
revoke all on function public.release_slot_lock(uuid, uuid) from public;
revoke all on function public.release_expired_slot_locks() from public;

grant execute on function public.lock_break_slot(uuid, uuid) to service_role;
grant execute on function public.release_slot_lock(uuid, uuid) to service_role;
grant execute on function public.release_expired_slot_locks() to service_role;
