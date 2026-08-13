import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { cancelWithdrawal } from "@/lib/wallet/withdrawal-actions";

type CancelBody = {
  withdrawalId?: number;
};

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const rateLimited = enforceRateLimit(
    request,
    "withdrawal-cancel",
    session.userId,
    RATE_LIMITS.withdrawalCancelPerUserHour
  );
  if (rateLimited) {
    return rateLimited;
  }

  const body = (await request.json()) as CancelBody;
  const withdrawalId = Number(body.withdrawalId);

  if (!withdrawalId || Number.isNaN(withdrawalId)) {
    return NextResponse.json({ ok: false, error: "MISSING_WITHDRAWAL_ID" }, { status: 400 });
  }

  const result = await cancelWithdrawal(session.userId, withdrawalId);

  if (!result.ok) {
    const status = result.code === "WITHDRAWAL_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  return NextResponse.json({ ok: true });
}
