# Phase 9 — Withdrawals / Cash Out (Story 4)

**Goal:** Manual payout workflow — users request cash out, admin completes or rejects offline payouts.

Most of this was built in **Phase 7** (`PHASE7.md`, `supabase/phase7_withdrawals.sql`). Phase 9 closes the remaining PRD gaps (emails + rate limit).

---

## Checklist vs PRD

| # | Requirement | Status |
|---|-------------|--------|
| 1 | User: request withdrawal (amount, FPS/PayMe/PayPal, recipient details) | ✅ Done |
| 2 | Instantly freeze amount from `store_credit` | ✅ Done (deducted on submit via `submit_withdrawal` RPC) |
| 3 | Admin: pending withdrawals list → Complete or Reject | ✅ Done (`/admin?tab=withdrawals`) |
| 4 | Complete: mark done, send confirmation email | ✅ Done (Resend) |
| 5 | Reject: refund to wallet, send notification email | ✅ Done (RPC + Resend) |
| 6 | Rate limit: max **2** withdrawal requests per hour | ✅ Done |

---

## Step 1 — SQL (if not already run)

```text
supabase/phase7_withdrawals.sql
```

---

## Step 2 — Email (Resend)

Add to `.env.local`:

```env
RESEND_API_KEY=re_...
RESEND_FROM=Card Break HK <notifications@yourdomain.com>
```

- Verify your sending domain in [Resend](https://resend.com).
- If `RESEND_API_KEY` is missing, complete/reject still work — emails are skipped with a server log warning.

**Emails sent:**

| Admin action | Email |
|--------------|-------|
| Complete | Bilingual confirmation (amount, method, recipient, reference #) |
| Reject | Bilingual notification + amount refunded to wallet |

---

## Step 3 — Test end-to-end

1. User with wallet credit → **My Account → Request cash out** (`/account/withdraw`)
2. Submit amount + FPS/PayMe/PayPal + recipient details → balance drops immediately
3. Admin → **後台 → 提現審核** → **Complete** (after offline transfer) or **Reject**
4. User receives email; on reject, wallet credit is restored

**Rate limit:** Submit more than 2 requests within 1 hour → `429` / “Too many requests”.

---

## Key files

| Area | Path |
|------|------|
| User form | `src/components/account/WithdrawalForm.tsx` |
| User page | `src/app/[locale]/account/withdraw/page.tsx` |
| Submit API | `src/app/api/withdrawal/submit/route.ts` |
| Admin panel | `src/components/admin/AdminWithdrawalsPanel.tsx` |
| Admin actions | `src/app/api/admin/withdrawals/complete/route.ts`, `reject/route.ts` |
| Email | `src/lib/email/send.ts`, `withdrawal-notifications.ts` |
| DB RPCs | `supabase/phase7_withdrawals.sql` |

---

## Next phase

**Phase 8 (Post-break shipping)** — see `PHASE8_POST_BREAK_SHIPPING.md` (may already be deployed).
