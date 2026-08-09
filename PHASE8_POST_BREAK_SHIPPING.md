# Phase 8 — Post-Break Shipping

**Goal:** After a break is marked `completed`, users submit delivery intent (no payment). Admin fulfills from a unified dashboard.

> Note: Dual-path checkout (Buy Now + Cart) was implemented separately — see legacy `PHASE8_DUAL_CHECKOUT.md` if present, or cart/buy-now docs in repo.

---

## Run migration

Supabase → **SQL Editor**:

```text
supabase/phase8_post_break_shipping.sql
```

Requires base `schema.sql` (`shipping_options`, `shipping_requests` tables + seed options).

---

## User flow

1. Admin marks break **completed** + saves `video_url`
2. User → **My Account** → **Completed breaks — delivery**
3. Click **Select delivery option** → choose method + enter details → **Confirm**
4. Form becomes **read-only receipt** (one submission per user per break)
5. No Stripe / wallet charge at this step

---

## Admin flow

| Route | Purpose |
|-------|---------|
| `/admin/shipping` | Pending + completed requests with slot snapshots |
| `/admin/shipping-options` | Toggle/create shipping methods (soft-disable only) |

Admin can override any field (method, details, notes, status).

---

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/shipping/submit` | User submit (session-scoped, idempotent) |
| `POST /api/admin/shipping/update` | Admin edit request |
| `POST /api/admin/shipping/options` | Admin create/toggle options |

---

## Security

- **IDOR:** All queries scoped to `auth.uid()` / admin role
- **Idempotency:** Unique `(user_id, break_id)` + RPC raises `SHIPPING_ALREADY_REQUESTED`
- **Sanitization:** Text fields trimmed, length-capped; no `dangerouslySetInnerHTML`
- **Options:** Never hard-deleted — `is_active = false` only

---

## Test checklist

1. Complete a break with `video_url` as admin
2. User with paid slot sees break under account shipping section
3. Submit SF Express + locker code → receipt locks
4. Second submit attempt → error
5. Admin sees snapshot `Slots: Player 1, Player 2`
6. Admin marks **Completed** after shipping
7. Disable a shipping option → hidden from user dropdown; old requests keep snapshot name

When working, reply: **"Phase 8 is working"**
