import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { submitShippingRequest } from "@/lib/shipping/actions";

type SubmitBody = {
  breakId?: string;
  shippingOptionId?: number;
  shippingDetails?: string;
};

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const rateLimited = enforceRateLimit(
    request,
    "shipping-submit",
    session.userId,
    RATE_LIMITS.shippingSubmitPerUserHour
  );
  if (rateLimited) {
    return rateLimited;
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
    session.userId,
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
