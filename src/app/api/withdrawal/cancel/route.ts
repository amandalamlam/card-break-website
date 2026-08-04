import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { cancelWithdrawal } from "@/lib/wallet/withdrawal-actions";

type CancelBody = {
  withdrawalId?: number;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as CancelBody;
  const withdrawalId = Number(body.withdrawalId);

  if (!withdrawalId || Number.isNaN(withdrawalId)) {
    return NextResponse.json({ ok: false, error: "MISSING_WITHDRAWAL_ID" }, { status: 400 });
  }

  const result = await cancelWithdrawal(user.id, withdrawalId);

  if (!result.ok) {
    const status = result.code === "WITHDRAWAL_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  return NextResponse.json({ ok: true });
}
