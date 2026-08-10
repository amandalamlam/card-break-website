import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeHttpUrl } from "@/lib/shipping/sanitize";

export type CompleteBreakAdminResult =
  | { ok: true }
  | { ok: false; code: string; message?: string };

export async function completeBreakAdmin(
  breakId: string,
  videoUrl: string
): Promise<CompleteBreakAdminResult> {
  const admin = createAdminClient();
  const trimmedVideoUrl = videoUrl.trim();

  if (!trimmedVideoUrl || !isSafeHttpUrl(trimmedVideoUrl)) {
    return { ok: false, code: "MISSING_VIDEO_URL" };
  }

  const { data: breakRow, error: fetchError } = await admin
    .from("breaks")
    .select("id, status")
    .eq("id", breakId)
    .maybeSingle();

  if (fetchError || !breakRow) {
    return { ok: false, code: "BREAK_NOT_FOUND" };
  }

  if (breakRow.status === "completed") {
    return { ok: true };
  }

  if (breakRow.status === "cancelled") {
    return { ok: false, code: "BREAK_CANNOT_BE_COMPLETED" };
  }

  if (breakRow.status !== "active" && breakRow.status !== "sold_out") {
    return { ok: false, code: "BREAK_CANNOT_BE_COMPLETED" };
  }

  const { error: updateError } = await admin
    .from("breaks")
    .update({
      status: "completed",
      video_url: trimmedVideoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", breakId);

  if (updateError) {
    return { ok: false, code: "BREAK_UPDATE_FAILED", message: updateError.message };
  }

  return { ok: true };
}

export async function userPurchasedBreak(userId: string, breakId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: soldSlots } = await admin
    .from("break_slots")
    .select("id")
    .eq("break_id", breakId)
    .eq("user_id", userId)
    .eq("status", "sold")
    .limit(1);

  if ((soldSlots ?? []).length > 0) {
    return true;
  }

  const { data: orders } = await admin
    .from("orders")
    .select("id, break_id")
    .eq("user_id", userId)
    .eq("status", "paid");

  const orderIds: string[] = [];
  for (const order of orders ?? []) {
    if (order.break_id === breakId) {
      return true;
    }
    orderIds.push(order.id);
  }

  if (orderIds.length === 0) {
    return false;
  }

  const { data: items } = await admin
    .from("order_items")
    .select("id")
    .eq("break_id", breakId)
    .in("order_id", orderIds)
    .limit(1);

  return (items ?? []).length > 0;
}
