import { createClient } from "@/lib/supabase/server";
import type { Break, BreakListItem, BreakSlot, BreakWithSlots } from "./types";

function mapBreakListItem(
  row: Break & { break_slots: { status: BreakSlot["status"] }[] }
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breaks")
    .select("id, title, description, image_url, status, video_url, created_at, break_slots(status)")
    .in("status", ["active", "sold_out"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapBreakListItem(row as Break & { break_slots: { status: BreakSlot["status"] }[] }));
}

export async function getBreakById(id: string): Promise<BreakWithSlots | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breaks")
    .select(
      "id, title, description, image_url, status, video_url, created_at, break_slots(id, break_id, name, price, status, user_id, locked_at)"
    )
    .eq("id", id)
    .in("status", ["active", "sold_out"])
    .single();

  if (error) {
    return null;
  }

  const breakRow = data as Break & { break_slots: BreakSlot[] };

  return {
    ...breakRow,
    break_slots: (breakRow.break_slots ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function getSlotById(slotId: string, breakId: string): Promise<BreakSlot | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("break_slots")
    .select("id, break_id, name, price, status, user_id, locked_at")
    .eq("id", slotId)
    .eq("break_id", breakId)
    .single();

  if (error) {
    return null;
  }

  return data as BreakSlot;
}

export async function getAllBreaksForAdmin(): Promise<BreakListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breaks")
    .select("id, title, description, image_url, status, video_url, created_at, break_slots(status)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapBreakListItem(row as Break & { break_slots: { status: BreakSlot["status"] }[] }));
}
