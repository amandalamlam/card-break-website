-- Phase 6B: Relational wallet activity (Schema B) — orders, order_items, wallet_transactions
-- Run in Supabase SQL Editor after phase6_wallet.sql

-- ---------------------------------------------------------------------------
-- Enums & order columns
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_payment_type') then
    create type public.order_payment_type as enum ('credit', 'stripe', 'hybrid');
  end if;
end $$;

alter table public.orders
  add column if not exists total_amount numeric(12, 2),
  add column if not exists credit_paid numeric(12, 2) not null default 0.00,
  add column if not exists stripe_paid numeric(12, 2) not null default 0.00,
  add column if not exists payment_type public.order_payment_type;

-- Backfill from legacy columns (amount / credit_amount)
update public.orders
set
  total_amount = coalesce(total_amount, amount),
  credit_paid = case
    when credit_paid = 0 and coalesce(credit_amount, 0) > 0 then credit_amount
    else credit_paid
  end,
  stripe_paid = case
    when stripe_paid = 0 then greatest(coalesce(total_amount, amount) - coalesce(credit_paid, credit_amount, 0), 0)
    else stripe_paid
  end,
  payment_type = coalesce(
    payment_type,
    case
      when coalesce(credit_paid, credit_amount, 0) >= coalesce(total_amount, amount) then 'credit'::public.order_payment_type
      when coalesce(credit_paid, credit_amount, 0) > 0 then 'hybrid'::public.order_payment_type
      else 'stripe'::public.order_payment_type
    end
  )
where total_amount is null or payment_type is null;

alter table public.orders
  alter column total_amount set default 0.00;

update public.orders set total_amount = 0.00 where total_amount is null;

alter table public.orders
  alter column total_amount set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_credit_paid_lte_total') then
    alter table public.orders
      add constraint orders_credit_paid_lte_total check (credit_paid <= total_amount);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- order_items (cart-ready line items)
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  break_id uuid not null references public.breaks (id) on delete cascade,
  slot_id uuid references public.break_slots (id) on delete set null,
  break_title text not null,
  position_name text not null,
  price numeric(12, 2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_break_id_idx on public.order_items (break_id);

alter table public.order_items enable row level security;

drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items"
  on public.order_items for select
  using (public.is_admin());

-- Backfill order_items from existing single-item orders
insert into public.order_items (order_id, break_id, slot_id, break_title, position_name, price)
select
  o.id,
  o.break_id,
  o.slot_id,
  b.title,
  s.name,
  coalesce(o.total_amount, o.amount)
from public.orders o
join public.breaks b on b.id = o.break_id
join public.break_slots s on s.id = o.slot_id
where not exists (
  select 1 from public.order_items oi where oi.order_id = o.id
);

-- ---------------------------------------------------------------------------
-- wallet_transactions (rename from credit_transactions when present)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'credit_transactions'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'wallet_transactions'
  ) then
    alter table public.credit_transactions rename to wallet_transactions;
    alter index if exists credit_transactions_user_id_idx rename to wallet_transactions_user_id_idx;
  end if;
end $$;

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  break_id uuid references public.breaks (id) on delete set null,
  amount numeric(12, 2) not null check (amount <> 0),
  type public.credit_transaction_type not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_id_idx
  on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;

drop policy if exists "Users can read own credit transactions" on public.wallet_transactions;
drop policy if exists "Users can read own wallet transactions" on public.wallet_transactions;
create policy "Users can read own wallet transactions"
  on public.wallet_transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can read all credit transactions" on public.wallet_transactions;
drop policy if exists "Admins can read all wallet transactions" on public.wallet_transactions;
create policy "Admins can read all wallet transactions"
  on public.wallet_transactions for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helper: resolve order monetary fields (supports legacy + Schema B columns)
-- ---------------------------------------------------------------------------
create or replace function public.order_total_amount(p_order public.orders)
returns numeric
language sql
immutable
as $$
  select coalesce(p_order.total_amount, p_order.amount, 0);
$$;

create or replace function public.order_credit_paid(p_order public.orders)
returns numeric
language sql
immutable
as $$
  select coalesce(nullif(p_order.credit_paid, 0), p_order.credit_amount, 0);
$$;

-- ---------------------------------------------------------------------------
-- create_checkout_order — creates order + order_item + reserves credit
-- ---------------------------------------------------------------------------
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
  v_total numeric(12, 2);
  v_stripe numeric(12, 2);
  v_payment_type public.order_payment_type;
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

  v_total := v_slot.price;

  if v_credit > v_total then
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

  v_stripe := greatest(v_total - v_credit, 0);

  if v_credit >= v_total then
    v_payment_type := 'credit';
  elsif v_credit > 0 then
    v_payment_type := 'hybrid';
  else
    v_payment_type := 'stripe';
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
    total_amount,
    credit_paid,
    stripe_paid,
    payment_type,
    currency,
    status
  )
  values (
    p_user_id,
    p_break_id,
    p_slot_id,
    v_total,
    v_credit,
    v_total,
    v_credit,
    v_stripe,
    v_payment_type,
    'hkd',
    'pending'
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    break_id,
    slot_id,
    break_title,
    position_name,
    price
  )
  values (
    v_order_id,
    p_break_id,
    p_slot_id,
    v_break.title,
    v_slot.name,
    v_total
  );

  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_order_credit
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
    credit_reserved = credit_reserved - v_credit,
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
    v_order.break_id,
    v_credit,
    'checkout_release',
    'Checkout cancelled — store credit released'
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- fulfill_slot_purchase — fulfills all order_items + wallet transaction
-- ---------------------------------------------------------------------------
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
  v_item record;
  v_slot public.break_slots%rowtype;
  v_credit numeric(12, 2);
  v_total numeric(12, 2);
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

  v_credit := public.order_credit_paid(v_order);
  v_total := public.order_total_amount(v_order);

  for v_item in
    select *
    from public.order_items
    where order_id = p_order_id
    for update
  loop
    select *
    into v_slot
    from public.break_slots
    where id = coalesce(v_item.slot_id, v_order.slot_id)
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'SLOT_NOT_FOUND';
    end if;

    if v_slot.status = 'sold' then
      if v_slot.user_id <> v_order.user_id then
        raise exception using errcode = 'P0001', message = 'SLOT_SOLD_TO_OTHER';
      end if;
      continue;
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
    where id = v_slot.id;
  end loop;

  if v_credit > 0 then
    update public.profiles
    set
      credit_reserved = credit_reserved - v_credit,
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
      v_order.break_id,
      -v_credit,
      'purchase',
      'Store credit applied to slot purchase'
    );
  end if;

  update public.orders
  set
    status = 'paid',
    stripe_paid = greatest(v_total - v_credit, 0),
    payment_type = case
      when v_credit >= v_total then 'credit'::public.order_payment_type
      when v_credit > 0 then 'hybrid'::public.order_payment_type
      else 'stripe'::public.order_payment_type
    end,
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- fulfill_credit_only_order
-- ---------------------------------------------------------------------------
create or replace function public.fulfill_credit_only_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_credit numeric(12, 2);
  v_total numeric(12, 2);
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

  v_credit := public.order_credit_paid(v_order);
  v_total := public.order_total_amount(v_order);

  if v_credit <> v_total then
    raise exception using errcode = 'P0001', message = 'NOT_CREDIT_ONLY_ORDER';
  end if;

  return public.fulfill_slot_purchase(p_order_id, null);
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_break_and_refund — uses order_items for slot + order lookup
-- ---------------------------------------------------------------------------
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
  v_total numeric(12, 2);
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
    select distinct o.*
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    where o.status = 'pending'
      and (o.break_id = p_break_id or oi.break_id = p_break_id)
    for update of o
  loop
    perform public.cancel_pending_order(v_order.id);
  end loop;

  for v_order in
    select distinct o.*
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.status = 'paid'
      and oi.break_id = p_break_id
    for update of o
  loop
    v_total := public.order_total_amount(v_order);

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
      'Break cancelled — full purchase amount credited to wallet'
    );

    update public.break_slots bs
    set
      status = 'refunded',
      updated_at = now()
    from public.order_items oi
    where oi.order_id = v_order.id
      and oi.break_id = p_break_id
      and bs.id = coalesce(oi.slot_id, v_order.slot_id)
      and bs.status = 'sold';

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

grant execute on function public.create_checkout_order(uuid, uuid, uuid, numeric) to service_role;
grant execute on function public.release_order_credit(uuid) to service_role;
grant execute on function public.fulfill_credit_only_order(uuid) to service_role;
grant execute on function public.cancel_break_and_refund(uuid) to service_role;
