import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { addSlotToCart, getActiveCart } from "@/lib/cart/actions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const cart = await getActiveCart(user.id);
  return NextResponse.json({ cart });
}

type AddItemBody = {
  breakId?: string;
  slotId?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as AddItemBody;
  const { breakId, slotId } = body;

  if (!breakId || !slotId) {
    return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
  }

  const result = await addSlotToCart(user.id, breakId, slotId);

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
