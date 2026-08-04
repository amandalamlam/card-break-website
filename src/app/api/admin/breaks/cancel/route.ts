import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { cancelBreakAndRefund } from "@/lib/wallet/credit";

type CancelBody = {
  breakId?: string;
};

export async function POST(request: Request) {
  const adminCheck = await requireAdminApi();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json()) as CancelBody;
  const breakId = body.breakId;

  if (!breakId) {
    return NextResponse.json({ ok: false, error: "MISSING_BREAK_ID" }, { status: 400 });
  }

  const result = await cancelBreakAndRefund(breakId);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.code }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    refundedOrders: result.refundedOrders,
    refundedSlots: result.refundedSlots,
    releasedLocks: result.releasedLocks,
  });
}
