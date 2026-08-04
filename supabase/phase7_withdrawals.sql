-- Phase 7: Withdrawals (cash out request + admin approve/reject)
-- Run in Supabase SQL Editor after phase6b_wallet_relational.sql

-- ---------------------------------------------------------------------------
-- Ledger types for withdrawal escrow
-- ---------------------------------------------------------------------------
alter type public.credit_transaction_type add value if not exists 'withdrawal';
alter type public.credit_transaction_type add value if not exists 'withdrawal_reversal';

alter table public.wallet_transactions
  add column if not exists withdrawal_id bigint references public.withdrawals (id) on delete set null;

create index if not exists wallet_transactions_withdrawal_id_idx
  on public.wallet_transactions (withdrawal_id);

-- ---------------------------------------------------------------------------
-- Submit withdrawal: deduct store_credit immediately, create pending request
-- ---------------------------------------------------------------------------
create or replace function public.submit_withdrawal(
  p_user_id uuid,
  p_amount numeric,
  p_method public.withdrawal_method,
  p_details text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_amount numeric(12, 2);
  v_withdrawal_id bigint;
begin
  v_amount := round(coalesce(p_amount, 0), 2);

  if v_amount <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_AMOUNT';
  end if;

  if coalesce(trim(p_details), '') = '' then
    raise exception using errcode = 'P0001', message = 'MISSING_DETAILS';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;

  if v_amount > v_profile.store_credit then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_CREDIT';
  end if;

  update public.profiles
  set store_credit = store_credit - v_amount
  where id = p_user_id;

  insert into public.withdrawals (user_id, amount, method, details, status)
  values (p_user_id, v_amount, p_method, trim(p_details), 'pending')
  returning id into v_withdrawal_id;

  insert into public.wallet_transactions (
    user_id,
    withdrawal_id,
    amount,
    type,
    description
  )
  values (
    p_user_id,
    v_withdrawal_id,
    -v_amount,
    'withdrawal',
    'Cash out request (' || p_method::text || ') — pending admin approval'
  );

  return v_withdrawal_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- User cancel: restore credit for a pending withdrawal owned by the user
-- ---------------------------------------------------------------------------
create or replace function public.cancel_withdrawal(
  p_user_id uuid,
  p_withdrawal_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  select *
  into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'WITHDRAWAL_NOT_FOUND';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'WITHDRAWAL_NOT_PENDING';
  end if;

  update public.profiles
  set store_credit = store_credit + v_withdrawal.amount
  where id = p_user_id;

  update public.withdrawals
  set status = 'rejected'
  where id = p_withdrawal_id;

  insert into public.wallet_transactions (
    user_id,
    withdrawal_id,
    amount,
    type,
    description
  )
  values (
    p_user_id,
    p_withdrawal_id,
    v_withdrawal.amount,
    'withdrawal_reversal',
    'Cash out request cancelled by user'
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin complete: mark paid offline; credit was already deducted on submit
-- ---------------------------------------------------------------------------
create or replace function public.complete_withdrawal(
  p_withdrawal_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  select *
  into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'WITHDRAWAL_NOT_FOUND';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'WITHDRAWAL_NOT_PENDING';
  end if;

  update public.withdrawals
  set status = 'completed'
  where id = p_withdrawal_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin reject: restore credit to user wallet
-- ---------------------------------------------------------------------------
create or replace function public.reject_withdrawal(
  p_withdrawal_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  select *
  into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'WITHDRAWAL_NOT_FOUND';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'WITHDRAWAL_NOT_PENDING';
  end if;

  update public.profiles
  set store_credit = store_credit + v_withdrawal.amount
  where id = v_withdrawal.user_id;

  update public.withdrawals
  set status = 'rejected'
  where id = p_withdrawal_id;

  insert into public.wallet_transactions (
    user_id,
    withdrawal_id,
    amount,
    type,
    description
  )
  values (
    v_withdrawal.user_id,
    p_withdrawal_id,
    v_withdrawal.amount,
    'withdrawal_reversal',
    'Cash out request rejected — credit restored'
  );

  return true;
end;
$$;
