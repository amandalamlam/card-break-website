import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { sanitizePlainText } from "@/lib/security/sanitize-plain-text";
import { roundMoney } from "@/lib/wallet/types";
import {
  countRecentWithdrawals,
  submitWithdrawal,
} from "@/lib/wallet/withdrawal-actions";
import type { WithdrawalMethod } from "@/lib/wallet/withdrawals";

const WITHDRAWAL_METHODS: WithdrawalMethod[] = ["FPS", "PayMe", "PayPal"];
const MAX_WITHDRAWALS_PER_HOUR = 2;
const MAX_WITHDRAWAL_DETAILS_LENGTH = 500;

type SubmitBody = {
  amount?: number;
  method?: WithdrawalMethod;
  details?: string;
};

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const rateLimited = enforceRateLimit(
    request,
    "withdrawal-submit",
    session.userId,
    RATE_LIMITS.withdrawalSubmitPerIpHour
  );
  if (rateLimited) {
    return rateLimited;
  }

  const body = (await request.json()) as SubmitBody;
  const amount = roundMoney(Number(body.amount));
  const method = body.method;
  const details = sanitizePlainText(body.details ?? "", MAX_WITHDRAWAL_DETAILS_LENGTH);

  if (!amount || amount <= 0) {
    return NextResponse.json({ ok: false, error: "INVALID_AMOUNT" }, { status: 400 });
  }

  if (!method || !WITHDRAWAL_METHODS.includes(method)) {
    return NextResponse.json({ ok: false, error: "INVALID_METHOD" }, { status: 400 });
  }

  if (!details) {
    return NextResponse.json({ ok: false, error: "MISSING_DETAILS" }, { status: 400 });
  }

  const recentCount = await countRecentWithdrawals(session.userId);

  if (recentCount >= MAX_WITHDRAWALS_PER_HOUR) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT" }, { status: 429 });
  }

  const result = await submitWithdrawal(session.userId, amount, method, details);

  if (!result.ok) {
    const status = result.code === "INSUFFICIENT_CREDIT" ? 409 : 400;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  return NextResponse.json({ ok: true, withdrawalId: result.withdrawalId });
}
