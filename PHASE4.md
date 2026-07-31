# Phase 4 — 8-Minute Slot Locking

**Goal:** When a logged-in user starts checkout, lock the slot exclusively for 8 minutes with database row-level locking.

---

## What was built

- PostgreSQL functions: `lock_break_slot`, `release_slot_lock`, `release_expired_slot_locks`
- `SELECT FOR UPDATE` prevents two users locking the same slot at the same millisecond
- Checkout page auto-locks on load and shows a live **MM:SS countdown**
- Expired locks auto-release via Vercel Cron (every minute)
- Error UI when slot is sold or locked by someone else

---

## Step 1 — Run the SQL migration (required)

1. Open Supabase → **SQL Editor** → **New query**
2. Copy all of `supabase/phase4_slot_locking.sql`
3. Click **Run**

You should see **Success**.

---

## Step 2 — Add CRON_SECRET

Generate a random string (e.g. `openssl rand -hex 32`).

**Local `.env.local`:**
```env
CRON_SECRET=your-random-secret-here
```

**Vercel → Settings → Environment Variables:**
- Key: `CRON_SECRET`
- Value: same random string
- Environments: Production + Preview

Redeploy after adding.

---

## Step 3 — Pull code and run locally

```bash
cd /Users/amanda/Desktop/card-break-website
git pull
npm install
npm run dev
```

---

## Step 4 — Test the lock flow

### A. Basic lock + countdown

1. Log in
2. Open a break → click **Checkout** on an **Available** slot
3. You should see **你的位置已鎖定** with a countdown from ~8:00
4. Go back to the break page → that slot should show **鎖定中 / Locked**

### B. Same user refresh (resume lock)

1. While countdown is active, refresh the checkout page
2. Timer should continue from the **same** `locked_at` (not reset to 8:00)

### C. Another user blocked

1. Open an incognito window with a **second account**
2. Try to checkout the **same slot** while User A's timer is running
3. User B should see: **另一位用戶正在結帳此位置**

### D. Expiry

1. Wait for countdown to hit **00:00** (or test with a short lock in dev)
2. Slot returns to **可購買 / Available** on the break page

---

## Step 5 — Deploy

```bash
git add .
git commit -m "Phase 4: 8-minute slot locking with countdown and cron release"
git push
```

`vercel.json` configures a cron job at `/api/cron/release-locks` every minute.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `function lock_break_slot does not exist` | Run `supabase/phase4_slot_locking.sql` |
| Lock never releases | Check `CRON_SECRET` on Vercel; verify cron in Vercel dashboard |
| Countdown shows but slot not locked in DB | Check Supabase logs; verify `SUPABASE_SERVICE_ROLE_KEY` in env |
| Everyone can lock same slot | RPC not applied — re-run SQL migration |

---

## When Phase 4 is done, tell me:

> **"Phase 4 is working"**

Next: **Phase 5 — Stripe payments** (webhook marks slot as `sold`).
