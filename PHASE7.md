# Phase 7 — Withdrawals (Cash Out)

**Goal:** Users can request cash out from wallet credit; admin pays offline and completes or rejects requests with automatic escrow.

---

## What was built

- **Escrow RPCs** — submit deducts `store_credit` immediately; reject/cancel restores credit; complete marks paid offline
- **Wallet ledger** — `withdrawal` and `withdrawal_reversal` transaction types
- **Account UI** — subtle **Request cash out** link on My Account → dedicated `/account/withdraw` page with form + history
- **Admin UI** — `/admin/withdrawals` pending queue with Complete / Reject actions
- **API routes** — user submit/cancel + admin complete/reject (session-scoped, rate-limited)

---

## Step 1 — Run SQL migration

Supabase → **SQL Editor** → run:

```text
supabase/phase7_withdrawals.sql
```

This adds ledger types, `withdrawal_id` on `wallet_transactions`, and RPCs:

- `submit_withdrawal`
- `cancel_withdrawal`
- `complete_withdrawal`
- `reject_withdrawal`

---

## Step 2 — Test user cash out

1. Give a test user wallet credit (`profiles.store_credit`, e.g. `500.00`)
2. Log in → **My Account** → click **Request cash out** (beside available balance)
3. On `/account/withdraw`, enter amount, method (FPS / PayMe / PayPal), recipient details → Submit
4. Confirm:
   - Available balance drops immediately
   - Withdrawal appears as **Pending**
   - Wallet activity shows a **Cash out request** debit

---

## Step 3 — Test admin approve / reject

1. Log in as admin → **Admin → Withdrawals** (or `/admin/withdrawals`)
2. **Complete:** after paying the user offline, click **Complete withdrawal**
   - Status → Completed; balance stays deducted (escrow released)
3. **Reject:** click **Reject** on a pending request
   - Status → Rejected; credit restored to user wallet
   - Wallet activity shows **Cash out reversal**

---

## Step 4 — Test user cancel

1. Submit a pending withdrawal as a user
2. Click **Cancel request** before admin action
3. Credit should return to wallet; status → Rejected

---

## Escrow rules

| Action | `store_credit` | `withdrawals.status` |
|--------|----------------|----------------------|
| Submit | Deduct immediately | `pending` |
| Admin complete | Stays deducted | `completed` |
| Admin reject | Restored | `rejected` |
| User cancel | Restored | `rejected` |

---

## Rate limit

Users may submit at most **3 withdrawal requests per hour** (API returns `429`).

---

## Routes

| Route | Purpose |
|-------|---------|
| `POST /api/withdrawal/submit` | User cash out request |
| `POST /api/withdrawal/cancel` | User cancel pending request |
| `POST /api/admin/withdrawals/complete` | Admin mark paid |
| `POST /api/admin/withdrawals/reject` | Admin reject + restore credit |
| `/[locale]/admin/withdrawals` | Admin dashboard |

---

## Next phase

**Phase 8 — Post-break shipping** (delivery option submission after break completes)

When Phase 7 is working, reply: **"Phase 7 is working"**
