import { createClient } from "@/lib/supabase/server";
import { fetchBreakSlotsWithLazyRelease } from "@/lib/slots/fetch-slots";
import { releaseExpiredSlotLocks } from "@/lib/slots/locking";
import type { Break, BreakListItem, BreakSlot, BreakWithSlots } from "./types";

function mapBreakListItem(
  row: Break & { break_slots: Pick<BreakSlot, "status">[] }
): BreakListItem {
  const total_count = row.break_slots.length;
  const available_count = row.break_slots.filter((slot) => slot.status === "available").length;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    status: row.status,
    video_url: row.video_url,
    created_at: row.created_at,
    available_count,
    total_count,
  };
}

export async function getPublicBreaks(): Promise<BreakListItem[]> {
  await releaseExpiredSlotLocks();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breaks")
    .select("id, title, description, image_url, status, video_url, created_at, break_slots(status, locked_at)")
    .in("status", ["active", "sold_out"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapBreakListItem(row as Break & { break_slots: Pick<BreakSlot, "status">[] })
  );
}

export async function getBreakById(id: string): Promise<BreakWithSlots | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breaks")
    .select("id, title, description, image_url, status, video_url, created_at")
    .eq("id", id)
    .in("status", ["active", "sold_out"])
    .single();

  if (error) {
    return null;
  }

  const { slots } = await fetchBreakSlotsWithLazyRelease(id);

  return {
    ...(data as Break),
    break_slots: slots,
  };
}

export async function getSlotById(slotId: string, breakId: string): Promise<BreakSlot | null> {
  await releaseExpiredSlotLocks();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("break_slots")
    .select("id, break_id, name, price, status, user_id, locked_at, lock_type, lock_expires_at")
    .eq("id", slotId)
    .eq("break_id", breakId)
    .single();

  if (error) {
    return null;
  }

  return data as BreakSlot;
}

export async function getAllBreaksForAdmin(): Promise<BreakListItem[]> {
  await releaseExpiredSlotLocks();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breaks")
    .select("id, title, description, image_url, status, video_url, created_at, break_slots(status, locked_at)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapBreakListItem(row as Break & { break_slots: Pick<BreakSlot, "status">[] })
  );
}
