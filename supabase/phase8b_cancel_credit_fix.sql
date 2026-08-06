-- Phase 8B: Fix double credit release on checkout cancel (Stripe Back button)
-- Run in Supabase SQL Editor after phase8_dual_checkout.sql
--
-- Root cause: cancel_pending_order → release_order_slots → release_pending_orders_for_slot
-- re-entered cancel_pending_order for the same order, releasing credit_reserved twice.

-- ---------------------------------------------------------------------------
-- release_order_credit — idempotent (safe if called more than once)
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
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  v_credit := public.order_credit_paid(v_order);

  if not found or v_order.status <> 'pending' or v_credit <= 0 then
    return false;
  end if;

  update public.profiles
  set
    store_credit = store_credit + v_credit,
    credit_reserved = greatest(credit_reserved - v_credit, 0),
    updated_at = now()
  where id = v_order.user_id;

  update public.orders
  set
    credit_amount = 0,
    credit_paid = 0,
    updated_at = now()
  where id = p_order_id;

  insert into public.wallet_transactions (
    user_id,
    order_id,
    break_id,
    amount,
    type,
    description
  )
  values (
    v_order.user_id,
    v_order.id,
    v_order.break_id,
    v_credit,
    'checkout_release',
    'Checkout cancelled — store credit released'
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_order_slots — release holds only (do not re-cancel orders)
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
    select distinct coalesce(oi.slot_id, v_order.slot_id) as slot_id
    from public.order_items oi
    where oi.order_id = p_order_id
    union
    select v_order.slot_id where v_order.slot_id is not null
  loop
    if v_item.slot_id is not null then
      if public.release_slot_hold(v_item.slot_id) then
        v_released := v_released + 1;
      end if;
    end if;
  end loop;

  return v_released;
end;
$$;
