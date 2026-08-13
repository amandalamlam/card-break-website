import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export type SessionUserResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireSessionUser(): Promise<SessionUserResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  return { ok: true, userId: user.id };
}
