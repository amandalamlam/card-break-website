import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    storeCredit: Number(profile.store_credit),
    creditReserved: Number(profile.credit_reserved ?? 0),
  });
}
