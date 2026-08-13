# Phase 10 — Security Hardening

**Goal:** Implement PRD Section 5 (`requirements.md`) security checklist.

---

## Checklist vs PRD Section 5

| # | Requirement | Status | Implementation |
|---|-------------|--------|----------------|
| 5.1 | IDOR prevention on user APIs | ✅ Done | Session user ID passed to all mutations; DB/RPC queries scoped by `user_id` |
| 5.2 | Server-side shipping duplicate check | ✅ Done | `submit_shipping_request` RPC + `SHIPPING_ALREADY_REQUESTED` |
| 5.3 | RBAC on `/api/admin/*` | ✅ Done | `requireAdminApi()` on all 7 admin routes → `403 FORBIDDEN` |
| 5.4 | Input sanitization (no raw HTML in user fields) | ✅ Done | `sanitizePlainText`, `sanitizeBreakDescription`, `isSafeHttpUrl` |
| 5.5 | Rate limiting on sensitive endpoints | ✅ Done | See limits below |
| — | Stripe webhook signature verification | ✅ Done | `stripe.webhooks.constructEvent()` in `/api/stripe/webhook` |

---

## IDOR enforcement pattern

All user mutation APIs:

1. Call `requireSessionUser()` → verified `userId` from session (never trust body alone)
2. Pass `userId` into service layer / RPC
3. SQL/RPC includes `WHERE user_id = p_user_id` (or equivalent)

**Examples:**

| Endpoint | Scope |
|----------|-------|
| `POST /api/withdrawal/cancel` | `cancel_withdrawal(p_user_id, p_withdrawal_id)` |
| `DELETE /api/cart/items/[itemId]` | `.eq("user_id", userId)` on cart_items |
| `GET /api/wallet/history` | `queryWalletHistory({ userId })` |
| `POST /api/checkout/pay` | Order update `.eq("user_id", authSession.userId)` |

---

## RBAC (admin routes)

Every route under `src/app/api/admin/**` calls `requireAdminApi()`:

- Returns `401` if not logged in
- Returns `403` if `profiles.role !== 'admin'`

Non-admin users calling admin APIs via Postman/curl are blocked.

---

## Input sanitization

| Field | Sanitizer |
|-------|-----------|
| Break description (admin) | `sanitizeBreakDescription()` — allowlist HTML tags |
| Shipping details / admin notes | `sanitizePlainText()` — strips all HTML |
| Withdrawal recipient details | `sanitizePlainText()` |
| `video_url` / `image_url` | `isSafeHttpUrl()` — http/https only |
| Rich text display | `RichTextContent` re-sanitizes before render |

**Rule:** User-facing text fields never use unsanitized `dangerouslySetInnerHTML`.

---

## Rate limits

| Endpoint | Limit |
|----------|-------|
| `POST /api/withdrawal/submit` | **2 / hour** per user (DB count) + **6 / hour** per IP (in-memory) |
| `POST /api/withdrawal/cancel` | 10 / hour per user |
| `POST /api/shipping/submit` | 10 / hour per user |
| `POST /api/cart/items` | 30 / minute per user |
| `POST /api/checkout/pay`, `/api/cart/checkout`, `/api/stripe/checkout` | 15 / minute per user |

Returns `429` with `Retry-After` header.

> **Note:** In-memory rate limits are per server instance. For multi-region production, consider Upstash Redis.

---

## Stripe webhook

`/api/stripe/webhook`:

1. Requires `stripe-signature` header
2. Verifies payload with `STRIPE_WEBHOOK_SECRET`
3. Rejects invalid signatures with `400`

---

## Manual audit: two browser accounts

Use **two normal (non-incognito) browser profiles** — e.g. Chrome Profile A = User A, Profile B = User B.

### Setup

1. Create **User A** and **User B** (different emails)
2. Give User A wallet credit and a pending withdrawal / cart item / shipping-eligible break
3. Log in as User B in the other profile

### Tests (User B must fail)

| Action | How to test | Expected |
|--------|-------------|----------|
| Cancel A's withdrawal | `POST /api/withdrawal/cancel` with A's `withdrawalId` while logged in as B | `404 WITHDRAWAL_NOT_FOUND` |
| Delete A's cart item | `DELETE /api/cart/items/{A's itemId}` as B | `409 CART_ITEM_NOT_FOUND` |
| View A's wallet history | `GET /api/wallet/history` as B | Only B's transactions |
| Admin complete withdrawal | `POST /api/admin/withdrawals/complete` as B | `403 FORBIDDEN` |
| Submit shipping for break A didn't join | `POST /api/shipping/submit` with A's breakId as B | `403 NO_PAID_SLOTS` |
| Double shipping submit | Submit twice for same break as same user | `409 SHIPPING_ALREADY_REQUESTED` |

### DevTools quick test (User B session)

```bash
# Cancel someone else's withdrawal (replace IDs and use B's session cookie)
curl -X POST http://localhost:3000/api/withdrawal/cancel \
  -H "Content-Type: application/json" \
  -H "Cookie: <user-b-session-cookies>" \
  -d '{"withdrawalId": 123}'
```

### Admin RBAC test

```bash
curl -X POST http://localhost:3000/api/admin/withdrawals/complete \
  -H "Content-Type: application/json" \
  -H "Cookie: <user-b-session-cookies>" \
  -d '{"withdrawalId": 123}'
# Expected: {"ok":false,"error":"FORBIDDEN"}
```

---

## Key files

| Area | Path |
|------|------|
| Session guard | `src/lib/security/require-session-user.ts` |
| Rate limiting | `src/lib/security/rate-limit.ts` |
| Plain-text sanitization | `src/lib/security/sanitize-plain-text.ts` |
| Admin RBAC | `src/lib/auth/require-admin-api.ts` |
| HTML sanitization | `src/lib/breaks/sanitize-html.ts` |
| Shipping sanitization | `src/lib/shipping/sanitize.ts` |
| Stripe webhook | `src/app/api/stripe/webhook/route.ts` |

---

## Next steps (optional production hardening)

- Move rate limits to Redis/Upstash for global enforcement
- Add CSP headers in `next.config.ts`
- Enable Supabase RLS policies as defense-in-depth (service role bypasses RLS today)
- Add audit log table for admin actions
