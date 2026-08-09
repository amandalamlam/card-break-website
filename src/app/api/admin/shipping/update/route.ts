import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { updateShippingRequestAdmin } from "@/lib/shipping/actions";

type UpdateBody = {
  requestId?: number;
  optionName?: string;
  shippingDetails?: string;
  status?: "pending" | "shipped" | "completed";
  adminNotes?: string | null;
};

export async function POST(request: Request) {
  const adminCheck = await requireAdminApi();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json()) as UpdateBody;
  const requestId = Number(body.requestId);

  if (!requestId || Number.isNaN(requestId)) {
    return NextResponse.json({ ok: false, error: "MISSING_REQUEST_ID" }, { status: 400 });
  }

  if (!body.optionName?.trim() || !body.shippingDetails?.trim()) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (body.status !== "pending" && body.status !== "shipped" && body.status !== "completed") {
    return NextResponse.json({ ok: false, error: "INVALID_STATUS" }, { status: 400 });
  }

  const result = await updateShippingRequestAdmin(requestId, {
    optionName: body.optionName,
    shippingDetails: body.shippingDetails,
    status: body.status,
    adminNotes: body.adminNotes ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
