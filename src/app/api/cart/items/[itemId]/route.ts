import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { removeCartItem } from "@/lib/cart/actions";

type RouteParams = {
  params: Promise<{ itemId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { itemId } = await params;
  const result = await removeCartItem(user.id, itemId);

  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
