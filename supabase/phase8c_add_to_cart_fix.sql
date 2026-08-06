-- Phase 8C: Fix add-to-cart failing with UNKNOWN (409)
-- Run after phase8_dual_checkout.sql and phase8b_cancel_credit_fix.sql
--
-- Root cause: add_slot_to_cart called release_expired_slot_locks() up front, which
-- could abort the whole RPC (e.g. wallet credit_reserved cleanup on unrelated slots).
-- Also stale expired locks on the target slot were treated as SLOT_UNAVAILABLE.

-- ---------------------------------------------------------------------------
-- add_slot_to_cart — scoped cleanup + stale lock reclaim
-- ---------------------------------------------------------------------------
create or replace function public.add_slot_to_cart(
  p_user_id uuid,
  p_break_id uuid,
  p_slot_id uuid,
  p_cart_duration_minutes integer default 5
)
returns table (
  cart_id uuid,
  cart_item_id uuid,
  expires_at timestamptz,
  is_new_cart boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.break_slots%rowtype;
  v_break public.breaks%rowtype;
  v_cart public.carts%rowtype;
  v_cart_id uuid;
  v_item_id uuid;
  v_expires_at timestamptz;
  v_is_new boolean := false;
begin
  -- Expire stale carts only; do not sweep all slots (can fail on unrelated wallet cleanup).
  begin
    perform public.release_expired_carts();
  exception
    when others then
      null;
  end;

  select * into v_slot from public.break_slots where id = p_slot_id and break_id = p_break_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'SLOT_NOT_FOUND';
  end if;

  select * into v_break from public.breaks where id = p_break_id;
  if v_break.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'BREAK_NOT_ACTIVE';
  end if;

  if exists (
    select 1 from public.cart_items ci
    join public.carts c on c.id = ci.cart_id
    where ci.slot_id = p_slot_id and c.status = 'active' and c.user_id = p_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'SLOT_ALREADY_IN_CART';
  end if;

  -- Reclaim this slot when the hold expired but status was not cleared yet.
  if v_slot.status = 'locked' and not public.slot_lock_is_active(v_slot) then
    begin
      perform public.release_pending_orders_for_slot(v_slot.id, v_slot.user_id);
    exception
      when others then
        null;
    end;
    perform public.release_slot_hold(v_slot.id);
    select * into v_slot from public.break_slots where id = p_slot_id for update;
  end if;

  if public.slot_lock_is_active(v_slot) then
    if v_slot.lock_type = 'cart'::public.slot_lock_type and v_slot.user_id = p_user_id then
      null;
    else
      raise exception using errcode = 'P0001', message = 'SLOT_LOCKED_BY_OTHER';
    end if;
  elsif v_slot.status <> 'available' then
    raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
  end if;

  select * into v_cart
  from public.carts
  where user_id = p_user_id and status = 'active'
  for update;

  if not found then
    v_is_new := true;
    v_expires_at := now() + make_interval(mins => greatest(p_cart_duration_minutes, 1));

    insert into public.carts (user_id, expires_at, status)
    values (p_user_id, v_expires_at, 'active')
    returning id, expires_at into v_cart_id, v_expires_at;
  else
    v_cart_id := v_cart.id;
    v_expires_at := v_cart.expires_at;
    if v_expires_at <= now() then
      raise exception using errcode = 'P0001', message = 'CART_EXPIRED';
    end if;
  end if;

  update public.break_slots
  set
    status = 'locked',
    user_id = p_user_id,
    locked_at = now(),
    lock_type = 'cart'::public.slot_lock_type,
    lock_expires_at = v_expires_at,
    updated_at = now()
  where id = p_slot_id;

  insert into public.cart_items (
    cart_id, user_id, break_id, slot_id, break_title, position_name, price
  )
  values (
    v_cart_id, p_user_id, p_break_id, p_slot_id, v_break.title, v_slot.name, v_slot.price
  )
  returning id into v_item_id;

  return query select v_cart_id, v_item_id, v_expires_at, v_is_new;
end;
$$;
