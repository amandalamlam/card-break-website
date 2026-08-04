-- Phase 6: Wallet & store credit (checkout spend + cancellation refunds)
-- Run in Supabase SQL Editor after phase5_stripe_orders.sql

alter table public.orders
  add column if not exists credit_amount numeric(12, 2) not null default 0.00
    check (credit_amount >= 0);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_credit_lte_amount'
  ) then
    alter table public.orders
      add constraint orders_credit_lte_amount check (credit_amount <= amount);
  end if;
end $$;

create type public.credit_transaction_type as enum (
  'cancellation_refund',
  'purchase',
  'checkout_release',
  'admin_adjustment'
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  break_id uuid references public.breaks (id) on delete set null,
  amount numeric(12, 2) not null check (amount <> 0),
  type public.credit_transaction_type not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;

drop policy if exists "Users can read own credit transactions" on public.credit_transactions;
create policy "Users can read own credit transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can read all credit transactions" on public.credit_transactions;
create policy "Admins can read all credit transactions"
  on public.credit_transactions for select
  using (public.is_admin());

-- Reserve store credit and create a pending order atomically.
create or replace function public.create_checkout_order(
  p_user_id uuid,
  p_break_id uuid,
  p_slot_id uuid,
  p_credit_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.break_slots%rowtype;
  v_break public.breaks%rowtype;
  v_profile public.profiles%rowtype;
  v_order_id uuid;
  v_credit numeric(12, 2);
begin
  perform public.release_expired_slot_locks();

  v_credit := round(coalesce(p_credit_amount, 0), 2);

  if v_credit < 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_CREDIT_AMOUNT';
  end if;

  select *
  into v_slot
  from public.break_slots
  where id = p_slot_id and break_id = p_break_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'SLOT_NOT_FOUND';
  end if;

  select *
  into v_break
  from public.breaks
  where id = p_break_id;

  if v_break.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'BREAK_NOT_ACTIVE';
  end if;

  if v_slot.status <> 'locked' or v_slot.user_id is distinct from p_user_id then
    raise exception using errcode = 'P0001', message = 'SLOT_LOCK_EXPIRED';
  end if;

  if v_credit > v_slot.price then
    raise exception using errcode = 'P0001', message = 'CREDIT_EXCEEDS_PRICE';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;

  if v_credit > v_profile.store_credit then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_CREDIT';
  end if;

  if v_credit > 0 then
    update public.profiles
    set
      store_credit = store_credit - v_credit,
      credit_reserved = credit_reserved + v_credit,
      updated_at = now()
    where id = p_user_id;
  end if;

  insert into public.orders (
    user_id,
    break_id,
    slot_id,
    amount,
    credit_amount,
    currency,
    status
  )
  values (
    p_user_id,
    p_break_id,
    p_slot_id,
    v_slot.price,
    v_credit,
    'hkd',
    'pending'
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

-- Release reserved credit when a pending checkout is cancelled.
create or replace function public.release_order_credit(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_order.status <> 'pending' or v_order.credit_amount <= 0 then
    return false;
  end if;

  update public.profiles
  set
    store_credit = store_credit + v_order.credit_amount,
    credit_reserved = credit_reserved - v_order.credit_amount,
    updated_at = now()
  where id = v_order.user_id;

  insert into public.credit_transactions (
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
    v_order.credit_amount,
    'checkout_release',
    'Checkout cancelled — store credit released'
  );

  return true;
end;
$$;

create or replace function public.cancel_pending_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  perform public.release_order_credit(p_order_id);

  update public.orders
  set status = 'cancelled', updated_at = now()
  where id = p_order_id and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- Fulfill slot purchase; consume reserved credit when applicable.
create or replace function public.fulfill_slot_purchase(
  p_order_id uuid,
  p_payment_intent_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_slot public.break_slots%rowtype;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if v_order.status = 'paid' then
    return true;
  end if;

  select *
  into v_slot
  from public.break_slots
  where id = v_order.slot_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'SLOT_NOT_FOUND';
  end if;

  if v_slot.status = 'sold' then
    if v_slot.user_id = v_order.user_id then
      update public.orders
      set
        status = 'paid',
        stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
        updated_at = now()
      where id = p_order_id;
      return true;
    end if;

    raise exception using errcode = 'P0001', message = 'SLOT_SOLD_TO_OTHER';
  end if;

  if v_slot.status = 'locked' and v_slot.user_id is distinct from v_order.user_id then
    raise exception using errcode = 'P0001', message = 'SLOT_LOCKED_BY_OTHER';
  end if;

  update public.break_slots
  set
    status = 'sold',
    user_id = v_order.user_id,
    locked_at = null,
    updated_at = now()
  where id = v_order.slot_id;

  if v_order.credit_amount > 0 then
    update public.profiles
    set
      credit_reserved = credit_reserved - v_order.credit_amount,
      updated_at = now()
    where id = v_order.user_id;

    insert into public.credit_transactions (
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
      -v_order.credit_amount,
      'purchase',
      'Store credit applied to slot purchase'
    );
  end if;

  update public.orders
  set
    status = 'paid',
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

-- Instant fulfillment for 100% store-credit checkout (no Stripe).
create or replace function public.fulfill_credit_only_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if v_order.status = 'paid' then
    return true;
  end if;

  if v_order.credit_amount <> v_order.amount then
    raise exception using errcode = 'P0001', message = 'NOT_CREDIT_ONLY_ORDER';
  end if;

  return public.fulfill_slot_purchase(p_order_id, null);
end;
$$;

-- Admin cancels a break: refund all paid orders to store credit (100%, no Stripe refund).
create or replace function public.cancel_break_and_refund(p_break_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_break public.breaks%rowtype;
  v_order record;
  v_refunded_orders integer := 0;
  v_refunded_slots integer := 0;
  v_released_locks integer := 0;
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
    updated_at = now()
  where break_id = p_break_id and status = 'locked';

  get diagnostics v_released_locks = row_count;

  for v_order in
    select *
    from public.orders
    where break_id = p_break_id and status = 'pending'
    for update
  loop
    perform public.cancel_pending_order(v_order.id);
  end loop;

  for v_order in
    select o.*
    from public.orders o
    where o.break_id = p_break_id and o.status = 'paid'
    for update
  loop
    update public.profiles
    set
      store_credit = store_credit + v_order.amount,
      updated_at = now()
    where id = v_order.user_id;

    insert into public.credit_transactions (
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
      v_order.amount,
      'cancellation_refund',
      'Break cancelled — full purchase amount credited to wallet'
    );

    update public.break_slots
    set
      status = 'refunded',
      updated_at = now()
    where id = v_order.slot_id and status = 'sold';

    v_refunded_orders := v_refunded_orders + 1;
  end loop;

  select count(*)
  into v_refunded_slots
  from public.break_slots
  where break_id = p_break_id and status = 'refunded';

  return jsonb_build_object(
    'break_id', p_break_id,
    'refunded_orders', v_refunded_orders,
    'refunded_slots', v_refunded_slots,
    'released_locks', v_released_locks
  );
end;
$$;

revoke all on function public.create_checkout_order(uuid, uuid, uuid, numeric) from public;
revoke all on function public.release_order_credit(uuid) from public;
revoke all on function public.fulfill_credit_only_order(uuid) from public;
revoke all on function public.cancel_break_and_refund(uuid) from public;

grant execute on function public.create_checkout_order(uuid, uuid, uuid, numeric) to service_role;
grant execute on function public.release_order_credit(uuid) to service_role;
grant execute on function public.fulfill_credit_only_order(uuid) to service_role;
grant execute on function public.cancel_break_and_refund(uuid) to service_role;
