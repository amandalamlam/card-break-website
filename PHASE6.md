# Phase 6 — Wallet & Store Credit

**Goal:** On-site wallet for cancellation refunds, spending credit at checkout, and mixed payments (credit + Stripe).

---

## What was built

- **`store_credit`** wallet on each user profile (already in schema)
- **`credit_reserved`** — credit frozen during pending checkout
- **`credit_transactions`** ledger (refunds, purchases, releases)
- **Checkout wallet UI** — apply credit, mixed payment, or 100% credit (instant, no Stripe)
- **Admin cancel break** — refunds 100% of paid orders to user wallets (no Stripe refund)
- **Account page** — available balance, reserved amount, recent wallet activity

---

## Step 1 — Run SQL migrations

Supabase → **SQL Editor** → run in order:

1. `supabase/phase6_wallet.sql`
2. `supabase/phase6b_wallet_relational.sql` — order_items, wallet_transactions, payment breakdown

---

## Step 2 — Test wallet spending at checkout

1. Give a test user wallet credit (Supabase → **Table Editor** → `profiles` → set `store_credit` e.g. `300.00`)
2. Log in as that user → lock a slot → go to checkout
3. You should see **可用錢包餘額** and options to apply credit
4. **Full credit:** if balance ≥ slot price, click **使用餘額立即確認** → instant success (no Stripe)
5. **Mixed:** apply partial credit → remainder goes to Stripe
6. **Stripe only:** leave credit at 0 → same as Phase 5

Verify in Supabase:
- `orders.credit_amount` matches what was applied
- `profiles.store_credit` reduced; `credit_reserved` cleared after payment
- `credit_transactions` row for purchase

---

## Step 3 — Test cancellation refund (流局)

1. User A purchases a slot (Stripe or wallet)
2. Log in as **admin** → `/admin/breaks`
3. Click **取消開箱（流局退款）** on the break
4. Confirm the dialog

Verify:
- Break `status = cancelled`
- Sold slots → `refunded`
- User A's `store_credit` increased by **full order amount** (100%, including any Stripe portion)
- `credit_transactions` row with type `cancellation_refund`

User A can now spend that credit on another break.

---

## Step 4 — Test reserved credit release

If a user starts checkout with credit applied but Stripe session expires:

1. Apply credit and start Stripe checkout
2. Abandon / let session expire (or use Stripe test mode cancel)

Verify:
- `orders.status = cancelled`
- Reserved credit returned to `store_credit`
- `credit_transactions` row with type `checkout_release`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Wallet section not showing | Run `phase6_wallet.sql`; ensure `store_credit > 0` on profile |
| `create_checkout_order does not exist` | Run SQL migration |
| Cancel break fails | Break must be `active` or `sold_out` (not `completed`) |
| Credit not released after Stripe cancel | Webhook must fire `checkout.session.expired` (use Stripe CLI locally) |

---

## When Phase 6 is done, tell me:

> **"Phase 6 is working"**

Next: **Phase 7 — Withdrawals (cash out request + admin approve/reject)**
