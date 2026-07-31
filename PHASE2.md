# Phase 2 — Authentication

**Goal:** Sign up, log in, log out, and intercept checkout for guests.

---

## What was built

- `/auth/signup` — email + password + **international phone** (required)
- `/auth/login` — email + password
- `/account` — protected profile page (wallet balance, phone, role)
- `/checkout/start` — auth gate (guests → login → return here)
- Header shows **Log out** when signed in
- Homepage **Test checkout gate** button to try the flow

---

## Step 1 — Configure Supabase Auth URLs

In Supabase → **Authentication** → **URL Configuration**:

| Field | Value |
|-------|--------|
| **Site URL** | `https://card-break-website.vercel.app` |
| **Redirect URLs** | Add both: |
| | `http://localhost:3000/auth/callback` |
| | `https://card-break-website.vercel.app/auth/callback` |

Click **Save**.

---

## Step 2 — Email confirmation (recommended for testing)

For easier testing while building:

1. Supabase → **Authentication** → **Providers** → **Email**
2. Turn **OFF** “Confirm email” (optional — turn back on before launch)

If confirmation is **ON**, users must click the email link before they can log in.

---

## Step 3 — Pull latest code & run locally

```bash
cd /Users/amanda/Desktop/card-break-website
git pull
npm install
npm run dev
```

---

## Step 4 — Test the full flow

### A. Sign up

1. Open [http://localhost:3000/zh-Hant/auth/signup](http://localhost:3000/zh-Hant/auth/signup)
2. Enter email, phone (e.g. `+852 9123 4567`), password (8+ chars)
3. Submit → you should land on **My Account** (or see “check your email” if confirmation is on)

### B. Checkout intercept (guest)

1. Log out (header button)
2. Homepage → click **測試結帳攔截（Phase 2）**
3. You should be redirected to **Login** with a `redirect` parameter
4. Log in → you return to the checkout test page

### C. Protected account page

1. While logged out, visit [http://localhost:3000/zh-Hant/account](http://localhost:3000/zh-Hant/account)
2. You should be redirected to login
3. After login → account page shows email, phone, wallet ($0.00)

---

## Step 5 — Make yourself admin

After you have signed up, run in Supabase **SQL Editor** (replace your email):

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_EMAIL@example.com';
```

Refresh `/account` — **Account type** should show `admin`.

---

## Step 6 — Deploy to Vercel

```bash
git add .
git commit -m "Phase 2: authentication with signup, login, and checkout gate"
git push
```

Ensure Supabase redirect URLs include your Vercel domain (Step 1).

Test live signup: [https://card-break-website.vercel.app/zh-Hant/auth/signup](https://card-break-website.vercel.app/zh-Hant/auth/signup)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Signup fails silently | Check Supabase **Logs** → Auth. Phone must start with `+`. |
| “Invalid redirect URL” | Add exact callback URL in Supabase URL Configuration |
| Profile not created | Re-run `supabase/schema.sql` trigger section |
| Logged in but `/account` empty | Confirm `profiles` row exists in Table Editor |

---

## When Phase 2 is done, tell me:

> **"Phase 2 is working"**

Next: **Phase 3 — Public break browsing** (real break list + slot grid from database).
