import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { updateBreakAdmin } from "@/lib/breaks/admin-actions";

type UpdateBody = {
  breakId?: string;
  title?: string;
  description?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  slotsRaw?: string;
};

export async function POST(request: Request) {
  const adminCheck = await requireAdminApi();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json()) as UpdateBody;

  if (!body.breakId?.trim()) {
    return NextResponse.json({ ok: false, error: "MISSING_BREAK_ID" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, error: "MISSING_TITLE" }, { status: 400 });
  }

  if (!body.slotsRaw?.trim()) {
    return NextResponse.json({ ok: false, error: "MISSING_SLOTS" }, { status: 400 });
  }

  const result = await updateBreakAdmin({
    breakId: body.breakId,
    title: body.title,
    description: body.description ?? "",
    imageUrl: body.imageUrl ?? null,
    videoUrl: body.videoUrl ?? null,
    slotsRaw: body.slotsRaw,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.code, message: result.message },
      { status: result.code === "BREAK_NOT_FOUND" ? 404 : 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
