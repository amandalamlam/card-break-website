-- Card Break Platform — Initial Schema (Phase 1)
-- Run this entire file in Supabase: SQL Editor → New query → Run

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.break_status as enum ('active', 'sold_out', 'completed', 'cancelled');
create type public.slot_status as enum ('available', 'locked', 'sold', 'refunded');
create type public.shipping_request_status as enum ('pending', 'completed');
create type public.withdrawal_method as enum ('FPS', 'PayMe', 'PayPal');
create type public.withdrawal_status as enum ('pending', 'completed', 'rejected');
create type public.user_role as enum ('user', 'admin');

-- ---------------------------------------------------------------------------
-- Profiles (extends Supabase auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  phone text not null,
  store_credit numeric(12, 2) not null default 0.00 check (store_credit >= 0),
  credit_reserved numeric(12, 2) not null default 0.00 check (credit_reserved >= 0),
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.credit_reserved is
  'Store credit temporarily held during 8-minute checkout lock (Phase 6).';

-- Auto-create profile row when a user signs up (Phase 2 will collect phone)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Breaks
-- ---------------------------------------------------------------------------
create table public.breaks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text,
  status public.break_status not null default 'active',
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint breaks_completed_requires_video check (
    status <> 'completed' or (video_url is not null and length(trim(video_url)) > 0)
  )
);

-- ---------------------------------------------------------------------------
-- Break slots
-- ---------------------------------------------------------------------------
create table public.break_slots (
  id uuid primary key default gen_random_uuid(),
  break_id uuid not null references public.breaks (id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  status public.slot_status not null default 'available',
  user_id uuid references public.profiles (id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (break_id, name)
);

create index break_slots_break_id_idx on public.break_slots (break_id);
create index break_slots_status_idx on public.break_slots (status);
create index break_slots_locked_at_idx on public.break_slots (locked_at)
  where status = 'locked';

-- ---------------------------------------------------------------------------
-- Shipping options (soft-disable only — never hard delete)
-- ---------------------------------------------------------------------------
create table public.shipping_options (
  id bigserial primary key,
  name text not null,
  instructions text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Shipping requests
-- ---------------------------------------------------------------------------
create table public.shipping_requests (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  break_id uuid not null references public.breaks (id) on delete cascade,
  slot_names_snapshot text not null,
  option_name text not null,
  shipping_details text not null default '',
  status public.shipping_request_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, break_id)
);

-- ---------------------------------------------------------------------------
-- Withdrawals
-- ---------------------------------------------------------------------------
create table public.withdrawals (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  method public.withdrawal_method not null,
  details text not null,
  status public.withdrawal_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index withdrawals_user_id_idx on public.withdrawals (user_id);
create index withdrawals_status_idx on public.withdrawals (status);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger breaks_updated_at before update on public.breaks
  for each row execute function public.set_updated_at();
create trigger break_slots_updated_at before update on public.break_slots
  for each row execute function public.set_updated_at();
create trigger shipping_options_updated_at before update on public.shipping_options
  for each row execute function public.set_updated_at();
create trigger shipping_requests_updated_at before update on public.shipping_requests
  for each row execute function public.set_updated_at();
create trigger withdrawals_updated_at before update on public.withdrawals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.breaks enable row level security;
alter table public.break_slots enable row level security;
alter table public.shipping_options enable row level security;
alter table public.shipping_requests enable row level security;
alter table public.withdrawals enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- BREAKS (public read for browsing)
create policy "Anyone can view breaks"
  on public.breaks for select
  using (true);

create policy "Admins manage breaks"
  on public.breaks for all
  using (public.is_admin())
  with check (public.is_admin());

-- BREAK SLOTS (public read)
create policy "Anyone can view break slots"
  on public.break_slots for select
  using (true);

create policy "Admins manage break slots"
  on public.break_slots for all
  using (public.is_admin())
  with check (public.is_admin());

-- Authenticated users will lock slots via server API (service role) in Phase 4.
-- Direct client updates to slots are blocked for non-admins.

-- SHIPPING OPTIONS (public read active only)
create policy "Anyone can view active shipping options"
  on public.shipping_options for select
  using (is_active = true);

create policy "Admins manage shipping options"
  on public.shipping_options for all
  using (public.is_admin())
  with check (public.is_admin());

-- SHIPPING REQUESTS
create policy "Users can read own shipping requests"
  on public.shipping_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert own shipping requests"
  on public.shipping_requests for insert
  with check (auth.uid() = user_id);

create policy "Admins manage all shipping requests"
  on public.shipping_requests for all
  using (public.is_admin())
  with check (public.is_admin());

-- WITHDRAWALS
create policy "Users can read own withdrawals"
  on public.withdrawals for select
  using (auth.uid() = user_id);

create policy "Users can insert own withdrawals"
  on public.withdrawals for insert
  with check (auth.uid() = user_id);

create policy "Admins manage all withdrawals"
  on public.withdrawals for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed data (test break + shipping options)
-- ---------------------------------------------------------------------------
insert into public.breaks (title, description, image_url, status)
values (
  '2026 NBA Prizm Hobby Box #01',
  '30-team break · Live reveal on Instagram · Shipping after break completes.',
  null,
  'active'
);

insert into public.break_slots (break_id, name, price, status)
select b.id, slot.name, slot.price, 'available'
from public.breaks b
cross join (
  values
    ('Lakers', 300.00),
    ('Celtics', 300.00),
    ('Warriors', 280.00),
    ('Bucks', 250.00),
    ('Nuggets', 250.00)
) as slot(name, price)
where b.title = '2026 NBA Prizm Hobby Box #01';

insert into public.shipping_options (name, instructions, is_active)
values
  (
    'Hold for Next Shipping',
    'We will hold your cards until the next batch shipment. No payment required now.',
    true
  ),
  (
    'SF Express Collect (順豐到付)',
    'Enter your SF locker code or pickup details. Freight is collect-on-delivery.',
    true
  ),
  (
    'In-Person Pickup',
    'Pick up in Hong Kong. We will contact you to arrange time.',
    true
  ),
  (
    'International Shipping',
    'Enter your full English address including postal/zip code.',
    true
  );
