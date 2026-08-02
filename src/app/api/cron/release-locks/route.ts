import { NextResponse } from "next/server";
import { releaseExpiredSlotLocks } from "@/lib/slots/locking";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  // Allow manual local testing when CRON_SECRET is not configured.
  return process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production" && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured on Vercel." },
      { status: 500 }
    );
  }

  try {
    const released = await releaseExpiredSlotLocks();
    return NextResponse.json({ ok: true, released });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
