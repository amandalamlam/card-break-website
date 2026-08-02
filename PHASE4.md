# Phase 4 — 8-Minute Slot Locking

**Goal:** When a logged-in user starts checkout, lock the slot exclusively for 8 minutes with database row-level locking.

---

## What was built

- PostgreSQL functions: `lock_break_slot`, `release_slot_lock`, `release_expired_slot_locks`
- `SELECT FOR UPDATE` prevents two users locking the same slot at the same millisecond
- Checkout page auto-locks on load and shows a live **MM:SS countdown**
- Expired locks release via **lazy cleanup** on every `/api/slots` request (no cron required)
- Break page **polls every 8 seconds** and pauses when the tab is hidden
- Error UI when slot is sold or locked by someone else

---

## Step 1 — Run the SQL migration (required)

1. Open Supabase → **SQL Editor** → **New query**
2. Copy all of `supabase/phase4_slot_locking.sql`
3. Click **Run**

You should see **Success**.

---

## Step 2 — Pull code and run locally

```bash
cd /Users/amanda/Desktop/card-break-website
git pull
npm install
npm run dev
```

---

## Step 3 — Test the lock flow

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
2. Slot returns to **可購買 / Available** on the break page within ~8 seconds (live polling)

---

## Step 4 — Deploy

```bash
git add .
git commit -m "Phase 4: slot locking with lazy release and live polling"
git push
```

No Vercel cron configuration is required (`vercel.json` is empty).

---

## How lazy release works

| Trigger | Action |
|---------|--------|
| `GET /api/slots?breakId=...` | Runs `release_expired_slot_locks()` then returns fresh slots |
| Break page load | Same lazy release via server-side fetch |
| Checkout countdown hits 0 | Calls `/api/slots` + `/api/slots/release` |
| Slot grid polling | Every **8 seconds** while tab is focused |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `function lock_break_slot does not exist` | Run `supabase/phase4_slot_locking.sql` |
| Lock never releases | Open break page (polling triggers lazy release); run `phase4_slot_locking_fix.sql` |
| Countdown shows but slot not locked in DB | Check Supabase logs; verify `SUPABASE_SERVICE_ROLE_KEY` in env |
| Everyone can lock same slot | RPC not applied — re-run SQL migration |

---

## When Phase 4 is done, tell me:

> **"Phase 4 is working"**

Next: **Phase 5 — Stripe payments** (webhook marks slot as `sold`).
