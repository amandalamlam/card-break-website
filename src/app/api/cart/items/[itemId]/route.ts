import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { getActiveCart, removeCartItem } from "@/lib/cart/actions";
import { normalizeCartWithItems } from "@/lib/cart/normalize";

export const dynamic = "force-dynamic";

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

  const cart = normalizeCartWithItems(await getActiveCart(session.userId));

  return NextResponse.json(
    { ok: true, cart },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
