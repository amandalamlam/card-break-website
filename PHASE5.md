# Phase 5 — Stripe Payments

**Goal:** Pay for locked slots via Stripe Checkout. Webhook marks slot as `sold`.

---

## What was built

- **Pay with Stripe** button on checkout page (inside the 8-minute lock window)
- Stripe Checkout Session in **HKD**
- `orders` table tracks each purchase
- Webhook `/api/stripe/webhook` handles `checkout.session.completed`
- Success page `/checkout/success` confirms payment
- Slot status updates to **sold** after payment

---

## Step 1 — Run SQL migration

Supabase → **SQL Editor** → run all of:

`supabase/phase5_stripe_orders.sql`

---

## Step 2 — Create a Stripe account (Test mode)

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Stay in **Test mode** (toggle top-right)
3. HK live account can wait — test mode works for development

---

## Step 3 — Get API keys

Stripe Dashboard → **Developers** → **API keys**

| Key | Env variable |
|-----|----------------|
| Publishable key | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Secret key | `STRIPE_SECRET_KEY` |

Add to `.env.local`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add the same keys to **Vercel** (Production + Preview).

---

## Step 4 — Set up webhook (local dev)

Install [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

Forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret (`whsec_...`) to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Keep this terminal running while testing.

---

## Step 5 — Set up webhook (production / Vercel)

Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**

| Field | Value |
|-------|--------|
| URL | `https://card-break-website.vercel.app/api/stripe/webhook` |
| Events | `checkout.session.completed`, `checkout.session.expired` |

Copy the **Signing secret** → Vercel env `STRIPE_WEBHOOK_SECRET`

Redeploy Vercel after adding keys.

---

## Step 6 — Test the payment flow

```bash
npm install
npm run dev
```

1. Log in → pick a break → **Checkout** on an available slot
2. Wait for lock countdown → click **前往 Stripe 付款**
3. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. After payment → success page
5. Return to break page → slot shows **已售出 / Sold**

Verify in Supabase **Table Editor**:
- `orders` row with `status = paid`
- `break_slots` row with `status = sold`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Pay button error | Check `STRIPE_SECRET_KEY` in `.env.local`, restart dev server |
| Payment works but slot not sold | Webhook not running — use `stripe listen` locally |
| Webhook 400 invalid signature | Wrong `STRIPE_WEBHOOK_SECRET` |
| `orders table does not exist` | Run `phase5_stripe_orders.sql` |

---

## When Phase 5 is done, tell me:

> **"Phase 5 is working"**

Next: **Phase 6 — Wallet & store credit** (cancellation credits, mixed payments).
