import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { sendWithdrawalCompletedEmail } from "@/lib/email/withdrawal-notifications";
import {
  completeWithdrawal,
  getWithdrawalWithProfile,
} from "@/lib/wallet/withdrawal-actions";

type CompleteBody = {
  withdrawalId?: number;
};

export async function POST(request: Request) {
  const adminCheck = await requireAdminApi();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json()) as CompleteBody;
  const withdrawalId = Number(body.withdrawalId);

  if (!withdrawalId || Number.isNaN(withdrawalId)) {
    return NextResponse.json({ ok: false, error: "MISSING_WITHDRAWAL_ID" }, { status: 400 });
  }

  const withdrawal = await getWithdrawalWithProfile(withdrawalId);

  if (!withdrawal) {
    return NextResponse.json({ ok: false, error: "WITHDRAWAL_NOT_FOUND" }, { status: 404 });
  }

  if (withdrawal.status !== "pending") {
    return NextResponse.json({ ok: false, error: "WITHDRAWAL_NOT_PENDING" }, { status: 409 });
  }

  const result = await completeWithdrawal(withdrawalId);

  if (!result.ok) {
    const status = result.code === "WITHDRAWAL_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  await sendWithdrawalCompletedEmail(withdrawal);

  return NextResponse.json({ ok: true });
}
