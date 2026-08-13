import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { roundMoney } from "@/lib/wallet/types";
import {
  countRecentWithdrawals,
  submitWithdrawal,
} from "@/lib/wallet/withdrawal-actions";
import type { WithdrawalMethod } from "@/lib/wallet/withdrawals";

const WITHDRAWAL_METHODS: WithdrawalMethod[] = ["FPS", "PayMe", "PayPal"];
const MAX_WITHDRAWALS_PER_HOUR = 2;

type SubmitBody = {
  amount?: number;
  method?: WithdrawalMethod;
  details?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as SubmitBody;
  const amount = roundMoney(Number(body.amount));
  const method = body.method;
  const details = body.details?.trim() ?? "";

  if (!amount || amount <= 0) {
    return NextResponse.json({ ok: false, error: "INVALID_AMOUNT" }, { status: 400 });
  }

  if (!method || !WITHDRAWAL_METHODS.includes(method)) {
    return NextResponse.json({ ok: false, error: "INVALID_METHOD" }, { status: 400 });
  }

  if (!details) {
    return NextResponse.json({ ok: false, error: "MISSING_DETAILS" }, { status: 400 });
  }

  const recentCount = await countRecentWithdrawals(user.id);

  if (recentCount >= MAX_WITHDRAWALS_PER_HOUR) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT" }, { status: 429 });
  }

  const result = await submitWithdrawal(user.id, amount, method, details);

  if (!result.ok) {
    const status = result.code === "INSUFFICIENT_CREDIT" ? 409 : 400;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  return NextResponse.json({ ok: true, withdrawalId: result.withdrawalId });
}
