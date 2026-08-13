import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeBreakDescription } from "./sanitize-html";
import { isSafeHttpUrl } from "@/lib/shipping/sanitize";
import { sanitizePlainText } from "@/lib/security/sanitize-plain-text";
import { parseSlotsInput } from "./slots-input";
import type { BreakSlot } from "./types";

export type UpdateBreakAdminInput = {
  breakId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  slotsRaw: string;
};

export type UpdateBreakAdminResult =
  | { ok: true }
  | { ok: false; code: string; message?: string };

async function syncBreakSlots(
  breakId: string,
  parsedSlots: ReturnType<typeof parseSlotsInput>,
  existingSlots: BreakSlot[]
): Promise<UpdateBreakAdminResult> {
  const admin = createAdminClient();
  const parsedByName = new Map(parsedSlots.map((slot) => [slot.name.toLowerCase(), slot]));

  for (const slot of existingSlots) {
    const parsed = parsedByName.get(slot.name.toLowerCase());

    if (parsed) {
      if (slot.status === "available") {
        const { error } = await admin
          .from("break_slots")
          .update({ name: parsed.name, price: parsed.price })
          .eq("id", slot.id);

        if (error) {
          return { ok: false, code: "SLOT_UPDATE_FAILED", message: error.message };
        }
      }
      continue;
    }

    if (slot.status === "available") {
      const { error } = await admin.from("break_slots").delete().eq("id", slot.id);

      if (error) {
        return { ok: false, code: "SLOT_DELETE_FAILED", message: error.message };
      }
    }
  }

  const existingNames = new Set(existingSlots.map((slot) => slot.name.toLowerCase()));

  for (const parsed of parsedSlots) {
    if (existingNames.has(parsed.name.toLowerCase())) {
      continue;
    }

    const { error } = await admin.from("break_slots").insert({
      break_id: breakId,
      name: parsed.name,
      price: parsed.price,
      status: "available",
    });

    if (error) {
      return { ok: false, code: "SLOT_INSERT_FAILED", message: error.message };
    }
  }

  return { ok: true };
}

export async function updateBreakAdmin(input: UpdateBreakAdminInput): Promise<UpdateBreakAdminResult> {
  const admin = createAdminClient();
  const title = sanitizePlainText(input.title, 200);

  if (!title) {
    return { ok: false, code: "MISSING_TITLE" };
  }

  let parsedSlots: ReturnType<typeof parseSlotsInput>;
  try {
    parsedSlots = parseSlotsInput(input.slotsRaw);
  } catch (error) {
    return {
      ok: false,
      code: "INVALID_SLOTS",
      message: error instanceof Error ? error.message : "Invalid slots input.",
    };
  }

  if (parsedSlots.length === 0) {
    return { ok: false, code: "MISSING_SLOTS" };
  }

  const { data: breakRow, error: breakFetchError } = await admin
    .from("breaks")
    .select("id, status")
    .eq("id", input.breakId)
    .maybeSingle();

  if (breakFetchError || !breakRow) {
    return { ok: false, code: "BREAK_NOT_FOUND" };
  }

  const { data: existingSlots, error: slotsFetchError } = await admin
    .from("break_slots")
    .select("id, break_id, name, price, status, user_id, locked_at")
    .eq("break_id", input.breakId);

  if (slotsFetchError) {
    return { ok: false, code: "SLOTS_FETCH_FAILED", message: slotsFetchError.message };
  }

  const description = sanitizeBreakDescription(input.description);
  const imageUrl = input.imageUrl?.trim() || null;
  const videoUrl = input.videoUrl?.trim() || null;

  if (imageUrl && !isSafeHttpUrl(imageUrl)) {
    return { ok: false, code: "INVALID_IMAGE_URL" };
  }

  if (videoUrl && !isSafeHttpUrl(videoUrl)) {
    return { ok: false, code: "INVALID_VIDEO_URL" };
  }

  if (breakRow.status === "completed" && !videoUrl) {
    return { ok: false, code: "COMPLETED_REQUIRES_VIDEO" };
  }

  const { error: breakUpdateError } = await admin
    .from("breaks")
    .update({
      title,
      description,
      image_url: imageUrl,
      video_url: videoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.breakId);

  if (breakUpdateError) {
    return { ok: false, code: "BREAK_UPDATE_FAILED", message: breakUpdateError.message };
  }

  return syncBreakSlots(input.breakId, parsedSlots, (existingSlots ?? []) as BreakSlot[]);
}
