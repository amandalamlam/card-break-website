import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchBreakSlotsWithLazyRelease } from "@/lib/slots/fetch-slots";
import { releaseExpiredSlotLocks } from "@/lib/slots/locking";
import type { AdminBreakDetail, Break, BreakListItem, BreakSlot, BreakWithSlots } from "./types";

export const BREAKS_HISTORY_MAX = 50;
export const BREAKS_HISTORY_PAGE_SIZE = 10;

export type PaginatedBreakListResult = {
  items: BreakListItem[];
  page: number;
  totalPages: number;
  totalCount: number;
};

const PUBLIC_BREAK_LIST_SELECT =
  "id, title, description, image_url, status, video_url, created_at, break_slots(status, locked_at)";

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

function createPublicBreaksClient() {
  return createAdminClient();
}

function clampHistoryPage(page: number): number {
  const maxPage = Math.max(1, Math.ceil(BREAKS_HISTORY_MAX / BREAKS_HISTORY_PAGE_SIZE));
  return Math.max(1, Math.min(page, maxPage));
}

export async function getHistoryBreakCount(status: "completed" | "cancelled"): Promise<number> {
  const supabase = createPublicBreaksClient();

  const { count, error } = await supabase
    .from("breaks")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) {
    throw new Error(error.message);
  }

  return Math.min(count ?? 0, BREAKS_HISTORY_MAX);
}

async function fetchHistoryBreaksPage(
  status: "completed" | "cancelled",
  page: number
): Promise<PaginatedBreakListResult> {
  const supabase = createPublicBreaksClient();
  const safePage = clampHistoryPage(page);
  const totalCount = await getHistoryBreakCount(status);
  const totalPages = Math.max(1, Math.ceil(totalCount / BREAKS_HISTORY_PAGE_SIZE));
  const boundedPage = Math.min(safePage, totalPages);
  const offset = (boundedPage - 1) * BREAKS_HISTORY_PAGE_SIZE;
  const end = Math.min(offset + BREAKS_HISTORY_PAGE_SIZE - 1, BREAKS_HISTORY_MAX - 1);

  const { data, error } = await supabase
    .from("breaks")
    .select(PUBLIC_BREAK_LIST_SELECT)
    .eq("status", status)
    .order("updated_at", { ascending: false })
    .range(offset, end);

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data ?? []).map((row) =>
      mapBreakListItem(row as Break & { break_slots: Pick<BreakSlot, "status">[] })
    ),
    page: boundedPage,
    totalPages,
    totalCount,
  };
}

export async function fetchCompletedBreaksPage(page: number): Promise<PaginatedBreakListResult> {
  return fetchHistoryBreaksPage("completed", page);
}

export async function fetchCancelledBreaksPage(page: number): Promise<PaginatedBreakListResult> {
  return fetchHistoryBreaksPage("cancelled", page);
}

export async function fetchPublicBreaks(): Promise<BreakListItem[]> {
  await releaseExpiredSlotLocks();

  const supabase = createPublicBreaksClient();

  const { data, error } = await supabase
    .from("breaks")
    .select(PUBLIC_BREAK_LIST_SELECT)
    .in("status", ["active", "sold_out"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapBreakListItem(row as Break & { break_slots: Pick<BreakSlot, "status">[] })
  );
}

export async function getPublicBreaks(): Promise<BreakListItem[]> {
  return fetchPublicBreaks();
}

export async function getCompletedBreaks(limit?: number): Promise<BreakListItem[]> {
  const result = await fetchCompletedBreaksPage(1);
  const items = result.items;

  if (typeof limit === "number" && limit > 0) {
    return items.slice(0, limit);
  }

  return items;
}

export async function getCompletedBreaksPaginated(page: number): Promise<PaginatedBreakListResult> {
  return fetchCompletedBreaksPage(page);
}

export async function getCancelledBreaks(limit?: number): Promise<BreakListItem[]> {
  const result = await fetchCancelledBreaksPage(1);
  const items = result.items;

  if (typeof limit === "number" && limit > 0) {
    return items.slice(0, limit);
  }

  return items;
}

export async function getCancelledBreaksPaginated(page: number): Promise<PaginatedBreakListResult> {
  return fetchCancelledBreaksPage(page);
}

export async function getBreakById(id: string): Promise<BreakWithSlots | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breaks")
    .select("id, title, description, image_url, status, video_url, created_at")
    .eq("id", id)
    .in("status", ["active", "sold_out", "completed", "cancelled"])
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

export async function getAllBreaksWithSlotsForAdmin(): Promise<AdminBreakDetail[]> {
  await releaseExpiredSlotLocks();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breaks")
    .select(
      "id, title, description, image_url, status, video_url, created_at, break_slots(id, break_id, name, price, status, user_id, locked_at)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const breakRow = row as Break & { break_slots: BreakSlot[] };
    const breakSlots = breakRow.break_slots ?? [];
    const available_count = breakSlots.filter((slot) => slot.status === "available").length;

    return {
      id: breakRow.id,
      title: breakRow.title,
      description: breakRow.description,
      image_url: breakRow.image_url,
      status: breakRow.status,
      video_url: breakRow.video_url,
      created_at: breakRow.created_at,
      available_count,
      total_count: breakSlots.length,
      break_slots: breakSlots.sort((left, right) => left.name.localeCompare(right.name)),
    };
  });
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
