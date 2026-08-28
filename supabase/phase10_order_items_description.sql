-- Phase 10: Multi-line order item descriptions for wallet history
-- Run in Supabase SQL Editor after prior phase migrations.

create or replace function public.format_order_items_description(p_order_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with ordered as (
    select
      oi.break_title,
      oi.position_name,
      row_number() over (order by oi.created_at, oi.id) as item_ord
    from public.order_items oi
    where oi.order_id = p_order_id
  ),
  per_break as (
    select
      break_title,
      string_agg(position_name, ', ' order by min_ord) as slot_list,
      min(min_ord) as break_ord
    from (
      select break_title, position_name, min(item_ord) as min_ord
      from ordered
      where length(trim(position_name)) > 0
      group by break_title, position_name
    ) slots
    group by break_title
  )
  select coalesce(
    string_agg(break_title || ' (' || slot_list || ')', E'\n' order by break_ord),
    ''
  )
  from per_break;
$$;

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
  v_description text;
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
  v_description := public.format_order_items_description(p_order_id);

  if v_description = '' then
    v_description := 'Store credit applied to slot purchase';
  end if;

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
      lock_expires_at = null,
      lock_type = null,
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
      v_description
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

revoke all on function public.format_order_items_description(uuid) from public;
grant execute on function public.format_order_items_description(uuid) to service_role;
