-- Phase 8: Dual-path checkout (Buy Now 1min + Cart 5min)
-- Run after phase6c_checkout_credit_release.sql

-- ---------------------------------------------------------------------------
-- Enums & columns
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'slot_lock_type') then
    create type public.slot_lock_type as enum ('buy_now', 'cart');
  end if;
  if not exists (select 1 from pg_type where typname = 'cart_status') then
    create type public.cart_status as enum ('active', 'checkout', 'expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'checkout_mode') then
    create type public.checkout_mode as enum ('buy_now', 'cart');
  end if;
end $$;

alter table public.break_slots
  add column if not exists lock_type public.slot_lock_type,
  add column if not exists lock_expires_at timestamptz;

alter table public.orders
  add column if not exists checkout_mode public.checkout_mode,
  add column if not exists cart_id uuid;

-- Backfill legacy locks
update public.break_slots
set
  lock_expires_at = coalesce(lock_expires_at, locked_at + interval '8 minutes'),
  lock_type = coalesce(lock_type, 'buy_now'::public.slot_lock_type)
where status = 'locked' and locked_at is not null;

-- ---------------------------------------------------------------------------
-- carts & cart_items
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  status public.cart_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists carts_user_id_idx on public.carts (user_id, status);
create unique index if not exists carts_one_active_per_user_idx
  on public.carts (user_id) where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  break_id uuid not null references public.breaks (id) on delete cascade,
  slot_id uuid not null references public.break_slots (id) on delete cascade,
  break_title text not null,
  position_name text not null,
  price numeric(12, 2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  unique (cart_id, slot_id)
);

create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists cart_items_slot_id_idx on public.cart_items (slot_id);

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

drop policy if exists "Users read own carts" on public.carts;
create policy "Users read own carts"
  on public.carts for select using (auth.uid() = user_id);

drop policy if exists "Users read own cart items" on public.cart_items;
create policy "Users read own cart items"
  on public.cart_items for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.slot_lock_is_active(p_slot public.break_slots)
returns boolean
language sql
stable
as $$
  select
    p_slot.status = 'locked'
    and p_slot.lock_expires_at is not null
    and p_slot.lock_expires_at > now();
$$;

create or replace function public.release_slot_hold(p_slot_id uuid)
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
    lock_type = null,
    lock_expires_at = null,
    updated_at = now()
  where id = p_slot_id and status = 'locked';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

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

-- ---------------------------------------------------------------------------
-- Expired locks & carts
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_carts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart record;
  v_item record;
  v_count integer := 0;
begin
  for v_cart in
    select * from public.carts
    where status = 'active' and expires_at <= now()
    for update
  loop
    for v_item in
      select * from public.cart_items where cart_id = v_cart.id
    loop
      perform public.release_pending_orders_for_slot(v_item.slot_id, v_cart.user_id);
      perform public.release_slot_hold(v_item.slot_id);
    end loop;

    update public.carts
    set status = 'expired', updated_at = now()
    where id = v_cart.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

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
  perform public.release_expired_carts();

  for v_slot in
    select id, user_id
    from public.break_slots
    where
      status = 'locked'
      and lock_expires_at is not null
      and lock_expires_at <= now()
  loop
    perform public.release_pending_orders_for_slot(v_slot.id, v_slot.user_id);
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
    and lock_expires_at is not null
    and lock_expires_at <= now();

  get diagnostics released_count = row_count;
  return released_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Buy Now lock (1 minute) — isolated from cart
-- ---------------------------------------------------------------------------
create or replace function public.lock_slot_buy_now(
  p_slot_id uuid,
  p_user_id uuid,
  p_duration_minutes integer default 1
)
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

  select * into v_slot from public.break_slots where id = p_slot_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'SLOT_NOT_FOUND';
  end if;

  select * into v_break from public.breaks where id = v_slot.break_id;
  if v_break.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'BREAK_NOT_ACTIVE';
  end if;

  if v_slot.status = 'sold' then
    raise exception using errcode = 'P0001', message = 'SLOT_ALREADY_SOLD';
  end if;

  if v_slot.status = 'refunded' then
    raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
  end if;

  if public.slot_lock_is_active(v_slot) then
    if v_slot.lock_type = 'buy_now'::public.slot_lock_type and v_slot.user_id = p_user_id then
      return query
      select v_slot.id, v_slot.break_id, v_slot.locked_at, v_slot.lock_expires_at;
      return;
    end if;
    raise exception using errcode = 'P0001', message = 'SLOT_LOCKED_BY_OTHER';
  end if;

  if v_slot.status = 'locked' then
    perform public.release_pending_orders_for_slot(v_slot.id, v_slot.user_id);
    perform public.release_slot_hold(v_slot.id);
    select * into v_slot from public.break_slots where id = p_slot_id for update;
  end if;

  v_expires_at := now() + make_interval(mins => greatest(p_duration_minutes, 1));

  update public.break_slots
  set
    status = 'locked',
    user_id = p_user_id,
    locked_at = now(),
    lock_type = 'buy_now'::public.slot_lock_type,
    lock_expires_at = v_expires_at,
    updated_at = now()
  where id = p_slot_id
  returning * into v_slot;

  return query select v_slot.id, v_slot.break_id, v_slot.locked_at, v_expires_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cart: add item (sync to cart expires_at)
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
  -- Expire stale carts only; avoid global slot sweep that can abort on wallet cleanup.
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

-- ---------------------------------------------------------------------------
-- Cart: remove item — immediate release
-- ---------------------------------------------------------------------------
create or replace function public.remove_cart_item(
  p_user_id uuid,
  p_cart_item_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.cart_items%rowtype;
  v_remaining integer;
begin
  select * into v_item
  from public.cart_items
  where id = p_cart_item_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'CART_ITEM_NOT_FOUND';
  end if;

  perform public.release_pending_orders_for_slot(v_item.slot_id, p_user_id);
  perform public.release_slot_hold(v_item.slot_id);

  delete from public.cart_items where id = p_cart_item_id;

  select count(*) into v_remaining from public.cart_items where cart_id = v_item.cart_id;

  if v_remaining = 0 then
    update public.carts set status = 'expired', updated_at = now() where id = v_item.cart_id;
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Buy Now checkout order (requires buy_now lock)
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

  select * into v_slot from public.break_slots where id = p_slot_id and break_id = p_break_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'SLOT_NOT_FOUND'; end if;

  select * into v_break from public.breaks where id = p_break_id;
  if v_break.status <> 'active' then raise exception using errcode = 'P0001', message = 'BREAK_NOT_ACTIVE'; end if;

  if v_slot.status <> 'locked'
    or v_slot.user_id is distinct from p_user_id
    or v_slot.lock_type is distinct from 'buy_now'::public.slot_lock_type
    or not public.slot_lock_is_active(v_slot) then
    raise exception using errcode = 'P0001', message = 'SLOT_LOCK_EXPIRED';
  end if;

  v_total := v_slot.price;
  if v_credit > v_total then raise exception using errcode = 'P0001', message = 'CREDIT_EXCEEDS_PRICE'; end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if v_credit > v_profile.store_credit then raise exception using errcode = 'P0001', message = 'INSUFFICIENT_CREDIT'; end if;

  v_stripe := greatest(v_total - v_credit, 0);
  v_payment_type := case
    when v_credit >= v_total then 'credit'::public.order_payment_type
    when v_credit > 0 then 'hybrid'::public.order_payment_type
    else 'stripe'::public.order_payment_type
  end;

  if v_credit > 0 then
    update public.profiles
    set store_credit = store_credit - v_credit, credit_reserved = credit_reserved + v_credit, updated_at = now()
    where id = p_user_id;
  end if;

  insert into public.orders (
    user_id, break_id, slot_id, amount, credit_amount, total_amount, credit_paid, stripe_paid,
    payment_type, currency, status, checkout_mode
  )
  values (
    p_user_id, p_break_id, p_slot_id, v_total, v_credit, v_total, v_credit, v_stripe,
    v_payment_type, 'hkd', 'pending', 'buy_now'::public.checkout_mode
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, break_id, slot_id, break_title, position_name, price)
  values (v_order_id, p_break_id, p_slot_id, v_break.title, v_slot.name, v_total);

  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cart checkout order (multi order_items)
-- ---------------------------------------------------------------------------
create or replace function public.create_cart_checkout_order(
  p_user_id uuid,
  p_credit_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart public.carts%rowtype;
  v_item record;
  v_profile public.profiles%rowtype;
  v_order_id uuid;
  v_credit numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_stripe numeric(12, 2);
  v_payment_type public.order_payment_type;
  v_slot public.break_slots%rowtype;
  v_first_break_id uuid;
  v_first_slot_id uuid;
begin
  perform public.release_expired_slot_locks();

  select * into v_cart from public.carts where user_id = p_user_id and status = 'active' for update;
  if not found then raise exception using errcode = 'P0001', message = 'CART_EMPTY'; end if;
  if v_cart.expires_at <= now() then raise exception using errcode = 'P0001', message = 'CART_EXPIRED'; end if;

  if not exists (select 1 from public.cart_items where cart_id = v_cart.id) then
    raise exception using errcode = 'P0001', message = 'CART_EMPTY';
  end if;

  for v_item in select * from public.cart_items where cart_id = v_cart.id order by created_at
  loop
    select * into v_slot from public.break_slots where id = v_item.slot_id for update;
    if v_slot.status <> 'locked'
      or v_slot.user_id is distinct from p_user_id
      or v_slot.lock_type is distinct from 'cart'::public.slot_lock_type
      or not public.slot_lock_is_active(v_slot) then
      raise exception using errcode = 'P0001', message = 'SLOT_LOCK_EXPIRED';
    end if;
    v_total := v_total + v_item.price;
    if v_first_break_id is null then
      v_first_break_id := v_item.break_id;
      v_first_slot_id := v_item.slot_id;
    end if;
  end loop;

  v_credit := round(coalesce(p_credit_amount, 0), 2);
  if v_credit > v_total then raise exception using errcode = 'P0001', message = 'CREDIT_EXCEEDS_PRICE'; end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if v_credit > v_profile.store_credit then raise exception using errcode = 'P0001', message = 'INSUFFICIENT_CREDIT'; end if;

  v_stripe := greatest(v_total - v_credit, 0);
  v_payment_type := case
    when v_credit >= v_total then 'credit'::public.order_payment_type
    when v_credit > 0 then 'hybrid'::public.order_payment_type
    else 'stripe'::public.order_payment_type
  end;

  if v_credit > 0 then
    update public.profiles
    set store_credit = store_credit - v_credit, credit_reserved = credit_reserved + v_credit, updated_at = now()
    where id = p_user_id;
  end if;

  insert into public.orders (
    user_id, break_id, slot_id, amount, credit_amount, total_amount, credit_paid, stripe_paid,
    payment_type, currency, status, checkout_mode, cart_id
  )
  values (
    p_user_id, v_first_break_id, v_first_slot_id, v_total, v_credit, v_total, v_credit, v_stripe,
    v_payment_type, 'hkd', 'pending', 'cart'::public.checkout_mode, v_cart.id
  )
  returning id into v_order_id;

  for v_item in select * from public.cart_items where cart_id = v_cart.id order by created_at
  loop
    insert into public.order_items (order_id, break_id, slot_id, break_title, position_name, price)
    values (v_order_id, v_item.break_id, v_item.slot_id, v_item.break_title, v_item.position_name, v_item.price);
  end loop;

  update public.carts set status = 'checkout', updated_at = now() where id = v_cart.id;

  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_pending_order — release credit + slots
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
-- release_slot_lock (manual) — buy_now or cart item owned by user
-- ---------------------------------------------------------------------------
create or replace function public.release_slot_lock(p_slot_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.release_pending_orders_for_slot(p_slot_id, p_user_id);
  return public.release_slot_hold(p_slot_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- lock_break_slot — legacy alias → buy_now
-- ---------------------------------------------------------------------------
create or replace function public.lock_break_slot(p_slot_id uuid, p_user_id uuid)
returns table (slot_id uuid, break_id uuid, locked_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query select * from public.lock_slot_buy_now(p_slot_id, p_user_id, 1);
end;
$$;

revoke all on function public.lock_slot_buy_now(uuid, uuid, integer) from public;
revoke all on function public.add_slot_to_cart(uuid, uuid, uuid, integer) from public;
revoke all on function public.remove_cart_item(uuid, uuid) from public;
revoke all on function public.create_cart_checkout_order(uuid, numeric) from public;
revoke all on function public.release_expired_carts() from public;
revoke all on function public.release_slot_hold(uuid) from public;
revoke all on function public.release_order_slots(uuid) from public;

grant execute on function public.lock_slot_buy_now(uuid, uuid, integer) to service_role;
grant execute on function public.add_slot_to_cart(uuid, uuid, uuid, integer) to service_role;
grant execute on function public.remove_cart_item(uuid, uuid) to service_role;
grant execute on function public.create_cart_checkout_order(uuid, numeric) to service_role;
grant execute on function public.release_expired_carts() to service_role;
grant execute on function public.release_slot_hold(uuid) to service_role;
grant execute on function public.release_order_slots(uuid) to service_role;
