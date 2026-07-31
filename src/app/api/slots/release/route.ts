import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { releaseSlotLock } from "@/lib/slots/locking";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as { slotId?: string };
  const slotId = body.slotId;

  if (!slotId) {
    return NextResponse.json({ ok: false, error: "MISSING_SLOT_ID" }, { status: 400 });
  }

  const released = await releaseSlotLock(slotId, user.id);

  return NextResponse.json({ ok: true, released });
}
