import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireAdminApi(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}
