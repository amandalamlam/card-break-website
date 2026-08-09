-- Phase 8F: Fix cancel_break_and_refund
-- Root causes fixed:
--   1) SELECT DISTINCT ... FOR UPDATE is invalid in PostgreSQL
--   2) order_total_amount(record) fails with "cannot cast type record to orders"
-- Run in Supabase SQL Editor after phase8d_wallet_and_cart_hotfix.sql
-- Safe to re-run.

create or replace function public.cancel_break_and_refund(p_break_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_break public.breaks%rowtype;
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_refunded_orders integer := 0;
  v_refunded_slots integer := 0;
  v_released_locks integer := 0;
  v_total numeric(12, 2);
  v_cancelled_pending integer := 0;
  v_other_items integer := 0;
begin
  select *
  into v_break
  from public.breaks
  where id = p_break_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BREAK_NOT_FOUND';
  end if;

  if v_break.status in ('completed', 'cancelled') then
    raise exception using errcode = 'P0001', message = 'BREAK_CANNOT_BE_CANCELLED';
  end if;

  update public.breaks
  set status = 'cancelled', updated_at = now()
  where id = p_break_id;

  update public.break_slots
  set
    status = 'available',
    user_id = null,
    locked_at = null,
    lock_type = null,
    lock_expires_at = null,
    updated_at = now()
  where break_id = p_break_id
    and status = 'locked';

  get diagnostics v_released_locks = row_count;

  -- Cancel pending orders tied to this break (legacy break_id or order_items)
  for v_order_id in
    select distinct o.id
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    where o.status = 'pending'
      and (o.break_id = p_break_id or oi.break_id = p_break_id)
  loop
    begin
      if public.cancel_pending_order(v_order_id) then
        v_cancelled_pending := v_cancelled_pending + 1;
      end if;
    exception
      when others then
        raise exception using
          errcode = 'P0001',
          message = 'PENDING_ORDER_CANCEL_FAILED';
    end;
  end loop;

  -- Refund paid orders for this break only
  for v_order_id in
    select distinct o.id
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    where o.status = 'paid'
      and (o.break_id = p_break_id or oi.break_id = p_break_id)
  loop
    select *
    into v_order
    from public.orders
    where id = v_order_id
    for update;

    if not found or v_order.status <> 'paid' then
      continue;
    end if;

    -- Prefer break-scoped item prices (cart-safe). Fall back to legacy order total.
    select coalesce(sum(oi.price), 0)
    into v_total
    from public.order_items oi
    where oi.order_id = v_order.id
      and oi.break_id = p_break_id;

    if v_total <= 0 and v_order.break_id = p_break_id then
      v_total := coalesce(v_order.total_amount, v_order.amount, 0);
    end if;

    if v_total <= 0 then
      continue;
    end if;

    update public.profiles
    set
      store_credit = store_credit + v_total,
      updated_at = now()
    where id = v_order.user_id;

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
      p_break_id,
      v_total,
      'cancellation_refund',
      'Break cancelled — purchase amount credited to wallet'
    );

    -- Mark sold/locked slots for this break as refunded
    update public.break_slots bs
    set
      status = 'refunded',
      user_id = null,
      locked_at = null,
      lock_type = null,
      lock_expires_at = null,
      updated_at = now()
    from public.order_items oi
    where oi.order_id = v_order.id
      and oi.break_id = p_break_id
      and bs.id = oi.slot_id
      and bs.status in ('sold', 'locked');

    if v_order.slot_id is not null and v_order.break_id = p_break_id then
      update public.break_slots
      set
        status = 'refunded',
        user_id = null,
        locked_at = null,
        lock_type = null,
        lock_expires_at = null,
        updated_at = now()
      where id = v_order.slot_id
        and break_id = p_break_id
        and status in ('sold', 'locked');
    end if;

    -- Only cancel the order if it has no remaining items from other breaks
    select count(*)
    into v_other_items
    from public.order_items oi
    where oi.order_id = v_order.id
      and oi.break_id <> p_break_id;

    if v_other_items = 0 then
      update public.orders
      set status = 'cancelled', updated_at = now()
      where id = v_order.id
        and status = 'paid';
    end if;

    v_refunded_orders := v_refunded_orders + 1;
  end loop;

  select count(*)
  into v_refunded_slots
  from public.break_slots
  where break_id = p_break_id
    and status = 'refunded';

  return jsonb_build_object(
    'break_id', p_break_id,
    'refunded_orders', v_refunded_orders,
    'refunded_slots', v_refunded_slots,
    'released_locks', v_released_locks,
    'cancelled_pending_orders', v_cancelled_pending
  );
end;
$$;

revoke all on function public.cancel_break_and_refund(uuid) from public;
grant execute on function public.cancel_break_and_refund(uuid) to service_role;
