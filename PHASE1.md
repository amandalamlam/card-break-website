# Phase 1 — Supabase Database Setup

**Goal:** Create your database, run the schema, connect it to your website, and verify with test data.

**Time:** ~20–30 minutes

---

## What you'll accomplish

- [ ] Supabase project created (Singapore region)
- [ ] Database tables created (breaks, slots, wallet, shipping, withdrawals)
- [ ] Row Level Security enabled
- [ ] Test break seeded (Lakers, Celtics, Warriors…)
- [ ] Environment variables added locally + on Vercel
- [ ] Health check API returns `"ok": true`

---

## Step 1 — Create a Supabase project

1. Log in at [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Settings:
   - **Name:** `card-break-website`
   - **Database password:** choose a strong password and **save it** (password manager)
   - **Region:** **Singapore (ap-southeast-1)** — closest to Hong Kong
4. Click **Create new project** and wait ~2 minutes

---

## Step 2 — Run the database schema

1. In Supabase, open **SQL Editor** (left sidebar)
2. Click **New query**
3. Open this file on your computer:

   `supabase/schema.sql`

4. Copy **the entire file** and paste it into the SQL Editor
5. Click **Run** (or press `Cmd + Enter`)

You should see **Success. No rows returned** at the bottom.

### Verify in Table Editor

Open **Table Editor** and confirm these tables exist:

| Table | What it stores |
|-------|----------------|
| `profiles` | User phone, wallet balance, admin role |
| `breaks` | Break listings |
| `break_slots` | Team/player slots |
| `shipping_options` | SF Express, pickup, etc. |
| `shipping_requests` | User delivery choices |
| `withdrawals` | Cash-out requests |

Click **breaks** — you should see **2026 NBA Prizm Hobby Box #01**.

Click **break_slots** — you should see 5 teams (Lakers, Celtics, …).

---

## Step 3 — Copy your API keys

1. In Supabase, go to **Project Settings** (gear icon) → **API**
2. Copy these three values:

| Supabase label | Your `.env.local` variable |
|----------------|----------------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role (secret) | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **Never** commit `service_role` to GitHub or expose it in the browser. It bypasses all security rules.

---

## Step 4 — Add keys to your local project

Open `.env.local` in your project folder and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Save the file, then restart the dev server:

```bash
# Stop with Ctrl+C if running, then:
npm run dev
```

---

## Step 5 — Install Supabase packages (one-time)

In your project terminal:

```bash
cd /Users/amanda/Desktop/card-break-website
npm install @supabase/supabase-js @supabase/ssr
```

If you already ran this, skip to Step 6.

---

## Step 6 — Test the connection

Open in your browser:

[http://localhost:3000/api/health/db](http://localhost:3000/api/health/db)

**Success looks like:**

```json
{
  "ok": true,
  "message": "Supabase connection successful",
  "breaks": [
    {
      "id": "...",
      "title": "2026 NBA Prizm Hobby Box #01",
      "status": "active"
    }
  ]
}
```

**Common errors:**

| Error | Fix |
|-------|-----|
| `Missing NEXT_PUBLIC_SUPABASE_URL` | Fill in `.env.local` and restart `npm run dev` |
| `relation "breaks" does not exist` | Re-run `supabase/schema.sql` in SQL Editor |
| `Invalid API key` | Double-check you copied the **anon** key, not service role, for `ANON_KEY` |

---

## Step 7 — Add the same keys to Vercel

Your live site needs the same environment variables.

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Open your **card-break-website** project
3. **Settings → Environment Variables**
4. Add all three Supabase variables (same names as `.env.local`)
5. Apply to **Production**, **Preview**, and **Development**
6. Go to **Deployments → … → Redeploy** (so the new vars take effect)

Test live:

[https://card-break-website.vercel.app/api/health/db](https://card-break-website.vercel.app/api/health/db)

---

## Step 8 — Make yourself admin (after Phase 2 signup)

You can't set admin until you have a user account. After Phase 2 (login/signup), run this in Supabase SQL Editor — replace the email:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_EMAIL@example.com';
```

We'll do this together in Phase 2.

---

## Step 9 — Commit and push (optional)

After Steps 1–7 work locally:

```bash
git add .
git commit -m "Phase 1: Supabase schema and database health check"
git push
```

Vercel will auto-redeploy.

---

## When Phase 1 is done, tell me:

> **"Phase 1 is working"** — and paste the JSON from `/api/health/db` if you want me to verify

Next up: **Phase 2 — Authentication** (signup with email + phone, login, checkout redirect).
