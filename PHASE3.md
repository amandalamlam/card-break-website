# Phase 3 — Public Break Browsing

**Goal:** Show real breaks and slots from Supabase, with admin tools to create new breaks.

---

## What was built

| Page | URL | Who can access |
|------|-----|----------------|
| Homepage (featured breaks) | `/zh-Hant` | Everyone |
| Break list | `/zh-Hant/breaks` | Everyone |
| Break detail + slot grid | `/zh-Hant/breaks/[id]` | Everyone |
| Checkout (auth required) | `/zh-Hant/checkout/start?breakId=&slotId=` | Logged-in users |
| Admin dashboard | `/zh-Hant/admin/breaks` | Admin only |
| Create break | `/zh-Hant/admin/breaks/new` | Admin only |

---

## Step 1 — Pull latest code

```bash
cd /Users/amanda/Desktop/card-break-website
git pull
npm install
npm run dev
```

---

## Step 2 — Confirm seed data appears

Open [http://localhost:3000/zh-Hant/breaks](http://localhost:3000/zh-Hant/breaks)

You should see **2026 NBA Prizm Hobby Box #01** from Phase 1 seed data, with 5 team slots.

Click into the break → each **Available** slot has a **Checkout** button.

---

## Step 3 — Test guest vs logged-in checkout

1. **Logged out** → click **Checkout** on Lakers → redirected to login
2. Log in → returned to checkout page showing break title, slot name, and price
3. **Logged in** → click Checkout on another slot → goes directly to checkout page

---

## Step 4 — Test admin break creation

Ensure your account is admin (Phase 2 SQL):

```sql
update public.profiles set role = 'admin' where email = 'YOUR_EMAIL@example.com';
```

Then:

1. Header shows **後台 / Admin** link
2. Visit [http://localhost:3000/zh-Hant/admin/breaks/new](http://localhost:3000/zh-Hant/admin/breaks/new)
3. Fill title, description, and slots (one per line: `Team,300`)
4. Submit → redirects to the new public break page

---

## Step 5 — Deploy

```bash
git add .
git commit -m "Phase 3: public break browsing and admin break creation"
git push
```

Test live:

- [https://card-break-website.vercel.app/zh-Hant/breaks](https://card-break-website.vercel.app/zh-Hant/breaks)

---

## Slot status badges

| Badge | Meaning |
|-------|---------|
| 可購買 / Available | Can click Checkout |
| 鎖定中 / Locked | Someone is checking out (Phase 4) |
| 已售出 / Sold | Purchased |

---

## When Phase 3 is done, tell me:

> **"Phase 3 is working"**

Next: **Phase 4 — 8-minute slot locking** with database row-level locking.
