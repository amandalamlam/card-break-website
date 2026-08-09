-- Phase 8: Post-break shipping (delivery intent submission)
-- Run in Supabase SQL Editor after phase7_withdrawals.sql
-- Tables shipping_options / shipping_requests already exist in schema.sql

-- ---------------------------------------------------------------------------
-- Slot snapshot for admin packing list
-- ---------------------------------------------------------------------------
create or replace function public.build_user_break_slot_snapshot(
  p_user_id uuid,
  p_break_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select string_agg(distinct slot_name, ', ' order by slot_name)
      from (
        select oi.position_name as slot_name
        from public.orders o
        join public.order_items oi on oi.order_id = o.id
        where o.user_id = p_user_id
          and o.status = 'paid'
          and oi.break_id = p_break_id
        union
        select bs.name as slot_name
        from public.orders o
        join public.break_slots bs on bs.id = o.slot_id
        where o.user_id = p_user_id
          and o.status = 'paid'
          and o.break_id = p_break_id
          and not exists (
            select 1 from public.order_items oi where oi.order_id = o.id
          )
      ) slots
      where slot_name is not null and length(trim(slot_name)) > 0
    ),
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- User submit (idempotent — one request per user per break)
-- ---------------------------------------------------------------------------
create or replace function public.submit_shipping_request(
  p_user_id uuid,
  p_break_id uuid,
  p_shipping_option_id bigint,
  p_shipping_details text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_break public.breaks%rowtype;
  v_option public.shipping_options%rowtype;
  v_snapshot text;
  v_details text;
  v_request_id bigint;
begin
  v_details := left(trim(coalesce(p_shipping_details, '')), 4000);

  if length(v_details) = 0 then
    raise exception using errcode = 'P0001', message = 'MISSING_SHIPPING_DETAILS';
  end if;

  if exists (
    select 1 from public.shipping_requests
    where user_id = p_user_id and break_id = p_break_id
  ) then
    raise exception using errcode = 'P0001', message = 'SHIPPING_ALREADY_REQUESTED';
  end if;

  select * into v_break from public.breaks where id = p_break_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'BREAK_NOT_FOUND';
  end if;

  if v_break.status <> 'completed'::public.break_status then
    raise exception using errcode = 'P0001', message = 'BREAK_NOT_COMPLETED';
  end if;

  v_snapshot := public.build_user_break_slot_snapshot(p_user_id, p_break_id);
  if v_snapshot = '' then
    raise exception using errcode = 'P0001', message = 'NO_PAID_SLOTS';
  end if;

  select * into v_option
  from public.shipping_options
  where id = p_shipping_option_id and is_active = true;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_SHIPPING_OPTION';
  end if;

  insert into public.shipping_requests (
    user_id,
    break_id,
    slot_names_snapshot,
    option_name,
    shipping_details,
    status
  )
  values (
    p_user_id,
    p_break_id,
    v_snapshot,
    v_option.name,
    v_details,
    'pending'::public.shipping_request_status
  )
  returning id into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'SHIPPING_ALREADY_REQUESTED';
end;
$$;

revoke all on function public.build_user_break_slot_snapshot(uuid, uuid) from public;
revoke all on function public.submit_shipping_request(uuid, uuid, bigint, text) from public;
grant execute on function public.build_user_break_slot_snapshot(uuid, uuid) to service_role;
grant execute on function public.submit_shipping_request(uuid, uuid, bigint, text) to service_role;
