import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { completeBreakAdmin } from "@/lib/breaks/complete";

type CompleteBody = {
  breakId?: string;
  videoUrl?: string;
};

export async function POST(request: Request) {
  const adminCheck = await requireAdminApi();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json()) as CompleteBody;
  const breakId = body.breakId?.trim();
  const videoUrl = body.videoUrl ?? "";

  if (!breakId) {
    return NextResponse.json({ ok: false, error: "MISSING_BREAK_ID" }, { status: 400 });
  }

  const result = await completeBreakAdmin(breakId, videoUrl);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.code, message: result.message },
      { status: result.code === "BREAK_NOT_FOUND" ? 404 : 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
