import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { addSlotToCart, getActiveCart } from "@/lib/cart/actions";
import { normalizeCartWithItems } from "@/lib/cart/normalize";

export const dynamic = "force-dynamic";

function jsonCartResponse(cart: Awaited<ReturnType<typeof getActiveCart>>) {
  return NextResponse.json(
    { cart: normalizeCartWithItems(cart) },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export async function GET() {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const cart = await getActiveCart(session.userId);
  return jsonCartResponse(cart);
}

type AddItemBody = {
  breakId?: string;
  slotId?: string;
};

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const rateLimited = enforceRateLimit(
    request,
    "cart-add",
    session.userId,
    RATE_LIMITS.cartAddPerUserMinute
  );
  if (rateLimited) {
    return rateLimited;
  }

  const body = (await request.json()) as AddItemBody;
  const { breakId, slotId } = body;

  if (!breakId || !slotId) {
    return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
  }

  const result = await addSlotToCart(session.userId, breakId, slotId);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.code,
        ...(process.env.NODE_ENV !== "production" && result.detail
          ? { detail: result.detail }
          : {}),
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    cartId: result.cartId,
    cartItemId: result.cartItemId,
    expiresAt: result.expiresAt,
    isNewCart: result.isNewCart,
  });
}
