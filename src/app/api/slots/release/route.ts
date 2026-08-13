import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSlotLockActive } from "@/lib/slots/helpers";
import { releaseExpiredSlotLocks, releaseSlotLock } from "@/lib/slots/locking";

/**
 * POST /api/slots/release
 * Body: { slotId, force?: boolean }
 *
 * By default only clears the caller's lock if it has already expired (or after
 * lazy-release). Pass force:true only for explicit user cancel.
 */
export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const body = (await request.json()) as { slotId?: string; force?: boolean };
  const slotId = body.slotId;
  const force = Boolean(body.force);

  if (!slotId) {
    return NextResponse.json({ ok: false, error: "MISSING_SLOT_ID" }, { status: 400 });
  }

  await releaseExpiredSlotLocks();

  if (!force) {
    const admin = createAdminClient();
    const { data: slot } = await admin
      .from("break_slots")
      .select("status, user_id, locked_at")
      .eq("id", slotId)
      .maybeSingle();

    if (
      slot &&
      slot.status === "locked" &&
      isSlotLockActive({ status: "locked", locked_at: slot.locked_at })
    ) {
      return NextResponse.json({
        ok: true,
        released: false,
        reason: "LOCK_STILL_ACTIVE",
      });
    }
  }

  const released = await releaseSlotLock(slotId, session.userId);

  return NextResponse.json({ ok: true, released });
}
