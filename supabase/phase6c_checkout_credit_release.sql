-- Phase 6C: Release reserved wallet credit when slot locks expire or are cancelled
-- Run in Supabase SQL Editor after phase6b_wallet_relational.sql (and phase6_wallet.sql)

-- Cancel pending checkout orders (and release reserved credit) for a slot.
create or replace function public.release_pending_orders_for_slot(
  p_slot_id uuid,
  p_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_cancelled integer := 0;
begin
  for v_order_id in
    select distinct o.id
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    where o.status = 'pending'
      and (
        o.slot_id = p_slot_id
        or oi.slot_id = p_slot_id
      )
      and (p_user_id is null or o.user_id = p_user_id)
  loop
    if public.cancel_pending_order(v_order_id) then
      v_cancelled := v_cancelled + 1;
    end if;
  end loop;

  return v_cancelled;
end;
$$;

-- Expired holds: cancel pending orders first, then free the slot.
create or replace function public.release_expired_slot_locks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot record;
  released_count integer;
begin
  for v_slot in
    select id, user_id
    from public.break_slots
    where
      status = 'locked'
      and locked_at is not null
      and locked_at + interval '8 minutes' <= now()
  loop
    perform public.release_pending_orders_for_slot(v_slot.id, v_slot.user_id);
  end loop;

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

-- Manual / forced release: cancel pending orders for this user+slot, then free the slot.
create or replace function public.release_slot_lock(p_slot_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  perform public.release_pending_orders_for_slot(p_slot_id, p_user_id);

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

-- Reclaim expired lock during lock_break_slot (inline expiry path).
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
      if v_slot.user_id is null or v_slot.user_id = p_user_id then
        if v_slot.user_id is null then
          update public.break_slots
          set user_id = p_user_id, updated_at = now()
          where id = p_slot_id
          returning * into v_slot;
        end if;

        return query
        select v_slot.id, v_slot.break_id, v_slot.locked_at, v_expires_at;
        return;
      end if;

      raise exception using errcode = 'P0001', message = 'SLOT_LOCKED_BY_OTHER';
    end if;

    perform public.release_pending_orders_for_slot(v_slot.id, v_slot.user_id);

    update public.break_slots
    set
      status = 'available',
      user_id = null,
      locked_at = null,
      updated_at = now()
    where id = p_slot_id
    returning * into v_slot;
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

revoke all on function public.release_pending_orders_for_slot(uuid, uuid) from public;
grant execute on function public.release_pending_orders_for_slot(uuid, uuid) to service_role;
