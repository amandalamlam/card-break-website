import { createAdminClient } from "@/lib/supabase/admin";
import { releaseExpiredSlotLocks } from "@/lib/slots/locking";
import type { BreakSlot } from "@/lib/breaks/types";

export type BreakSlotsResult = {
  slots: BreakSlot[];
  released: number;
};

/**
 * Lazy release: clears expired locks in the database, then returns fresh slot rows.
 * Uses locked_at + 8 minutes (via release_expired_slot_locks RPC).
 */
export async function fetchBreakSlotsWithLazyRelease(breakId: string): Promise<BreakSlotsResult> {
  const released = await releaseExpiredSlotLocks();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("break_slots")
    .select("id, break_id, name, price, status, user_id, locked_at")
    .eq("break_id", breakId)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  const slots = (data ?? []) as BreakSlot[];

  return { slots, released };
}
