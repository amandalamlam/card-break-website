-- Phase 5: Orders table + atomic slot fulfillment for Stripe payments
-- Run in Supabase SQL Editor after phase4_slot_locking.sql

create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  break_id uuid not null references public.breaks (id) on delete cascade,
  slot_id uuid not null references public.break_slots (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'hkd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_slot_id_idx on public.orders (slot_id);
create index orders_status_idx on public.orders (status);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

create policy "Users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Admins can read all orders"
  on public.orders for select
  using (public.is_admin());

-- Inserts/updates happen via service role in API routes and webhooks.

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

  update public.orders
  set
    status = 'paid',
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    updated_at = now()
  where id = p_order_id;

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
  update public.orders
  set status = 'cancelled', updated_at = now()
  where id = p_order_id and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.fulfill_slot_purchase(uuid, text) from public;
revoke all on function public.cancel_pending_order(uuid) from public;

grant execute on function public.fulfill_slot_purchase(uuid, text) to service_role;
grant execute on function public.cancel_pending_order(uuid) to service_role;
