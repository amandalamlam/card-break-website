# Phase 8 — Dual-Path Checkout (Buy Now + Cart)

**Goal:** Single-item ⚡ Buy Now (1 min) isolated from multi-item shopping cart (5 min shared timer).

---

## Run migration

Supabase → **SQL Editor** (in order):

```text
supabase/phase8_dual_checkout.sql
supabase/phase8d_wallet_and_cart_hotfix.sql   ← REQUIRED if Stripe Back / Add to Cart fails
```

Requires `phase6c_checkout_credit_release.sql` (wallet release on expiry).

If you already ran phase8 and hit `profiles_credit_reserved_check` or Add to Cart `UNKNOWN`,
run **only** `phase8d_wallet_and_cart_hotfix.sql`.

---

## Path 1 — ⚡ Buy Now

| Setting | Value |
|---------|--------|
| Lock TTL | **1 minute** (`lock_type = buy_now`) |
| Checkout page | `/checkout/start?mode=buy_now&breakId=&slotId=` |
| Stripe session | `expires_at` +30 min (Stripe API minimum) |
| Cart impact | **None** — independent session |

---

## Path 2 — Shopping cart

| Setting | Value |
|---------|--------|
| Lock TTL | **5 minutes** shared (`carts.expires_at`) |
| Page | `/cart` |
| New items | Sync to **remaining** cart time (no reset) |
| Remove item | Immediate slot release |
| Cart expiry | All slots released automatically |

---

## Wallet (atomic)

- `create_checkout_order` / `create_cart_checkout_order` use `FOR UPDATE` on profile
- Available credit = `store_credit` (reserved in `credit_reserved` across all pending sessions)
- Buy Now + Cart can run in parallel without double-spend

---

## Result routes

| Outcome | Buy Now | Cart |
|---------|---------|------|
| Success | `/checkout/success` | `/checkout/success` |
| Stripe Back / cancel | `/checkout/failed?order_id=&mode=buy_now&reason=cancelled` | `/cart?cancelled=1&order_id=` → `/cart?notice=cancelled` |
| Cart timer expired during Stripe | — | `/cart?notice=expired` (full cleanup) |

**Buy Now cancel:** releases slot + unfreezes wallet; links to break page + account.

**Cart cancel (timer still valid):** cancels pending order only; cart items + countdown preserved; shows retry notice.

**Cart cancel (timer expired):** clears cart, releases slots, unfreezes credit.

---

## Test checklist

1. **Buy Now:** lock 1 min → pay → success; cart untouched
2. **Cart:** add 2 slots → 5 min timer → checkout → success
3. **Parallel:** cart slot A + Buy Now slot B simultaneously
4. **Remove cart item:** slot instantly available to others
5. **Cart expiry:** all slots released
6. **Stripe cancel:** lands on `/checkout/failed`, credit restored

When working, reply: **"Phase 8 is working"**
