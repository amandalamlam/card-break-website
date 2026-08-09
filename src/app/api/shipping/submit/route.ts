import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { submitShippingRequest } from "@/lib/shipping/actions";

type SubmitBody = {
  breakId?: string;
  shippingOptionId?: number;
  shippingDetails?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as SubmitBody;
  const breakId = body.breakId?.trim();
  const shippingOptionId = Number(body.shippingOptionId);
  const shippingDetails = body.shippingDetails ?? "";

  if (!breakId) {
    return NextResponse.json({ ok: false, error: "MISSING_BREAK_ID" }, { status: 400 });
  }

  if (!shippingOptionId || Number.isNaN(shippingOptionId)) {
    return NextResponse.json({ ok: false, error: "INVALID_SHIPPING_OPTION" }, { status: 400 });
  }

  const result = await submitShippingRequest(
    user.id,
    breakId,
    shippingOptionId,
    shippingDetails
  );

  if (!result.ok) {
    const status =
      result.code === "SHIPPING_ALREADY_REQUESTED"
        ? 409
        : result.code === "BREAK_NOT_COMPLETED" || result.code === "NO_PAID_SLOTS"
          ? 403
          : 400;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  return NextResponse.json({ ok: true, requestId: result.requestId });
}
