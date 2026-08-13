import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { removeCartItem } from "@/lib/cart/actions";

type RouteParams = {
  params: Promise<{ itemId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { itemId } = await params;
  const result = await removeCartItem(session.userId, itemId);

  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
