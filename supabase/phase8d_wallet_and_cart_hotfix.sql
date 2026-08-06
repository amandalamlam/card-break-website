-- Phase 8D HOTFIX (run this ONE file in Supabase SQL Editor)
-- Fixes: Stripe Back credit_reserved crash + Add to Cart UNKNOWN 409
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Repair corrupted reserved credit (clamp to >= 0)
-- ---------------------------------------------------------------------------
update public.profiles
set credit_reserved = 0, updated_at = now()
where credit_reserved < 0;

-- Recompute reserved from open pending orders (best-effort)
with pending as (
  select
    o.user_id,
    coalesce(sum(coalesce(nullif(o.credit_paid, 0), o.credit_amount, 0)), 0) as reserved
  from public.orders o
  where o.status = 'pending'
  group by o.user_id
)
update public.profiles p
set
  credit_reserved = greatest(pending.reserved, 0),
  updated_at = now()
from pending
where p.id = pending.user_id;

-- ---------------------------------------------------------------------------
-- 2) release_order_credit — idempotent
-- ---------------------------------------------------------------------------
create or replace function public.release_order_credit(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_credit numeric(12, 2);
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found or v_order.status <> 'pending' then
    return false;
  end if;

  v_credit := round(coalesce(nullif(v_order.credit_paid, 0), v_order.credit_amount, 0), 2);

  if v_credit <= 0 then
    return false;
  end if;

  update public.profiles
  set
    store_credit = store_credit + v_credit,
    credit_reserved = greatest(credit_reserved - v_credit, 0),
    updated_at = now()
  where id = v_order.user_id;

  -- Prevent double-release if cancel is re-entered
  update public.orders
  set credit_amount = 0, credit_paid = 0, updated_at = now()
  where id = p_order_id;

  begin
    insert into public.wallet_transactions (
      user_id, order_id, break_id, amount, type, description
    )
    values (
      v_order.user_id, v_order.id, v_order.break_id, v_credit,
      'checkout_release', 'Checkout cancelled — store credit released'
    );
  exception
    when others then
      null;
  end;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) release_order_slots — release holds only (NO cancel recursion)
-- ---------------------------------------------------------------------------
create or replace function public.release_order_slots(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_released integer := 0;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    return 0;
  end if;

  for v_item in
    select distinct slot_id from (
      select oi.slot_id from public.order_items oi where oi.order_id = p_order_id
      union all
      select v_order.slot_id where v_order.slot_id is not null
    ) s
    where slot_id is not null
  loop
    update public.break_slots
    set
      status = 'available',
      user_id = null,
      locked_at = null,
      lock_type = null,
      lock_expires_at = null,
      updated_at = now()
    where id = v_item.slot_id and status = 'locked';

    if found then
      v_released := v_released + 1;
    end if;
  end loop;

  return v_released;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) cancel_pending_order
-- ---------------------------------------------------------------------------
create or replace function public.cancel_pending_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_updated integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'pending' then
    return false;
  end if;

  perform public.release_order_credit(p_order_id);
  perform public.release_order_slots(p_order_id);

  if v_order.checkout_mode = 'cart'::public.checkout_mode and v_order.cart_id is not null then
    update public.carts set status = 'active', updated_at = now()
    where id = v_order.cart_id and status = 'checkout';
  end if;

  update public.orders set status = 'cancelled', updated_at = now()
  where id = p_order_id and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) release_pending_orders_for_slot — swallow per-order failures
-- ---------------------------------------------------------------------------
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
      and (o.slot_id = p_slot_id or oi.slot_id = p_slot_id)
      and (p_user_id is null or o.user_id = p_user_id)
  loop
    begin
      if public.cancel_pending_order(v_order_id) then
        v_cancelled := v_cancelled + 1;
      end if;
    exception
      when others then
        -- Never abort the outer cleanup / add-to-cart flow
        null;
    end;
  end loop;

  return v_cancelled;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) release_expired_slot_locks — resilient
-- ---------------------------------------------------------------------------
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
  begin
    perform public.release_expired_carts();
  exception
    when others then
      null;
  end;

  for v_slot in
    select id, user_id
    from public.break_slots
    where
      status = 'locked'
      and (
        (lock_expires_at is not null and lock_expires_at <= now())
        or (lock_expires_at is null and locked_at is not null and locked_at + interval '8 minutes' <= now())
      )
  loop
    begin
      perform public.release_pending_orders_for_slot(v_slot.id, v_slot.user_id);
    exception
      when others then
        null;
    end;
  end loop;

  update public.break_slots
  set
    status = 'available',
    user_id = null,
    locked_at = null,
    lock_type = null,
    lock_expires_at = null,
    updated_at = now()
  where
    status = 'locked'
    and (
      (lock_expires_at is not null and lock_expires_at <= now())
      or (lock_expires_at is null and locked_at is not null and locked_at + interval '8 minutes' <= now())
    );

  get diagnostics released_count = row_count;
  return released_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) add_slot_to_cart — no global wallet-sensitive sweep
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
  begin
    perform public.release_expired_carts();
  exception
    when others then
      null;
  end;

  select * into v_slot
  from public.break_slots
  where id = p_slot_id and break_id = p_break_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'SLOT_NOT_FOUND';
  end if;

  select * into v_break from public.breaks where id = p_break_id;
  if v_break.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'BREAK_NOT_ACTIVE';
  end if;

  if exists (
    select 1
    from public.cart_items ci
    join public.carts c on c.id = ci.cart_id
    where ci.slot_id = p_slot_id
      and c.status = 'active'
      and c.user_id = p_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'SLOT_ALREADY_IN_CART';
  end if;

  -- Reclaim expired hold on THIS slot only
  if v_slot.status = 'locked'
     and (
       v_slot.lock_expires_at is null
       or v_slot.lock_expires_at <= now()
     ) then
    begin
      perform public.release_pending_orders_for_slot(v_slot.id, v_slot.user_id);
    exception
      when others then
        null;
    end;

    update public.break_slots
    set
      status = 'available',
      user_id = null,
      locked_at = null,
      lock_type = null,
      lock_expires_at = null,
      updated_at = now()
    where id = p_slot_id;

    select * into v_slot from public.break_slots where id = p_slot_id for update;
  end if;

  if v_slot.status = 'locked'
     and v_slot.lock_expires_at is not null
     and v_slot.lock_expires_at > now() then
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
