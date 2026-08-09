import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { upsertShippingOptionAdmin } from "@/lib/shipping/actions";

type OptionBody = {
  id?: number;
  name?: string;
  instructions?: string;
  isActive?: boolean;
};

export async function POST(request: Request) {
  const adminCheck = await requireAdminApi();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json()) as OptionBody;
  const name = body.name?.trim() ?? "";
  const instructions = body.instructions?.trim() ?? "";

  if (!name) {
    return NextResponse.json({ ok: false, error: "MISSING_NAME" }, { status: 400 });
  }

  const result = await upsertShippingOptionAdmin({
    id: body.id ? Number(body.id) : undefined,
    name,
    instructions,
    isActive: body.isActive ?? true,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true, optionId: result.optionId });
}
