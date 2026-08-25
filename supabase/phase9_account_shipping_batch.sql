-- Phase 9: Batch user shipping breaks (account N+1 fix)
-- Run in Supabase SQL Editor after prior phase migrations.

create or replace function public.get_user_shipping_breaks(p_user_id uuid)
returns table (
  break_id uuid,
  title text,
  video_url text,
  slot_names text
)
language sql
stable
security definer
set search_path = public
as $$
  with paid_order_items as (
    select oi.break_id, oi.position_name as slot_name
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = p_user_id
      and o.status = 'paid'
      and oi.break_id is not null
  ),
  paid_legacy_slots as (
    select o.break_id, bs.name as slot_name
    from public.orders o
    join public.break_slots bs on bs.id = o.slot_id
    where o.user_id = p_user_id
      and o.status = 'paid'
      and o.break_id is not null
      and not exists (
        select 1 from public.order_items oi where oi.order_id = o.id
      )
  ),
  all_slots as (
    select break_id, slot_name from paid_order_items
    union
    select break_id, slot_name from paid_legacy_slots
  ),
  aggregated as (
    select
      s.break_id,
      string_agg(distinct s.slot_name, ', ' order by s.slot_name) as slot_names
    from all_slots s
    where s.slot_name is not null and length(trim(s.slot_name)) > 0
    group by s.break_id
  )
  select
    b.id as break_id,
    b.title,
    b.video_url,
    a.slot_names
  from public.breaks b
  inner join aggregated a on a.break_id = b.id
  where b.status = 'completed'::public.break_status
  order by b.created_at desc;
$$;

revoke all on function public.get_user_shipping_breaks(uuid) from public;
grant execute on function public.get_user_shipping_breaks(uuid) to service_role;
